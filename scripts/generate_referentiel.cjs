const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../communes.csv');
const csv = fs.readFileSync(csvPath, 'utf-8');
const lines = csv.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

const communeMeta = {
  GS: {
    id: 'golf-sud',
    nom: 'Golf Sud',
    code: 'GLF',
    coordonnateur: 'Ousmane Sall',
    tel: '+221 77 645 12 34',
    pop: 114069,
    arr: 'Sam Notaire',
    centre: [14.7785, -17.4082],
    color: '#059669',
    nbAnnonce: 35,
    obj: 15000,
    desc: 'Bordure maritime nord, zones résidentielles Hamo et cités côtières réputées.'
  },
  SN: {
    id: 'sam-notaire',
    nom: 'Sam Notaire',
    code: 'SMN',
    coordonnateur: 'Fatou Bintou Ndiaye',
    tel: '+221 70 890 22 11',
    pop: 80566,
    arr: 'Sam Notaire',
    centre: [14.7690, -17.4120],
    color: '#ea580c',
    nbAnnonce: 25,
    obj: 14000,
    desc: 'Centre administratif, préfecture, marchés centraux et cités planifiées.'
  },
  NL: {
    id: 'ndiareme-limamoulaye',
    nom: 'Ndiarème Limamoulaye',
    code: 'NDL',
    coordonnateur: 'Mamadou Lamine Diop',
    tel: '+221 76 333 45 67',
    pop: 36024,
    arr: 'Wakhinane Nimzatt',
    centre: [14.7720, -17.3980],
    color: '#7c3aed',
    nbAnnonce: 10,
    obj: 10000,
    desc: "Foyer spirituel et historique layène, cités d'auto-construction et littoral."
  },
  WN: {
    id: 'wakhinane-nimzatt',
    nom: 'Wakhinane Nimzatt',
    code: 'WKN',
    coordonnateur: 'Cheikh Tidiane Ba',
    tel: '+221 75 421 99 78',
    pop: 105461,
    arr: 'Wakhinane Nimzatt',
    centre: [14.7810, -17.3790],
    color: '#b45309',
    nbAnnonce: 45,
    obj: 16000,
    desc: 'Plus grande commune du département, cités des cadres de la fonction publique et extension est.'
  },
  MG: {
    id: 'medina-gounass',
    nom: 'Médina Gounass',
    code: 'MDG',
    coordonnateur: 'Aïssatou Diallo Ba',
    tel: '+221 78 512 88 90',
    pop: 36588,
    arr: 'Wakhinane Nimzatt',
    centre: [14.7645, -17.3872],
    color: '#0284c7',
    nbAnnonce: 42,
    obj: 12000,
    desc: 'Bassin de peuplement populaire dense, fort maillage associatif et marchand.'
  }
};

const supervisorsByCommune = {
  GS: ['Abdoulaye Wade Thiam', 'Aminata Touré', 'Malick Gningue'],
  SN: ['Moustapha Cissé', 'Khady Bâ', 'El Hadji Fall'],
  NL: ['Djibril Ndoye', 'Sokhna Mbaye'],
  WN: ['Babacar Ndiaye', 'Marième Sène', 'Ousseynou Diop'],
  MG: ['Oumar Sylla', 'Salif Sané']
};

const COMMISSAIRES_NAMES = [
  'Ibrahima Ndiaye', 'Mariama Sarr', 'Babacar Guèye', 'Awa Cissé', 'Moussa Kane',
  'Ndeye Fatou Diop', 'Seydou Camara', 'Khadija Sow', 'Alioune Fall', 'Bara Ndao',
  'Thierno Laye', 'Khadim Laye', 'Mame Diarra Bousso', 'Amadou Lamine', 'Moussa Faye',
  'Aïda Samb', 'Libasse Thiaw', 'Cheikh Sarr', 'Fatou Kiné Diagne', 'Abdoulaye Ly',
  'Coumba Kane', 'Amadou Sow', 'Mame Cheikh Ndir', 'Gorgui Wade', 'Adji Bousso',
  'El Hadji Diop', 'Binetou Tall', 'Modou Khoulé', 'Yacine Diagne', 'Serigne Mbacké',
  'Fallou Ndiaye', 'Aïssata Diallo', 'Idrissa Traoré', 'Massamba Guèye', 'El Hadji Malick Sy',
  'Rokhayatou Dia', 'Demba Ba', 'Boubacar Baldé', 'Astou Seck', 'Serigne Fallou Mbacké',
  'Ousmane Mané', 'Aissata Barry', 'Daouda Sow', 'Khadim Seck', 'Oumy Touré'
];

const countByCommune = { GS: 0, SN: 0, NL: 0, WN: 0, MG: 0 };
const quartiers = [];
let idx = 0;

for (const line of lines) {
  if (line.startsWith('code_commune;') || line.startsWith('code_quartier;')) continue;
  const parts = line.split(';');
  if (parts.length >= 5 && parts[0].includes('-')) {
    const [code_quartier, code_commune, commune, niveau, nom, type_habitat, source, remarque] = parts;
    const meta = communeMeta[code_commune];
    if (!meta) continue;

    countByCommune[code_commune]++;
    const cIdx = countByCommune[code_commune];

    const id = code_quartier.toLowerCase();
    const supList = supervisorsByCommune[code_commune];
    const sup = supList[(cIdx - 1) % supList.length];

    const isVacant = (cIdx % 8 === 7);
    const commName = isVacant ? 'Non pourvu' : COMMISSAIRES_NAMES[idx % COMMISSAIRES_NAMES.length];
    const commTel = isVacant ? '' : `+221 7${7 + (idx % 2)} ${String(100 + (idx * 23) % 899).padStart(3, '0')} ${String(10 + (idx * 17) % 89).padStart(2, '0')} ${String(10 + (idx * 31) % 89).padStart(2, '0')}`;

    const angle = ((cIdx - 1) * 2.39996);
    const radiusLat = 0.0016 + ((cIdx % 6) * 0.0013);
    const radiusLng = 0.0020 + ((cIdx % 8) * 0.0015);
    const lat = Number((meta.centre[0] + Math.sin(angle) * radiusLat).toFixed(4));
    const lng = Number((meta.centre[1] + Math.cos(angle) * radiusLng).toFixed(4));

    const obj = 300 + ((idx * 37) % 650);

    quartiers.push({
      id,
      codeQuartier: code_quartier,
      communeId: meta.id,
      nom: nom.trim(),
      commissaire: commName,
      telephoneCommissaire: commTel,
      superviseur: sup,
      centre: [lat, lng],
      objectif: obj,
      typeHabitat: type_habitat ? type_habitat.trim() : undefined,
      niveau: (niveau || 'quartier').trim(),
      remarque: remarque ? remarque.trim() : undefined,
      source: source ? source.trim() : undefined
    });
    idx++;
  }
}

console.log('Quartiers count:', quartiers.length);
console.log('Per commune:', countByCommune);

let tsContent = `import { Commune, Quartier, Role, Utilisateur } from '../types';

export const COMMUNES_GUEDIAWAYE: Commune[] = [
  {
    id: 'golf-sud',
    nom: 'Golf Sud',
    code: 'GLF',
    coordonnateur: 'Ousmane Sall',
    telephoneCoordonnateur: '+221 77 645 12 34',
    objectifMilitants: 15000,
    description: 'Bordure maritime nord, zones résidentielles Hamo et cités côtières réputées.',
    couleur: '#059669', // Emerald
    centre: [14.7785, -17.4082],
    populationRgph2023: 114069,
    arrondissement: 'Sam Notaire',
    nbQuartiersAnnonce: 35,
    nbQuartiersRepertoire: 31
  },
  {
    id: 'medina-gounass',
    nom: 'Médina Gounass',
    code: 'MDG',
    coordonnateur: 'Aïssatou Diallo Ba',
    telephoneCoordonnateur: '+221 78 512 88 90',
    objectifMilitants: 12000,
    description: 'Bassin de peuplement populaire dense, fort maillage associatif et marchand.',
    couleur: '#0284c7', // Sky
    centre: [14.7645, -17.3872],
    populationRgph2023: 36588,
    arrondissement: 'Wakhinane Nimzatt',
    nbQuartiersAnnonce: 42,
    nbQuartiersRepertoire: 8
  },
  {
    id: 'ndiareme-limamoulaye',
    nom: 'Ndiarème Limamoulaye',
    code: 'NDL',
    coordonnateur: 'Mamadou Lamine Diop',
    telephoneCoordonnateur: '+221 76 333 45 67',
    objectifMilitants: 10000,
    description: 'Foyer spirituel et historique layène, cités d\\'auto-construction et littoral.',
    couleur: '#7c3aed', // Violet
    centre: [14.7720, -17.3980],
    populationRgph2023: 36024,
    arrondissement: 'Wakhinane Nimzatt',
    nbQuartiersAnnonce: 10,
    nbQuartiersRepertoire: 10
  },
  {
    id: 'sam-notaire',
    nom: 'Sam Notaire',
    code: 'SMN',
    coordonnateur: 'Fatou Bintou Ndiaye',
    telephoneCoordonnateur: '+221 70 890 22 11',
    objectifMilitants: 14000,
    description: 'Centre administratif, préfecture, marchés centraux et cités planifiées.',
    couleur: '#ea580c', // Orange
    centre: [14.7690, -17.4120],
    populationRgph2023: 80566,
    arrondissement: 'Sam Notaire',
    nbQuartiersAnnonce: 25,
    nbQuartiersRepertoire: 27
  },
  {
    id: 'wakhinane-nimzatt',
    nom: 'Wakhinane Nimzatt',
    code: 'WKN',
    coordonnateur: 'Cheikh Tidiane Ba',
    telephoneCoordonnateur: '+221 75 421 99 78',
    objectifMilitants: 16000,
    description: 'Plus grande commune du département, cités des cadres de la fonction publique et extension est.',
    couleur: '#b45309', // Amber
    centre: [14.7810, -17.3790],
    populationRgph2023: 105461,
    arrondissement: 'Wakhinane Nimzatt',
    nbQuartiersAnnonce: 45,
    nbQuartiersRepertoire: 23
  }
];

export const QUARTIERS_GUEDIAWAYE: Quartier[] = [
`;

for (const q of quartiers) {
  tsContent += `  {
    id: '${q.id}',
    codeQuartier: '${q.codeQuartier}',
    communeId: '${q.communeId}',
    nom: ${JSON.stringify(q.nom)},
    commissaire: ${JSON.stringify(q.commissaire)},
    telephoneCommissaire: '${q.telephoneCommissaire}',
    superviseur: ${JSON.stringify(q.superviseur)},
    centre: [${q.centre[0]}, ${q.centre[1]}],
    objectif: ${q.objectif}${q.typeHabitat ? `,\n    typeHabitat: ${JSON.stringify(q.typeHabitat)}` : ''}${q.niveau ? `,\n    niveau: ${JSON.stringify(q.niveau)}` : ''}${q.remarque ? `,\n    remarque: ${JSON.stringify(q.remarque)}` : ''}${q.source ? `,\n    source: ${JSON.stringify(q.source)}` : ''}
  },\n`;
}

tsContent += `];

export const DEMO_USERS: Utilisateur[] = [
  {
    id: 'user-admin',
    identifiant: 'admin',
    nomComplet: 'Mouhamadou Mansour Sy',
    role: 'admin',
    email: 'admin.central@kiiraay.sn',
    telephone: '+221 77 600 00 01',
    actif: true
  },
  {
    id: 'user-coord-golfsud',
    identifiant: 'coord.golfsud',
    nomComplet: 'Ousmane Sall',
    role: 'coordonnateur',
    email: 'coord.golfsud@kiiraay.sn',
    telephone: '+221 77 645 12 34',
    communeId: 'golf-sud',
    actif: true
  },
  {
    id: 'user-sup-golfsud',
    identifiant: 'sup.golfsud',
    nomComplet: 'Abdoulaye Wade Thiam',
    role: 'superviseur',
    email: 'sup.golfsud@kiiraay.sn',
    telephone: '+221 77 555 11 22',
    communeId: 'golf-sud',
    quartierIds: ['gs-01', 'gs-02', 'gs-03', 'gs-04', 'gs-05'],
    actif: true
  },
  {
    id: 'user-commissaire-hamo',
    identifiant: 'commissaire.fadia',
    nomComplet: 'Ibrahima Ndiaye',
    role: 'commissaire',
    email: 'commissaire.fadia@kiiraay.sn',
    telephone: '+221 77 201 11 22',
    communeId: 'golf-sud',
    quartierIds: ['gs-01'],
    actif: true
  },
  {
    id: 'user-saisie',
    identifiant: 'saisie',
    nomComplet: 'Aminata Badiane',
    role: 'saisie',
    email: 'saisie@kiiraay.sn',
    telephone: '+221 76 400 90 90',
    actif: true
  },
  {
    id: 'user-decideur',
    identifiant: 'decideur',
    nomComplet: 'Dr. Cheikh Anta Diop Junior',
    role: 'decideur',
    email: 'decideur.comite@kiiraay.sn',
    telephone: '+221 70 800 12 34',
    actif: true
  },
  {
    id: 'user-militant',
    identifiant: 'militant.demo',
    nomComplet: 'Ndeye Astou Diouf',
    role: 'militant',
    email: 'ndeye.diouf@gmail.com',
    telephone: '+221 77 345 88 12',
    communeId: 'golf-sud',
    quartierIds: ['gs-01'],
    militantId: 'mil-001',
    actif: true
  }
];

export const SOURCES_COLLECTE = [
  'Porte-à-porte',
  'Permanence communale',
  'Meeting politique',
  'Parrainage / Recommandation',
  'Réseaux sociaux & Web',
  'Caravane de proximité'
];

export const MOTIFS_DESACTIVATION = [
  'Déménagement hors Guédiawaye',
  'Décès',
  'Démission volontaire',
  'Incompatibilité statutaire',
  'Doublon confirmé et fusionné',
  'Sanction disciplinaire'
];

export const FONCTIONS_PARTI = [
  'Militant de base',
  'Délégué de secteur',
  'Membre cellule de quartier',
  'Responsable Mouvement des Jeunes',
  'Responsable Mouvement des Femmes',
  'Cadre et comité scientifique',
  'Agent électoral de bureau'
];

export const TRANCHES_AGE = [
  { id: '18-25', label: '18 - 25 ans' },
  { id: '26-35', label: '26 - 35 ans' },
  { id: '36-50', label: '36 - 50 ans' },
  { id: '51-65', label: '51 - 65 ans' },
  { id: '65+', label: 'Plus de 65 ans' }
];

export const PERMISSIONS_PAR_ROLE: Record<Role, {
  peutVoirDonneesPersonnelles: boolean;
  peutEcrire: boolean;
  peutValider: boolean;
  peutDesactiver: boolean;
  peutExporter: boolean;
  peutImporter: boolean;
  peutGererUtilisateurs: boolean;
  peutVoirAudit: boolean;
  peutVoirPointsGPS: boolean;
  perimetre: 'departement' | 'commune' | 'quartiers' | 'personnel';
}> = {
  admin: {
    peutVoirDonneesPersonnelles: true,
    peutEcrire: true,
    peutValider: true,
    peutDesactiver: true,
    peutExporter: true,
    peutImporter: true,
    peutGererUtilisateurs: true,
    peutVoirAudit: true,
    peutVoirPointsGPS: true,
    perimetre: 'departement'
  },
  coordonnateur: {
    peutVoirDonneesPersonnelles: true,
    peutEcrire: true,
    peutValider: true,
    peutDesactiver: true,
    peutExporter: true,
    peutImporter: true,
    peutGererUtilisateurs: false,
    peutVoirAudit: false,
    peutVoirPointsGPS: true,
    perimetre: 'commune'
  },
  superviseur: {
    peutVoirDonneesPersonnelles: true,
    peutEcrire: true,
    peutValider: true,
    peutDesactiver: false,
    peutExporter: false,
    peutImporter: false,
    peutGererUtilisateurs: false,
    peutVoirAudit: false,
    peutVoirPointsGPS: true,
    perimetre: 'quartiers'
  },
  commissaire: {
    peutVoirDonneesPersonnelles: true,
    peutEcrire: true,
    peutValider: false,
    peutDesactiver: false,
    peutExporter: false,
    peutImporter: false,
    peutGererUtilisateurs: false,
    peutVoirAudit: false,
    peutVoirPointsGPS: true,
    perimetre: 'quartiers'
  },
  saisie: {
    peutVoirDonneesPersonnelles: true,
    peutEcrire: true,
    peutValider: false,
    peutDesactiver: false,
    peutExporter: false,
    peutImporter: true,
    peutGererUtilisateurs: false,
    peutVoirAudit: false,
    peutVoirPointsGPS: true,
    perimetre: 'departement'
  },
  decideur: {
    peutVoirDonneesPersonnelles: false, // Données personnelles masquées (CDC §4)
    peutEcrire: false,
    peutValider: false,
    peutDesactiver: false,
    peutExporter: false,
    peutImporter: false,
    peutGererUtilisateurs: false,
    peutVoirAudit: false,
    peutVoirPointsGPS: false, // Pas de points individuels, vue agrégée uniquement
    perimetre: 'departement'
  },
  militant: {
    peutVoirDonneesPersonnelles: true,
    peutEcrire: false,
    peutValider: false,
    peutDesactiver: false,
    peutExporter: false,
    peutImporter: false,
    peutGererUtilisateurs: false,
    peutVoirAudit: false,
    peutVoirPointsGPS: false,
    perimetre: 'personnel'
  }
};
`;

const outputPath = path.resolve(__dirname, '../src/data/referentiel.ts');
fs.writeFileSync(outputPath, tsContent, 'utf-8');
console.log('Successfully written to:', outputPath);
