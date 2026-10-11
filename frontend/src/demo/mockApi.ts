// =====================================================================
// Faux backend de DÉMONSTRATION (mode VITE_DEMO) : mêmes routes et mêmes
// règles que l'API réelle (droits, périmètres, statuts, doublons), sur des
// données fictives générées dans le navigateur et gardées en mémoire.
// =====================================================================
import geo from '@shared/geo/guediawaye.json';
import {
  PERMISSIONS, STATUTS, ROLES, SOURCES, MOTIFS_DESACTIVATION, DELAI_MISE_A_JOUR_MOIS,
  normaliserTelephone, normaliserTexte,
} from '@shared/referentiel.js';
import { construireTerritoires, construireResponsables, construireUtilisateurs, construireMilitants, pointInMultiPolygon } from '@shared/generator.js';
import { ApiError } from '../api/client';

type Any = Record<string, any>;
const DAY = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const err = (status: number, erreur: string, code?: string, details?: any) => new ApiError(status, { erreur, code, details });

// ------------------------------------------------------------------ Données
const terr = construireTerritoires(geo);
const communes: Any[] = terr.communes.map((c: Any, i: number) => ({ id: i + 1, code: c.code, nom: c.nom, nom_court: c.court, objectif_militants: c.objectif, actif: true, geometry: c.geometry }));
const communeParCode = Object.fromEntries(communes.map((c) => [c.code, c]));
const quartiers: Any[] = terr.quartiers.map((q: Any, i: number) => ({ id: i + 1, code: q.code, nom: q.nom, commune_id: communeParCode[q.commune].id, objectif_militants: q.objectif, actif: true, geometry: q.geometry }));
const quartierParCode = Object.fromEntries(quartiers.map((q) => [q.code, q]));
const secteurs: Any[] = terr.secteurs.map((s: Any, i: number) => ({ id: i + 1, code: s.code, nom: s.nom, quartier_id: quartierParCode[s.quartier].id, actif: true }));
const secteurParCode = Object.fromEntries(secteurs.map((s) => [s.code, s]));
for (const q of quartiers) {
  // Point intérieur pour les étiquettes (centroïde de la boîte, ajusté)
  const ring = q.geometry.coordinates[0][0];
  let cx = ring.reduce((s: number, p: number[]) => s + p[0], 0) / ring.length, cy = ring.reduce((s: number, p: number[]) => s + p[1], 0) / ring.length;
  if (!pointInMultiPolygon(cx, cy, q.geometry.coordinates)) [cx, cy] = ring[0];
  q.centre = [cx, cy];
}
for (const c of communes) {
  const qs = quartiers.filter((q) => q.commune_id === c.id);
  c.centre = [qs.reduce((s, q) => s + q.centre[0], 0) / qs.length, qs.reduce((s, q) => s + q.centre[1], 0) / qs.length];
}

const respGen = construireResponsables(terr);
const respId: Record<string, number> = {};
const responsables: Any[] = respGen.map((r: Any, i: number) => {
  respId[r.key] = i + 1;
  return {
    id: i + 1, fonction: r.fonction, nom: r.nom.toUpperCase(), prenoms: r.prenoms, sexe: r.sexe, telephone: r.telephone, actif: true,
    parent_id: r.parent ? respId[r.parent] : null,
    perimetres: r.perimetres.map((p: Any) => ({ commune_id: communeParCode[p.commune].id, quartier_id: p.quartier ? quartierParCode[p.quartier].id : null })),
  };
});
const usersGen = construireUtilisateurs(respGen);
const utilisateurs: Any[] = usersGen.map((u: Any, i: number) => ({
  id: i + 1, identifiant: u.identifiant, email: null, nom: u.nom.toUpperCase(), prenoms: u.prenoms, role: u.role, actif: true,
  doit_changer_mdp: false, verrouille: false, responsable_id: u.responsable ? respId[u.responsable] : null,
  derniere_connexion: new Date(Date.now() - (i + 1) * 3.7 * 3600000).toISOString(), created_at: new Date(Date.now() - 200 * DAY).toISOString(),
  perimetres: u.perimetres.map((p: Any) => ({ commune_id: communeParCode[p.commune].id, quartier_id: p.quartier ? quartierParCode[p.quartier].id : null })),
}));

const militants: Any[] = construireMilitants(terr, respGen, { now: new Date() })
  .sort((a: Any, b: Any) => a.created_at.localeCompare(b.created_at))
  .map((m: Any, i: number) => ({
    id: `d${String(i + 1).padStart(6, '0')}-demo-0000-0000-000000000000`.slice(0, 36),
    numero: `KRY-GDW-${String(i + 1).padStart(6, '0')}`,
    nom: m.nom.toUpperCase(), prenoms: m.prenoms, sexe: m.sexe, date_naissance: m.date_naissance,
    telephone: m.telephone, telephone2: m.telephone2, email: m.email, adresse: m.adresse, repere: m.repere,
    commune_id: communeParCode[m.commune].id, quartier_id: quartierParCode[m.quartier].id, secteur_id: m.secteur ? secteurParCode[m.secteur].id : null,
    latitude: m.lat, longitude: m.lon,
    coordonnateur_id: m.coordonnateur ? respId[m.coordonnateur] : null, superviseur_id: m.superviseur ? respId[m.superviseur] : null,
    commissaire_id: m.commissaire ? respId[m.commissaire] : null,
    statut: m.statut, motif_desactivation: m.motif_desactivation, source: m.source, observations: m.observations,
    information_personne: m.information_personne, information_date: m.information_personne ? m.created_at.slice(0, 10) : null,
    date_enregistrement: m.created_at.slice(0, 10), created_at: m.created_at, updated_at: m.updated_at, version: 1,
    created_by: m.statut === 'EN_ATTENTE' ? 5 : 1, updated_by: 1, valide_par: m.statut === 'ACTIF' ? 1 : null, valide_le: m.statut === 'ACTIF' ? m.created_at : null,
  }));
const parId = new Map(militants.map((m) => [m.id, m]));
let seqNumero = militants.length;
const historique: Any[] = [];
const ecartes = new Set<string>();
const imports: Any[] = [];
const sources = SOURCES.map((s: Any) => ({ ...s, actif: true }));
const motifs = MOTIFS_DESACTIVATION.map((s: Any) => ({ ...s, actif: true }));
const journal: Any[] = [];
let session: Any | null = null;

// ------------------------------------------------------------------ Outils
const can = (perm: string) => !!session && (PERMISSIONS as Any)[session.role]?.includes(perm);
function exiger(...perms: string[]) {
  if (!session) throw err(401, 'Authentification requise');
  if (!perms.every(can)) throw err(403, 'Droits insuffisants pour cette opération');
}
const ROLES_PERIM = new Set(['COORDONNATEUR', 'SUPERVISEUR', 'COMMISSAIRE']);
const scope = () => {
  const p = session!.perimetres as Any[];
  return { global: !p.length && !ROLES_PERIM.has(session!.role), communes: p.filter((x) => !x.quartier_id).map((x) => x.commune_id), quartiers: p.filter((x) => x.quartier_id).map((x) => x.quartier_id) };
};
const dansScope = (commune_id: number, quartier_id: number) => { const s = scope(); return s.global || s.communes.includes(commune_id) || s.quartiers.includes(quartier_id); };
const quartierScope = (q: Any) => dansScope(q.commune_id, q.id);
function journaliser(action: string, extra: Any = {}) {
  journal.unshift({ id: journal.length + 1, horodatage: new Date().toISOString(), identifiant: session?.identifiant ?? extra.identifiant ?? null, role: session?.role ?? null, action, entite: extra.entite ?? null, entite_id: extra.entite_id ?? null, succes: extra.succes ?? true, ip: '127.0.0.1', details: extra.details ?? null });
}
// Journal initial plausible
for (let i = 0; i < 40; i++) {
  const u = utilisateurs[i % utilisateurs.length];
  const actions = ['CONNEXION', 'MILITANT_CONSULTATION', 'MILITANT_CREATION', 'MILITANT_VALIDATION', 'EXPORT', 'CONNEXION_ECHEC'];
  const a = actions[(i * 7) % actions.length];
  journal.push({ id: 1000 - i, horodatage: new Date(Date.now() - i * 2.3 * 3600000).toISOString(), identifiant: u.identifiant, role: u.role, action: a, entite: a.startsWith('MILITANT') ? 'militant' : null, entite_id: a.startsWith('MILITANT') ? militants[(i * 131) % militants.length].id : null, succes: a !== 'CONNEXION_ECHEC', ip: `41.82.${i % 9}.${(i * 17) % 250}`, details: a === 'EXPORT' ? { format: 'xlsx', lignes: 1200 + i * 3 } : null });
}

const age = (d?: string | null) => { if (!d) return null; const b = new Date(d), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
const nomResp = (id?: number | null) => { const r = id ? responsables[id - 1] : null; return r ? `${r.prenoms} ${r.nom}` : null; };
const nomUser = (id?: number | null) => { const u = id ? utilisateurs.find((x) => x.id === id) : null; return u ? `${u.prenoms} ${u.nom}` : null; };
const TRANCHES: Record<string, [number, number]> = { '18-25': [18, 25], '26-35': [26, 35], '36-45': [36, 45], '46-60': [46, 60], '60+': [61, 150] };
const aMettreAJour = (m: Any) => m.statut === 'A_VERIFIER' || !m.telephone || Date.now() - new Date(m.updated_at).getTime() > DELAI_MISE_A_JOUR_MOIS * 30.4 * DAY;

function filtrer(p: Any, { periode = true, statutDefaut = null as string | null } = {}) {
  const s = scope();
  const statut = p.statut || statutDefaut;
  const q = (p.q || '').trim();
  const chiffres = q.replace(/[\s.\-()]/g, '');
  const tel = /^\+?\d{9,15}$/.test(chiffres) ? normaliserTelephone(chiffres) : null;
  const suffixe = /^\d{4,8}$/.test(chiffres) ? chiffres.slice(-4) : null;
  const mots = !tel && !suffixe && !/^kry-/i.test(q) ? normaliserTexte(q).split(' ').filter((x: string) => x.length >= 2) : [];
  return militants.filter((m) => {
    if (!s.global && !s.communes.includes(m.commune_id) && !s.quartiers.includes(m.quartier_id)) return false;
    if (p.commune && m.commune_id !== Number(p.commune)) return false;
    if (p.quartier && m.quartier_id !== Number(p.quartier)) return false;
    if (p.secteur && m.secteur_id !== Number(p.secteur)) return false;
    if (p.responsable) { const r = Number(p.responsable); if (m.coordonnateur_id !== r && m.superviseur_id !== r && m.commissaire_id !== r) return false; }
    if (statut && statut !== 'TOUS' && m.statut !== statut) return false;
    if (p.sexe && m.sexe !== p.sexe) return false;
    if (p.source && m.source !== p.source) return false;
    if (p.tranche) { const a = age(m.date_naissance); const [mi, ma] = TRANCHES[p.tranche]; if (a == null || a < mi || a > ma) return false; }
    if (periode && p.du && m.date_enregistrement < p.du) return false;
    if (periode && p.au && m.date_enregistrement > p.au) return false;
    if (p.incomplet === 'telephone' && m.telephone) return false;
    if (p.incomplet === 'gps' && m.latitude != null) return false;
    if (p.incomplet === 'commissaire' && m.commissaire_id) return false;
    if (p.incomplet === 'information' && m.information_personne) return false;
    if (p.incomplet === 'maj' && !aMettreAJour(m)) return false;
    if (q) {
      if (tel) { if (m.telephone !== tel && m.telephone2 !== tel) return false; }
      else if (suffixe) { if (!m.telephone?.endsWith(suffixe)) return false; }
      else if (/^kry-/i.test(q)) { if (!m.numero.startsWith(q.toUpperCase())) return false; }
      else {
        const t = normaliserTexte(`${m.nom} ${m.prenoms} ${m.adresse || ''} ${m.repere || ''}`);
        if (!mots.every((w: string) => t.includes(w))) return false;
      }
    }
    return true;
  });
}

// Similarité trigrammes (approche pg_trgm)
function trigrammes(s: string) {
  const out = new Set<string>();
  for (const w of normaliserTexte(s).split(' ').filter(Boolean)) { const x = `  ${w} `; for (let i = 0; i < x.length - 2; i++) out.add(x.slice(i, i + 3)); }
  return out;
}
function similarite(a: string, b: string) {
  const A = trigrammes(a), B = trigrammes(b); let inter = 0;
  A.forEach((t) => { if (B.has(t)) inter++; });
  return inter / (A.size + B.size - inter || 1);
}
function pairesDoublons(liste: Any[]) {
  const vivants = liste.filter((m) => m.statut !== 'INACTIF');
  const res = new Map<string, Any>();
  const add = (a: Any, b: Any, motif: string, score: number) => {
    const [x, y] = a.id < b.id ? [a, b] : [b, a];
    const k = `${x.id}|${y.id}`;
    if (ecartes.has(k)) return;
    if (!res.has(k) || res.get(k)!.score < score) res.set(k, { a: x, b: y, motif, score });
  };
  const parTel = new Map<string, Any[]>();
  for (const m of vivants) if (m.telephone) { const l = parTel.get(m.telephone) || []; l.push(m); parTel.set(m.telephone, l); }
  parTel.forEach((l) => { for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) add(l[i], l[j], 'telephone', 1); });
  const blocs = new Map<string, Any[]>();
  for (const m of vivants) { const k = `${m.quartier_id}|${m.nom}|${m.sexe}`; const l = blocs.get(k) || []; l.push(m); blocs.set(k, l); }
  blocs.forEach((l) => {
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
      const a = l[i], b = l[j];
      const pa = normaliserTexte(a.prenoms), pb = normaliserTexte(b.prenoms);
      if (pa !== pb && similarite(pa, pb) < 0.8) continue;
      const indice = a.date_naissance && a.date_naissance === b.date_naissance
        || ((!a.date_naissance || !b.date_naissance) && normaliserTexte(a.adresse) === normaliserTexte(b.adresse));
      if (indice) add(a, b, 'identite', Math.round(similarite(`${a.nom} ${a.prenoms}`, `${b.nom} ${b.prenoms}`) * 100) / 100);
    }
  });
  return [...res.values()];
}

const encadrement = (qid: number) => {
  const rs = responsables.filter((r) => r.actif && r.perimetres.some((p: Any) => p.quartier_id === qid));
  return { nb_commissaires: rs.filter((r) => r.fonction === 'COMMISSAIRE').length, nb_superviseurs: rs.filter((r) => r.fonction === 'SUPERVISEUR').length };
};
const quartiersVisibles = (p: Any) => quartiers.filter((q) => q.actif && quartierScope(q) && (!p.commune || q.commune_id === Number(p.commune)) && (!p.quartier || q.id === Number(p.quartier)));
function chaineParDefaut(qid: number) {
  const q = quartiers[qid - 1];
  const parmi = (fn: string, test: (p: Any) => boolean) => responsables.find((r) => r.actif && r.fonction === fn && r.perimetres.some(test))?.id ?? null;
  return {
    commissaire_id: parmi('COMMISSAIRE', (p) => p.quartier_id === qid),
    superviseur_id: parmi('SUPERVISEUR', (p) => p.quartier_id === qid),
    coordonnateur_id: parmi('COORDONNATEUR', (p) => p.commune_id === q.commune_id),
  };
}

// ------------------------------------------------------------------ Routes
type H = (p: Any, body: Any, m: RegExpMatchArray) => any;
const routes: [string, RegExp, H][] = [];
const on = (method: string, path: string, h: H) => routes.push([method, new RegExp(`^${path.replace(/:(\w+)/g, '([^/]+)')}$`), h]);

on('POST', '/auth/login', (_p, b) => {
  const u = utilisateurs.find((x) => x.identifiant === String(b.identifiant || '').trim().toLowerCase());
  if (!u || !u.actif) { journaliser('CONNEXION_ECHEC', { succes: false, identifiant: b.identifiant }); throw err(401, 'Identifiant ou mot de passe incorrect'); }
  session = u; u.derniere_connexion = new Date().toISOString();
  journaliser('CONNEXION');
  return { accessToken: 'demo', utilisateur: { ...u, permissions: (PERMISSIONS as Any)[u.role] } };
});
on('POST', '/auth/logout', () => { session = null; return null; });
on('GET', '/auth/me', () => { if (!session) throw err(401, 'Session absente'); return { ...session, permissions: (PERMISSIONS as Any)[session.role] }; });

on('GET', '/referentiels', () => ({ sources, motifs, statuts: STATUTS, roles: ROLES, permissions: PERMISSIONS }));
on('POST', '/referentiels/:type', (_p, b, m) => { exiger('territoires:gerer'); const l = m[1] === 'sources' ? sources : motifs; const x = l.find((s) => s.code === b.code); if (x) Object.assign(x, b); else l.push(b); return { ok: true }; });

on('GET', '/territoires', () => {
  if (!session) throw err(401, 'Authentification requise');
  return communes.map((c) => ({
    id: c.id, code: c.code, nom: c.nom, nom_court: c.nom_court, objectif_militants: c.objectif_militants, actif: c.actif,
    quartiers: quartiers.filter((q) => q.commune_id === c.id && quartierScope(q)).sort((a, b) => a.nom.localeCompare(b.nom))
      .map((q) => ({ id: q.id, code: q.code, nom: q.nom, objectif_militants: q.objectif_militants, actif: q.actif, secteurs: secteurs.filter((s) => s.quartier_id === q.id) })),
  })).filter((c) => c.quartiers.length);
});
on('PUT', '/territoires/communes/:id', (_p, b, m) => { exiger('territoires:gerer'); communes[Number(m[1]) - 1].objectif_militants = Number(b.objectif_militants); journaliser('TERRITOIRE_MODIFICATION', { entite: 'commune', entite_id: m[1] }); return { ok: true }; });
on('PUT', '/territoires/quartiers/:id', (_p, b, m) => { exiger('territoires:gerer'); Object.assign(quartiers[Number(m[1]) - 1], { nom: b.nom, objectif_militants: Number(b.objectif_militants), actif: b.actif }); return { ok: true }; });
on('POST', '/territoires/quartiers', (_p, b) => {
  exiger('territoires:gerer');
  const c = communes[Number(b.commune_id) - 1];
  const q = { id: quartiers.length + 1, code: `${c.code}-${String(quartiers.filter((x) => x.commune_id === c.id).length + 1).padStart(2, '0')}`, nom: b.nom, commune_id: c.id, objectif_militants: Number(b.objectif_militants) || 0, actif: true, geometry: null, centre: c.centre };
  quartiers.push(q); return { id: q.id, code: q.code };
});
on('POST', '/territoires/secteurs', (_p, b) => {
  exiger('territoires:gerer');
  const q = quartiers[Number(b.quartier_id) - 1];
  const s = { id: secteurs.length + 1, code: `${q.code}-S${secteurs.filter((x) => x.quartier_id === q.id).length + 1}`, nom: b.nom, quartier_id: q.id, actif: true };
  secteurs.push(s); return s;
});

on('GET', '/responsables', () => {
  exiger('dashboard');
  const s = scope();
  const effectifs = new Map<number, number>();
  for (const m of militants) if (m.statut === 'ACTIF') for (const k of ['commissaire_id', 'superviseur_id', 'coordonnateur_id']) if (m[k]) effectifs.set(`${k}:${m[k]}` as any, (effectifs.get(`${k}:${m[k]}` as any) || 0) + 1);
  const cle = { COMMISSAIRE: 'commissaire_id', SUPERVISEUR: 'superviseur_id', COORDONNATEUR: 'coordonnateur_id' } as Any;
  return responsables.filter((r: Any) => r.actif && (s.global || r.perimetres.some((p: Any) => s.communes.includes(p.commune_id) || s.quartiers.includes(p.quartier_id)
    || (!p.quartier_id && quartiers.some((q) => q.commune_id === p.commune_id && s.quartiers.includes(q.id))))))
    .map((r: Any): Any => ({
      ...r, parent: nomResp(r.parent_id), effectif: effectifs.get(`${cle[r.fonction]}:${r.id}` as any) || 0,
      compte: utilisateurs.find((u) => u.responsable_id === r.id)?.identifiant || null,
      telephone: can('militants:pii') ? r.telephone : null,
      perimetres: r.perimetres.map((p: Any) => ({ ...p, commune: communes[p.commune_id - 1].nom, quartier: p.quartier_id ? quartiers[p.quartier_id - 1].nom : null })),
    }))
    .sort((a, b) => ['COORDONNATEUR', 'SUPERVISEUR', 'COMMISSAIRE'].indexOf(a.fonction) - ['COORDONNATEUR', 'SUPERVISEUR', 'COMMISSAIRE'].indexOf(b.fonction) || a.nom.localeCompare(b.nom));
});
const ecrireResp = (r: Any, b: Any) => Object.assign(r, {
  fonction: b.fonction, nom: String(b.nom).toUpperCase(), prenoms: b.prenoms, sexe: b.sexe, telephone: normaliserTelephone(b.telephone),
  parent_id: b.fonction === 'COORDONNATEUR' ? null : b.parent_id, actif: b.actif ?? true,
  perimetres: b.perimetres.map((p: Any) => ({ commune_id: Number(p.commune_id), quartier_id: p.quartier_id ? Number(p.quartier_id) : null })),
});
function validerResp(b: Any) {
  if (!b.nom || !b.prenoms) throw err(400, 'Nom et prénom(s) obligatoires');
  if (!b.perimetres?.length) throw err(400, 'Au moins un périmètre');
  if (b.fonction !== 'COORDONNATEUR' && b.perimetres.some((p: Any) => !p.quartier_id)) throw err(400, 'Superviseurs et commissaires sont affectés à des quartiers');
}
on('POST', '/responsables', (_p, b) => { exiger('responsables:gerer'); validerResp(b); const r = ecrireResp({ id: responsables.length + 1 }, b); responsables.push(r); journaliser('RESPONSABLE_CREATION', { entite: 'responsable', entite_id: r.id }); return { id: r.id }; });
on('PUT', '/responsables/:id', (_p, b, m) => { exiger('responsables:gerer'); validerResp(b); ecrireResp(responsables[Number(m[1]) - 1], b); journaliser('RESPONSABLE_MODIFICATION', { entite: 'responsable', entite_id: m[1] }); return { ok: true }; });
on('POST', '/responsables/reaffecter', (_p, b) => {
  exiger('responsables:gerer');
  const ch = chaineParDefaut(Number(b.quartier_id)); let n = 0;
  for (const m of militants) if (m.quartier_id === Number(b.quartier_id) && m.statut !== 'INACTIF') { Object.assign(m, ch); n++; }
  return { fiches_mises_a_jour: n };
});

on('GET', '/dashboard', (p) => {
  exiger('dashboard');
  const au = p.au || iso(new Date()), du = p.du || iso(new Date(Date.now() - 30 * DAY));
  const stock = filtrer(p, { periode: false, statutDefaut: 'ACTIF' });
  const vivantes = filtrer({ ...p, statut: undefined }, { periode: false }).filter((m) => m.statut !== 'INACTIF');
  const qv = quartiersVisibles(p);
  const parQ = new Map<number, Any>();
  for (const m of stock) { const x = parQ.get(m.quartier_id) || { actifs: 0, derniere_maj: null }; x.actifs++; if (!x.derniere_maj || m.updated_at > x.derniere_maj) x.derniere_maj = m.updated_at; parQ.set(m.quartier_id, x); }
  const par_quartier = qv.map((q) => {
    const e = encadrement(q.id), s = parQ.get(q.id) || { actifs: 0 };
    return { id: q.id, code: q.code, nom: q.nom, commune_id: q.commune_id, commune: communes[q.commune_id - 1].nom, objectif: q.objectif_militants, actifs: s.actifs, derniere_maj: s.derniere_maj, ...e,
      taux: q.objectif_militants ? Math.round((s.actifs / q.objectif_militants) * 1000) / 10 : null, couvert: s.actifs > 0 && e.nb_commissaires > 0 };
  }).sort((a, b) => a.commune.localeCompare(b.commune) || a.nom.localeCompare(b.nom));
  const visibles = new Set(qv.map((q) => q.commune_id));
  const par_commune = communes.filter((c) => visibles.has(c.id)).map((c) => {
    const l = stock.filter((m) => m.commune_id === c.id);
    const sc = scope();
    const obj = sc.global && !p.quartier ? c.objectif_militants : par_quartier.filter((q) => q.commune_id === c.id).reduce((s2, q) => s2 + q.objectif, 0);
    return { id: c.id, code: c.code, nom: c.nom, nom_court: c.nom_court, objectif: obj, actifs: l.length, femmes: l.filter((m) => m.sexe === 'F').length,
      nouvelles: l.filter((m) => m.date_enregistrement >= du && m.date_enregistrement <= au).length, taux: obj ? Math.round((l.length / obj) * 1000) / 10 : null };
  });
  const tranches: Record<string, number> = {};
  for (const m of stock) { const a = age(m.date_naissance); const t = a == null ? 'Non renseigné' : a < 26 ? '18-25' : a < 36 ? '26-35' : a < 46 ? '36-45' : a < 61 ? '46-60' : '60+'; tranches[t] = (tranches[t] || 0) + 1; }
  const parSource: Record<string, number> = {};
  for (const m of stock) { const l = sources.find((s) => s.code === m.source)?.libelle || 'Non renseignée'; parSource[l] = (parSource[l] || 0) + 1; }
  const evolution: Any[] = [];
  const fin = new Date(`${au}T12:00:00`);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(fin.getFullYear(), fin.getMonth() - i, 1), mois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const suivant = iso(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    evolution.push({ mois, nouvelles: stock.filter((m) => m.date_enregistrement.startsWith(mois)).length, cumul: stock.filter((m) => m.date_enregistrement < suivant).length });
  }
  const effectifs = new Map<number, number>();
  for (const m of stock) for (const k of ['commissaire_id', 'superviseur_id', 'coordonnateur_id']) if (m[k]) effectifs.set(m[k], (effectifs.get(m[k]) || 0) + 1);
  const par_responsable = responsables.filter((r) => r.actif && effectifs.get(r.id)).map((r) => ({
    id: r.id, fonction: r.fonction, nom: `${r.prenoms} ${r.nom}`, parent: nomResp(r.parent_id), effectif: effectifs.get(r.id),
    perimetre: r.perimetres.map((p: Any) => (p.quartier_id ? quartiers[p.quartier_id - 1].nom : communes[p.commune_id - 1].nom)).join(', '),
  })).sort((a, b) => ['COORDONNATEUR', 'SUPERVISEUR', 'COMMISSAIRE'].indexOf(a.fonction) - ['COORDONNATEUR', 'SUPERVISEUR', 'COMMISSAIRE'].indexOf(b.fonction) || b.effectif! - a.effectif!);
  const respActifs = new Set(responsables.filter((r) => r.actif && r.perimetres.some((pp: Any) => qv.some((q) => q.id === pp.quartier_id || (!pp.quartier_id && q.commune_id === pp.commune_id)))).map((r) => r.id));
  const objectif = par_quartier.reduce((s, q) => s + q.objectif, 0);
  const debut = stock.filter((m) => m.date_enregistrement < du).length;
  const en_attente = vivantes.filter((m) => m.statut === 'EN_ATTENTE').length;
  return {
    periode: { du, au },
    kpis: {
      actifs: stock.length, evolution_pct: debut ? Math.round(((stock.length - debut) / debut) * 1000) / 10 : null,
      nouvelles: stock.filter((m) => m.date_enregistrement >= du && m.date_enregistrement <= au).length,
      mises_a_jour: vivantes.filter((m) => m.updated_at.slice(0, 10) >= du && m.updated_at.slice(0, 10) <= au && new Date(m.updated_at).getTime() - new Date(m.created_at).getTime() > 60000).length,
      en_attente, communes_couvertes: new Set(stock.map((m) => m.commune_id)).size, communes_total: visibles.size,
      quartiers_couverts: par_quartier.filter((q) => q.couvert).length, quartiers_total: par_quartier.length,
      responsables_actifs: respActifs.size, objectif, taux_objectif: objectif ? Math.round((stock.length / objectif) * 1000) / 10 : null,
    },
    par_sexe: { F: stock.filter((m) => m.sexe === 'F').length, M: stock.filter((m) => m.sexe === 'M').length },
    par_age: Object.entries(tranches).map(([tranche, n]) => ({ tranche, n })).sort((a, b) => a.tranche.localeCompare(b.tranche)),
    par_source: Object.entries(parSource).map(([source, n]) => ({ source, n })).sort((a, b) => b.n - a.n),
    par_commune, par_quartier, par_responsable, evolution,
    alertes: {
      quartiers_sans_commissaire: par_quartier.filter((q) => !q.nb_commissaires).map((q) => ({ id: q.id, nom: q.nom, commune: q.commune, actifs: q.actifs })),
      quartiers_sous_objectif: par_quartier.filter((q) => q.taux != null && q.taux < 50).length,
      a_mettre_a_jour: vivantes.filter(aMettreAJour).length, doublons_potentiels: pairesDoublons(vivantes).length, en_attente,
      sans_gps: vivantes.filter((m) => m.latitude == null).length, sans_information: vivantes.filter((m) => !m.information_personne).length,
      sans_commissaire: vivantes.filter((m) => !m.commissaire_id).length,
    },
  };
});

on('GET', '/carte/territoires', (p) => {
  exiger('dashboard');
  const stock = filtrer({ ...p, commune: undefined, quartier: undefined }, { periode: false, statutDefaut: 'ACTIF' });
  const cpt = new Map<number, number>();
  for (const m of stock) cpt.set(m.quartier_id, (cpt.get(m.quartier_id) || 0) + 1);
  const qv = quartiers.filter((q) => q.actif && q.geometry && quartierScope(q));
  const qf = qv.map((q) => ({ type: 'Feature', geometry: q.geometry, properties: { niveau: 'quartier', id: q.id, code: q.code, nom: q.nom, commune_id: q.commune_id, commune: communes[q.commune_id - 1].nom, objectif: q.objectif_militants, actifs: cpt.get(q.id) || 0, nb_commissaires: encadrement(q.id).nb_commissaires, centre: q.centre } }));
  const cv = communes.filter((c) => qv.some((q) => q.commune_id === c.id));
  const cf = cv.map((c) => ({ type: 'Feature', geometry: c.geometry, properties: { niveau: 'commune', id: c.id, code: c.code, nom: c.nom, objectif: c.objectif_militants, centre: c.centre, actifs: qf.filter((q) => q.properties.commune_id === c.id).reduce((s, q) => s + q.properties.actifs, 0) } }));
  return { type: 'FeatureCollection', features: [...cf, ...qf] };
});
on('GET', '/carte/points', (p) => {
  exiger('carte:points');
  const l = filtrer(p, { statutDefaut: 'ACTIF' }).filter((m) => m.latitude != null);
  return { total: l.length, points: l.map((m) => [m.longitude, m.latitude, m.statut, m.id]) };
});

const ligne = (m: Any) => ({
  id: m.id, numero: m.numero, nom: m.nom, prenoms: m.prenoms, sexe: m.sexe, age: age(m.date_naissance), statut: m.statut,
  date_naissance: can('militants:pii') ? m.date_naissance : null, adresse: can('militants:pii') ? m.adresse : null,
  date_enregistrement: m.date_enregistrement, updated_at: m.updated_at, source: m.source, geolocalise: m.latitude != null,
  commune_id: m.commune_id, commune: communes[m.commune_id - 1].nom, quartier_id: m.quartier_id, quartier: quartiers[m.quartier_id - 1].nom,
  commissaire_id: m.commissaire_id, commissaire: nomResp(m.commissaire_id),
  telephone_masque: m.telephone ? `•• ••• ${m.telephone.slice(-4, -2)} ${m.telephone.slice(-2)}` : null,
});
const TRIS: Record<string, (m: Any) => string> = { nom: (m) => `${m.nom} ${m.prenoms}`, date: (m) => m.date_enregistrement + m.created_at, maj: (m) => m.updated_at, quartier: (m) => quartiers[m.quartier_id - 1].nom, numero: (m) => m.numero, statut: (m) => m.statut };
on('GET', '/militants', (p) => {
  exiger('militants:lire');
  const l = filtrer(p, { periode: true });
  const f = TRIS[p.tri || 'date'] || TRIS.date;
  l.sort((a, b) => (f(a) < f(b) ? -1 : f(a) > f(b) ? 1 : 0) * (p.ordre === 'asc' ? 1 : -1));
  const page = Number(p.page) || 1, taille = Number(p.taille) || 25;
  return { total: l.length, page, taille, resultats: l.slice((page - 1) * taille, page * taille).map(ligne) };
});
function charger(id: string) {
  const m = parId.get(id);
  if (!m || !dansScope(m.commune_id, m.quartier_id)) throw err(404, 'Fiche introuvable');
  return m;
}
on('GET', '/militants/:id', (_p, _b, r) => {
  exiger('militants:lire');
  const m = charger(r[1]); const pii = can('militants:pii');
  journaliser('MILITANT_CONSULTATION', { entite: 'militant', entite_id: m.id });
  return {
    ...m, age: age(m.date_naissance), commune: communes[m.commune_id - 1].nom, quartier: quartiers[m.quartier_id - 1].nom,
    secteur: m.secteur_id ? secteurs[m.secteur_id - 1].nom : null,
    coordonnateur: nomResp(m.coordonnateur_id), superviseur: nomResp(m.superviseur_id), commissaire: nomResp(m.commissaire_id),
    motif_libelle: motifs.find((x) => x.code === m.motif_desactivation)?.libelle, source_libelle: sources.find((x) => x.code === m.source)?.libelle,
    cree_par: nomUser(m.created_by), modifie_par: nomUser(m.updated_by), valide_par_nom: nomUser(m.valide_par),
    telephone: pii ? m.telephone : null, telephone2: pii ? m.telephone2 : null, adresse: pii ? m.adresse : null, repere: pii ? m.repere : null,
    email: pii ? m.email : null, latitude: pii ? m.latitude : null, longitude: pii ? m.longitude : null,
  };
});
on('GET', '/militants/:id/historique', (_p, _b, r) => {
  exiger('militants:lire');
  const m = charger(r[1]);
  return [...historique.filter((h) => h.militant_id === m.id), { id: 0, operation: 'CREATION', modifie_le: m.created_at, champs: null, auteur: nomUser(m.created_by) }];
});

function doublonsPour(d: Any, exclude?: string) {
  const tels = [normaliserTelephone(d.telephone), normaliserTelephone(d.telephone2)].filter(Boolean);
  const ident = `${d.nom} ${d.prenoms}`;
  return militants.filter((m) => m.statut !== 'INACTIF' && m.id !== exclude && (
    tels.includes(m.telephone) || tels.includes(m.telephone2)
    || ((m.quartier_id === Number(d.quartier_id) || (d.date_naissance && m.date_naissance === d.date_naissance)) && similarite(`${m.nom} ${m.prenoms}`, ident) > 0.75)
  )).slice(0, 10).map((m) => ({ id: m.id, numero: m.numero, nom: m.nom, prenoms: m.prenoms, statut: m.statut, quartier: quartiers[m.quartier_id - 1].nom,
    motif: tels.includes(m.telephone) || tels.includes(m.telephone2) ? 'telephone' : 'identite', score: Math.round(similarite(`${m.nom} ${m.prenoms}`, ident) * 100) / 100 }));
}
function validerFiche(d: Any) {
  const champs: Any[] = [];
  if (!d.nom?.trim()) champs.push({ champ: 'nom', message: 'Nom obligatoire' });
  if (!d.prenoms?.trim()) champs.push({ champ: 'prenoms', message: 'Prénom(s) obligatoire(s)' });
  if (!['M', 'F'].includes(d.sexe)) champs.push({ champ: 'sexe', message: 'Sexe obligatoire' });
  if (!d.quartier_id) champs.push({ champ: 'quartier_id', message: 'Quartier obligatoire' });
  if (d.telephone && !normaliserTelephone(d.telephone)) champs.push({ champ: 'telephone', message: 'Numéro de téléphone invalide' });
  if (champs.length) throw new ApiError(400, { erreur: 'Données invalides', champs });
  const q = quartiers[Number(d.quartier_id) - 1];
  if (!q || !quartierScope(q)) throw err(403, 'Ce quartier est hors de votre périmètre');
  return q;
}
on('POST', '/militants/verifier-doublons', (_p, b) => { exiger('militants:ecrire'); return { doublons: doublonsPour(b) }; });
on('POST', '/militants', (p, d) => {
  exiger('militants:ecrire');
  const q = validerFiche(d);
  if (p.forcer !== 'true') { const db = doublonsPour(d); if (db.length) throw err(409, 'Doublon potentiel détecté', 'DOUBLON', { doublons: db }); }
  const ch = chaineParDefaut(q.id), valide = can('militants:valider'), now = new Date().toISOString();
  const m: Any = {
    id: crypto.randomUUID(), numero: `KRY-GDW-${String(++seqNumero).padStart(6, '0')}`,
    nom: d.nom.toUpperCase(), prenoms: d.prenoms, sexe: d.sexe, date_naissance: d.date_naissance || null,
    telephone: normaliserTelephone(d.telephone), telephone2: normaliserTelephone(d.telephone2), email: d.email, adresse: d.adresse, repere: d.repere,
    commune_id: q.commune_id, quartier_id: q.id, secteur_id: d.secteur_id || null, latitude: d.latitude, longitude: d.longitude,
    coordonnateur_id: d.coordonnateur_id || ch.coordonnateur_id, superviseur_id: d.superviseur_id || ch.superviseur_id, commissaire_id: d.commissaire_id || ch.commissaire_id,
    statut: valide ? 'ACTIF' : 'EN_ATTENTE', source: d.source, observations: d.observations, information_personne: !!d.information_personne,
    information_date: d.information_personne ? iso(new Date()) : null, date_enregistrement: iso(new Date()), created_at: now, updated_at: now, version: 1,
    created_by: session!.id, updated_by: session!.id, valide_par: valide ? session!.id : null, valide_le: valide ? now : null,
  };
  militants.push(m); parId.set(m.id, m);
  journaliser('MILITANT_CREATION', { entite: 'militant', entite_id: m.id, details: { numero: m.numero } });
  return { id: m.id, numero: m.numero, statut: m.statut, avertissements: [] };
});
const CHAMPS = ['nom', 'prenoms', 'sexe', 'date_naissance', 'telephone', 'telephone2', 'email', 'adresse', 'repere', 'quartier_id', 'secteur_id', 'latitude', 'longitude', 'coordonnateur_id', 'superviseur_id', 'commissaire_id', 'source', 'observations', 'information_personne'];
function tracer(m: Any, operation: string, avant: Any) {
  const champs = CHAMPS.concat(['statut', 'motif_desactivation']).filter((k) => String(avant[k] ?? '') !== String(m[k] ?? ''));
  if (!champs.length) return;
  historique.unshift({ id: historique.length + 1, militant_id: m.id, operation, modifie_le: new Date().toISOString(), auteur: `${session!.prenoms} ${session!.nom}`, champs,
    avant: Object.fromEntries(champs.map((k) => [k, avant[k]])), apres: Object.fromEntries(champs.map((k) => [k, m[k]])) });
}
on('PUT', '/militants/:id', (p, d, r) => {
  exiger('militants:ecrire');
  const m = charger(r[1]);
  if (Number(d.version) !== m.version) throw err(409, 'Cette fiche a été modifiée par un autre utilisateur. Rechargez-la.', 'VERSION');
  const q = validerFiche(d);
  if (p.forcer !== 'true') { const db = doublonsPour(d, m.id); if (db.length) throw err(409, 'Doublon potentiel détecté', 'DOUBLON', { doublons: db }); }
  const avant = { ...m };
  const ch = q.id !== m.quartier_id ? chaineParDefaut(q.id) : m;
  Object.assign(m, {
    nom: d.nom.toUpperCase(), prenoms: d.prenoms, sexe: d.sexe, date_naissance: d.date_naissance || null, telephone: normaliserTelephone(d.telephone), telephone2: normaliserTelephone(d.telephone2),
    email: d.email, adresse: d.adresse, repere: d.repere, commune_id: q.commune_id, quartier_id: q.id, secteur_id: d.secteur_id || null, latitude: d.latitude, longitude: d.longitude,
    coordonnateur_id: d.coordonnateur_id || ch.coordonnateur_id, superviseur_id: d.superviseur_id || ch.superviseur_id, commissaire_id: d.commissaire_id || ch.commissaire_id,
    source: d.source, observations: d.observations, information_personne: !!d.information_personne,
    statut: m.statut === 'A_VERIFIER' ? (can('militants:valider') ? 'ACTIF' : 'EN_ATTENTE') : m.statut,
    updated_at: new Date().toISOString(), updated_by: session!.id, version: m.version + 1,
  });
  tracer(m, 'MODIFICATION', avant);
  journaliser('MILITANT_MODIFICATION', { entite: 'militant', entite_id: m.id });
  return { id: m.id, avertissements: [] };
});
function statut(id: string, nouveau: string, attendu: string[], op: string, action: string, motif: string | null = null) {
  const m = charger(id);
  if (!attendu.includes(m.statut)) throw err(409, `Opération impossible depuis le statut « ${m.statut} »`);
  const avant = { ...m };
  Object.assign(m, { statut: nouveau, motif_desactivation: nouveau === 'INACTIF' ? motif : null, updated_at: new Date().toISOString(), updated_by: session!.id, version: m.version + 1 });
  if (nouveau === 'ACTIF') Object.assign(m, { valide_par: session!.id, valide_le: m.updated_at });
  tracer(m, op, avant);
  journaliser(action, { entite: 'militant', entite_id: m.id });
  return { id: m.id, statut: nouveau };
}
on('POST', '/militants/:id/valider', (_p, _b, r) => { exiger('militants:valider'); return statut(r[1], 'ACTIF', ['EN_ATTENTE', 'A_VERIFIER'], 'VALIDATION', 'MILITANT_VALIDATION'); });
on('POST', '/militants/:id/a-verifier', (_p, _b, r) => { exiger('militants:ecrire'); return statut(r[1], 'A_VERIFIER', ['EN_ATTENTE', 'ACTIF'], 'MODIFICATION', 'MILITANT_A_VERIFIER'); });
on('POST', '/militants/:id/desactiver', (_p, b, r) => { exiger('militants:desactiver'); if (!b.motif) throw err(400, 'Motif obligatoire'); return statut(r[1], 'INACTIF', ['EN_ATTENTE', 'ACTIF', 'A_VERIFIER'], 'DESACTIVATION', 'MILITANT_DESACTIVATION', b.motif); });
on('POST', '/militants/:id/reactiver', (_p, _b, r) => { exiger('militants:desactiver'); return statut(r[1], 'ACTIF', ['INACTIF'], 'REACTIVATION', 'MILITANT_REACTIVATION'); });

on('GET', '/qualite/doublons', (p) => {
  exiger('qualite');
  const vue = (m: Any) => ({ id: m.id, numero: m.numero, nom: m.nom, prenoms: m.prenoms, sexe: m.sexe, date_naissance: m.date_naissance, quartier: quartiers[m.quartier_id - 1].nom, statut: m.statut, date_enregistrement: m.date_enregistrement, telephone_suffixe: m.telephone?.slice(-4) || null, adresse: m.adresse });
  return pairesDoublons(filtrer({ ...p, statut: undefined }, { periode: false })).sort((a, b) => b.score - a.score).slice(0, 200).map((x) => ({ motif: x.motif, score: x.score, a: vue(x.a), b: vue(x.b) }));
});
on('POST', '/qualite/doublons/ecarter', (_p, b) => { exiger('qualite'); const [x, y] = [b.a, b.b].sort(); ecartes.add(`${x}|${y}`); journaliser('DOUBLON_ECARTE', { entite: 'militant', entite_id: x }); return { ok: true }; });
on('POST', '/qualite/doublons/resoudre', (_p, b) => {
  exiger('qualite', 'militants:ecrire');
  const k = charger(b.conserver), m = charger(b.desactiver), avant = { ...m };
  Object.assign(m, { statut: 'INACTIF', motif_desactivation: 'DOUBLON', observations: [m.observations, `Doublon de ${k.numero}`].filter(Boolean).join('\n'), updated_at: new Date().toISOString(), version: m.version + 1 });
  tracer(m, 'DESACTIVATION', avant);
  journaliser('DOUBLON_RESOLU', { entite: 'militant', entite_id: m.id });
  return { ok: true };
});

on('GET', '/imports', () => { exiger('import'); return imports; });
on('POST', '/imports', async (p, fd: Any) => {
  exiger('import');
  const f = (fd as FormData).get('fichier') as File;
  if (!f) throw err(400, 'Fichier requis');
  if (!/\.csv$/i.test(f.name)) throw err(400, 'Dans la démo en ligne, seul le format CSV est lu. La plateforme installée lit aussi les fichiers Excel (.xlsx).');
  const txt = (await f.text()).replace(/^﻿/, '');
  const lignes = txt.split(/\r?\n/).filter((l) => l.trim());
  const sep = (lignes[0].match(/;/g) || []).length >= (lignes[0].match(/,/g) || []).length ? ';' : ',';
  const ent = lignes[0].split(sep).map((h) => normaliserTexte(h.replace(/\(.*\)/, '')));
  const col = (row: string[], ...noms: string[]) => { const i = ent.findIndex((h) => noms.includes(h)); return i >= 0 ? (row[i] || '').trim() : ''; };
  const vus = new Set<string>(); const rapport: Any[] = []; const valides: Any[] = [];
  lignes.slice(1).forEach((l, i) => {
    const r = l.split(sep);
    const d: Any = { nom: col(r, 'nom'), prenoms: col(r, 'prenom s', 'prenoms', 'prenom'), sexe: col(r, 'sexe').toUpperCase().slice(0, 1), telephone: col(r, 'telephone', 'tel') };
    const commune = communes.find((c) => normaliserTexte(c.nom) === normaliserTexte(col(r, 'commune')));
    const q = commune && quartiers.find((x) => x.commune_id === commune.id && normaliserTexte(x.nom) === normaliserTexte(col(r, 'quartier')));
    const erreurs: string[] = [];
    if (!d.nom) erreurs.push('nom : obligatoire'); if (!d.prenoms) erreurs.push('prénoms : obligatoire'); if (!['M', 'F'].includes(d.sexe)) erreurs.push('sexe : M ou F');
    if (!commune) erreurs.push(`Commune inconnue : « ${col(r, 'commune')} »`); else if (!q) erreurs.push(`Quartier inconnu : « ${col(r, 'quartier')} »`); else if (!quartierScope(q)) erreurs.push('Quartier hors de votre périmètre');
    if (d.telephone && !normaliserTelephone(d.telephone)) erreurs.push('telephone : Numéro de téléphone invalide');
    const tel = normaliserTelephone(d.telephone);
    let doublon: string | null = null;
    for (const k of [tel && `t${tel}`, `i${normaliserTexte(d.nom + d.prenoms)}${q?.id}`].filter(Boolean) as string[]) { if (vus.has(k)) doublon = 'Doublon dans le fichier'; vus.add(k); }
    if (!doublon && tel && militants.some((m) => m.statut !== 'INACTIF' && m.telephone === tel)) doublon = 'Téléphone déjà enregistré';
    const e = { ligne: i + 2, nom: `${d.prenoms} ${d.nom}`.trim(), erreurs, doublon };
    rapport.push(e);
    if (!erreurs.length) valides.push({ e, d: { ...d, quartier_id: q!.id, information_personne: /^(oui|o|1|x)$/i.test(col(r, 'personne informee')) } });
  });
  const aInserer = valides.filter((x) => p.inclure_doublons === 'true' || !x.e.doublon);
  const simulation = p.simulation !== 'false';
  const synthese = { fichier: f.name, lignes: rapport.length, valides: valides.length, rejetees: rapport.filter((r) => r.erreurs.length).length, doublons: rapport.filter((r) => r.doublon).length, a_inserer: aInserer.length, simulation };
  if (!simulation) {
    for (const x of aInserer) routes.find((rt) => rt[0] === 'POST' && rt[1].test('/militants'))![2]({ forcer: 'true' }, { ...x.d, source: 'IMPORT' }, [] as any);
    imports.unshift({ id: imports.length + 1, fichier: f.name, lignes_total: rapport.length, lignes_inserees: aInserer.length, lignes_rejetees: synthese.rejetees, doublons: synthese.doublons, created_at: new Date().toISOString(), auteur: `${session!.prenoms} ${session!.nom}` });
    journaliser('IMPORT', { details: synthese });
  } else journaliser('IMPORT_SIMULATION', { details: synthese });
  return { synthese, rapport: rapport.filter((r) => r.erreurs.length || r.doublon) };
});

on('GET', '/utilisateurs', () => {
  exiger('utilisateurs:gerer');
  return utilisateurs.map((u) => ({ ...u, perimetres: u.perimetres.map((p: Any) => ({ ...p, commune: communes[p.commune_id - 1].nom, quartier: p.quartier_id ? quartiers[p.quartier_id - 1].nom : null })) }));
});
const motTemp = () => `Kr${Math.random().toString(36).slice(2, 10)}#${Math.floor(Math.random() * 90 + 10)}`;
on('POST', '/utilisateurs', (_p, b) => {
  exiger('utilisateurs:gerer');
  if (!/^[a-z0-9._-]{3,60}$/.test(b.identifiant || '')) throw err(400, 'Identifiant : 3 à 60 caractères (lettres, chiffres, . _ -)');
  if (utilisateurs.some((u) => u.identifiant === b.identifiant)) throw err(409, 'Cet enregistrement existe déjà');
  if (ROLES_PERIM.has(b.role) && !b.perimetres.length) throw err(400, 'Ce profil nécessite au moins un périmètre territorial');
  utilisateurs.push({ ...b, id: utilisateurs.length + 1, doit_changer_mdp: true, verrouille: false, derniere_connexion: null, created_at: new Date().toISOString() });
  journaliser('UTILISATEUR_CREATION', { entite: 'utilisateur', details: { identifiant: b.identifiant, role: b.role } });
  return { id: utilisateurs.length, motDePasseTemporaire: motTemp() };
});
on('PUT', '/utilisateurs/:id', (_p, b, r) => {
  exiger('utilisateurs:gerer');
  const u = utilisateurs.find((x) => x.id === Number(r[1]))!;
  if (u.id === session!.id && (b.role !== 'ADMIN' || !b.actif)) throw err(400, "Vous ne pouvez pas retirer vos propres droits d'administration");
  Object.assign(u, b); return { ok: true };
});
on('POST', '/utilisateurs/:id/reinitialiser', (_p, _b, r) => { exiger('utilisateurs:gerer'); const u = utilisateurs.find((x) => x.id === Number(r[1]))!; u.doit_changer_mdp = true; return { motDePasseTemporaire: motTemp() }; });
on('POST', '/utilisateurs/:id/deverrouiller', (_p, _b, r) => { exiger('utilisateurs:gerer'); utilisateurs.find((x) => x.id === Number(r[1]))!.verrouille = false; return { ok: true }; });

on('GET', '/audit', (p) => {
  exiger('audit:lire');
  const l = journal.filter((j) => (!p.action || j.action.startsWith(p.action)) && (!p.succes || String(j.succes) === p.succes));
  const page = Number(p.page) || 1;
  return { total: l.length, page, taille: 50, resultats: l.slice((page - 1) * 50, page * 50), actions: [...new Set(journal.map((j) => j.action))].sort() };
});
on('GET', '/audit/integrite', () => { exiger('audit:lire'); return { lignes: journal.length, anomalies: 0, premiere_anomalie: null, integre: true }; });

// ------------------------------------------------------------------ Point d'entrée
export async function demoFetch(method: string, path: string, body?: any, params?: Any) {
  await new Promise((r) => setTimeout(r, 60)); // latence réaliste
  const p = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]));
  for (const [m, re, h] of routes) {
    const match = path.match(re);
    if (m === method && match) return structuredClone(await h(p, body || {}, match));
  }
  throw err(404, 'Ressource inconnue');
}
