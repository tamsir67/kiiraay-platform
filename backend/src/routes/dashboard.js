import { Router } from 'express';
import { pool } from '../db.js';
import { asyncH } from '../errors.js';
import { exiger, restreindrePerimetre } from '../auth.js';
import { filtresMilitants, schemaFiltres } from '../filtres.js';
import { Where } from '../sql.js';
import { CONDITION_A_METTRE_A_JOUR, sqlPairesDoublons } from '../qualite.js';

export const router = Router();

const iso = (d) => d.toISOString().slice(0, 10);

/**
 * GET /dashboard — indicateurs consolidés (CDC §7).
 * Filtres : commune, quartier, responsable, statut (défaut ACTIF), sexe,
 * période du/au (défaut : 30 derniers jours) pour les flux (inscriptions, MAJ).
 */
router.get('/', exiger('dashboard'), asyncH(async (req, res) => {
  const f = schemaFiltres.parse(req.query);
  const au = f.au || iso(new Date());
  const du = f.du || iso(new Date(Date.now() - 30 * 86400000));
  const u = req.user;

  // Stock (sans filtre de période), statut ACTIF par défaut
  const stock = filtresMilitants(f, u, { periode: false, statutParDefaut: 'ACTIF' });
  // Toutes fiches non désactivées (qualité)
  const vivantes = filtresMilitants({ ...f, statut: undefined }, u, { periode: false });
  vivantes.raw("m.statut <> 'INACTIF'");
  // Quartiers du périmètre (offset = paramètres déjà utilisés par la requête)
  const whereQuartiers = (base = []) => {
    const w = new Where([...base]);
    restreindrePerimetre(w, u, 'q', { quartierCol: 'id' });
    if (f.commune) w.add('q.commune_id = ?', f.commune);
    if (f.quartier) w.add('q.id = ?', f.quartier);
    return w.raw('q.actif');
  };
  const wq = whereQuartiers();

  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query('SET LOCAL pg_trgm.similarity_threshold = 0.9');
    const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

    const [kpi] = await q(`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE m.date_enregistrement < $${stock.params.length + 1}::date)::int AS total_debut,
             count(*) FILTER (WHERE m.date_enregistrement BETWEEN $${stock.params.length + 1}::date AND $${stock.params.length + 2}::date)::int AS nouvelles,
             count(DISTINCT m.commune_id)::int AS communes_couvertes,
             count(*) FILTER (WHERE m.sexe = 'F')::int AS femmes,
             count(*) FILTER (WHERE m.sexe = 'M')::int AS hommes
      FROM militants m ${stock}`, [...stock.params, du, au]);

    const [flux] = await q(`
      SELECT count(*) FILTER (WHERE m.statut = 'EN_ATTENTE')::int AS en_attente,
             count(*) FILTER (WHERE m.updated_at::date BETWEEN $${vivantes.params.length + 1} AND $${vivantes.params.length + 2}
                              AND m.updated_at > m.created_at + interval '1 minute')::int AS mises_a_jour,
             count(*) FILTER (WHERE ${CONDITION_A_METTRE_A_JOUR('m')})::int AS a_mettre_a_jour,
             count(*) FILTER (WHERE m.geom IS NULL)::int AS sans_gps,
             count(*) FILTER (WHERE NOT m.information_personne)::int AS sans_information,
             count(*) FILTER (WHERE m.commissaire_id IS NULL)::int AS sans_commissaire
      FROM militants m ${vivantes}`, [...vivantes.params, du, au]);

    const parCommune = await q(`
      SELECT c.id, c.code, c.nom, c.nom_court, c.objectif_militants AS objectif,
             count(m.id)::int AS actifs,
             count(m.id) FILTER (WHERE m.sexe = 'F')::int AS femmes,
             count(m.id) FILTER (WHERE m.date_enregistrement BETWEEN $${stock.params.length + 1}::date AND $${stock.params.length + 2}::date)::int AS nouvelles
      FROM communes c LEFT JOIN militants m ON m.commune_id = c.id ${stock.and()}
      WHERE c.actif
      GROUP BY c.id ORDER BY c.nom`, [...stock.params, du, au]);

    const wqs = whereQuartiers(stock.params);
    const parQuartier = await q(`
      SELECT q.id, q.code, q.nom, q.commune_id, c.nom AS commune, q.objectif_militants AS objectif,
             coalesce(s.actifs, 0)::int AS actifs, s.derniere_maj,
             e.nb_commissaires::int, e.nb_superviseurs::int
      FROM quartiers q JOIN communes c ON c.id = q.commune_id
      JOIN v_quartiers_encadrement e ON e.quartier_id = q.id
      LEFT JOIN (SELECT m.quartier_id, count(*) AS actifs, max(m.updated_at) AS derniere_maj
                 FROM militants m ${stock} GROUP BY m.quartier_id) s ON s.quartier_id = q.id
      ${wqs}
      ORDER BY c.nom, q.nom`, wqs.params);

    const parAge = await q(`
      SELECT CASE WHEN m.date_naissance IS NULL THEN 'Non renseigné'
                  WHEN a < 26 THEN '18-25' WHEN a < 36 THEN '26-35' WHEN a < 46 THEN '36-45'
                  WHEN a < 61 THEN '46-60' ELSE '60+' END AS tranche, count(*)::int AS n
      FROM militants m CROSS JOIN LATERAL (SELECT date_part('year', age(m.date_naissance)) AS a) x
      ${stock} GROUP BY 1 ORDER BY 1`, stock.params);

    const parSource = await q(`
      SELECT coalesce(s.libelle, 'Non renseignée') AS source, count(*)::int AS n
      FROM militants m LEFT JOIN sources_collecte s ON s.code = m.source ${stock}
      GROUP BY 1 ORDER BY 2 DESC`, stock.params);

    const evolution = await q(`
      WITH mois AS (
        SELECT generate_series(date_trunc('month', $${stock.params.length + 1}::date - interval '11 months'),
                               date_trunc('month', $${stock.params.length + 1}::date), interval '1 month')::date AS mois
      ), ins AS (
        SELECT date_trunc('month', m.date_enregistrement)::date AS mois, count(*) AS n FROM militants m ${stock} GROUP BY 1
      )
      SELECT to_char(mo.mois, 'YYYY-MM') AS mois, coalesce(i.n, 0)::int AS nouvelles,
             (SELECT count(*) FROM militants m ${stock.toString() ? stock + ' AND' : 'WHERE'} m.date_enregistrement < mo.mois + interval '1 month')::int AS cumul
      FROM mois mo LEFT JOIN ins i ON i.mois = mo.mois ORDER BY mo.mois`, [...stock.params, au]);

    const parResponsable = await q(`
      SELECT r.id, r.fonction, r.prenoms || ' ' || r.nom AS nom, p.parent,
             (SELECT string_agg(DISTINCT coalesce(qq.nom, cc.nom), ', ')
                FROM responsable_perimetres rp JOIN communes cc ON cc.id = rp.commune_id
                LEFT JOIN quartiers qq ON qq.id = rp.quartier_id WHERE rp.responsable_id = r.id) AS perimetre,
             count(m.id)::int AS effectif
      FROM responsables r
      LEFT JOIN LATERAL (SELECT pr.prenoms || ' ' || pr.nom AS parent FROM responsables pr WHERE pr.id = r.parent_id) p ON true
      JOIN militants m ON (m.commissaire_id = r.id OR m.superviseur_id = r.id OR m.coordonnateur_id = r.id)
      ${stock.toString() ? stock.toString() + ' AND r.actif' : 'WHERE r.actif'}
      GROUP BY r.id, p.parent ORDER BY r.fonction, effectif DESC`, stock.params);

    const [resp] = await q(`
      SELECT count(DISTINCT r.id)::int AS n FROM responsables r
      JOIN responsable_perimetres rp ON rp.responsable_id = r.id
      JOIN quartiers q ON (q.id = rp.quartier_id OR (rp.quartier_id IS NULL AND q.commune_id = rp.commune_id))
      ${wq} AND r.actif`, wq.params);

    const [doublons] = await q(`SELECT count(*)::int AS n FROM (${sqlPairesDoublons(vivantes)}) d`, vivantes.params);

    await client.query('COMMIT');

    const quartiers = parQuartier.map((x) => ({ ...x, taux: x.objectif ? Math.round((x.actifs / x.objectif) * 1000) / 10 : null, couvert: x.actifs > 0 && x.nb_commissaires > 0 }));
    const communesVisibles = new Set(quartiers.map((x) => x.commune_id));
    const objectif = quartiers.reduce((s, x) => s + x.objectif, 0);
    res.json({
      periode: { du, au },
      kpis: {
        actifs: kpi.total,
        evolution_pct: kpi.total_debut ? Math.round(((kpi.total - kpi.total_debut) / kpi.total_debut) * 1000) / 10 : null,
        nouvelles: kpi.nouvelles,
        mises_a_jour: flux.mises_a_jour,
        en_attente: flux.en_attente,
        communes_couvertes: kpi.communes_couvertes,
        communes_total: communesVisibles.size,
        quartiers_couverts: quartiers.filter((x) => x.couvert).length,
        quartiers_total: quartiers.length,
        responsables_actifs: resp.n,
        objectif,
        taux_objectif: objectif ? Math.round((kpi.total / objectif) * 1000) / 10 : null,
      },
      par_sexe: { F: kpi.femmes, M: kpi.hommes },
      par_age: parAge,
      par_source: parSource,
      // Périmètre partiel : l'objectif communal devient la somme des quartiers visibles
      par_commune: parCommune.filter((c) => communesVisibles.has(c.id)).map((c) => {
        const objectif = u.global && !f.quartier ? c.objectif : quartiers.filter((x) => x.commune_id === c.id).reduce((s, x) => s + x.objectif, 0);
        return { ...c, objectif, taux: objectif ? Math.round((c.actifs / objectif) * 1000) / 10 : null };
      }),
      par_quartier: quartiers,
      par_responsable: parResponsable,
      evolution,
      alertes: {
        quartiers_sans_commissaire: quartiers.filter((x) => !x.nb_commissaires).map((x) => ({ id: x.id, nom: x.nom, commune: x.commune, actifs: x.actifs })),
        quartiers_sous_objectif: quartiers.filter((x) => x.taux != null && x.taux < 50).length,
        a_mettre_a_jour: flux.a_mettre_a_jour,
        doublons_potentiels: doublons.n,
        en_attente: flux.en_attente,
        sans_gps: flux.sans_gps,
        sans_information: flux.sans_information,
        sans_commissaire: flux.sans_commissaire,
      },
    });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}));
