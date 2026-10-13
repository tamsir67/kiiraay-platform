export type Role = 
  | 'admin'
  | 'coordonnateur'
  | 'superviseur'
  | 'commissaire'
  | 'saisie'
  | 'decideur'
  | 'militant';

export type StatutMilitant = 'actif' | 'en_attente' | 'a_verifier' | 'desactive';

export type Sexe = 'M' | 'F';

export interface Commune {
  id: string;
  nom: string;
  code: string;
  coordonnateur: string;
  telephoneCoordonnateur: string;
  objectifMilitants: number;
  description: string;
  couleur: string;
  centre: [number, number]; // [lat, lng]
  populationRgph2023?: number;
  arrondissement?: string;
  nbQuartiersAnnonce?: number;
  nbQuartiersRepertoire?: number;
}

export interface Quartier {
  id: string;
  codeQuartier?: string;
  communeId: string;
  nom: string;
  commissaire: string;
  telephoneCommissaire: string;
  superviseur: string;
  centre: [number, number];
  objectif: number;
  typeHabitat?: string;
  niveau?: string;
  remarque?: string;
  source?: string;
}

export interface Secteur {
  id: string;
  quartierId: string;
  nom: string;
  objectif: number;
}

export interface Militant {
  id: string;
  numeroKry: string; // Ex: KRY-GDW-2027-04812
  prenom: string;
  nom: string;
  sexe: Sexe;
  dateNaissance: string; // YYYY-MM-DD
  telephone: string; // Chiffré en production, format sénégalais +221 7X XXX XX XX
  email?: string;
  cni?: string; // 13 chiffres
  communeId: string;
  quartierId: string;
  secteurId?: string;
  adresse: string;
  repere: string; // Ex: En face Mosquée Thierno, près boulangerie
  latitude: number;
  longitude: number;
  precisionGps?: number; // Précision en mètres retournée par le GPS de l'appareil
  sourceGps?: 'appareil' | 'quartier_referentiel' | 'manuel';
  statut: StatutMilitant;
  motifDesactivation?: string;
  sourceCollecte: string; // Porte-à-porte, Meeting, Réseaux sociaux, Parrainage, Permanence
  fonctionParti?: string; // Militant de base, Délégué de secteur, Responsable des jeunes, Responsable des femmes
  personneInformee: boolean; // Consentement loi sénégalaise 2008-12
  dateAdhesion: string;
  derniereModification: string;
  modifiePar: string;
  version: number;
  carteDelivree: boolean;
  dateDelivranceCarte?: string;
  jetonSecurise: string; // Jeton HMAC pour vérification du QR Code
}

export interface HistoriqueModification {
  id: string;
  militantId: string;
  auteur: string;
  role: Role;
  date: string;
  champModifie: string;
  ancienneValeur: string;
  nouvelleValeur: string;
}

export interface DoublonDetecte {
  id: string;
  militant1: Militant;
  militant2: Militant;
  motif: 'telephone' | 'cni' | 'nom_date_naissance' | 'proximite_adresse';
  scoreCertitude: number; // 0 à 100%
  statut: 'a_traiter' | 'ecarte' | 'fusionne';
  dateDetection: string;
}

export interface Utilisateur {
  id: string;
  identifiant: string;
  nomComplet: string;
  role: Role;
  email: string;
  telephone: string;
  communeId?: string; // Périmètre territorial
  quartierIds?: string[]; // Si superviseur ou commissaire
  militantId?: string; // Si compte militant
  actif: boolean;
  avatar?: string;
}

export interface AuditEntry {
  id: number;
  timestamp: string;
  utilisateur: string;
  role: Role;
  action: string;
  details: string;
  entiteType: 'militant' | 'utilisateur' | 'territoire' | 'export' | 'import' | 'carte';
  entiteId?: string;
  ip: string;
  precedentHash: string;
  hash: string;
}

export interface MessageDiscussion {
  id: string;
  expediteurId: string;
  expediteurNom: string;
  destinataireId: string;
  destinataireNom: string;
  objet: string;
  contenu: string;
  dateEnvoi: string;
  lu: boolean;
  priorite: 'normale' | 'urgente';
}

export interface FiltreMilitants {
  recherche: string;
  communeId: string;
  quartierId: string;
  statut: string;
  sexe: string;
  trancheAge: string;
  responsableId: string;
  source: string;
  qualite: string; // 'tous' | 'sans_gps' | 'sans_cni' | 'non_informe'
}
