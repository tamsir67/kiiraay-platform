import { Router } from 'express';
import { query } from '../db.js';
import { asyncH } from '../errors.js';
import { exiger, restreindrePerimetre } from '../auth.js';
import { filtresMilitants, schemaFiltres } from '../filtres.js';
import { Where } from '../sql.js';
import { config } from '../config.js';

export const router = Router();

/**
 * GET /carte/territoires — GeoJSON communes + quartiers avec indicateurs
 * de couverture (CDC §9). Accessible à tous les profils « dashboard ».
 */
router.get('/territoires', exiger('dashboard'), asyncH(async (req, res) => {
  const f = schemaFiltres.parse(req.query);
  const stock = filtresMilitants({ ...f, commune: undefined, quartier: undefined }, req.user, { periode: false, statutParDefaut: 'ACTIF' });
  const wq = new Where([...stock.params]);
  restreindrePerimetre(wq, req.user, 'q', { quartierCol: 'id' });
  wq.raw('q.actif AND q.geom IS NOT NULL');
  const { rows: quartiers } = await query(`
    SELECT json_build_object('type','Feature','geometry', ST_AsGeoJSON(q.geom, 6)::json,
      'properties', json_build_object('niveau','quartier','id',q.id,'code',q.code,'nom',q.nom,'commune_id',q.commune_id,
        'commune',c.nom,'objectif',q.objectif_militants,'actifs',coalesce(s.n,0),'nb_commissaires',e.nb_commissaires,
        'centre', ARRAY[ST_X(ST_PointOnSurface(q.geom)), ST_Y(ST_PointOnSurface(q.geom))])) AS f
    FROM quartiers q JOIN communes c ON c.id = q.commune_id
    JOIN v_quartiers_encadrement e ON e.quartier_id = q.id
    LEFT JOIN (SELECT m.quartier_id, count(*) AS n FROM militants m ${stock} GROUP BY 1) s ON s.quartier_id = q.id
    ${wq}`, wq.params);
  const communesVisibles = [...new Set(quartiers.map((r) => r.f.properties.commune_id))];
  const { rows: communes } = await query(`
    SELECT json_build_object('type','Feature','geometry', ST_AsGeoJSON(c.geom, 6)::json,
      'properties', json_build_object('niveau','commune','id',c.id,'code',c.code,'nom',c.nom,'objectif',c.objectif_militants,
        'centre', ARRAY[ST_X(ST_PointOnSurface(c.geom)), ST_Y(ST_PointOnSurface(c.geom))])) AS f
    FROM communes c WHERE c.id = ANY($1::smallint[]) AND c.geom IS NOT NULL`, [communesVisibles]);
  // Agrégation communale depuis les quartiers
  for (const c of communes) {
    const qs = quartiers.filter((q) => q.f.properties.commune_id === c.f.properties.id);
    c.f.properties.actifs = qs.reduce((s, q) => s + q.f.properties.actifs, 0);
  }
  res.json({ type: 'FeatureCollection', features: [...communes.map((r) => r.f), ...quartiers.map((r) => r.f)] });
}));

/**
 * GET /carte/points — positions des militants géolocalisés (format compact).
 * Réservé aux profils autorisés à voir les positions précises (CDC §9).
 * Aucune donnée nominative n'est renvoyée.
 */
router.get('/points', exiger('carte:points'), asyncH(async (req, res) => {
  const f = schemaFiltres.parse(req.query);
  const w = filtresMilitants(f, req.user, { periode: true, statutParDefaut: 'ACTIF' });
  w.raw('m.geom IS NOT NULL');
  const { rows } = await query(
    `SELECT m.id, m.longitude::float8 AS x, m.latitude::float8 AS y, m.statut FROM militants m ${w} LIMIT ${config.exportMaxRows}`, w.params);
  res.json({ total: rows.length, points: rows.map((r) => [r.x, r.y, r.statut, r.id]) });
}));
