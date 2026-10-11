// Utilisateurs, référentiels et journal d'audit (Administrateur central)
import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { query, transaction } from '../db.js';
import { asyncH, HttpError } from '../errors.js';
import { exiger } from '../auth.js';
import { journaliser } from '../audit.js';
import { Where } from '../sql.js';
import { ROLES, STATUTS, PERMISSIONS } from '../../../shared/referentiel.js';
import { colonnesTelephone, dechiffrer } from '../crypto.js';
import { normaliserTelephone } from '../../../shared/referentiel.js';

export const router = Router();

// ------------------------------- Référentiels -------------------------------
router.get('/referentiels', asyncH(async (_req, res) => {
  const [sources, motifs] = await Promise.all([
    query('SELECT code, libelle, actif FROM sources_collecte ORDER BY libelle'),
    query('SELECT code, libelle, actif FROM motifs_desactivation ORDER BY libelle'),
  ]);
  res.json({ sources: sources.rows, motifs: motifs.rows, statuts: STATUTS, roles: ROLES, permissions: PERMISSIONS });
}));

router.post('/referentiels/:type', exiger('territoires:gerer'), asyncH(async (req, res) => {
  const table = { sources: 'sources_collecte', motifs: 'motifs_desactivation' }[req.params.type];
  if (!table) throw new HttpError(404, 'Référentiel inconnu');
  const d = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z_]{2,20}$/), libelle: z.string().trim().min(2).max(120), actif: z.boolean().default(true) }).parse(req.body);
  await query(`INSERT INTO ${table} (code, libelle, actif) VALUES ($1,$2,$3) ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle, actif = EXCLUDED.actif`,
    [d.code, d.libelle, d.actif]);
  await journaliser(req, 'REFERENTIEL_MODIFICATION', { entite: table, entiteId: d.code, details: d });
  res.json({ ok: true });
}));

// ------------------------------- Utilisateurs -------------------------------
const motDePasseTemporaire = () => {
  // 16 caractères conformes à la politique (min/maj/chiffre/spécial)
  const b = crypto.randomBytes(12).toString('base64url');
  return `Kr${b}#${crypto.randomInt(10, 99)}`;
};

const schemaUtilisateur = z.object({
  identifiant: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,60}$/, '3 à 60 caractères : lettres, chiffres, . _ -'),
  email: z.string().trim().email().optional().nullable().or(z.literal('').transform(() => null)),
  telephone: z.string().trim().max(30).optional().nullable().or(z.literal('')).refine((t) => !t || normaliserTelephone(t), 'Numéro de téléphone invalide'),
  nom: z.string().trim().min(1).max(80),
  prenoms: z.string().trim().min(1).max(120),
  role: z.enum(Object.keys(ROLES)),
  responsable_id: z.coerce.number().int().positive().optional().nullable(),
  actif: z.boolean().default(true),
  perimetres: z.array(z.object({ commune_id: z.coerce.number().int().positive(), quartier_id: z.coerce.number().int().positive().nullable().optional() })).default([]),
}).refine((u) => !['COORDONNATEUR', 'SUPERVISEUR', 'COMMISSAIRE'].includes(u.role) || u.perimetres.length > 0,
  { message: 'Ce profil nécessite au moins un périmètre territorial', path: ['perimetres'] });

router.get('/utilisateurs', exiger('utilisateurs:gerer'), asyncH(async (_req, res) => {
  const { rows } = await query(`
    SELECT u.id, u.identifiant, coalesce(u.email, m.email) AS email, u.nom, u.prenoms, u.role, u.actif, u.responsable_id, u.militant_id,
           u.derniere_connexion, m.numero AS numero_militant, m.statut AS statut_militant,
           coalesce(u.telephone_chiffre, m.telephone_chiffre, r.telephone_chiffre) AS telephone_chiffre,
           u.doit_changer_mdp, (u.verrouille_jusqua > now()) AS verrouille, u.created_at,
           coalesce(json_agg(json_build_object('commune_id', p.commune_id, 'commune', c.nom, 'quartier_id', p.quartier_id, 'quartier', q.nom))
             FILTER (WHERE p.commune_id IS NOT NULL), '[]') AS perimetres
    FROM utilisateurs u LEFT JOIN utilisateur_perimetres p ON p.utilisateur_id = u.id
    LEFT JOIN militants m ON m.id = u.militant_id
    LEFT JOIN responsables r ON r.id = u.responsable_id
    LEFT JOIN communes c ON c.id = p.commune_id LEFT JOIN quartiers q ON q.id = p.quartier_id
    GROUP BY u.id, m.id, r.id ORDER BY u.role, u.nom`);
  res.json(rows.map(({ telephone_chiffre, ...u }) => ({ ...u, telephone: dechiffrer(telephone_chiffre) })));
}));

async function ecrirePerimetres(client, id, perimetres) {
  await client.query('DELETE FROM utilisateur_perimetres WHERE utilisateur_id = $1', [id]);
  for (const p of perimetres) {
    await client.query('INSERT INTO utilisateur_perimetres (utilisateur_id, commune_id, quartier_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [id, p.commune_id, p.quartier_id || null]);
  }
}

router.post('/utilisateurs', exiger('utilisateurs:gerer'), asyncH(async (req, res) => {
  const d = schemaUtilisateur.parse(req.body);
  if (d.role === 'MILITANT') throw new HttpError(400, 'Les comptes militants sont créés par le formulaire d’inscription lié à une fiche');
  const temp = motDePasseTemporaire();
  const telephone = colonnesTelephone(d.telephone);
  const id = await transaction(req.user, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO utilisateurs (identifiant, email, nom, prenoms, role, responsable_id, telephone_chiffre, telephone_index, actif, mot_de_passe_hash, doit_changer_mdp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true) RETURNING id`,
      [d.identifiant, d.email || null, d.nom, d.prenoms, d.role, d.responsable_id || null, telephone.chiffre, telephone.index,
        d.actif, await bcrypt.hash(temp, 12)]);
    await ecrirePerimetres(client, rows[0].id, d.perimetres);
    return rows[0].id;
  });
  await journaliser(req, 'UTILISATEUR_CREATION', { entite: 'utilisateur', entiteId: id, details: { identifiant: d.identifiant, role: d.role } });
  // Le mot de passe temporaire n'est affiché qu'une seule fois
  res.status(201).json({ id, motDePasseTemporaire: temp });
}));

router.put('/utilisateurs/:id', exiger('utilisateurs:gerer'), asyncH(async (req, res) => {
  const d = schemaUtilisateur.parse(req.body);
  const id = Number(req.params.id);
  const { rows: existant } = await query('SELECT role FROM utilisateurs WHERE id = $1', [id]);
  if (!existant[0]) throw new HttpError(404, 'Utilisateur introuvable');
  if (d.role === 'MILITANT' && existant[0].role !== 'MILITANT') throw new HttpError(400, 'Un compte militant doit être lié par le formulaire d’inscription');
  const telephone = colonnesTelephone(d.telephone);
  if (id === req.user.id && (d.role !== 'ADMIN' || !d.actif)) throw new HttpError(400, 'Vous ne pouvez pas retirer vos propres droits d\'administration');
  await transaction(req.user, async (client) => {
    const { rowCount } = await client.query(
      `UPDATE utilisateurs SET identifiant=$2, email=$3, nom=$4, prenoms=$5, role=$6, responsable_id=$7, actif=$8,
        telephone_chiffre=$9, telephone_index=$10, updated_at=now() WHERE id=$1`,
      [id, d.identifiant, d.email || null, d.nom, d.prenoms, d.role, d.responsable_id || null, d.actif,
        telephone.chiffre, telephone.index]);
    if (!rowCount) throw new HttpError(404, 'Utilisateur introuvable');
    await ecrirePerimetres(client, id, d.perimetres);
    if (!d.actif) await client.query('UPDATE sessions SET revoque_le = now() WHERE utilisateur_id = $1 AND revoque_le IS NULL', [id]);
  });
  await journaliser(req, 'UTILISATEUR_MODIFICATION', { entite: 'utilisateur', entiteId: id, details: { role: d.role, actif: d.actif } });
  res.json({ ok: true });
}));

router.delete('/utilisateurs/:id', exiger('utilisateurs:gerer'), asyncH(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw new HttpError(400, 'Vous ne pouvez pas désactiver votre propre compte');
  const { rowCount } = await query('UPDATE utilisateurs SET actif = false, updated_at = now() WHERE id = $1 AND actif', [id]);
  if (!rowCount) throw new HttpError(404, 'Utilisateur introuvable ou déjà désactivé');
  await query('UPDATE sessions SET revoque_le = now() WHERE utilisateur_id = $1 AND revoque_le IS NULL', [id]);
  await journaliser(req, 'UTILISATEUR_DESACTIVATION', { entite: 'utilisateur', entiteId: id });
  res.status(204).end();
}));

router.post('/utilisateurs/:id/reinitialiser', exiger('utilisateurs:gerer'), asyncH(async (req, res) => {
  const temp = motDePasseTemporaire();
  const { rowCount } = await query(
    `UPDATE utilisateurs SET mot_de_passe_hash = $2, doit_changer_mdp = true, echecs_connexion = 0, verrouille_jusqua = NULL, updated_at = now() WHERE id = $1`,
    [req.params.id, await bcrypt.hash(temp, 12)]);
  if (!rowCount) throw new HttpError(404, 'Utilisateur introuvable');
  await query('UPDATE sessions SET revoque_le = now() WHERE utilisateur_id = $1 AND revoque_le IS NULL', [req.params.id]);
  await journaliser(req, 'UTILISATEUR_REINITIALISATION_MDP', { entite: 'utilisateur', entiteId: req.params.id });
  res.json({ motDePasseTemporaire: temp });
}));

router.post('/utilisateurs/:id/deverrouiller', exiger('utilisateurs:gerer'), asyncH(async (req, res) => {
  const { rowCount } = await query('UPDATE utilisateurs SET echecs_connexion = 0, verrouille_jusqua = NULL WHERE id = $1', [req.params.id]);
  if (!rowCount) throw new HttpError(404, 'Utilisateur introuvable');
  await journaliser(req, 'UTILISATEUR_DEVERROUILLAGE', { entite: 'utilisateur', entiteId: req.params.id });
  res.json({ ok: true });
}));

// ------------------------------- Journal d'audit -------------------------------
router.get('/audit', exiger('audit:lire'), asyncH(async (req, res) => {
  const f = z.object({
    action: z.string().max(40).optional(), utilisateur: z.coerce.number().int().optional(),
    succes: z.enum(['true', 'false']).optional(),
    du: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), au: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().min(1).default(1),
  }).parse(req.query);
  const w = new Where();
  if (f.action) w.add('j.action LIKE ?', `${f.action}%`);
  if (f.utilisateur) w.add('j.utilisateur_id = ?', f.utilisateur);
  if (f.succes) w.add('j.succes = ?', f.succes === 'true');
  if (f.du) w.add('j.horodatage >= ?::date', f.du);
  if (f.au) w.add("j.horodatage < ?::date + interval '1 day'", f.au);
  const [{ rows }, { rows: [t] }, { rows: actions }] = await Promise.all([
    query(`SELECT j.id, j.horodatage, j.identifiant, j.role, j.action, j.entite, j.entite_id, j.succes, host(j.ip) AS ip, j.details
           FROM journal_audit j ${w} ORDER BY j.id DESC LIMIT 50 OFFSET ${(f.page - 1) * 50}`, w.params),
    query(`SELECT count(*)::int AS n FROM journal_audit j ${w}`, w.params),
    query('SELECT DISTINCT action FROM journal_audit ORDER BY 1'),
  ]);
  res.json({ total: t.n, page: f.page, taille: 50, resultats: rows, actions: actions.map((a) => a.action) });
}));

/** Recalcule la chaîne d'empreintes pour détecter toute falsification du journal. */
router.get('/audit/integrite', exiger('audit:lire'), asyncH(async (req, res) => {
  const { rows: [r] } = await query(`
    WITH c AS (
      SELECT id, empreinte, lag(empreinte) OVER (ORDER BY id) AS prev,
             horodatage, utilisateur_id, action, entite, entite_id, succes, details
      FROM journal_audit)
    SELECT count(*)::int AS lignes,
           count(*) FILTER (WHERE empreinte IS DISTINCT FROM digest(coalesce(prev, '\\x'::bytea) || convert_to(
             to_char(horodatage AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' || coalesce(utilisateur_id::text, '') || '|' || action || '|' ||
             coalesce(entite, '') || '|' || coalesce(entite_id, '') || '|' || succes::text || '|' ||
             coalesce(details::text, ''), 'UTF8'), 'sha256'))::int AS anomalies,
           min(id) FILTER (WHERE empreinte IS DISTINCT FROM digest(coalesce(prev, '\\x'::bytea) || convert_to(
             to_char(horodatage AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' || coalesce(utilisateur_id::text, '') || '|' || action || '|' ||
             coalesce(entite, '') || '|' || coalesce(entite_id, '') || '|' || succes::text || '|' ||
             coalesce(details::text, ''), 'UTF8'), 'sha256')) AS premiere_anomalie
    FROM c`);
  await journaliser(req, 'AUDIT_VERIFICATION_INTEGRITE', { details: r });
  res.json({ ...r, integre: r.anomalies === 0 });
}));
