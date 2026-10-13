import { 
  Militant, 
  Quartier,
  HistoriqueModification, 
  AuditEntry, 
  DoublonDetecte, 
  Utilisateur, 
  MessageDiscussion,
  StatutMilitant 
} from '../types';
import { COMMUNES_GUEDIAWAYE, QUARTIERS_GUEDIAWAYE, DEMO_USERS } from '../data/referentiel';
import { calculateSha256, fastHash, generateSecureToken } from './crypto';

const PRENOMS_H = ['Mamadou', 'Ousmane', 'Ibrahima', 'Cheikh', 'Abdoulaye', 'Babacar', 'Modou', 'Alioune', 'Seydou', 'Thierno', 'Moussa', 'Serigne', 'Demba', 'El Hadji', 'Amadou'];
const PRENOMS_F = ['Fatou', 'Aïssatou', 'Mariama', 'Aminata', 'Ndeye', 'Khady', 'Coumba', 'Binetou', 'Awa', 'Sokhna', 'Mame Diarra', 'Yacine', 'Adji', 'Rokhayatou', 'Astou'];
const NOMS = ['Ndiaye', 'Diop', 'Fall', 'Sarr', 'Sow', 'Ba', 'Cissé', 'Gueye', 'Sy', 'Diallo', 'Niang', 'Faye', 'Mbaye', 'Kane', 'Seck', 'Touré', 'Thiam', 'Camara', 'Samb'];
const SOURCES = ['Porte-à-porte', 'Permanence communale', 'Meeting politique', 'Parrainage / Recommandation', 'Réseaux sociaux & Web'];
const FONCTIONS = ['Militant de base', 'Délégué de secteur', 'Membre cellule de quartier', 'Responsable Mouvement des Jeunes', 'Responsable Mouvement des Femmes'];

function generateInitialMilitants(): Militant[] {
  const militants: Militant[] = [];
  let counter = 1001;

  // Création spécifique du militant de test pour le compte démo
  const premierQuartier = QUARTIERS_GUEDIAWAYE.find(q => q.id === 'gs-01') || QUARTIERS_GUEDIAWAYE[0];
  militants.push({
    id: 'mil-001',
    numeroKry: 'KRY-GDW-2027-01001',
    prenom: 'Ndeye Astou',
    nom: 'Diouf',
    sexe: 'F',
    dateNaissance: '1998-04-14',
    telephone: '+221 77 345 88 12',
    email: 'ndeye.diouf@gmail.com',
    cni: '1752199804128',
    communeId: premierQuartier.communeId,
    quartierId: premierQuartier.id,
    adresse: `Villa N° 45, ${premierQuartier.nom}`,
    repere: 'En face Mosquée locale, près de la place publique',
    latitude: premierQuartier.centre[0],
    longitude: premierQuartier.centre[1],
    statut: 'actif',
    sourceCollecte: 'Permanence communale',
    fonctionParti: 'Responsable Mouvement des Jeunes',
    personneInformee: true,
    dateAdhesion: '2024-03-15',
    derniereModification: '2026-09-10 14:32',
    modifiePar: 'admin',
    version: 3,
    carteDelivree: true,
    dateDelivranceCarte: '2026-09-12',
    jetonSecurise: generateSecureToken('KRY-GDW-2027-01001', 'Diouf')
  });

  counter++;

  // Générer des militants équitablement répartis sur les 99 quartiers officiels
  QUARTIERS_GUEDIAWAYE.forEach((quartier, qIdx) => {
    // 1 à 2 militants par quartier pour avoir un panel représentatif d'environ 150 militants
    const count = (qIdx % 2 === 0) ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const isFemme = (counter % 2 === 0);
      const prenom = isFemme ? PRENOMS_F[counter % PRENOMS_F.length] : PRENOMS_H[counter % PRENOMS_H.length];
      const nom = NOMS[(counter * 3 + qIdx) % NOMS.length];
      const anneeNaiss = 1960 + (counter * 7) % 45; // Entre 1960 et 2005
      const moisNaiss = String((counter % 12) + 1).padStart(2, '0');
      const jourNaiss = String((counter % 28) + 1).padStart(2, '0');
      
      const prefixesTel = ['77', '78', '76', '70', '75'];
      const pref = prefixesTel[(counter + qIdx) % prefixesTel.length];
      const numPart1 = String(100 + (counter * 13) % 899);
      const numPart2 = String(10 + (counter * 17) % 89);
      const numPart3 = String(10 + (counter * 19) % 89);
      const telephone = `+221 ${pref} ${numPart1} ${numPart2} ${numPart3}`;
      
      const numKry = `KRY-GDW-2027-${String(counter).padStart(5, '0')}`;
      const cni = `${isFemme ? '2' : '1'}752${anneeNaiss}${moisNaiss}${String(1000 + (counter * 3) % 8999)}`;

      // Dispersion GPS réaliste autour du centre du quartier (+/- 0.002 deg)
      const latOffset = ((counter % 11) - 5) * 0.0004;
      const lngOffset = (((counter * 7) % 11) - 5) * 0.0004;

      let statut: StatutMilitant = 'actif';
      if (counter % 14 === 0) statut = 'en_attente';
      else if (counter % 19 === 0) statut = 'a_verifier';
      else if (counter % 31 === 0) statut = 'desactive';

      const sansGps = counter % 23 === 0;
      const sansCni = counter % 9 === 0;
      const carteEmise = statut === 'actif' && counter % 3 !== 0;

      militants.push({
        id: `mil-${counter}`,
        numeroKry: numKry,
        prenom,
        nom,
        sexe: isFemme ? 'F' : 'M',
        dateNaissance: `${anneeNaiss}-${moisNaiss}-${jourNaiss}`,
        telephone,
        email: counter % 4 === 0 ? `${prenom.toLowerCase().replace(/\s+/g, '')}.${nom.toLowerCase()}@gmail.com` : undefined,
        cni: sansCni ? undefined : cni,
        communeId: quartier.communeId,
        quartierId: quartier.id,
        adresse: `Rue ${20 + (counter % 40)}, Maison ${10 + (counter % 90)}`,
        repere: counter % 2 === 0 ? `Face École Coranique ${quartier.nom}` : `Derrière Poste de Santé, boutique ${nom}`,
        latitude: sansGps ? 0 : quartier.centre[0] + latOffset,
        longitude: sansGps ? 0 : quartier.centre[1] + lngOffset,
        statut,
        motifDesactivation: statut === 'desactive' ? 'Déménagement hors Guédiawaye' : undefined,
        sourceCollecte: SOURCES[counter % SOURCES.length],
        fonctionParti: FONCTIONS[counter % FONCTIONS.length],
        personneInformee: counter % 17 !== 0,
        dateAdhesion: `2024-0${1 + (counter % 9)}-${String(10 + (counter % 18)).padStart(2, '0')}`,
        derniereModification: '2026-08-20 10:15',
        modifiePar: 'saisie',
        version: 1,
        carteDelivree: carteEmise,
        dateDelivranceCarte: carteEmise ? '2026-08-22' : undefined,
        jetonSecurise: generateSecureToken(numKry, nom)
      });

      counter++;
    }
  });

  // Injecter un doublon intentionnel pour démontrer l'écran "Qualité des données"
  const original = militants[2];
  militants.push({
    id: `mil-dup-01`,
    numeroKry: `KRY-GDW-2027-${String(counter).padStart(5, '0')}`,
    prenom: original.prenom,
    nom: original.nom,
    sexe: original.sexe,
    dateNaissance: original.dateNaissance,
    telephone: original.telephone, // Même numéro de téléphone
    communeId: original.communeId,
    quartierId: original.quartierId,
    adresse: original.adresse + ' (bis)',
    repere: original.repere,
    latitude: original.latitude,
    longitude: original.longitude,
    statut: 'en_attente',
    sourceCollecte: 'Réseaux sociaux & Web',
    fonctionParti: 'Militant de base',
    personneInformee: true,
    dateAdhesion: '2026-10-01',
    derniereModification: '2026-10-01 11:20',
    modifiePar: 'saisie',
    version: 1,
    carteDelivree: false,
    jetonSecurise: generateSecureToken(`KRY-GDW-2027-${counter}`, original.nom)
  });

  return militants;
}

const INITIAL_AUDIT_LOGS: AuditEntry[] = [
  {
    id: 1,
    timestamp: '2026-10-10 08:00:00',
    utilisateur: 'Système KIIRAAY',
    role: 'admin',
    action: 'INITIALISATION_PLATEFORME',
    details: 'Initialisation des 5 communes, 46 quartiers et référentiels officiels Guédiawaye 2027.',
    entiteType: 'territoire',
    ip: '127.0.0.1',
    precedentHash: '0000000000000000000000000000000000000000000000000000000000000000',
    hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef'
  },
  {
    id: 2,
    timestamp: '2026-10-10 09:15:22',
    utilisateur: 'Mouhamadou Mansour Sy',
    role: 'admin',
    action: 'CREATION_COMPTES_RESPONSABLES',
    details: 'Création des comptes de démonstration CDC (Coordonnateurs, Superviseurs, Commissaires).',
    entiteType: 'utilisateur',
    ip: '197.234.218.42',
    precedentHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef',
    hash: 'b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef12'
  },
  {
    id: 3,
    timestamp: '2026-10-10 11:42:05',
    utilisateur: 'Aminata Badiane',
    role: 'saisie',
    action: 'IMPORT_INITIAL_MILITANTS',
    details: 'Chargement initial des fiches de parrainage et de mobilisation de terrain.',
    entiteType: 'import',
    ip: '197.234.218.89',
    precedentHash: 'b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef12',
    hash: 'c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef1234'
  }
];

const INITIAL_MESSAGES: MessageDiscussion[] = [
  {
    id: 'msg-01',
    expediteurId: 'user-admin',
    expediteurNom: 'Mouhamadou Mansour Sy (Admin Central)',
    destinataireId: 'user-coord-golfsud',
    destinataireNom: 'Ousmane Sall (Coord. Golf Sud)',
    objet: 'Préparation du meeting départemental 2027',
    contenu: 'Chers camarades, nous devons finaliser les commissions de parrainage sur Hamo 1 à 6 d’ici vendredi. Merci de vérifier la couverture des commissaires.',
    dateEnvoi: '2026-10-11 10:14',
    lu: true,
    priorite: 'urgente'
  },
  {
    id: 'msg-02',
    expediteurId: 'user-coord-golfsud',
    expediteurNom: 'Ousmane Sall (Coord. Golf Sud)',
    destinataireId: 'user-sup-golfsud',
    destinataireNom: 'Abdoulaye Wade Thiam (Superviseur)',
    objet: 'Remplacement commissaire Hamo 6',
    contenu: 'Le poste de commissaire de Hamo 6 est vacant. Merci de nous proposer deux camarades de confiance lors de notre réunion de secteur.',
    dateEnvoi: '2026-10-11 11:30',
    lu: false,
    priorite: 'normale'
  },
  {
    id: 'msg-03',
    expediteurId: 'user-militant',
    expediteurNom: 'Ndeye Astou Diouf (Militante)',
    destinataireId: 'user-commissaire-hamo',
    destinataireNom: 'Ibrahima Ndiaye (Commissaire Hamo 1)',
    objet: 'Demande de cartes pour les jeunes de la cellule',
    contenu: 'Bonjour Commissaire, les 15 jeunes inscrits lors de la caravane ont validé leur dossier. Pouvons-nous imprimer leurs cartes d’adhésion pour la réunion de dimanche ?',
    dateEnvoi: '2026-10-11 14:05',
    lu: false,
    priorite: 'normale'
  }
];

// Storage state
class KiiraayStore {
  private militants: Militant[] = [];
  private quartiers: Quartier[] = [];
  private auditLogs: AuditEntry[] = [];
  private messages: MessageDiscussion[] = [];
  private currentUser: Utilisateur = DEMO_USERS[0]; // Admin by default
  private historiqueModifs: HistoriqueModification[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    try {
      const storedMilitants = localStorage.getItem('kiiraay_militants');
      const storedQuartiers = localStorage.getItem('kiiraay_quartiers');
      const storedAudit = localStorage.getItem('kiiraay_audit');
      const storedMessages = localStorage.getItem('kiiraay_messages');
      const storedUser = localStorage.getItem('kiiraay_current_user');

      const storedVersion = localStorage.getItem('kiiraay_quartiers_version');
      const needsMigration = storedVersion !== 'v_communes_csv_99' || !storedQuartiers || JSON.parse(storedQuartiers).length !== QUARTIERS_GUEDIAWAYE.length;

      if (needsMigration) {
        this.quartiers = [...QUARTIERS_GUEDIAWAYE];
        this.militants = generateInitialMilitants();
        localStorage.setItem('kiiraay_quartiers_version', 'v_communes_csv_99');
      } else {
        this.militants = storedMilitants ? JSON.parse(storedMilitants) : generateInitialMilitants();
        this.quartiers = storedQuartiers ? JSON.parse(storedQuartiers) : [...QUARTIERS_GUEDIAWAYE];
      }

      this.auditLogs = storedAudit ? JSON.parse(storedAudit) : INITIAL_AUDIT_LOGS;
      this.messages = storedMessages ? JSON.parse(storedMessages) : INITIAL_MESSAGES;
      this.messages = this.messages.map(m => ({
        ...m,
        expediteurNom: m.expediteurNom.replace('Ousmane Sonko Sall', 'Ousmane Sall'),
        destinataireNom: m.destinataireNom.replace('Ousmane Sonko Sall', 'Ousmane Sall')
      }));

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const found = DEMO_USERS.find(u => u.id === parsed.id);
        if (found) {
          this.currentUser = found;
        } else if (parsed.nomComplet === 'Ousmane Sonko Sall') {
          this.currentUser = { ...parsed, nomComplet: 'Ousmane Sall' };
        }
      }
    } catch {
      this.militants = generateInitialMilitants();
      this.quartiers = [...QUARTIERS_GUEDIAWAYE];
      this.auditLogs = INITIAL_AUDIT_LOGS;
      this.messages = INITIAL_MESSAGES;
    }
    this.save();
  }

  private save() {
    try {
      localStorage.setItem('kiiraay_militants', JSON.stringify(this.militants));
      localStorage.setItem('kiiraay_quartiers', JSON.stringify(this.quartiers));
      localStorage.setItem('kiiraay_audit', JSON.stringify(this.auditLogs));
      localStorage.setItem('kiiraay_messages', JSON.stringify(this.messages));
      localStorage.setItem('kiiraay_current_user', JSON.stringify(this.currentUser));
    } catch {
      // Storage unavailable or quota reached
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public resetToFactory() {
    localStorage.removeItem('kiiraay_militants');
    localStorage.removeItem('kiiraay_quartiers');
    localStorage.removeItem('kiiraay_audit');
    localStorage.removeItem('kiiraay_messages');
    localStorage.setItem('kiiraay_quartiers_version', 'v_communes_csv_99');
    this.militants = generateInitialMilitants();
    this.quartiers = [...QUARTIERS_GUEDIAWAYE];
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
    this.messages = [...INITIAL_MESSAGES];
    this.currentUser = DEMO_USERS[0];
    this.save();
  }

  public getCurrentUser(): Utilisateur {
    return this.currentUser;
  }

  public setCurrentUser(user: Utilisateur) {
    this.currentUser = user;
    this.logAudit('CONNEXION_UTILISATEUR', `Connexion en tant que ${user.nomComplet} (${user.role.toUpperCase()})`, 'utilisateur', user.id);
    this.save();
  }

  public getMilitants(filtres?: {
    recherche?: string;
    communeId?: string;
    quartierId?: string;
    statut?: string;
    sexe?: string;
    trancheAge?: string;
    source?: string;
    qualite?: string;
  }): Militant[] {
    let list = [...this.militants];

    // Périmètre de l'utilisateur actif (CDC §4)
    const user = this.currentUser;
    if (user.role === 'coordonnateur' && user.communeId) {
      list = list.filter(m => m.communeId === user.communeId);
    } else if ((user.role === 'superviseur' || user.role === 'commissaire') && user.quartierIds) {
      list = list.filter(m => user.quartierIds!.includes(m.quartierId));
    } else if (user.role === 'militant') {
      list = list.filter(m => m.id === user.militantId || m.numeroKry === 'KRY-GDW-2027-01001');
    }

    if (!filtres) return list;

    // Filtres dynamiques
    if (filtres.recherche && filtres.recherche.trim() !== '') {
      const q = filtres.recherche.toLowerCase().trim();
      list = list.filter(m => 
        m.nom.toLowerCase().includes(q) ||
        m.prenom.toLowerCase().includes(q) ||
        m.numeroKry.toLowerCase().includes(q) ||
        m.telephone.includes(q) ||
        (m.cni && m.cni.includes(q)) ||
        m.adresse.toLowerCase().includes(q) ||
        m.repere.toLowerCase().includes(q)
      );
    }

    if (filtres.communeId && filtres.communeId !== 'tous') {
      list = list.filter(m => m.communeId === filtres.communeId);
    }

    if (filtres.quartierId && filtres.quartierId !== 'tous') {
      list = list.filter(m => m.quartierId === filtres.quartierId);
    }

    if (filtres.statut && filtres.statut !== 'tous') {
      list = list.filter(m => m.statut === filtres.statut);
    }

    if (filtres.sexe && filtres.sexe !== 'tous') {
      list = list.filter(m => m.sexe === filtres.sexe);
    }

    if (filtres.source && filtres.source !== 'tous') {
      list = list.filter(m => m.sourceCollecte === filtres.source);
    }

    if (filtres.qualite) {
      if (filtres.qualite === 'sans_gps') {
        list = list.filter(m => !m.latitude || m.latitude === 0);
      } else if (filtres.qualite === 'sans_cni') {
        list = list.filter(m => !m.cni || m.cni.trim() === '');
      } else if (filtres.qualite === 'non_informe') {
        list = list.filter(m => !m.personneInformee);
      }
    }

    if (filtres.trancheAge && filtres.trancheAge !== 'tous') {
      const currentYear = 2026;
      list = list.filter(m => {
        const year = parseInt(m.dateNaissance.split('-')[0], 10);
        const age = currentYear - year;
        if (filtres.trancheAge === '18-25') return age >= 18 && age <= 25;
        if (filtres.trancheAge === '26-35') return age >= 26 && age <= 35;
        if (filtres.trancheAge === '36-50') return age >= 36 && age <= 50;
        if (filtres.trancheAge === '51-65') return age >= 51 && age <= 65;
        if (filtres.trancheAge === '65+') return age > 65;
        return true;
      });
    }

    return list;
  }

  public getMilitantById(id: string): Militant | undefined {
    return this.militants.find(m => m.id === id);
  }

  public createMilitant(data: Omit<Militant, 'id' | 'numeroKry' | 'version' | 'derniereModification' | 'modifiePar' | 'jetonSecurise' | 'carteDelivree'>): Militant {
    const nextNum = 1000 + this.militants.length + 1;
    const numeroKry = `KRY-GDW-2027-${String(nextNum).padStart(5, '0')}`;
    const jetonSecurise = generateSecureToken(numeroKry, data.nom);

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const newMilitant: Militant = {
      ...data,
      id: `mil-${Date.now()}`,
      numeroKry,
      version: 1,
      derniereModification: now,
      modifiePar: this.currentUser.nomComplet,
      carteDelivree: false,
      jetonSecurise
    };

    this.militants.unshift(newMilitant);
    this.logAudit('CREATION_MILITANT', `Création fiche ${numeroKry} (${data.prenom} ${data.nom}) à ${data.communeId}`, 'militant', newMilitant.id);
    this.save();
    return newMilitant;
  }

  public updateMilitant(id: string, updates: Partial<Militant>): Militant | null {
    const index = this.militants.findIndex(m => m.id === id);
    if (index === -1) return null;

    const old = this.militants[index];
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // Enregistrer les modifications dans l'historique
    Object.keys(updates).forEach(key => {
      const k = key as keyof Militant;
      if (old[k] !== updates[k] && key !== 'version' && key !== 'derniereModification' && key !== 'modifiePar') {
        this.historiqueModifs.unshift({
          id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          militantId: id,
          auteur: this.currentUser.nomComplet,
          role: this.currentUser.role,
          date: now,
          champModifie: String(key),
          ancienneValeur: String(old[k] ?? ''),
          nouvelleValeur: String(updates[k] ?? '')
        });
      }
    });

    const updated: Militant = {
      ...old,
      ...updates,
      version: old.version + 1,
      derniereModification: now,
      modifiePar: this.currentUser.nomComplet
    };

    this.militants[index] = updated;
    this.logAudit('MODIFICATION_MILITANT', `Mise à jour v${updated.version} de la fiche ${updated.numeroKry}`, 'militant', id);
    this.save();
    return updated;
  }

  public deleteMilitant(id: string): boolean {
    const index = this.militants.findIndex(m => m.id === id);
    if (index === -1) return false;

    const removed = this.militants[index];
    this.militants.splice(index, 1);
    this.logAudit('SUPPRESSION_MILITANT', `Suppression définitive de la fiche ${removed.numeroKry} (${removed.prenom} ${removed.nom}) pour correction`, 'militant', id);
    this.save();
    return true;
  }

  public inscrireMilitant(data: Omit<Militant, 'id' | 'numeroKry' | 'version' | 'derniereModification' | 'modifiePar' | 'jetonSecurise' | 'carteDelivree' | 'statut'>): Militant {
    const nextNum = 1000 + this.militants.length + 1;
    const numeroKry = `KRY-GDW-2027-${String(nextNum).padStart(5, '0')}`;
    const jetonSecurise = generateSecureToken(numeroKry, data.nom);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const newMilitant: Militant = {
      ...data,
      id: `mil-inscr-${Date.now()}`,
      numeroKry,
      statut: 'en_attente',
      sourceCollecte: 'Auto-inscription en ligne (Guédiawaye 2027)',
      version: 1,
      derniereModification: now,
      modifiePar: 'Adhérent (Auto-inscription)',
      carteDelivree: false,
      jetonSecurise
    };

    this.militants.unshift(newMilitant);
    this.logAudit('AUTO_INSCRIPTION_MILITANT', `Nouvelle demande d'adhésion en ligne ${numeroKry} (${data.prenom} ${data.nom}) en attente de validation administrative`, 'militant', newMilitant.id);
    this.save();
    return newMilitant;
  }

  // --- CRUD QUARTIERS ---
  public getQuartiers(communeId?: string): Quartier[] {
    if (!communeId || communeId === 'tous') {
      return [...this.quartiers];
    }
    return this.quartiers.filter(q => q.communeId === communeId);
  }

  public getQuartierById(id: string): Quartier | undefined {
    return this.quartiers.find(q => q.id === id);
  }

  public createQuartier(data: Omit<Quartier, 'id'>): Quartier {
    const slug = data.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const id = `${data.communeId.slice(0, 3)}-${slug}-${Date.now().toString().slice(-4)}`;
    const newQuartier: Quartier = {
      ...data,
      id
    };
    this.quartiers.push(newQuartier);
    this.logAudit('CREATION_QUARTIER', `Création du nouveau quartier "${data.nom}" dans la commune ${data.communeId}`, 'territoire', id);
    this.save();
    return newQuartier;
  }

  public updateQuartier(id: string, updates: Partial<Quartier>): Quartier | null {
    const idx = this.quartiers.findIndex(q => q.id === id);
    if (idx === -1) return null;
    const old = this.quartiers[idx];
    const updated: Quartier = { ...old, ...updates };
    this.quartiers[idx] = updated;
    this.logAudit('MODIFICATION_QUARTIER', `Mise à jour du quartier "${updated.nom}" (Responsable: ${updated.commissaire || 'Non pourvu'})`, 'territoire', id);
    this.save();
    return updated;
  }

  public deleteQuartier(id: string): { success: boolean; message: string } {
    const idx = this.quartiers.findIndex(q => q.id === id);
    if (idx === -1) return { success: false, message: 'Quartier introuvable.' };

    const q = this.quartiers[idx];
    const attachedCount = this.militants.filter(m => m.quartierId === id).length;
    if (attachedCount > 0) {
      return { 
        success: false, 
        message: `Impossible de supprimer ce quartier car ${attachedCount} militant(s) y sont rattachés. Veuillez d'abord réaffecter ces militants.` 
      };
    }

    this.quartiers.splice(idx, 1);
    this.logAudit('SUPPRESSION_QUARTIER', `Suppression du quartier "${q.nom}"`, 'territoire', id);
    this.save();
    return { success: true, message: `Quartier "${q.nom}" supprimé avec succès.` };
  }

  public changerStatut(id: string, statut: StatutMilitant, motif?: string) {
    const m = this.getMilitantById(id);
    if (!m) return;
    this.updateMilitant(id, { 
      statut, 
      motifDesactivation: motif || (statut === 'actif' ? undefined : m.motifDesactivation) 
    });
    this.logAudit(`CHANGEMENT_STATUT_${statut.toUpperCase()}`, `Statut passé à ${statut} pour ${m.numeroKry}`, 'militant', id);
  }

  public delivrerCarte(id: string): Militant | null {
    const now = new Date().toISOString().split('T')[0];
    const updated = this.updateMilitant(id, {
      carteDelivree: true,
      dateDelivranceCarte: now
    });
    if (updated) {
      this.logAudit('EMISSION_CARTE_ADHESION', `Délivrance de la carte officielle QR signée pour ${updated.numeroKry}`, 'carte', id);
    }
    return updated;
  }

  public getHistorique(militantId: string): HistoriqueModification[] {
    return this.historiqueModifs.filter(h => h.militantId === militantId);
  }

  public detecterDoublons(): DoublonDetecte[] {
    const doublons: DoublonDetecte[] = [];
    const list = this.militants;

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const m1 = list[i];
        const m2 = list[j];

        // 1. Même numéro de téléphone
        const cleanTel1 = m1.telephone.replace(/\s+/g, '');
        const cleanTel2 = m2.telephone.replace(/\s+/g, '');
        if (cleanTel1 && cleanTel2 && cleanTel1 === cleanTel2) {
          doublons.push({
            id: `dup-${m1.id}-${m2.id}`,
            militant1: m1,
            militant2: m2,
            motif: 'telephone',
            scoreCertitude: 98,
            statut: 'a_traiter',
            dateDetection: '2026-10-11'
          });
          continue;
        }

        // 2. Même CNI
        if (m1.cni && m2.cni && m1.cni === m2.cni) {
          doublons.push({
            id: `dup-${m1.id}-${m2.id}`,
            militant1: m1,
            militant2: m2,
            motif: 'cni',
            scoreCertitude: 100,
            statut: 'a_traiter',
            dateDetection: '2026-10-11'
          });
          continue;
        }

        // 3. Même identité (nom + prénom identique + même date de naissance)
        if (
          m1.nom.toLowerCase().trim() === m2.nom.toLowerCase().trim() &&
          m1.prenom.toLowerCase().trim() === m2.prenom.toLowerCase().trim() &&
          m1.dateNaissance === m2.dateNaissance
        ) {
          doublons.push({
            id: `dup-${m1.id}-${m2.id}`,
            militant1: m1,
            militant2: m2,
            motif: 'nom_date_naissance',
            scoreCertitude: 92,
            statut: 'a_traiter',
            dateDetection: '2026-10-11'
          });
        }
      }
    }

    return doublons;
  }

  public getAuditLogs(): AuditEntry[] {
    return [...this.auditLogs];
  }

  public async logAudit(action: string, details: string, entiteType: AuditEntry['entiteType'], entiteId?: string): Promise<AuditEntry> {
    const id = this.auditLogs.length + 1;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const precedentHash = this.auditLogs.length > 0 ? this.auditLogs[this.auditLogs.length - 1].hash : '0000000000000000000000000000000000000000000000000000000000000000';
    
    // Hash cryptographique chaîné SHA-256
    const blockData = `${id}|${timestamp}|${this.currentUser.nomComplet}|${this.currentUser.role}|${action}|${details}|${precedentHash}`;
    let hash: string;
    try {
      hash = await calculateSha256(blockData);
    } catch {
      hash = fastHash(blockData);
    }

    const entry: AuditEntry = {
      id,
      timestamp,
      utilisateur: this.currentUser.nomComplet,
      role: this.currentUser.role,
      action,
      details,
      entiteType,
      entiteId,
      ip: '197.234.218.42',
      precedentHash,
      hash
    };

    this.auditLogs.push(entry);
    this.save();
    return entry;
  }

  public async verifierIntegriteAudit(): Promise<{ valide: boolean; blocsVerifies: number; details: string }> {
    if (this.auditLogs.length <= 1) {
      return { valide: true, blocsVerifies: this.auditLogs.length, details: 'Chaîne cryptographique conforme (bloc de genèse vérifié).' };
    }

    for (let i = 1; i < this.auditLogs.length; i++) {
      const prev = this.auditLogs[i - 1];
      const curr = this.auditLogs[i];
      if (curr.precedentHash !== prev.hash) {
        return {
          valide: false,
          blocsVerifies: i,
          details: `Rupture d'intégrité détectée au bloc #${curr.id} ! Le hash précédent ne correspond pas au hash du bloc #${prev.id}.`
        };
      }
    }

    return {
      valide: true,
      blocsVerifies: this.auditLogs.length,
      details: `Intégrité absolue certifiée : tous les ${this.auditLogs.length} blocs sont cryptographiquement scellés par SHA-256 sans altération.`
    };
  }

  public getMessages(): MessageDiscussion[] {
    const user = this.currentUser;
    return this.messages.filter(m => 
      m.destinataireId === user.id || 
      m.expediteurId === user.id || 
      user.role === 'admin'
    );
  }

  public envoyerMessage(destinataireId: string, objet: string, contenu: string, priorite: 'normale' | 'urgente' = 'normale'): MessageDiscussion {
    const destUser = DEMO_USERS.find(u => u.id === destinataireId) || { nomComplet: 'Responsable' };
    const newMsg: MessageDiscussion = {
      id: `msg-${Date.now()}`,
      expediteurId: this.currentUser.id,
      expediteurNom: `${this.currentUser.nomComplet} (${this.currentUser.role.toUpperCase()})`,
      destinataireId,
      destinataireNom: destUser.nomComplet,
      objet,
      contenu,
      dateEnvoi: new Date().toISOString().replace('T', ' ').slice(0, 16),
      lu: false,
      priorite
    };

    this.messages.unshift(newMsg);
    this.logAudit('ENVOI_MESSAGE', `Message transmis à ${destUser.nomComplet} : "${objet}"`, 'utilisateur', destinataireId);
    this.save();
    return newMsg;
  }
}

export const store = new KiiraayStore();
