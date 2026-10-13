# 🇸🇳 Plateforme KIIRAAY Guédiawaye

> **Plateforme Numérique de Gestion, Cartographie et Mobilisation des Militants du Mouvement KIIRAAY**  
> *Département de Guédiawaye — Golf Sud • Sam Notaire • Ndiarème Limamoulaye • Wakhinane Nimzatt • Médina Gounass*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftamsir67%2Fkiiraay-platform)

---

## 🌟 Présentation

La **Plateforme KIIRAAY Guédiawaye** est une application web moderne et réactive conçue pour structurer, dynamiser et sécuriser la base militante du parti à l'échelle départementale et communale.

Elle offre aux instances dirigeantes et aux responsables de quartier un outil tout-en-un de pilotage territorial, de suivi des adhésions, d'émission de cartes d'adhésion numériques infalsifiables et de mobilisation citoyenne.

---

## 🚀 Fonctionnalités Clés

### 1. 👥 Gestion Complète des Militants (CRUD)
- **Ajout, Édition et Suppression** de militants avec contrôle des autorisations.
- Fiches individuelles enrichies : identité, photo de profil, numéro de CNI, téléphone, commune, quartier, bureau de vote, profession, cotisations et date d'adhésion.
- Recherche multi-critères instantanée et filtrage par commune, tranche d'âge, statut de validation et responsabilité.

### 2. 📝 Auto-Inscription Publique & Validation Administrateur
- **Portail d'auto-inscription citoyenne** accessible à tous les nouveaux sympathisants.
- **File d'attente d'approbation administrative** : les administrateurs valident ou rejettent les demandes après vérification des pièces.
- Notification et mise à jour automatique du statut militant.

### 3. 💳 Carte d'Adhésion Numérique & QR Code Haute Définition
- Génération instantanée de la **Carte Officielle d'Adhérent KIIRAAY** aux couleurs du parti.
- **QR Code vectoriel SVG ultra-net** contenant l'empreinte chiffrée du militant.
- **Module de vérification publique** permettant à quiconque de flasher la carte pour certifier l'authenticité de l'adhérent en temps réel.
- Exportation et impression directe au format carte d'identité (format recto/verso badge).

### 4. 🗺️ Référentiel Territorial & CRUD des Quartiers
- Couverture complète des **5 communes de Guédiawaye** :
  - *Golf Sud* (Hamo 1 à 6, Golf Nord, Cité Alioune Sow, etc.)
  - *Sam Notaire* (Notaire, Cité Serigne Mansour, etc.)
  - *Ndiarème Limamoulaye* (Ndiarème, Cité Douane, etc.)
  - *Wakhinane Nimzatt* (Darou Salam, Nimzatt, etc.)
  - *Médina Gounass* (Bagdad, Gounass, etc.)
- **Ajout de nouveaux quartiers**, renommage, mise à jour des coordonnées géographiques et suppression sécurisée (avec vérification préalable des militants rattachés).
- Statistiques de pénétration politique en temps réel par quartier.

### 5. 📍 Cartographie Interactive (SIG)
- Vue cartographique dynamique basée sur **Leaflet** et OpenStreetMap.
- Marqueurs personnalisés par statut et commune.
- Visualisation instantanée de la densité de militants par zone géographique.

### 6. 🛡️ Qualité des Données & Détection des Doublons
- Audit automatisé des numéros de téléphone et CNI dupliqués.
- Détection des adresses incomplètes ou orphelines.
- Taux de complétude des dossiers militants.

### 7. 📜 Journal d'Audit & Sécurité
- Historique chronologique immuable de toutes les actions (créations, modifications, validations, suppressions).
- Traçabilité complète des interventions avec horodatage et auteur.

### 8. 📊 Import & Export de Données
- Exportation des listes électorales et militantes au format **CSV** et **JSON**.
- Importation en masse de fichiers militants avec validation automatique de structure.

### 9. 📢 Messagerie & Mobilisation
- Envoi groupé d'alertes par **SMS** et **WhatsApp**.
- Organisation de campagnes de mobilisation et convocations pour réunions politiques.

---

## 🎨 Charte Graphique KIIRAAY

L'interface adopte fidèlement la palette d'identité visuelle du parti :
- **Bleu Roi KIIRAAY** : `#1E3A8A` (Sidebar, En-tête, Identité institutionnelle)
- **Vert Espoir** : `#15803D` (Validation, Succès, Solidarité)
- **Or Républicain / Jaune Solaire** : `#F59E0B` (Étoile, Badges d'excellence, Alertes)
- **Blanc Épuré** : Clarté et lisibilité maximale sur écrans tactiles et mobiles.

---

## 🛠️ Stack Technique

- **Framework Front-End** : [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool** : [Vite 8](https://vitejs.dev/)
- **Design & Styles** : [Tailwind CSS v4](https://tailwindcss.com/)
- **Icônes** : [Lucide React](https://lucide.dev/)
- **Cartographie** : [Leaflet 1.9](https://leafletjs.com/)
- **Génération QR Code** : [QRCode](https://www.npmjs.com/package/qrcode) (moteur SVG vectoriel haute précision)
- **Animations** : [Motion](https://motion.dev/)

---

## 📂 Structure du Répertoire

```
kiiraay-platform/
├── public/                 # Fichiers publics (logos, favicons)
│   └── logo-kiiraay.svg    # Emblème officiel KIIRAAY
├── src/
│   ├── components/         # Composants réutilisables
│   │   ├── CarteAdhesionModal.tsx     # Affichage et impression de la carte d'adhérent
│   │   ├── CarteLeaflet.tsx           # Cartographie interactive SIG
│   │   ├── CrispQrCode.tsx            # Moteur SVG de rendu QR Code haute clarté
│   │   ├── Header.tsx                 # En-tête avec raccourcis et actions rapides
│   │   ├── InscriptionMilitantModal.tsx# Formulaire d'auto-inscription publique
│   │   ├── KiiraayLogo.tsx            # Composant Logo dynamique
│   │   ├── MilitantFormModal.tsx      # Formulaire CRUD militant (admin)
│   │   ├── PublicVerifyModal.tsx      # Vérification publique du QR code
│   │   ├── QuartierModal.tsx          # Formulaire CRUD quartier
│   │   └── Sidebar.tsx                # Menu latéral aux couleurs officielles
│   ├── data/               # Référentiels géographiques et données initiales
│   │   ├── geo.ts                     # Coordonnées et polygones de Guédiawaye
│   │   └── referentiel.ts             # Données de départ (militants, quartiers)
│   ├── pages/              # Vues principales de l'application
│   │   ├── DashboardPage.tsx          # Tableau de bord et métriques clés
│   │   ├── MilitantsPage.tsx          # Liste, filtres et CRUD militants
│   │   ├── MilitantDetailPage.tsx     # Profil complet d'un militant
│   │   ├── TerritoiresPage.tsx        # Gestion et CRUD des quartiers
│   │   ├── CartePage.tsx              # Cartographie plein écran
│   │   ├── ResponsablesPage.tsx       # Gestion du collège électoral et cadres
│   │   ├── QualitePage.tsx            # Détection doublons et nettoyage
│   │   ├── AuditPage.tsx              # Journal de traçabilité
│   │   ├── ImportExportPage.tsx       # Sauvegardes et imports de masse
│   │   ├── MessageriePage.tsx         # Diffusion SMS / WhatsApp
│   │   └── EspaceMilitantPage.tsx     # Espace personnel militant
│   ├── services/           # Logique métier et persistance locale
│   │   ├── store.ts                   # Gestionnaire d'état réactif et persistance
│   │   └── crypto.ts                  # Hachage et sécurité des données
│   ├── types/              # Définitions TypeScript
│   │   └── index.ts
│   ├── App.tsx             # Routeur et orchestration de l'interface
│   ├── index.css           # Thème global et imports Tailwind CSS
│   └── main.tsx            # Point d'entrée de l'application
├── package.json            # Dépendances et scripts
├── tsconfig.json           # Configuration TypeScript
├── vite.config.ts          # Configuration Vite
└── README.md               # Documentation du projet
```

---

## 💻 Installation & Démarrage en Local

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure)
- [npm](https://www.npmjs.com/) ou [pnpm](https://pnpm.io/)

### Étapes d'installation

1. **Cloner le dépôt :**
   ```bash
   git clone https://github.com/tamsir67/kiiraay-platform.git
   cd kiiraay-platform
   ```

2. **Installer les dépendances :**
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```
   L'application sera accessible sur [http://localhost:3000](http://localhost:3000).

4. **Compiler pour la production :**
   ```bash
   npm run build
   ```
   Les fichiers optimisés seront générés dans le dossier `dist/`.

---

## 🚀 Déploiement sur Vercel

La plateforme est préconfigurée avec un fichier `vercel.json` pour un déploiement instantané avec gestion native du routage Single Page Application (SPA).

### Option A : Déploiement en 1 clic (Recommandé)
Cliquez sur le bouton ci-dessous pour importer et déployer directement le projet sur votre compte Vercel :

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftamsir67%2Fkiiraay-platform)

### Option B : Depuis le tableau de bord Vercel
1. Rendez-vous sur [vercel.com](https://vercel.com) et connectez-vous avec votre compte GitHub (**tamsir67**).
2. Cliquez sur **"Add New..."** > **"Project"**.
3. Sélectionnez le dépôt **`kiiraay-platform`** et cliquez sur **"Import"**.
4. Vercel détecte automatiquement la configuration Vite :
   - **Framework Preset** : `Vite`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
5. Cliquez sur **"Deploy"**. En 30 secondes, votre plateforme sera en ligne avec son URL de production (ex: `https://kiiraay-platform.vercel.app`) et certificat SSL HTTPS automatique !

### Option C : Déploiement via le terminal (CLI Vercel)
Si vous disposez de l'outil en ligne de commande Vercel :
```bash
npx vercel
# Pour déployer directement en production :
npx vercel --prod
```

---

## 🔒 Sécurité et Données Personnelles

- Les données personnelles des militants (CNI, numéros de téléphone) sont protégées et réservées aux administrateurs habilités.
- Les QR codes de vérification publique n'exposent que les données d'identification strictement nécessaires (Nom, Prénom, Matricule, Validité).

---

## 🤝 Contribution & Contact

**Mouvement KIIRAAY — Fédération Départementale de Guédiawaye**  
Pour toute question ou contribution au code source, contactez l'équipe technique ou soumettez une pull request sur ce dépôt.
