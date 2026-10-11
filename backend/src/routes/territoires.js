import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { asyncH, HttpError } from '../errors.js';
import { exiger, restreindrePerimetre } from '../auth.js';
import { Where } from '../sql.js';
import { journaliser } from '../audit.js';

export const router = Router();

/** GET /territoires — référentiel communes > quartiers > secteurs du périmètre. */
router.get('/', asyncH(async (req, res) => {
  const w = new Where();
  restreindrePerimetre(w, req.user, 'q', { quartierCol: 'id' });
  const { rows } = await query(`
    SELECT c.id, c.code, c.nom, c.nom_court, c.objectif_militants, c.actif,
      json_agg(json_build_object('id', q.id, 'code', q.code, 'nom', q.nom, 'objectif_militants', q.objectif_militants, 'actif', q.actif,
        'secteurs', coalesce((SELECT json_agg(json_build_object('id', s.id, 'code', s.code, 'nom', s.nom, 'actif', s.actif) ORDER BY s.nom)
                              FROM secteurs s WHERE s.quartier_id = q.id), '[]'::json))
        ORDER BY q.nom) AS quartiers
    FROM communes c JOIN quartiers q ON q.commune_id = c.id
    ${w} GROUP BY c.id ORDER BY c.nom`, w.params);
  res.json(rows);
}));

const schemaQuartier = z.object({
  nom: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,12}$/).optional(),
  commune_id: z.coerce.number().int().positive(),
  objectif_militants: z.coerce.number().int().min(0).max(100000).default(0),
  actif: z.boolean().default(true),
});

router.put('/communes/:id', exiger('territoires:gerer'), asyncH(async (req, res) => {
  const d = z.object({ objectif_militants: z.coerce.number().int().min(0).max(1000000), nom_court: z.string().trim().min(2).max(30).optional() }).parse(req.body);
  const { rowCount } = await query('UPDATE communes SET objectif_militants = $2, nom_court = coalesce($3, nom_court), updated_at = now() WHERE id = $1',
    [req.params.id, d.objectif_militants, d.nom_court || null]);
  if (!rowCount) throw new HttpError(404, 'Commune introuvable');
  await journaliser(req, 'TERRITOIRE_MODIFICATION', { entite: 'commune', entiteId: req.params.id, details: d });
  res.json({ ok: true });
}));

router.post('/quartiers', exiger('territoires:gerer'), asyncH(async (req, res) => {
  const d = schemaQuartier.parse(req.body);
  const { rows: [c] } = await query('SELECT code FROM communes WHERE id = $1', [d.commune_id]);
  if (!c) throw new HttpError(400, 'Commune inconnue');
  const code = d.code || `${c.code}-${String((await query('SELECT count(*)::int + 1 AS n FROM quartiers WHERE commune_id = $1', [d.commune_id])).rows[0].n).padStart(2, '0')}`;
  const { rows } = await query(
    'INSERT INTO quartiers (commune_id, code, nom, objectif_militants, actif) VALUES ($1,$2,$3,$4,$5) RETURNING id, code',
    [d.commune_id, code, d.nom, d.objectif_militants, d.actif]);
  await journaliser(req, 'TERRITOIRE_CREATION', { entite: 'quartier', entiteId: rows[0].id, details: { nom: d.nom } });
  res.status(201).json(rows[0]);
}));

router.put('/quartiers/:id', exiger('territoires:gerer'), asyncH(async (req, res) => {
  const d = schemaQuartier.omit({ commune_id: true, code: true }).parse(req.body);
  const { rowCount } = await query('UPDATE quartiers SET nom = $2, objectif_militants = $3, actif = $4, updated_at = now() WHERE id = $1',
    [req.params.id, d.nom, d.objectif_militants, d.actif]);
  if (!rowCount) throw new HttpError(404, 'Quartier introuvable');
  await journaliser(req, 'TERRITOIRE_MODIFICATION', { entite: 'quartier', entiteId: req.params.id, details: d });
  res.json({ ok: true });
}));

router.post('/secteurs', exiger('territoires:gerer'), asyncH(async (req, res) => {
  const d = z.object({ quartier_id: z.coerce.number().int().positive(), nom: z.string().trim().min(1).max(120) }).parse(req.body);
  const { rows: [q] } = await query('SELECT code, (SELECT count(*)::int + 1 FROM secteurs WHERE quartier_id = $1) AS n FROM quartiers WHERE id = $1', [d.quartier_id]);
  if (!q) throw new HttpError(400, 'Quartier inconnu');
  const { rows } = await query('INSERT INTO secteurs (quartier_id, code, nom) VALUES ($1,$2,$3) RETURNING id, code',
    [d.quartier_id, `${q.code}-S${q.n}`, d.nom]);
  await journaliser(req, 'TERRITOIRE_CREATION', { entite: 'secteur', entiteId: rows[0].id, details: d });
  res.status(201).json(rows[0]);
}));

/**
 * POST /territoires/geometries — remplace les limites par un GeoJSON validé
 * (features avec properties.niveau = commune|quartier et properties.code).
 */
export async function importerGeometries(geojson, user = null) {
  const schema = z.object({ type: z.literal('FeatureCollection'), features: z.array(z.object({
    properties: z.object({ niveau: z.enum(['commune', 'quartier', 'secteur']), code: z.string() }).passthrough(),
    geometry: z.object({ type: z.enum(['Polygon', 'MultiPolygon']) }).passthrough(),
  })).min(1).max(5000) });
  const g = schema.parse(geojson);
  return transaction(user, async (client) => {
    const res = { communes: 0, quartiers: 0, secteurs: 0, inconnus: [] };
    for (const f of g.features) {
      const table = { commune: 'communes', quartier: 'quartiers', secteur: 'secteurs' }[f.properties.niveau];
      const { rowCount } = await client.query(
        `UPDATE ${table} SET geom = ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))) WHERE code = $1`,
        [f.properties.code, JSON.stringify(f.geometry)]);
      if (rowCount) res[table] += 1; else res.inconnus.push(f.properties.code);
    }
    return res;
  });
}

router.post('/geometries', exiger('territoires:gerer'), asyncH(async (req, res) => {
  const r = await importerGeometries(req.body, req.user);
  await journaliser(req, 'TERRITOIRE_GEOMETRIES', { details: r });
  res.json(r);
}));
