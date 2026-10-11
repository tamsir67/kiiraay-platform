// Requêtes de qualité des données : doublons et fiches à mettre à jour (CDC §5.5, §7)
import { DELAI_MISE_A_JOUR_MOIS } from '../../shared/referentiel.js';

export const CONDITION_A_METTRE_A_JOUR = (a = 'm') =>
  `(${a}.statut = 'A_VERIFIER' OR ${a}.telephone_index IS NULL
    OR ${a}.updated_at < now() - interval '${DELAI_MISE_A_JOUR_MOIS} months')`;

/**
 * Paires de doublons potentiels dans le périmètre `where` (alias m) :
 *  1. même numéro de téléphone (index aveugle) ;
 *  2. même quartier, même nom, même sexe, prénoms identiques ou très proches,
 *     ET un second indice : même date de naissance, ou même adresse si la date
 *     manque (les homonymes sont fréquents).
 * Toutes les jointures sont des égalités (jointures par hachage) : < 1 s sur 50 000 fiches.
 * Les paires écartées manuellement sont exclues.
 */
export function sqlPairesDoublons(where) {
  const w = `${where} ${where.toString() ? 'AND' : 'WHERE'} m.statut <> 'INACTIF'`;
  const p = (alias) => `(SELECT m.id, m.quartier_id, m.nom, m.sexe, m.identite_norm, m.date_naissance,
                               lower(btrim(m.adresse)) AS adresse_norm, m.telephone_index FROM militants m ${w}) ${alias}`;
  return `
    WITH par_tel AS (
      SELECT a.id AS id_a, b.id AS id_b, 'telephone'::text AS motif, 1.0::numeric AS score
      FROM ${p('a')} JOIN ${p('b')} ON a.telephone_index = b.telephone_index AND a.id < b.id
    ),
    par_naissance AS (
      SELECT a.id, b.id, 'identite', round(similarity(a.identite_norm, b.identite_norm)::numeric, 2)
      FROM ${p('a')} JOIN ${p('b')}
        ON a.quartier_id = b.quartier_id AND a.nom = b.nom AND a.sexe = b.sexe
       AND a.date_naissance = b.date_naissance AND a.id < b.id
      WHERE a.identite_norm = b.identite_norm OR similarity(a.identite_norm, b.identite_norm) >= 0.85
    ),
    par_adresse AS (
      SELECT a.id, b.id, 'identite', round(similarity(a.identite_norm, b.identite_norm)::numeric, 2)
      FROM ${p('a')} JOIN ${p('b')}
        ON a.quartier_id = b.quartier_id AND a.nom = b.nom AND a.sexe = b.sexe
       AND a.adresse_norm = b.adresse_norm AND a.id < b.id
      WHERE (a.date_naissance IS NULL OR b.date_naissance IS NULL)
        AND (a.identite_norm = b.identite_norm OR similarity(a.identite_norm, b.identite_norm) >= 0.85)
    ),
    toutes AS (
      SELECT DISTINCT ON (id_a, id_b) * FROM (
        SELECT * FROM par_tel UNION ALL SELECT * FROM par_naissance UNION ALL SELECT * FROM par_adresse) x
      ORDER BY id_a, id_b, score DESC
    )
    SELECT t.* FROM toutes t
    WHERE NOT EXISTS (SELECT 1 FROM doublons_ecartes e WHERE e.militant_a = t.id_a AND e.militant_b = t.id_b)`;
}
