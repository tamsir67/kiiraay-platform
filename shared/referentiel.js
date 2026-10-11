// =====================================================================
// KIIRAAY — Référentiels métier partagés (backend, seed, démo frontend)
// Les noms de quartiers sont un RÉFÉRENTIEL DE DÉMARRAGE : ils doivent être
// validés par le comité de pilotage (CDC §15) puis ajustés dans l'écran
// « Territoires » ou par import.
// =====================================================================

export const DEPARTEMENT = { code: 'GDW', nom: 'Guédiawaye' };

export const COMMUNES = [
  { code: 'GS', nom: 'Golf Sud', court: 'Golf S.', objectif: 3200 },
  { code: 'MG', nom: 'Médina Gounass', court: 'Médina G.', objectif: 2400 },
  { code: 'NL', nom: 'Ndiarème Limamoulaye', court: 'Ndiarème', objectif: 2800 },
  { code: 'SN', nom: 'Sam Notaire', court: 'Sam N.', objectif: 2600 },
  { code: 'WN', nom: 'Wakhinane Nimzatt', court: 'Wakhinane', objectif: 2700 },
];

// L'ordre correspond à l'index des cellules dans shared/geo/guediawaye.geojson
export const QUARTIERS = {
  GS: ['Golf Nord', 'Hamo 1', 'Hamo 2', 'Cité Golf', 'Hamo 3', 'Angle Mousse',
       'Hamo 4', 'Hamo 5', 'Cité Sotiba', 'Hamo 6', 'Fith Mith', 'Golf Extension'],
  SN: ['Sam Notaire Plage', 'Sam Sam', 'Cité Baraka', 'Sam Notaire 1',
       'Darou Missette', 'Sam Notaire 2', 'Cité Aynoumadi', 'Cité Soleil'],
  NL: ['Ndiarème Plage', 'Ndiarème Nord', 'Limamoulaye 1', 'Cité Comico', 'Ndiarème Sud',
       'Limamoulaye 2', 'Darou Khoudoss', 'Cité Sonatel', 'Médine'],
  WN: ['Wakhinane Plage', 'Wakhinane 1', 'Nimzatt', 'Wakhinane 2', 'Daroukhane',
       'Sotrac', 'Cité Hamo Tefess', 'Nimzatt Extension', 'Wakhinane 3'],
  MG: ['Médina Gounass Nord', 'Darou Rahmane 1', 'Touba Gounass', 'Darou Rahmane 2',
       'Darou Salam', 'Bène Barack', 'Cité Millionnaire', 'Médina Gounass Sud'],
};

export const ROLES = {
  ADMIN: 'Administrateur central',
  COORDONNATEUR: 'Coordonnateur',
  SUPERVISEUR: 'Superviseur',
  COMMISSAIRE: 'Commissaire',
  OPERATEUR: 'Opérateur de saisie',
  DECIDEUR: 'Décideur / Consultation',
  MILITANT: 'Militant',
};

// Matrice des droits (CDC §4). Toute vérification côté API passe par ici.
export const PERMISSIONS = {
  ADMIN:         ['dashboard', 'carte:points', 'militants:lire', 'militants:ecrire', 'militants:valider', 'militants:desactiver', 'militants:pii', 'export', 'export:pii', 'import', 'responsables:gerer', 'territoires:gerer', 'utilisateurs:gerer', 'audit:lire', 'qualite', 'messagerie'],
  COORDONNATEUR: ['dashboard', 'carte:points', 'militants:lire', 'militants:ecrire', 'militants:valider', 'militants:desactiver', 'militants:pii', 'export', 'export:pii', 'import', 'responsables:gerer', 'qualite', 'messagerie'],
  SUPERVISEUR:   ['dashboard', 'carte:points', 'militants:lire', 'militants:ecrire', 'militants:pii', 'export', 'qualite', 'messagerie'],
  COMMISSAIRE:   ['dashboard', 'carte:points', 'militants:lire', 'militants:ecrire', 'militants:pii', 'messagerie'],
  OPERATEUR:     ['militants:lire', 'militants:ecrire', 'militants:pii', 'import', 'messagerie'],
  DECIDEUR:      ['dashboard', 'messagerie'],
  MILITANT:      ['espace:personnel', 'messagerie'],
};

export const can = (role, perm) => (PERMISSIONS[role] || []).includes(perm);

export const STATUTS = {
  EN_ATTENTE: { libelle: 'En attente de validation', couleur: 'amber' },
  ACTIF:      { libelle: 'Actif', couleur: 'green' },
  A_VERIFIER: { libelle: 'À vérifier', couleur: 'blue' },
  INACTIF:    { libelle: 'Désactivé', couleur: 'grey' },
};

export const FONCTIONS = {
  COORDONNATEUR: 'Coordonnateur',
  SUPERVISEUR: 'Superviseur',
  COMMISSAIRE: 'Commissaire',
};

export const SOURCES = [
  { code: 'TERRAIN', libelle: 'Collecte terrain (porte-à-porte)' },
  { code: 'MEETING', libelle: 'Meeting / rassemblement' },
  { code: 'PERMANENCE', libelle: 'Permanence du parti' },
  { code: 'PARRAINAGE', libelle: 'Parrainage par un militant' },
  { code: 'EN_LIGNE', libelle: 'Formulaire en ligne' },
  { code: 'IMPORT', libelle: 'Import de fichier' },
];

export const MOTIFS_DESACTIVATION = [
  { code: 'DEMISSION', libelle: 'Démission / retrait volontaire' },
  { code: 'DEMENAGEMENT', libelle: 'Déménagement hors du département' },
  { code: 'DOUBLON', libelle: 'Doublon fusionné' },
  { code: 'DECES', libelle: 'Décès' },
  { code: 'ERREUR', libelle: 'Fiche erronée' },
  { code: 'OPPOSITION', libelle: 'Opposition au traitement des données' },
];

export const TRANCHES_AGE = [
  { code: '18-25', min: 18, max: 25 },
  { code: '26-35', min: 26, max: 35 },
  { code: '36-45', min: 36, max: 45 },
  { code: '46-60', min: 46, max: 60 },
  { code: '60+', min: 61, max: 200 },
];

// Une fiche est « à mettre à jour » si elle n'a pas été révisée depuis ce délai
export const DELAI_MISE_A_JOUR_MOIS = 12;

// Normalisation d'un numéro sénégalais au format E.164 (+221XXXXXXXXX)
export function normaliserTelephone(raw) {
  if (raw == null) return null;
  let d = String(raw).replace(/[^\d+]/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (d.startsWith('+')) {
    return /^\+\d{8,15}$/.test(d) ? d : null;
  }
  if (/^221\d{9}$/.test(d)) return '+' + d;
  if (/^[37]\d{8}$/.test(d)) return '+221' + d;
  return null;
}

export function masquerTelephone(e164) {
  if (!e164) return null;
  const local = e164.replace(/^\+221/, '');
  return local.length >= 9 ? `${local.slice(0, 2)} ••• •• ${local.slice(-2)}` : '•••';
}

export function formaterTelephone(e164) {
  if (!e164) return '';
  const l = e164.replace(/^\+221/, '');
  return l.length === 9 ? `${l.slice(0, 2)} ${l.slice(2, 5)} ${l.slice(5, 7)} ${l.slice(7)}` : e164;
}

export function normaliserNumeroCni(raw) {
  if (raw == null) return null;
  const numero = String(raw).replace(/[\s-]/g, '');
  return /^\d{13}$/.test(numero) ? numero : null;
}

// Normalisation pour comparaison (accents, casse, espaces)
export function normaliserTexte(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
