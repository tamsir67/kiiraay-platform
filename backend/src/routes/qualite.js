import { Router } from 'express';
import { z } from 'zod';
import { pool, query, transaction } from '../db.js';
import { asyncH, HttpError } from '../errors.js';
import { exiger, verifierAccesQuartier } from '../auth.js';
import { filtresMilitants, schemaFiltres } from '../filtres.js';
import { sqlPairesDoublons } from '../qualite.js';
import { journaliser } from '../audit.js';

export const router = Router();

/** GET /qualite/doublons — paires de doublons potentiels avec détail des deux fiches. */
router.get('/doublons', exiger('qualite'), asyncH(async (req, res) => {
  const f = schemaFiltres.parse(req.query);
  const w = filtresMilitants({ ...f, statut: undefined }, req.user, { periode: false });
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query('SET LOCAL pg_trgm.similarity_threshold = 0.9');
    const { rows } = await client.query(`
      WITH p AS (${sqlPairesDoublons(w)})
      SELECT p.motif, p.score,
        json_build_object('id', a.id, 'numero', a.numero, 'nom', a.nom, 'prenoms', a.prenoms, 'sexe', a.sexe, 'date_naissance', a.date_naissance,
          'quartier', qa.nom, 'statut', a.statut, 'date_enregistrement', a.date_enregistrement, 'telephone_suffixe', a.telephone_suffixe, 'adresse', a.adresse) AS a,
        json_build_object('id', b.id, 'numero', b.numero, 'nom', b.nom, 'prenoms', b.prenoms, 'sexe', b.sexe, 'date_naissance', b.date_naissance,
          'quartier', qb.nom, 'statut', b.statut, 'date_enregistrement', b.date_enregistrement, 'telephone_suffixe', b.telephone_suffixe, 'adresse', b.adresse) AS b
      FROM p JOIN militants a ON a.id = p.id_a JOIN militants b ON b.id = p.id_b
      JOIN quartiers qa ON qa.id = a.quartier_id JOIN quartiers qb ON qb.id = b.quartier_id
      ORDER BY p.score DESC, a.nom LIMIT 200`, w.params);
    await client.query('COMMIT');
    res.json(rows);
  } finally { client.release(); }
}));

const paire = z.object({ a: z.string().uuid(), b: z.string().uuid() });

async function controlerPaire(req, a, b) {
  const { rows } = await query('SELECT id, quartier_id, statut FROM militants WHERE id = ANY($1::uuid[])', [[a, b]]);
  if (rows.length !== 2) throw new HttpError(404, 'Fiches introuvables');
  for (const r of rows) if (!(await verifierAccesQuartier(req.user, r.quartier_id))) throw new HttpError(404, 'Fiches introuvables');
  return rows;
}

/** POST /qualite/doublons/ecarter — la paire n'est pas un doublon. */
router.post('/doublons/ecarter', exiger('qualite'), asyncH(async (req, res) => {
  const { a, b } = paire.parse(req.body);
  await controlerPaire(req, a, b);
  const [x, y] = [a, b].sort();
  await query('INSERT INTO doublons_ecartes (militant_a, militant_b, ecarte_par) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [x, y, req.user.id]);
  await journaliser(req, 'DOUBLON_ECARTE', { entite: 'militant', entiteId: x, details: { autre: y } });
  res.json({ ok: true });
}));

/** POST /qualite/doublons/resoudre — conserve une fiche, désactive l'autre (motif DOUBLON). */
router.post('/doublons/resoudre', exiger('qualite', 'militants:ecrire'), asyncH(async (req, res) => {
  const { conserver, desactiver } = z.object({ conserver: z.string().uuid(), desactiver: z.string().uuid() }).parse(req.body);
  await controlerPaire(req, conserver, desactiver);
  await transaction(req.user, async (client) => {
    const { rows: [k] } = await client.query('SELECT numero FROM militants WHERE id = $1', [conserver]);
    await client.query(
      `UPDATE militants SET statut = 'INACTIF', motif_desactivation = 'DOUBLON', updated_by = $2,
         observations = concat_ws(E'\\n', observations, $3::text) WHERE id = $1`,
      [desactiver, req.user.id, `Doublon de ${k.numero}`]);
  });
  await journaliser(req, 'DOUBLON_RESOLU', { entite: 'militant', entiteId: desactiver, details: { conserve: conserver } });
  res.json({ ok: true });
}));
