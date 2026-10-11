import { z } from 'zod';
import { Where } from './sql.js';
import { restreindrePerimetre } from './auth.js';
import { normaliserTelephone, normaliserTexte } from '../../shared/referentiel.js';
import { indexAveugle } from './crypto.js';
import { CONDITION_A_METTRE_A_JOUR } from './qualite.js';

const idOpt = z.coerce.number().int().positive().optional();
const dateOpt = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

export const schemaFiltres = z.object({
  q: z.string().trim().max(100).optional(),
  commune: idOpt,
  quartier: idOpt,
  secteur: idOpt,
  responsable: idOpt,
  statut: z.enum(['EN_ATTENTE', 'ACTIF', 'A_VERIFIER', 'INACTIF', 'TOUS']).optional(),
  sexe: z.enum(['M', 'F']).optional(),
  source: z.string().max(20).optional(),
  tranche: z.enum(['18-25', '26-35', '36-45', '46-60', '60+']).optional(),
  du: dateOpt,      // période d'enregistrement
  au: dateOpt,
  incomplet: z.enum(['telephone', 'gps', 'commissaire', 'information', 'maj']).optional(),
}).passthrough();

const TRANCHES = { '18-25': [18, 25], '26-35': [26, 35], '36-45': [36, 45], '46-60': [46, 60], '60+': [61, 150] };

/**
 * Construit le WHERE commun (liste, export, dashboard, carte) en appliquant
 * TOUJOURS le périmètre de l'utilisateur.
 * @param opts.periode false pour ignorer du/au (ex. stock total du dashboard)
 */
export function filtresMilitants(f, user, { alias = 'm', periode = true, statutParDefaut = null } = {}) {
  const w = new Where();
  const a = alias;
  restreindrePerimetre(w, user, a);
  if (f.commune) w.add(`${a}.commune_id = ?`, f.commune);
  if (f.quartier) w.add(`${a}.quartier_id = ?`, f.quartier);
  if (f.secteur) w.add(`${a}.secteur_id = ?`, f.secteur);
  if (f.responsable) w.add(`? IN (${a}.coordonnateur_id, ${a}.superviseur_id, ${a}.commissaire_id)`, f.responsable);
  const statut = f.statut || statutParDefaut;
  if (statut && statut !== 'TOUS') w.add(`${a}.statut = ?::statut_militant`, statut);
  if (f.sexe) w.add(`${a}.sexe = ?::sexe`, f.sexe);
  if (f.source) w.add(`${a}.source = ?`, f.source);
  if (f.tranche) {
    const [min, max] = TRANCHES[f.tranche];
    w.add(`${a}.date_naissance IS NOT NULL AND date_part('year', age(${a}.date_naissance)) BETWEEN ? AND ?`, min, max);
  }
  if (periode && f.du) w.add(`${a}.date_enregistrement >= ?::date`, f.du);
  if (periode && f.au) w.add(`${a}.date_enregistrement <= ?::date`, f.au);
  if (f.incomplet === 'telephone') w.raw(`${a}.telephone_index IS NULL`);
  if (f.incomplet === 'gps') w.raw(`${a}.geom IS NULL`);
  if (f.incomplet === 'commissaire') w.raw(`${a}.commissaire_id IS NULL`);
  if (f.incomplet === 'information') w.raw(`NOT ${a}.information_personne`);
  if (f.incomplet === 'maj') w.raw(CONDITION_A_METTRE_A_JOUR(a));
  if (f.q) appliquerRecherche(w, f.q, a);
  return w;
}

function appliquerRecherche(w, q, a) {
  const chiffres = q.replace(/[\s.\-()]/g, '');
  if (/^\+?\d{9,15}$/.test(chiffres)) {
    const idx = indexAveugle(normaliserTelephone(chiffres));
    return w.add(`${a}.telephone_index = ? OR ${a}.telephone2_index = ?`, idx, idx);
  }
  if (/^\d{4,8}$/.test(chiffres)) return w.add(`${a}.telephone_suffixe = ?`, chiffres.slice(-4));
  if (/^kry-/i.test(q)) return w.add(`${a}.numero ILIKE ?`, `${q.toUpperCase()}%`);
  const mots = normaliserTexte(q).split(' ').filter((m) => m.length >= 2).slice(0, 5);
  for (const mot of mots) w.add(`${a}.recherche LIKE ?`, `%${mot}%`);
  return w;
}
