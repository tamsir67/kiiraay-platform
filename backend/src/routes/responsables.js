import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { asyncH, HttpError } from '../errors.js';
import { exiger, verifierAccesQuartier } from '../auth.js';
import { colonnesTelephone, dechiffrer } from '../crypto.js';
import { journaliser } from '../audit.js';
import { can, normaliserTelephone } from '../../../shared/referentiel.js';

export const router = Router();

/** Un responsable est visible si l'un de ses périmètres croise celui de l'utilisateur. */
function clausePerimetre(user, params) {
  if (user.global) return 'true';
  params.push(user.communes, user.quartiers);
  const c = `$${params.length - 1}::smallint[]`, q = `$${params.length}::int[]`;
  return `EXISTS (SELECT 1 FROM responsable_perimetres rp LEFT JOIN quartiers qq ON qq.id = rp.quartier_id
                  WHERE rp.responsable_id = r.id AND (rp.commune_id = ANY(${c}) OR rp.quartier_id = ANY(${q})
                     OR (rp.quartier_id IS NULL AND EXISTS (SELECT 1 FROM quartiers q3 WHERE q3.commune_id = rp.commune_id AND q3.id = ANY(${q})))))`;
}

router.get('/', exiger('dashboard'), asyncH(async (req, res) => {
  const f = z.object({ fonction: z.enum(['COORDONNATEUR', 'SUPERVISEUR', 'COMMISSAIRE']).optional(),
    commune: z.coerce.number().int().optional(), inclure_inactifs: z.enum(['true', 'false']).optional() }).parse(req.query);
  const params = [];
  const conds = [clausePerimetre(req.user, params)];
  if (f.fonction) { params.push(f.fonction); conds.push(`r.fonction = $${params.length}`); }
  if (f.commune) { params.push(f.commune); conds.push(`EXISTS (SELECT 1 FROM responsable_perimetres p2 WHERE p2.responsable_id = r.id AND p2.commune_id = $${params.length})`); }
  if (f.inclure_inactifs !== 'true') conds.push('r.actif');
  const { rows } = await query(`
    SELECT r.id, r.fonction, r.nom, r.prenoms, r.sexe, r.actif, r.parent_id, r.telephone_chiffre,
           (p.prenoms || ' ' || p.nom) AS parent,
           coalesce((SELECT json_agg(json_build_object('commune_id', rp.commune_id, 'commune', c.nom, 'quartier_id', rp.quartier_id, 'quartier', q.nom) ORDER BY c.nom, q.nom)
             FROM responsable_perimetres rp JOIN communes c ON c.id = rp.commune_id LEFT JOIN quartiers q ON q.id = rp.quartier_id
             WHERE rp.responsable_id = r.id), '[]') AS perimetres,
           (SELECT count(*) FROM militants m WHERE m.statut = 'ACTIF' AND
               CASE r.fonction WHEN 'COMMISSAIRE' THEN m.commissaire_id WHEN 'SUPERVISEUR' THEN m.superviseur_id ELSE m.coordonnateur_id END = r.id)::int AS effectif,
           (SELECT u.identifiant FROM utilisateurs u WHERE u.responsable_id = r.id LIMIT 1) AS compte
    FROM responsables r LEFT JOIN responsables p ON p.id = r.parent_id
    WHERE ${conds.join(' AND ')}
    ORDER BY array_position(ARRAY['COORDONNATEUR','SUPERVISEUR','COMMISSAIRE']::fonction_responsable[], r.fonction), r.nom`, params);
  const pii = can(req.user.role, 'militants:pii');
  res.json(rows.map(({ telephone_chiffre, ...r }) => ({ ...r, telephone: pii ? dechiffrer(telephone_chiffre) : null })));
}));

const schemaResponsable = z.object({
  fonction: z.enum(['COORDONNATEUR', 'SUPERVISEUR', 'COMMISSAIRE']),
  nom: z.string().trim().min(1).max(80),
  prenoms: z.string().trim().min(1).max(120),
  sexe: z.enum(['M', 'F']).optional().nullable(),
  telephone: z.string().optional().nullable().refine((t) => !t || normaliserTelephone(t), 'Numéro invalide'),
  parent_id: z.coerce.number().int().positive().optional().nullable(),
  perimetres: z.array(z.object({ commune_id: z.coerce.number().int().positive(), quartier_id: z.coerce.number().int().positive().nullable().optional() })).min(1, 'Au moins un périmètre'),
});

async function valider(client, d, user) {
  const parentAttendu = { COORDONNATEUR: null, SUPERVISEUR: 'COORDONNATEUR', COMMISSAIRE: 'SUPERVISEUR' }[d.fonction];
  if (parentAttendu && d.parent_id) {
    const { rows } = await client.query('SELECT fonction FROM responsables WHERE id = $1 AND actif', [d.parent_id]);
    if (rows[0]?.fonction !== parentAttendu) throw new HttpError(400, `Le responsable hiérarchique doit être un ${parentAttendu.toLowerCase()}`);
  }
  if (!parentAttendu) d.parent_id = null;
  for (const p of d.perimetres) {
    if (d.fonction !== 'COORDONNATEUR' && !p.quartier_id) throw new HttpError(400, 'Superviseurs et commissaires sont affectés à des quartiers');
    if (p.quartier_id) {
      const { rows } = await client.query('SELECT commune_id FROM quartiers WHERE id = $1', [p.quartier_id]);
      if (rows[0]?.commune_id !== p.commune_id) throw new HttpError(400, 'Quartier et commune incohérents');
      if (!(await verifierAccesQuartier(user, p.quartier_id))) throw new HttpError(403, 'Périmètre hors de vos droits');
    } else if (!user.global && !user.communes.includes(p.commune_id)) {
      throw new HttpError(403, 'Périmètre hors de vos droits');
    }
  }
}

async function ecrirePerimetres(client, id, perimetres) {
  await client.query('DELETE FROM responsable_perimetres WHERE responsable_id = $1', [id]);
  for (const p of perimetres) {
    await client.query('INSERT INTO responsable_perimetres (responsable_id, commune_id, quartier_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [id, p.commune_id, p.quartier_id || null]);
  }
}

router.post('/', exiger('responsables:gerer'), asyncH(async (req, res) => {
  const d = schemaResponsable.parse(req.body);
  const id = await transaction(req.user, async (client) => {
    await valider(client, d, req.user);
    const t = colonnesTelephone(d.telephone);
    const { rows } = await client.query(
      `INSERT INTO responsables (fonction, nom, prenoms, sexe, telephone_chiffre, telephone_index, parent_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [d.fonction, d.nom.toUpperCase(), d.prenoms, d.sexe || null, t.chiffre, t.index, d.parent_id || null]);
    await ecrirePerimetres(client, rows[0].id, d.perimetres);
    return rows[0].id;
  });
  await journaliser(req, 'RESPONSABLE_CREATION', { entite: 'responsable', entiteId: id, details: { fonction: d.fonction } });
  res.status(201).json({ id });
}));

router.put('/:id', exiger('responsables:gerer'), asyncH(async (req, res) => {
  const d = schemaResponsable.extend({ actif: z.boolean().default(true) }).parse(req.body);
  await transaction(req.user, async (client) => {
    await valider(client, d, req.user);
    const t = colonnesTelephone(d.telephone);
    const { rowCount } = await client.query(
      `UPDATE responsables SET fonction=$2, nom=$3, prenoms=$4, sexe=$5, telephone_chiffre=$6, telephone_index=$7,
         parent_id=$8, actif=$9, updated_at=now() WHERE id=$1`,
      [req.params.id, d.fonction, d.nom.toUpperCase(), d.prenoms, d.sexe || null, t.chiffre, t.index, d.parent_id || null, d.actif]);
    if (!rowCount) throw new HttpError(404, 'Responsable introuvable');
    await ecrirePerimetres(client, req.params.id, d.perimetres);
  });
  await journaliser(req, 'RESPONSABLE_MODIFICATION', { entite: 'responsable', entiteId: req.params.id });
  res.json({ ok: true });
}));

/**
 * POST /responsables/reaffecter — applique la chaîne par défaut aux militants
 * d'un quartier (après changement de commissaire par exemple).
 */
router.post('/reaffecter', exiger('responsables:gerer'), asyncH(async (req, res) => {
  const { quartier_id } = z.object({ quartier_id: z.coerce.number().int().positive() }).parse(req.body);
  if (!(await verifierAccesQuartier(req.user, quartier_id))) throw new HttpError(403, 'Hors périmètre');
  const n = await transaction(req.user, async (client) => {
    const { rowCount } = await client.query(`
      WITH ch AS (
        SELECT
          (SELECT r.id FROM responsables r JOIN responsable_perimetres p ON p.responsable_id = r.id
            WHERE r.actif AND r.fonction='COMMISSAIRE' AND p.quartier_id=$1 ORDER BY r.id LIMIT 1) AS com,
          (SELECT r.id FROM responsables r JOIN responsable_perimetres p ON p.responsable_id = r.id
            WHERE r.actif AND r.fonction='SUPERVISEUR' AND p.quartier_id=$1 ORDER BY r.id LIMIT 1) AS sup,
          (SELECT r.id FROM responsables r JOIN responsable_perimetres p ON p.responsable_id = r.id JOIN quartiers q ON q.commune_id=p.commune_id AND q.id=$1
            WHERE r.actif AND r.fonction='COORDONNATEUR' ORDER BY r.id LIMIT 1) AS coo)
      UPDATE militants m SET commissaire_id = ch.com, superviseur_id = ch.sup, coordonnateur_id = ch.coo, updated_by = $2
      FROM ch WHERE m.quartier_id = $1 AND m.statut <> 'INACTIF'
        AND (m.commissaire_id IS DISTINCT FROM ch.com OR m.superviseur_id IS DISTINCT FROM ch.sup OR m.coordonnateur_id IS DISTINCT FROM ch.coo)`,
    [quartier_id, req.user.id]);
    return rowCount;
  });
  await journaliser(req, 'RESPONSABLE_REAFFECTATION', { entite: 'quartier', entiteId: quartier_id, details: { fiches: n } });
  res.json({ fiches_mises_a_jour: n });
}));
