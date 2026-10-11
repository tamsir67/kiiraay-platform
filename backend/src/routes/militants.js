import { Router } from 'express';
import { z } from 'zod';
import { pool, query, transaction } from '../db.js';
import { asyncH, HttpError } from '../errors.js';
import { exiger, verifierAccesQuartier } from '../auth.js';
import { filtresMilitants, schemaFiltres } from '../filtres.js';
import { colonnesTelephone, dechiffrer } from '../crypto.js';
import { journaliser } from '../audit.js';
import { can, normaliserTelephone } from '../../../shared/referentiel.js';

export const router = Router();

// ---------------------------------------------------------------------
// Schéma de validation d'une fiche (CDC §6.1)
// ---------------------------------------------------------------------
const nomRegex = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
const optStr = (max) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const optId = z.coerce.number().int().positive().optional().nullable();

export const schemaMilitant = z.object({
  nom: z.string().trim().min(1, 'Nom obligatoire').max(80).regex(nomRegex, 'Caractères non autorisés'),
  prenoms: z.string().trim().min(1, 'Prénom(s) obligatoire(s)').max(120).regex(nomRegex, 'Caractères non autorisés'),
  sexe: z.enum(['M', 'F'], { errorMap: () => ({ message: 'Sexe obligatoire (M ou F)' }) }),
  date_naissance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
    .refine((d) => !d || (new Date(d) <= new Date(Date.now() - 16 * 365.25 * 86400000)), 'Âge minimum : 16 ans'),
  telephone: optStr(30).refine((t) => !t || normaliserTelephone(t), 'Numéro de téléphone invalide'),
  telephone2: optStr(30).refine((t) => !t || normaliserTelephone(t), 'Numéro secondaire invalide'),
  email: optStr(160).refine((e) => !e || z.string().email().safeParse(e).success, 'Email invalide'),
  adresse: optStr(255),
  repere: optStr(255),
  quartier_id: z.coerce.number().int().positive({ message: 'Quartier obligatoire' }),
  secteur_id: optId,
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  coordonnateur_id: optId,
  superviseur_id: optId,
  commissaire_id: optId,
  source: optStr(20),
  observations: optStr(2000),
  information_personne: z.boolean().default(false),
  date_enregistrement: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
}).refine((m) => (m.latitude == null) === (m.longitude == null), { message: 'Latitude et longitude vont ensemble', path: ['latitude'] });

const LISTE_COLONNES = `
  m.id, m.numero, m.nom, m.prenoms, m.sexe, m.date_naissance,
  date_part('year', age(m.date_naissance))::int AS age,
  m.telephone_suffixe, m.adresse, m.statut, m.date_enregistrement, m.updated_at, m.source,
  m.latitude IS NOT NULL AS geolocalise,
  c.id AS commune_id, c.nom AS commune, q.id AS quartier_id, q.nom AS quartier,
  com.id AS commissaire_id, (com.prenoms || ' ' || com.nom) AS commissaire`;

const TRIS = { nom: 'm.nom, m.prenoms', date: 'm.date_enregistrement', maj: 'm.updated_at', quartier: 'q.nom', numero: 'm.numero', statut: 'm.statut' };

function masquer(row, user) {
  row.telephone_masque = row.telephone_suffixe ? `•• ••• ${row.telephone_suffixe.slice(0, 2)} ${row.telephone_suffixe.slice(2)}` : null;
  delete row.telephone_suffixe;
  if (!can(user.role, 'militants:pii')) { row.adresse = null; row.date_naissance = null; }
  return row;
}

// ---------------------------------------------------------------------
// GET /militants — recherche multicritère paginée (CDC §5.2)
// ---------------------------------------------------------------------
router.get('/', exiger('militants:lire'), asyncH(async (req, res) => {
  const f = schemaFiltres.extend({
    page: z.coerce.number().int().min(1).default(1),
    taille: z.coerce.number().int().min(5).max(200).default(25),
    tri: z.enum(Object.keys(TRIS)).default('date'),
    ordre: z.enum(['asc', 'desc']).default('desc'),
  }).parse(req.query);
  const w = filtresMilitants(f, req.user);
  const from = `FROM militants m JOIN communes c ON c.id = m.commune_id JOIN quartiers q ON q.id = m.quartier_id
                LEFT JOIN responsables com ON com.id = m.commissaire_id`;
  const offset = (f.page - 1) * f.taille;
  const [{ rows }, total] = await Promise.all([
    query(`SELECT ${LISTE_COLONNES} ${from} ${w} ORDER BY ${TRIS[f.tri]} ${f.ordre === 'asc' ? 'ASC' : 'DESC'}, m.id
           LIMIT ${f.taille} OFFSET ${offset}`, w.params),
    query(`SELECT count(*)::int AS n FROM militants m ${w}`, w.params),
  ]);
  res.json({ total: total.rows[0].n, page: f.page, taille: f.taille, resultats: rows.map((r) => masquer(r, req.user)) });
}));

// ---------------------------------------------------------------------
// Détection de doublons avant saisie
// ---------------------------------------------------------------------
async function chercherDoublons(client, { nom, prenoms, telephone, telephone2, quartier_id, date_naissance }, excludeId = null) {
  const idx = [telephone, telephone2].map((t) => colonnesTelephone(t).index).filter(Boolean);
  const { rows } = await client.query(
    `SELECT m.id, m.numero, m.nom, m.prenoms, m.statut, q.nom AS quartier, m.date_naissance,
            CASE WHEN m.telephone_index = ANY($1::bytea[]) OR m.telephone2_index = ANY($1::bytea[]) THEN 'telephone'
                 ELSE 'identite' END AS motif,
            round(similarity(m.identite_norm, f_norm($2))::numeric, 2) AS score
     FROM militants m JOIN quartiers q ON q.id = m.quartier_id
     WHERE m.statut <> 'INACTIF' AND ($5::uuid IS NULL OR m.id <> $5)
       AND ( m.telephone_index = ANY($1::bytea[]) OR m.telephone2_index = ANY($1::bytea[])
             OR (m.identite_norm % f_norm($2) AND similarity(m.identite_norm, f_norm($2)) > 0.75
                 AND (m.quartier_id = $3 OR m.date_naissance = $4::date)) )
     ORDER BY motif DESC, score DESC LIMIT 10`,
    [idx, `${nom} ${prenoms}`, quartier_id, date_naissance || null, excludeId]);
  return rows;
}

router.post('/verifier-doublons', exiger('militants:ecrire'), asyncH(async (req, res) => {
  const d = z.object({ nom: z.string().min(1), prenoms: z.string().min(1), telephone: z.string().optional().nullable(),
    telephone2: z.string().optional().nullable(), quartier_id: z.coerce.number().int().optional().nullable(),
    date_naissance: z.string().optional().nullable() }).parse(req.body);
  res.json({ doublons: await chercherDoublons(pool, d) });
}));

// ---------------------------------------------------------------------
// Résolution de la chaîne de responsabilité par défaut d'un quartier
// ---------------------------------------------------------------------
async function chaineParDefaut(client, quartierId) {
  const { rows } = await client.query(
    `SELECT
       (SELECT r.id FROM responsables r JOIN responsable_perimetres p ON p.responsable_id = r.id
         WHERE r.actif AND r.fonction = 'COMMISSAIRE' AND p.quartier_id = $1 ORDER BY r.id LIMIT 1) AS commissaire_id,
       (SELECT r.id FROM responsables r JOIN responsable_perimetres p ON p.responsable_id = r.id
         WHERE r.actif AND r.fonction = 'SUPERVISEUR' AND p.quartier_id = $1 ORDER BY r.id LIMIT 1) AS superviseur_id,
       (SELECT r.id FROM responsables r JOIN responsable_perimetres p ON p.responsable_id = r.id
         JOIN quartiers q ON q.commune_id = p.commune_id AND q.id = $1
         WHERE r.actif AND r.fonction = 'COORDONNATEUR' ORDER BY r.id LIMIT 1) AS coordonnateur_id`, [quartierId]);
  return rows[0];
}

async function verifierResponsables(client, d) {
  for (const [champ, fonction] of [['coordonnateur_id', 'COORDONNATEUR'], ['superviseur_id', 'SUPERVISEUR'], ['commissaire_id', 'COMMISSAIRE']]) {
    if (!d[champ]) continue;
    const { rows } = await client.query('SELECT fonction, actif FROM responsables WHERE id = $1', [d[champ]]);
    if (!rows[0] || rows[0].fonction !== fonction || !rows[0].actif) {
      throw new HttpError(400, `Le responsable choisi pour « ${fonction.toLowerCase()} » est invalide ou inactif`);
    }
  }
}

function colonnesEcriture(d) {
  const t1 = colonnesTelephone(d.telephone), t2 = colonnesTelephone(d.telephone2);
  return {
    nom: d.nom.toUpperCase(), prenoms: d.prenoms, sexe: d.sexe, date_naissance: d.date_naissance || null,
    telephone_chiffre: t1.chiffre, telephone_index: t1.index, telephone_suffixe: t1.suffixe,
    telephone2_chiffre: t2.chiffre, telephone2_index: t2.index,
    email: d.email?.toLowerCase() || null, adresse: d.adresse, repere: d.repere,
    quartier_id: d.quartier_id, secteur_id: d.secteur_id || null,
    latitude: d.latitude ?? null, longitude: d.longitude ?? null,
    coordonnateur_id: d.coordonnateur_id || null, superviseur_id: d.superviseur_id || null, commissaire_id: d.commissaire_id || null,
    source: d.source || null, observations: d.observations,
    information_personne: d.information_personne,
  };
}

async function avertissementsGps(client, d) {
  if (d.latitude == null) return [];
  const { rows } = await client.query(
    `SELECT ST_Contains(geom, ST_SetSRID(ST_MakePoint($2, $3), 4326)) AS dedans FROM quartiers WHERE id = $1`,
    [d.quartier_id, d.longitude, d.latitude]);
  return rows[0]?.dedans === false ? ['Les coordonnées GPS sont en dehors des limites du quartier sélectionné'] : [];
}

// ---------------------------------------------------------------------
// POST /militants — création
// ---------------------------------------------------------------------
router.post('/', exiger('militants:ecrire'), asyncH(async (req, res) => {
  const d = schemaMilitant.parse(req.body);
  const forcer = req.query.forcer === 'true';
  if (!(await verifierAccesQuartier(req.user, d.quartier_id))) throw new HttpError(403, 'Ce quartier est hors de votre périmètre');

  const result = await transaction(req.user, async (client) => {
    await verifierResponsables(client, d);
    if (!forcer) {
      const doublons = await chercherDoublons(client, d);
      if (doublons.length) throw new HttpError(409, 'Doublon potentiel détecté', 'DOUBLON', { doublons });
    }
    const chaine = await chaineParDefaut(client, d.quartier_id);
    const cols = colonnesEcriture(d);
    for (const k of ['coordonnateur_id', 'superviseur_id', 'commissaire_id']) cols[k] = cols[k] || chaine[k];
    const valide = can(req.user.role, 'militants:valider');
    Object.assign(cols, {
      commune_id: (await client.query('SELECT commune_id FROM quartiers WHERE id = $1', [d.quartier_id])).rows[0].commune_id,
      statut: valide ? 'ACTIF' : 'EN_ATTENTE',
      valide_par: valide ? req.user.id : null, valide_le: valide ? new Date() : null,
      date_enregistrement: d.date_enregistrement || new Date().toISOString().slice(0, 10),
      information_date: d.information_personne ? new Date().toISOString().slice(0, 10) : null,
      created_by: req.user.id, updated_by: req.user.id,
    });
    const keys = Object.keys(cols);
    const { rows } = await client.query(
      `INSERT INTO militants (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id, numero, statut`,
      keys.map((k) => cols[k]));
    return { ...rows[0], avertissements: await avertissementsGps(client, d) };
  });
  await journaliser(req, 'MILITANT_CREATION', { entite: 'militant', entiteId: result.id, details: { numero: result.numero, forcer } });
  res.status(201).json(result);
}));

// ---------------------------------------------------------------------
// Chargement d'une fiche avec contrôle de périmètre
// ---------------------------------------------------------------------
async function chargerFiche(req, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, 'Fiche introuvable');
  const { rows } = await query(
    `SELECT m.*, c.nom AS commune, q.nom AS quartier, s.nom AS secteur,
            date_part('year', age(m.date_naissance))::int AS age,
            (co.prenoms || ' ' || co.nom) AS coordonnateur, (su.prenoms || ' ' || su.nom) AS superviseur,
            (cm.prenoms || ' ' || cm.nom) AS commissaire,
            md.libelle AS motif_libelle, sc.libelle AS source_libelle,
            (uc.prenoms || ' ' || uc.nom) AS cree_par, (uu.prenoms || ' ' || uu.nom) AS modifie_par,
            (uv.prenoms || ' ' || uv.nom) AS valide_par_nom
     FROM militants m
     JOIN communes c ON c.id = m.commune_id JOIN quartiers q ON q.id = m.quartier_id
     LEFT JOIN secteurs s ON s.id = m.secteur_id
     LEFT JOIN responsables co ON co.id = m.coordonnateur_id
     LEFT JOIN responsables su ON su.id = m.superviseur_id
     LEFT JOIN responsables cm ON cm.id = m.commissaire_id
     LEFT JOIN motifs_desactivation md ON md.code = m.motif_desactivation
     LEFT JOIN sources_collecte sc ON sc.code = m.source
     LEFT JOIN utilisateurs uc ON uc.id = m.created_by
     LEFT JOIN utilisateurs uu ON uu.id = m.updated_by
     LEFT JOIN utilisateurs uv ON uv.id = m.valide_par
     WHERE m.id = $1`, [id]);
  const m = rows[0];
  if (!m) throw new HttpError(404, 'Fiche introuvable');
  if (!(await verifierAccesQuartier(req.user, m.quartier_id))) throw new HttpError(404, 'Fiche introuvable');
  return m;
}

function presenterFiche(m, user) {
  const pii = can(user.role, 'militants:pii');
  const out = { ...m };
  for (const k of ['telephone_chiffre', 'telephone_index', 'telephone2_chiffre', 'telephone2_index', 'recherche', 'identite_norm', 'geom']) delete out[k];
  out.telephone = pii ? dechiffrer(m.telephone_chiffre) : null;
  out.telephone2 = pii ? dechiffrer(m.telephone2_chiffre) : null;
  if (!pii) { out.adresse = null; out.repere = null; out.latitude = null; out.longitude = null; out.email = null; }
  return out;
}

router.get('/:id', exiger('militants:lire'), asyncH(async (req, res) => {
  const m = await chargerFiche(req, req.params.id);
  await journaliser(req, 'MILITANT_CONSULTATION', { entite: 'militant', entiteId: m.id });
  res.json(presenterFiche(m, req.user));
}));

router.get('/:id/historique', exiger('militants:lire'), asyncH(async (req, res) => {
  const m = await chargerFiche(req, req.params.id);
  const { rows } = await query(
    `SELECT h.id, h.operation, h.modifie_le, h.champs, h.avant, h.apres, (u.prenoms || ' ' || u.nom) AS auteur
     FROM militants_historique h LEFT JOIN utilisateurs u ON u.id = h.utilisateur_id
     WHERE h.militant_id = $1 ORDER BY h.modifie_le DESC, h.id DESC LIMIT 100`, [m.id]);
  res.json(rows);
}));

// ---------------------------------------------------------------------
// PUT /militants/:id — modification avec verrou optimiste (version)
// ---------------------------------------------------------------------
router.put('/:id', exiger('militants:ecrire'), asyncH(async (req, res) => {
  const m = await chargerFiche(req, req.params.id);
  const d = schemaMilitant.parse(req.body);
  const version = z.coerce.number().int().parse(req.body.version);
  if (version !== m.version) throw new HttpError(409, 'Cette fiche a été modifiée par un autre utilisateur. Rechargez-la.', 'VERSION');
  if (!(await verifierAccesQuartier(req.user, d.quartier_id))) throw new HttpError(403, 'Ce quartier est hors de votre périmètre');
  // Le numéro existant est conservé si le champ n'a pas été ressaisi (masqué côté client)
  if (req.body.telephone === undefined) d.telephone = dechiffrer(m.telephone_chiffre);
  if (req.body.telephone2 === undefined) d.telephone2 = dechiffrer(m.telephone2_chiffre);
  const result = await transaction(req.user, async (client) => {
    await verifierResponsables(client, d);
    if (req.query.forcer !== 'true') {
      const doublons = await chercherDoublons(client, d, m.id);
      if (doublons.length) throw new HttpError(409, 'Doublon potentiel détecté', 'DOUBLON', { doublons });
    }
    const cols = colonnesEcriture(d);
    // Responsables non précisés : on garde l'affectation existante, ou la chaîne du nouveau quartier
    const chaine = d.quartier_id !== m.quartier_id ? await chaineParDefaut(client, d.quartier_id) : m;
    for (const k of ['coordonnateur_id', 'superviseur_id', 'commissaire_id']) if (!cols[k]) cols[k] = chaine[k] ?? null;
    cols.commune_id = (await client.query('SELECT commune_id FROM quartiers WHERE id = $1', [d.quartier_id])).rows[0].commune_id;
    if (d.information_personne && !m.information_personne) cols.information_date = new Date().toISOString().slice(0, 10);
    // Une fiche « à vérifier » corrigée repasse en attente de validation
    if (m.statut === 'A_VERIFIER') cols.statut = can(req.user.role, 'militants:valider') ? 'ACTIF' : 'EN_ATTENTE';
    cols.updated_by = req.user.id;
    const keys = Object.keys(cols);
    await client.query(
      `UPDATE militants SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1`,
      [m.id, ...keys.map((k) => cols[k])]);
    return { id: m.id, avertissements: await avertissementsGps(client, d) };
  });
  await journaliser(req, 'MILITANT_MODIFICATION', { entite: 'militant', entiteId: m.id });
  res.json(result);
}));

// ---------------------------------------------------------------------
// Workflow de statut
// ---------------------------------------------------------------------
async function changerStatut(req, statut, { motif = null, attendu = null, action }) {
  const m = await chargerFiche(req, req.params.id);
  if (attendu && !attendu.includes(m.statut)) throw new HttpError(409, `Opération impossible depuis le statut « ${m.statut} »`);
  await transaction(req.user, (client) => client.query(
    `UPDATE militants SET statut = $2::statut_militant, motif_desactivation = $3, updated_by = $4,
       valide_par = CASE WHEN $2 = 'ACTIF' THEN $4 ELSE valide_par END,
       valide_le  = CASE WHEN $2 = 'ACTIF' THEN now() ELSE valide_le END,
       observations = CASE WHEN $5::text IS NULL THEN observations ELSE concat_ws(E'\n', observations, $5::text) END
     WHERE id = $1`, [m.id, statut, motif, req.user.id, req.body?.commentaire ? `[${new Date().toISOString().slice(0, 10)}] ${String(req.body.commentaire).slice(0, 500)}` : null]));
  await journaliser(req, action, { entite: 'militant', entiteId: m.id, details: motif ? { motif } : null });
  return { id: m.id, statut };
}

router.post('/:id/valider', exiger('militants:valider'), asyncH(async (req, res) => {
  res.json(await changerStatut(req, 'ACTIF', { attendu: ['EN_ATTENTE', 'A_VERIFIER'], action: 'MILITANT_VALIDATION' }));
}));
router.post('/:id/a-verifier', exiger('militants:ecrire'), asyncH(async (req, res) => {
  res.json(await changerStatut(req, 'A_VERIFIER', { attendu: ['EN_ATTENTE', 'ACTIF'], action: 'MILITANT_A_VERIFIER' }));
}));
router.post('/:id/desactiver', exiger('militants:desactiver'), asyncH(async (req, res) => {
  const { motif } = z.object({ motif: z.string().min(1, 'Motif obligatoire'), commentaire: z.string().max(500).optional() }).parse(req.body);
  const ok = await query('SELECT 1 FROM motifs_desactivation WHERE code = $1 AND actif', [motif]);
  if (!ok.rowCount) throw new HttpError(400, 'Motif de désactivation inconnu');
  res.json(await changerStatut(req, 'INACTIF', { motif, attendu: ['EN_ATTENTE', 'ACTIF', 'A_VERIFIER'], action: 'MILITANT_DESACTIVATION' }));
}));
router.post('/:id/reactiver', exiger('militants:desactiver'), asyncH(async (req, res) => {
  res.json(await changerStatut(req, 'ACTIF', { attendu: ['INACTIF'], action: 'MILITANT_REACTIVATION' }));
}));
