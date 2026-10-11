# KIIRAAY — Plateforme de gestion des militants · Guédiawaye 2027

Application web sécurisée de **gestion, de recherche et de cartographie des militants** de KIIRAAY — Les Patriotes Républicains
dans le département de Guédiawaye (Golf Sud, Médina Gounass, Ndiarème Limamoulaye, Sam Notaire, Wakhinane Nimzatt),
construite d'après le *Cahier des charges fonctionnel v1.1 du 06/10/2026*.

| Couche | Technologies |
|---|---|
| Base de données | PostgreSQL 16 + PostGIS 3 (géographie), pg_trgm (recherche floue), pgcrypto |
| API | Node.js 22, Express, Zod (validation), JWT + cookie de rafraîchissement, bcrypt |
| Interface | React 18 + TypeScript, Vite, TanStack Query, Leaflet (carte), graphiques SVG maison |
| Déploiement | Docker Compose (PostGIS, application, Caddy HTTPS automatique, sauvegardes quotidiennes chiffrées) |

---

## 1. Démarrage rapide

### Option A — Docker (recommandé pour un serveur)

```bash
cp .env.example .env
npm --prefix backend install && npm --prefix backend run keys:generate   # copier les 3 secrets dans .env
# Renseigner aussi POSTGRES_PASSWORD, BACKUP_PASSPHRASE, DOMAINE, CORS_ORIGINS dans .env
docker compose up -d --build
docker compose exec app node backend/scripts/seed.js --referentiels-seulement
```

La dernière commande crée les communes, quartiers, secteurs, référentiels et **un seul compte `admin`**
dont le mot de passe initial s'affiche (changement obligatoire à la première connexion).
L'application est servie en HTTPS sur `https://DOMAINE` (certificat Let's Encrypt automatique).

### Option B — Poste de développement

Prérequis : Node.js ≥ 20, PostgreSQL ≥ 14 avec PostGIS.

```bash
# 1. Base (en superutilisateur PostgreSQL)
createuser -P kiiraay && createdb -O kiiraay kiiraay
psql -d kiiraay -f database/init/00-extensions.sql

# 2. API
cd backend
cp .env.example .env && npm install
npm run keys:generate          # coller les valeurs dans .env, ainsi que DATABASE_URL
npm run db:migrate
npm run db:seed                # référentiels + 6 comptes + 12 450 militants FICTIFS
npm run dev                    # http://localhost:4000

# 3. Interface (autre terminal)
cd frontend && npm install && npm run dev   # http://localhost:5173 (proxy vers l'API)
```

### Comptes de démonstration (`npm run db:seed`, mot de passe `Kiiraay@2027!`)

| Identifiant | Profil (CDC §4) | Périmètre |
|---|---|---|
| `admin` | Administrateur central | Tout le département |
| `coord.golfsud` | Coordonnateur | Commune de Golf Sud |
| `sup.golfsud` | Superviseur | 4 quartiers de Golf Sud |
| `commissaire.hamo` | Commissaire | 1 quartier |
| `saisie` | Opérateur de saisie | Tout le département, sans validation |
| `decideur` | Décideur / Consultation | Dashboard et carte agrégée uniquement |

> ⚠️ Ces comptes et les 12 450 militants générés sont **fictifs** et réservés aux tests. En production, utilisez
> `--referentiels-seulement` (le script refuse d'ailleurs de charger des données fictives si `NODE_ENV=production`).

### Démo autonome

`npm --prefix frontend run build:demo` produit `frontend/dist-demo/index.html` : l'application complète en un seul
fichier, avec un faux backend en mémoire (mêmes règles de droits et de périmètre) et des données fictives. Utile pour
présenter la plateforme au comité de pilotage sans serveur.

---

## 2. Couverture du cahier des charges

| Exigence CDC | Mise en œuvre |
|---|---|
| §3 Périmètre territorial | Tables `communes` › `quartiers` › `secteurs` avec géométries PostGIS et objectifs de mobilisation. 5 communes, 46 quartiers, 92 secteurs de démarrage. |
| §4 Six profils et droits | Matrice unique `shared/referentiel.js` (`PERMISSIONS`) appliquée par l'API à chaque requête, et **périmètre territorial** par utilisateur (commune entière ou quartiers). |
| §5.1 Gestion des militants | Création, consultation, modification (verrou optimiste), validation, « à vérifier », désactivation avec motif, réactivation. Aucune suppression physique. **Historique complet par trigger** (`militants_historique`) : qui, quand, quels champs, avant/après. |
| §5.2 Recherche multicritère | Nom, prénoms, adresse, repère (trigrammes, insensible aux accents), téléphone complet ou 4 derniers chiffres, n° `KRY-GDW-…`, commune, quartier, secteur, statut, responsable, sexe, tranche d'âge, source, qualité. |
| §5.3 Gestion territoriale | Écran *Territoires* (quartiers, secteurs, objectifs) ; import des limites officielles : `npm run geo:import -- limites.geojson` ou `POST /api/territoires/geometries`. |
| §5.4 Chaîne de responsabilité | Coordonnateur (commune) → superviseur (quartiers) → commissaire (quartier). Affectation automatique des fiches selon le quartier, réaffectation en un clic, alerte des quartiers sans commissaire. |
| §5.5 Import / export / qualité | Import Excel/CSV avec **simulation**, rapport d'erreurs ligne par ligne et détection des doublons (fichier et base). Modèle Excel téléchargeable avec onglets de référentiel. Exports CSV/XLSX filtrés, bornés au périmètre, nominatifs et journalisés ; téléphones masqués selon le profil. Écran *Qualité des données* : doublons (même téléphone, ou même identité + date de naissance/adresse), fiches à mettre à jour, sans GPS, personnes non informées. |
| §5.6 Traçabilité | `journal_audit` en **ajout seul** (UPDATE/DELETE/TRUNCATE refusés par trigger), **chaîné par SHA-256** ; vérification d'intégrité depuis l'écran *Journal d'audit*. Connexions, échecs, consultations de fiche, créations, modifications, imports, exports… |
| §6 Données | Tous les champs de la fiche (identification, coordonnées, localisation GPS, organisation, suivi, information de la personne). Référentiels : sources de collecte, motifs de désactivation, statuts, fonctions. |
| §7 Dashboard | Militants actifs et évolution, communes et quartiers couverts, responsables actifs, répartition par commune / quartier / sexe / âge, effectifs par responsable, taux de couverture et objectifs, quartiers sans responsable, données à mettre à jour, nouvelles inscriptions, mises à jour, doublons. Filtres synchronisés commune / quartier / responsable / statut / période. |
| §8 Maquette | Reprise fidèle : en-tête KIIRAAY, menu latéral, 4 cartes KPI, carte centrale, barres par commune, alertes. |
| §9 Cartographie | Leaflet : limites départementales, communales et quartiers ; choroplèthe de couverture ; densité (heatmap) ; points géolocalisés (profils autorisés seulement) ; navigation département → commune → quartier ; export PNG pour les réunions. |
| §10 Sécurité / confidentialité | Voir section 3. Recherche < 50 ms et dashboard ≈ 1,2 s mesurés sur **50 000 fiches**. Interface responsive (ordinateur, tablette, smartphone). |
| §10 Disponibilité | Sauvegarde quotidienne chiffrée AES-256 avec rétention (`scripts/backup.sh`, service `backup`), procédure de restauration testée (`scripts/restore.sh`). |
| §12 Livrables | Application, base et référentiels initialisés, modèle d'import, ce README, `docs/GUIDE_ADMINISTRATEUR.md`, `docs/MANUEL_UTILISATEUR.md`. |
| §14 Recette | `npm --prefix backend test` : 13 scénarios automatisés (droits, périmètres, filtres, cycle de vie, doublons, import, exports, carte, journal, verrouillage). |

---

## 3. Sécurité et protection des données

Les données traitées révèlent une **opinion politique** : c'est une catégorie de données sensibles au sens de la
loi sénégalaise n° 2008-12 sur la protection des données à caractère personnel. La plateforme est conçue en conséquence :

- **Authentification** : mots de passe bcrypt (coût 12), politique de 12 caractères mixtes, changement obligatoire à la
  première connexion, verrouillage 15 min après 5 échecs, limitation de débit par IP, temps de réponse constant.
- **Sessions** : jeton d'accès de 15 min gardé en mémoire (jamais dans `localStorage`) ; jeton de rafraîchissement en
  cookie `httpOnly` + `SameSite=Strict`, stocké haché en base, **rotation à chaque usage**, révocation à la déconnexion,
  au changement de mot de passe et à la désactivation du compte.
- **Droits** : contrôle systématique côté API (rôle + périmètre territorial). Une fiche hors périmètre répond « introuvable ».
- **Chiffrement** : téléphones chiffrés en AES-256-GCM au niveau applicatif ; recherche et détection de doublons par
  index aveugle HMAC-SHA256 (le numéro n'est jamais en clair en base). HTTPS obligatoire via Caddy (HSTS).
- **Minimisation** : téléphones masqués dans les listes ; adresses, GPS et coordonnées invisibles pour le profil
  Décideur ; positions individuelles réservées aux profils de terrain ; export complet réservé à l'administrateur
  et aux coordonnateurs.
- **Traçabilité** : chaque consultation de fiche, export et import est journalisé de façon inviolable.
- **Robustesse** : requêtes 100 % paramétrées, validation Zod, en-têtes de sécurité (Helmet/CSP), protection contre
  l'injection de formules dans les exports CSV, réponses API `Cache-Control: no-store`.

**À faire côté organisation avant la mise en production :**
1. Déclarer le traitement à la **Commission de Protection des Données Personnelles (CDP)** du Sénégal.
2. Faire valider par le comité de pilotage les référentiels, rôles, indicateurs et règles d'accès (CDC §15).
3. Informer chaque militant (case « personne informée » de la fiche, suivie dans les alertes).
4. Conserver `DATA_ENCRYPTION_KEY` et `BACKUP_PASSPHRASE` dans un coffre-fort séparé : leur perte rend les téléphones
   et les sauvegardes illisibles.
5. Remplacer les limites cartographiques **indicatives** par les limites officielles validées.

---

## 4. Architecture

```
kiiraay-platform/
├── database/
│   ├── init/00-extensions.sql       Extensions PostgreSQL (superutilisateur)
│   └── migrations/001_schema.sql    Schéma, index, triggers d'historique et de journal
├── shared/                          Code commun API / interface
│   ├── referentiel.js               Communes, quartiers, rôles, PERMISSIONS, statuts
│   ├── generator.js                 Générateur déterministe de données fictives
│   └── geo/guediawaye.json          Limites indicatives (GeoJSON)
├── backend/
│   ├── src/app.js                   Express, sécurité, routage
│   ├── src/auth.js                  JWT, contrôle des droits et des périmètres
│   ├── src/crypto.js                AES-256-GCM, index aveugle HMAC
│   ├── src/filtres.js               Filtres et recherche communs (liste, export, dashboard, carte)
│   ├── src/qualite.js               Détection des doublons
│   ├── src/routes/*.js              auth, militants, dashboard, carte, territoires, responsables, qualité, imports/exports, administration
│   ├── scripts/                     migrate, seed, import-geo, generate-keys
│   └── test/api.test.js             Tests de recette
├── frontend/src/
│   ├── pages/                       Dashboard, Militants, Fiche, Formulaire, Carte, Rapports, Qualité, Import/Export, Responsables, Territoires, Administration
│   ├── components/                  Layout, FilterBar, Carte (Leaflet), charts, ui
│   └── demo/mockApi.ts              Faux backend de la démo autonome
├── scripts/backup.sh · restore.sh   Sauvegardes chiffrées
├── Dockerfile · docker-compose.yml · Caddyfile
└── docs/                            Guide administrateur, manuel utilisateur, modèle d'import CSV
```

### API (extrait)

| Méthode | Route | Droit |
|---|---|---|
| POST | `/api/auth/login` · `/refresh` · `/logout` · `/mot-de-passe` | — |
| GET | `/api/dashboard?commune&quartier&responsable&statut&du&au` | dashboard |
| GET | `/api/carte/territoires` · `/api/carte/points` | dashboard · carte:points |
| GET / POST | `/api/militants` | militants:lire · militants:ecrire |
| GET / PUT | `/api/militants/:id` · `/historique` | militants:lire · militants:ecrire |
| POST | `/api/militants/:id/valider` · `/a-verifier` · `/desactiver` · `/reactiver` | selon action |
| GET / POST | `/api/qualite/doublons` · `/ecarter` · `/resoudre` | qualite |
| GET / POST | `/api/imports` · `/api/imports/modele.xlsx` | import |
| GET | `/api/exports/militants.csv` · `.xlsx` | export |
| GET / POST / PUT | `/api/responsables` · `/reaffecter` | dashboard · responsables:gerer |
| GET / POST / PUT | `/api/territoires` · `/communes/:id` · `/quartiers` · `/secteurs` · `/geometries` | territoires:gerer |
| GET / POST / PUT | `/api/utilisateurs` · `/:id/reinitialiser` · `/:id/deverrouiller` | utilisateurs:gerer |
| GET | `/api/audit` · `/api/audit/integrite` | audit:lire |

---

## 5. Tests et performance

```bash
cd backend
LOGIN_RATE_LIMIT=1000 npm run dev &     # API sur une base seedée (limite de connexion relâchée pour les tests)
npm test                                # 13 scénarios de recette, rejouables
npm run db:seed -- --force --militants=50000   # test de charge (CDC : 50 000 fiches)
```

Mesures sur 50 000 fiches (PostgreSQL 16, machine de développement) : recherche nominative 18 ms, recherche par
téléphone 6 ms, points de carte 120 ms, détection des doublons 0,5 s, dashboard complet 1,2 s.
