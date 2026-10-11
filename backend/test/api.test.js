// Tests de recette de l'API (CDC §14). Prérequis : base seedée + API démarrée.
//   API_URL=http://localhost:4000 npm test
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL || 'http://localhost:4000';
const MDP = process.env.SEED_PASSWORD || 'Kiiraay@2027!';
const jetons = {};
// Numéros uniques à chaque exécution (les tests sont rejouables sur la même base)
const n7 = () => String(Math.floor(Math.random() * 1e7)).padStart(7, '0');
const TEL_A = `77${n7()}`, TEL_B = `78${n7()}`, TEL_C = `76${n7()}`;
const fmt = (t) => `${t.slice(0, 2)} ${t.slice(2, 5)} ${t.slice(5, 7)} ${t.slice(7)}`;
const SUFFIXE = Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');

async function api(role, method, path, body, { raw = false, headers = {} } = {}) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: { ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...(role ? { authorization: `Bearer ${jetons[role]}` } : {}), ...headers },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const txt = await res.text();
  return { status: res.status, data: txt ? JSON.parse(txt) : null, headers: res.headers };
}

before(async () => {
  for (const id of ['admin', 'coord.golfsud', 'sup.golfsud', 'commissaire.hamo', 'saisie', 'decideur']) {
    const r = await api(null, 'POST', '/auth/login', { identifiant: id, motDePasse: MDP });
    assert.equal(r.status, 200, `connexion ${id}`);
    jetons[id] = r.data.accessToken;
  }
});

test('authentification : refus sans jeton et mot de passe erroné journalisé', async () => {
  assert.equal((await api(null, 'GET', '/militants')).status, 401);
  assert.equal((await api(null, 'POST', '/auth/login', { identifiant: 'decideur', motDePasse: 'mauvais' })).status, 401);
  const j = await api('admin', 'GET', '/audit?action=CONNEXION_ECHEC');
  assert.ok(j.data.resultats.some((l) => l.details?.identifiant === 'decideur'));
});

test('droits : le décideur voit le dashboard mais aucune fiche nominative', async () => {
  assert.equal((await api('decideur', 'GET', '/dashboard')).status, 200);
  assert.equal((await api('decideur', 'GET', '/militants')).status, 403);
  assert.equal((await api('decideur', 'GET', '/carte/points')).status, 403);
  assert.equal((await api('decideur', 'GET', '/exports/militants.csv')).status, 403);
});

test('périmètre : le coordonnateur de Golf Sud ne voit que Golf Sud', async () => {
  const r = await api('coord.golfsud', 'GET', '/militants?taille=200&statut=TOUS');
  assert.equal(r.status, 200);
  assert.ok(r.data.total > 0);
  assert.ok(r.data.resultats.every((m) => m.commune === 'Golf Sud'));
  const d = await api('coord.golfsud', 'GET', '/dashboard');
  assert.equal(d.data.par_commune.length, 1);
  assert.equal(d.data.kpis.communes_total, 1);
});

test('périmètre : le commissaire est limité à son quartier et ne peut pas créer ailleurs', async () => {
  const r = await api('commissaire.hamo', 'GET', '/militants?taille=200');
  const quartiers = new Set(r.data.resultats.map((m) => m.quartier));
  assert.equal(quartiers.size, 1);
  const terr = await api('admin', 'GET', '/territoires');
  const autre = terr.data.find((c) => c.code === 'MG').quartiers[0];
  const c = await api('commissaire.hamo', 'POST', '/militants', { nom: 'Test', prenoms: 'Hors', sexe: 'M', quartier_id: autre.id });
  assert.equal(c.status, 403);
});

test('recherche multicritère par nom, téléphone et numéro en moins de 2 s', async () => {
  const t0 = Date.now();
  const r = await api('admin', 'GET', '/militants?q=diop&commune=1');
  assert.ok(Date.now() - t0 < 2000);
  assert.ok(r.data.resultats.every((m) => /diop/i.test(m.nom + m.prenoms + (m.adresse || ''))));
  const fiche = await api('admin', 'GET', `/militants/${r.data.resultats[0].id}`);
  if (fiche.data.telephone) {
    const parTel = await api('admin', 'GET', `/militants?statut=TOUS&q=${encodeURIComponent(fiche.data.telephone.replace('+221', ''))}`);
    assert.ok(parTel.data.resultats.some((m) => m.id === fiche.data.id));
  }
  const parNum = await api('admin', 'GET', `/militants?statut=TOUS&q=${fiche.data.numero}`);
  assert.equal(parNum.data.resultats[0].id, fiche.data.id);
});

test('cycle de vie : création, doublon, validation, modification, historique, désactivation', async () => {
  const terr = await api('admin', 'GET', '/territoires');
  const q = terr.data.find((c) => c.code === 'GS').quartiers.find((x) => x.nom === 'Hamo 1');
  const fiche = { nom: 'Ndiaye', prenoms: `Recette ${SUFFIXE}`, sexe: 'F', telephone: fmt(TEL_A), quartier_id: q.id,
    adresse: 'Villa 1', information_personne: true, date_naissance: '1990-05-01' };
  // L'opérateur crée : statut en attente
  const c = await api('saisie', 'POST', '/militants', fiche);
  assert.equal(c.status, 201, JSON.stringify(c.data));
  assert.equal(c.data.statut, 'EN_ATTENTE');
  // Doublon détecté (même téléphone, autre écriture)
  const d = await api('saisie', 'POST', '/militants', { ...fiche, prenoms: `RECETTE ${SUFFIXE}`.toUpperCase(), telephone: `+221${TEL_A}` });
  assert.equal(d.status, 409);
  assert.equal(d.data.code, 'DOUBLON');
  // L'opérateur ne peut pas valider ; le coordonnateur oui
  assert.equal((await api('saisie', 'POST', `/militants/${c.data.id}/valider`)).status, 403);
  assert.equal((await api('coord.golfsud', 'POST', `/militants/${c.data.id}/valider`)).status, 200);
  // Modification avec verrou optimiste
  const f = (await api('coord.golfsud', 'GET', `/militants/${c.data.id}`)).data;
  assert.equal(f.telephone, `+221${TEL_A}`);
  assert.equal((await api('coord.golfsud', 'PUT', `/militants/${c.data.id}`, { ...fiche, repere: 'Près du marché', version: f.version })).status, 200);
  assert.equal((await api('coord.golfsud', 'PUT', `/militants/${c.data.id}`, { ...fiche, version: f.version })).status, 409);
  // Historique
  const h = await api('coord.golfsud', 'GET', `/militants/${c.data.id}/historique`);
  assert.deepEqual(h.data.map((x) => x.operation), ['MODIFICATION', 'VALIDATION', 'CREATION']);
  assert.ok(h.data[0].champs.includes('repere'));
  // Désactivation : motif obligatoire
  assert.equal((await api('coord.golfsud', 'POST', `/militants/${c.data.id}/desactiver`, {})).status, 400);
  assert.equal((await api('coord.golfsud', 'POST', `/militants/${c.data.id}/desactiver`, { motif: 'ERREUR' })).status, 200);
});

test('inscription militante, validation admin et accès limité à sa fiche', async () => {
  const terr = await api('admin', 'GET', '/territoires');
  const quartier = terr.data.find((c) => c.code === 'GS').quartiers.find((x) => x.nom === 'Hamo 1');
  const numero = `78${n7()}`;
  const identifiant = `membre.${SUFFIXE}`;
  const naissance = '1992-04-12';
  const fiche = await api('admin', 'POST', '/militants', {
    nom: 'Sow', prenoms: `Membre ${SUFFIXE}`, sexe: 'F', telephone: fmt(numero), quartier_id: quartier.id,
    date_naissance: naissance, information_personne: true,
  });
  assert.equal(fiche.status, 201, JSON.stringify(fiche.data));
  const demande = await api(null, 'POST', '/auth/inscription', {
    identifiant, nom: 'Sow', prenoms: `Membre ${SUFFIXE}`, numero: fiche.data.numero,
    date_naissance: naissance, telephone: fmt(numero), motDePasse: 'Membre@2027!ok',
  });
  assert.equal(demande.status, 202, JSON.stringify(demande.data));
  const users = await api('admin', 'GET', '/utilisateurs');
  const membre = users.data.find((u) => u.identifiant === identifiant);
  assert.ok(membre);
  assert.equal(membre.actif, false);
  assert.equal(membre.numero_militant, fiche.data.numero);
  assert.equal(membre.telephone, `+221${numero}`);
  assert.equal((await api(null, 'POST', '/auth/login', { identifiant, motDePasse: 'Membre@2027!ok' })).status, 401);

  const activation = await api('admin', 'PUT', `/utilisateurs/${membre.id}`, {
    identifiant, email: null, telephone: membre.telephone, nom: membre.nom, prenoms: membre.prenoms,
    role: membre.role, responsable_id: null, actif: true, perimetres: [],
  });
  assert.equal(activation.status, 200);
  const connexion = await api(null, 'POST', '/auth/login', { identifiant, motDePasse: 'Membre@2027!ok' });
  assert.equal(connexion.status, 200);
  jetons[identifiant] = connexion.data.accessToken;
  assert.equal((await api(identifiant, 'GET', '/espace/mon-espace')).data.id, fiche.data.id);
  assert.equal((await api(identifiant, 'GET', '/militants')).status, 403);
});

test('messagerie : conversation privée entre deux comptes actifs', async () => {
  const users = await api('admin', 'GET', '/utilisateurs');
  const membre = users.data.find((u) => u.role === 'MILITANT' && u.actif);
  const admin = users.data.find((u) => u.role === 'ADMIN' && u.actif);
  assert.ok(membre && admin);
  const ouvert = await api('admin', 'POST', '/messagerie/conversations', { utilisateur_id: membre.id });
  assert.equal(ouvert.status, 200);
  const envoye = await api(membre.identifiant, 'POST', `/messagerie/conversations/${ouvert.data.id}/messages`, { contenu: `Bonjour ${SUFFIXE}` });
  assert.equal(envoye.status, 201);
  const lu = await api('admin', 'GET', `/messagerie/conversations/${ouvert.data.id}/messages`);
  assert.equal(lu.status, 200);
  assert.equal(lu.data.at(-1).contenu, `Bonjour ${SUFFIXE}`);
  assert.equal((await api('decideur', 'GET', `/messagerie/conversations/${ouvert.data.id}/messages`)).status, 404);
});

test('données sensibles : téléphones chiffrés en base et masqués dans les listes', async () => {
  const r = await api('admin', 'GET', '/militants?taille=5');
  for (const m of r.data.resultats) {
    assert.equal(m.telephone, undefined);
    if (m.telephone_masque) assert.match(m.telephone_masque, /^•• ••• \d\d \d\d$/);
  }
});

test('qualité : doublons potentiels listés et résolubles', async () => {
  const r = await api('admin', 'GET', '/qualite/doublons');
  assert.equal(r.status, 200);
  assert.ok(r.data.length >= 10);
  const p = r.data[0];
  assert.equal((await api('admin', 'POST', '/qualite/doublons/ecarter', { a: p.a.id, b: p.b.id })).status, 200);
  const r2 = await api('admin', 'GET', '/qualite/doublons');
  assert.ok(!r2.data.some((x) => x.a.id === p.a.id && x.b.id === p.b.id));
});

test('import CSV : simulation, rapport d\'erreurs puis import réel', async () => {
  const csv = [
    'Nom;Prénom(s);Sexe;Téléphone;Commune;Quartier;Personne informée',
    `SECK;Mariama ${SUFFIXE};F;${fmt(TEL_B)};Golf Sud;Hamo 2;oui`,
    `FAYE;Ousmane ${SUFFIXE};M;${fmt(TEL_C)};Sam Notaire;Cité Baraka;non`,
    'INCONNU;Test;M;12;Commune X;Quartier Y;oui',
    `SECK;Mariama ${SUFFIXE};F;${fmt(TEL_B)};Golf Sud;Hamo 2;oui`,
  ].join('\n');
  const fd = () => { const f = new FormData(); f.append('fichier', new Blob([csv], { type: 'text/csv' }), 'test.csv'); return f; };
  const sim = await api('admin', 'POST', '/imports?simulation=true', fd());
  assert.equal(sim.status, 200, JSON.stringify(sim.data));
  assert.deepEqual([sim.data.synthese.lignes, sim.data.synthese.rejetees, sim.data.synthese.doublons, sim.data.synthese.a_inserer], [4, 1, 1, 2]);
  const reel = await api('admin', 'POST', '/imports?simulation=false', fd());
  assert.equal(reel.status, 201);
  assert.equal(reel.data.synthese.a_inserer, 2);
  const encore = await api('admin', 'POST', '/imports?simulation=true', fd());
  assert.equal(encore.data.synthese.a_inserer, 0, 'les lignes déjà importées sont détectées comme doublons');
});

test('exports conformes au profil et journalisés', async () => {
  const admin = await api('admin', 'GET', '/exports/militants.csv?commune=1&statut=ACTIF', null, { raw: true });
  assert.equal(admin.status, 200);
  const txt = await admin.text();
  assert.ok(txt.split('\n').slice(1, 20).some((l) => /;\d{2} \d{3} \d{2} \d{2};/.test(l)), 'téléphone complet pour l\'admin');
  const sup = await api('sup.golfsud', 'GET', '/exports/militants.csv', null, { raw: true });
  const t2 = await sup.text();
  assert.ok(!/Adresse/.test(t2.split('\n')[0]), 'pas d\'adresse pour le superviseur');
  assert.ok(t2.split('\n').slice(1, 5).every((l) => !l || /••/.test(l) || !/\d{2} \d{3} \d{2} \d{2}/.test(l)));
  const x = await api('admin', 'GET', '/exports/militants.xlsx?commune=2', null, { raw: true });
  assert.equal(x.status, 200);
  const j = await api('admin', 'GET', '/audit?action=EXPORT');
  assert.ok(j.data.total >= 3);
});

test('cartographie : GeoJSON des territoires et points sans données nominatives', async () => {
  const g = await api('decideur', 'GET', '/carte/territoires');
  assert.equal(g.data.type, 'FeatureCollection');
  assert.equal(g.data.features.filter((f) => f.properties.niveau === 'commune').length, 5);
  const p = await api('coord.golfsud', 'GET', '/carte/points');
  assert.ok(p.data.points.length > 100);
  assert.equal(p.data.points[0].length, 4);
});

test('journal d\'audit : append-only et chaîne d\'intégrité valide', async () => {
  const r = await api('admin', 'GET', '/audit/integrite');
  assert.equal(r.data.integre, true, JSON.stringify(r.data));
  assert.equal((await api('coord.golfsud', 'GET', '/audit')).status, 403);
});

test('verrouillage du compte après échecs répétés', async () => {
  for (let i = 0; i < 5; i++) await api(null, 'POST', '/auth/login', { identifiant: 'decideur', motDePasse: `faux${i}` });
  const r = await api(null, 'POST', '/auth/login', { identifiant: 'decideur', motDePasse: MDP });
  assert.equal(r.status, 423);
  // Déverrouillage par l'administrateur (réinitialisation)
  const users = await api('admin', 'GET', '/utilisateurs');
  const dec = users.data.find((u) => u.identifiant === 'decideur');
  assert.equal(dec.verrouille, true);
  assert.equal((await api('admin', 'POST', `/utilisateurs/${dec.id}/deverrouiller`)).status, 200);
  assert.equal((await api(null, 'POST', '/auth/login', { identifiant: 'decideur', motDePasse: MDP })).status, 200);
});
