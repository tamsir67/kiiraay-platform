// =====================================================================
// KIIRAAY — Générateur DÉTERMINISTE de données de démonstration
// Utilisé par : le seed PostgreSQL (database/seeds) et la démo autonome du
// frontend. Toutes les personnes générées sont FICTIVES.
// =====================================================================
import { COMMUNES, QUARTIERS, SOURCES, MOTIFS_DESACTIVATION } from './referentiel.js';

export function prng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    weighted: (pairs) => {
      const total = pairs.reduce((s, [, w]) => s + w, 0);
      let x = next() * total;
      for (const [v, w] of pairs) { if ((x -= w) <= 0) return v; }
      return pairs[pairs.length - 1][0];
    },
  };
  return r;
}

const PRENOMS_H = ['Mamadou', 'Moussa', 'Ousmane', 'Abdoulaye', 'Ibrahima', 'Cheikh', 'Modou', 'Pape', 'Serigne', 'Aliou', 'Babacar', 'Mouhamed', 'Amadou', 'Saliou', 'Lamine', 'Malick', 'Alassane', 'Omar', 'Assane', 'Souleymane', 'Djibril', 'Fallou', 'Bassirou', 'Idrissa', 'Khadim', 'Mbaye', 'Ndiaga', 'Samba', 'Thierno', 'Youssou', 'El Hadji', 'Boubacar', 'Daouda', 'Elimane', 'Ismaïla'];
const PRENOMS_F = ['Aminata', 'Fatou', 'Awa', 'Mariama', 'Khady', 'Aïssatou', 'Ndeye', 'Coumba', 'Astou', 'Bineta', 'Seynabou', 'Rokhaya', 'Adja', 'Fatoumata', 'Mame Diarra', 'Sokhna', 'Dieynaba', 'Maimouna', 'Ramatoulaye', 'Oumou', 'Yacine', 'Penda', 'Ngoné', 'Marème', 'Khoudia', 'Anta', 'Nafissatou', 'Sophie', 'Codou', 'Thioro', 'Arame', 'Kiné', 'Absa', 'Néné', 'Fama'];
const NOMS = ['Diop', 'Ndiaye', 'Fall', 'Sow', 'Gueye', 'Diallo', 'Ba', 'Sarr', 'Faye', 'Mbaye', 'Cissé', 'Sy', 'Diouf', 'Seck', 'Thiam', 'Kane', 'Ndour', 'Niang', 'Touré', 'Camara', 'Wade', 'Dieng', 'Sène', 'Mbengue', 'Lô', 'Dia', 'Sall', 'Ka', 'Tall', 'Badji', 'Diatta', 'Samb', 'Gaye', 'Ndao', 'Dramé', 'Kébé', 'Sylla', 'Mané', 'Bâ', 'Wane', 'Diagne', 'Thiaw', 'Ndoye', 'Guèye', 'Konaté'];
const VOIES = ['Rue', 'Villa', 'Allée', 'Impasse', 'Lot'];
const REPERES = ['près de la mosquée', 'derrière le marché', 'face à la pharmacie', 'à côté de l\'école', 'près du terminus des bus', 'en face de la boutique', 'près du terrain de foot', 'derrière le poste de santé', 'à l\'angle de la station', 'près de la grande place'];

function bbox(coords) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of coords) for (const ring of poly) for (const [x, y] of ring) {
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function pointInMultiPolygon(x, y, coords) {
  return coords.some((poly) => inRing(x, y, poly[0]) && !poly.slice(1).some((h) => inRing(x, y, h)));
}
function randomPointIn(rand, coords, box) {
  for (let i = 0; i < 200; i++) {
    const x = box[0] + rand.next() * (box[2] - box[0]);
    const y = box[1] + rand.next() * (box[3] - box[1]);
    if (pointInMultiPolygon(x, y, coords)) return [+x.toFixed(6), +y.toFixed(6)];
  }
  return null;
}

/** Référentiel territorial (communes, quartiers, secteurs) à partir du GeoJSON. */
export function construireTerritoires(geo) {
  const rand = prng(2027);
  const communes = COMMUNES.map((c) => {
    const f = geo.features.find((x) => x.properties.niveau === 'commune' && x.properties.code === c.code);
    return { ...c, geometry: f.geometry };
  });
  const quartiers = [];
  for (const c of COMMUNES) {
    const feats = geo.features.filter((x) => x.properties.niveau === 'quartier' && x.properties.commune === c.code)
      .sort((a, b) => a.properties.index - b.properties.index);
    const noms = QUARTIERS[c.code];
    const base = c.objectif / feats.length;
    feats.forEach((f, i) => {
      quartiers.push({
        code: `${c.code}-${String(i + 1).padStart(2, '0')}`,
        nom: noms[i] || `${c.nom} Q${i + 1}`,
        commune: c.code,
        objectif: Math.round((base * (0.75 + rand.next() * 0.5)) / 10) * 10,
        geometry: f.geometry,
      });
    });
  }
  const secteurs = quartiers.flatMap((q) => [1, 2].map((n) => ({ code: `${q.code}-S${n}`, nom: `Secteur ${n}`, quartier: q.code })));
  return { communes, quartiers, secteurs };
}

function personne(rand, sexe) {
  const prenoms = sexe === 'F' ? PRENOMS_F : PRENOMS_H;
  const prenom = rand.chance(0.18) ? `${rand.pick(prenoms)} ${rand.pick(prenoms)}` : rand.pick(prenoms);
  return { nom: rand.pick(NOMS), prenoms: prenom.split(' ').filter((v, i, a) => a.indexOf(v) === i).join(' ') };
}
function telephone(rand) {
  return '+221' + rand.pick(['77', '78', '76', '70', '75']) + String(rand.int(0, 9999999)).padStart(7, '0');
}

/** Chaîne de responsabilité : 1 coordonnateur / commune, superviseurs, commissaires. */
export function construireResponsables(terr) {
  const rand = prng(4242);
  const responsables = [];
  let n = 0;
  const mk = (fonction, perimetres, parent) => {
    const sexe = rand.chance(0.42) ? 'F' : 'M';
    const r = { key: `R${String(++n).padStart(3, '0')}`, fonction, sexe, ...personne(rand, sexe), telephone: telephone(rand), parent, perimetres, actif: true };
    responsables.push(r);
    return r;
  };
  // Quartiers volontairement laissés sans commissaire (alerte de couverture)
  const sansCommissaire = new Set(['GS-12', 'NL-09', 'MG-08', 'WN-09', 'SN-08', 'GS-11']);
  for (const c of terr.communes) {
    const coord = mk('COORDONNATEUR', [{ commune: c.code, quartier: null }], null);
    const qs = terr.quartiers.filter((q) => q.commune === c.code);
    const nbSup = qs.length > 9 ? 3 : 2;
    const taille = Math.ceil(qs.length / nbSup);
    for (let s = 0; s < nbSup; s++) {
      const lot = qs.slice(s * taille, (s + 1) * taille);
      if (!lot.length) continue;
      const sup = mk('SUPERVISEUR', lot.map((q) => ({ commune: c.code, quartier: q.code })), coord.key);
      for (const q of lot) {
        if (sansCommissaire.has(q.code)) continue;
        mk('COMMISSAIRE', [{ commune: c.code, quartier: q.code }], sup.key);
        if (q.objectif > 330 && rand.chance(0.5)) mk('COMMISSAIRE', [{ commune: c.code, quartier: q.code }], sup.key);
      }
    }
  }
  return responsables;
}

/** Chaîne (coordonnateur, superviseur, commissaire) par défaut d'un quartier. */
export function chaineParQuartier(responsables) {
  const byKey = Object.fromEntries(responsables.map((r) => [r.key, r]));
  const map = {};
  for (const r of responsables.filter((x) => x.fonction === 'SUPERVISEUR')) {
    for (const p of r.perimetres) {
      map[p.quartier] = map[p.quartier] || { coordonnateur: r.parent, superviseur: r.key, commissaires: [] };
    }
  }
  for (const r of responsables.filter((x) => x.fonction === 'COMMISSAIRE')) {
    const q = r.perimetres[0].quartier;
    if (map[q]) map[q].commissaires.push(r.key);
  }
  return { map, byKey };
}

/** Comptes applicatifs de démonstration (un par profil du CDC §4). */
export function construireUtilisateurs(responsables) {
  const coordGS = responsables.find((r) => r.fonction === 'COORDONNATEUR' && r.perimetres[0].commune === 'GS');
  const supGS = responsables.find((r) => r.fonction === 'SUPERVISEUR' && r.parent === coordGS.key);
  const comGS = responsables.find((r) => r.fonction === 'COMMISSAIRE' && r.parent === supGS.key);
  return [
    { identifiant: 'admin', nom: 'KIIRAAY', prenoms: 'Administration', role: 'ADMIN', perimetres: [], responsable: null },
    { identifiant: 'coord.golfsud', nom: coordGS.nom, prenoms: coordGS.prenoms, role: 'COORDONNATEUR', perimetres: coordGS.perimetres, responsable: coordGS.key },
    { identifiant: 'sup.golfsud', nom: supGS.nom, prenoms: supGS.prenoms, role: 'SUPERVISEUR', perimetres: supGS.perimetres, responsable: supGS.key },
    { identifiant: 'commissaire.hamo', nom: comGS.nom, prenoms: comGS.prenoms, role: 'COMMISSAIRE', perimetres: comGS.perimetres, responsable: comGS.key },
    { identifiant: 'saisie', nom: 'Opérateur', prenoms: 'Saisie', role: 'OPERATEUR', perimetres: [], responsable: null },
    { identifiant: 'decideur', nom: 'Comité', prenoms: 'Pilotage', role: 'DECIDEUR', perimetres: [], responsable: null },
  ];
}

/**
 * Militants fictifs. `now` est passé en paramètre pour que la démo reste
 * cohérente avec la date du jour.
 */
export function construireMilitants(terr, responsables, { total = 12450, now = new Date() } = {}) {
  const rand = prng(1960);
  const { map } = chaineParQuartier(responsables);
  const boxes = Object.fromEntries(terr.quartiers.map((q) => [q.code, bbox(q.geometry.coordinates)]));
  // Poids : taux de mobilisation variable par quartier (certains en retard)
  const poids = terr.quartiers.map((q) => [q, q.objectif * (0.55 + rand.next() * 0.75) * (map[q.code]?.commissaires.length ? 1 : 0.35)]);
  const sources = SOURCES.filter((s) => s.code !== 'IMPORT').map((s) => s.code);
  const out = [];
  const DAY = 86400000;
  const debut = now.getTime() - 540 * DAY; // ~18 mois de collecte
  for (let i = 0; i < total; i++) {
    const q = rand.weighted(poids);
    const chaine = map[q.code] || { coordonnateur: null, superviseur: null, commissaires: [] };
    const sexe = rand.chance(0.47) ? 'F' : 'M';
    const p = personne(rand, sexe);
    // Collecte qui s'accélère à l'approche de 2027
    const t = Math.pow(rand.next(), 0.6);
    const created = new Date(debut + t * (now.getTime() - debut));
    const updated = rand.chance(0.35) ? new Date(created.getTime() + rand.next() * (now.getTime() - created.getTime())) : created;
    const age = rand.weighted([[rand.int(18, 25), 22], [rand.int(26, 35), 30], [rand.int(36, 45), 22], [rand.int(46, 60), 17], [rand.int(61, 80), 9]]);
    // Âge exact = age (anniversaire déjà passé ou non) : aucun mineur n'est généré
    const naissance = rand.chance(0.88) ? new Date(now.getTime() - (age * 365.25 + rand.int(1, 360)) * DAY) : null;
    const statut = rand.weighted([['ACTIF', 88], ['EN_ATTENTE', 5], ['A_VERIFIER', 3], ['INACTIF', 4]]);
    const gps = rand.chance(0.82) ? randomPointIn(rand, q.geometry.coordinates, boxes[q.code]) : null;
    out.push({
      nom: p.nom, prenoms: p.prenoms, sexe,
      date_naissance: naissance ? naissance.toISOString().slice(0, 10) : null,
      telephone: rand.chance(0.96) ? telephone(rand) : null,
      telephone2: rand.chance(0.15) ? telephone(rand) : null,
      email: rand.chance(0.12) ? `${p.prenoms.split(' ')[0]}.${p.nom}${rand.int(1, 99)}@exemple.sn`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : null,
      adresse: `${rand.pick(VOIES)} ${rand.int(1, 250)}, ${q.nom}`,
      repere: rand.chance(0.7) ? rand.pick(REPERES) : null,
      commune: q.commune, quartier: q.code,
      secteur: rand.chance(0.6) ? `${q.code}-S${rand.int(1, 2)}` : null,
      lon: gps ? gps[0] : null, lat: gps ? gps[1] : null,
      coordonnateur: chaine.coordonnateur, superviseur: chaine.superviseur,
      commissaire: chaine.commissaires.length ? rand.pick(chaine.commissaires) : null,
      statut,
      motif_desactivation: statut === 'INACTIF' ? rand.pick(MOTIFS_DESACTIVATION).code : null,
      source: rand.weighted(sources.map((s, k) => [s, [40, 22, 15, 15, 8][k] || 5])),
      observations: rand.chance(0.06) ? rand.pick(['Disponible pour la mobilisation le week-end', 'Souhaite devenir commissaire', 'Membre du mouvement des jeunes', 'Membre du mouvement des femmes', 'Ancien élu de quartier']) : null,
      information_personne: rand.chance(0.93),
      created_at: created.toISOString(), updated_at: updated.toISOString(),
    });
  }
  // Doublons volontaires (même téléphone ou même identité dans le même quartier)
  for (let k = 0; k < 34; k++) {
    const src = out[rand.int(0, out.length - 1)];
    if (!src.telephone || src.statut === 'INACTIF') { k--; continue; }
    const copie = { ...src, statut: 'EN_ATTENTE', source: 'TERRAIN', created_at: new Date(now.getTime() - rand.int(1, 40) * DAY).toISOString() };
    copie.updated_at = copie.created_at;
    if (k % 2) copie.telephone = telephone(rand); // même identité, autre numéro
    else copie.prenoms = src.prenoms.toUpperCase(); // même numéro, saisie différente
    out.push(copie);
  }
  return out;
}
