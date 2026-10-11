# Guide administrateur — KIIRAAY Guédiawaye 2027

Ce guide s'adresse à l'**Administrateur central** (CDC §4) : paramétrage, comptes, sécurité, sauvegardes.

## 1. Première mise en service

1. Installer la plateforme (README §1, option Docker).
2. Exécuter `docker compose exec app node backend/scripts/seed.js --referentiels-seulement` et noter le mot de passe
   initial du compte `admin` affiché une seule fois.
3. Se connecter, choisir un mot de passe fort (12 caractères, majuscule, minuscule, chiffre, caractère spécial).
4. **Territoires** : vérifier les 46 quartiers de démarrage, corriger les noms, ajouter ou désactiver des quartiers,
   créer les secteurs, saisir les objectifs de mobilisation par commune et par quartier.
5. **Limites cartographiques** : obtenir les limites officielles (ANAT / collectivités) au format GeoJSON. Chaque entité
   doit porter `properties.niveau` (`commune`, `quartier` ou `secteur`) et `properties.code` (ex. `GS`, `GS-03`) :
   ```bash
   docker compose exec app node backend/scripts/import-geo.js /chemin/limites.geojson
   ```
6. **Responsables** : créer les coordonnateurs (un par commune), puis les superviseurs (groupe de quartiers),
   puis les commissaires (quartier).
7. **Utilisateurs** : créer un compte par personne (jamais de compte partagé).

## 2. Comptes et droits

| Profil | À attribuer à | Périmètre |
|---|---|---|
| Administrateur central | 1 à 2 personnes de confiance | Aucun (tout le département) |
| Coordonnateur | Coordonnateur communal | Sa commune entière |
| Superviseur | Superviseur de zone | Ses quartiers |
| Commissaire | Commissaire de quartier | Son ou ses quartiers |
| Opérateur de saisie | Personnel de saisie | Vide (département) ou communes concernées |
| Décideur / Consultation | Membres du comité de pilotage | Vide (dashboard agrégé, aucune donnée nominative) |

- À la création, un **mot de passe temporaire** s'affiche une seule fois : transmettez-le par un canal sûr (en main propre,
  appel). L'utilisateur doit le changer à sa première connexion.
- **Départ d'une personne** : désactivez le compte (toutes ses sessions sont fermées immédiatement).
- **Compte verrouillé** (5 échecs) : bouton « Déverrouiller » dans *Utilisateurs*, ou attendre 15 minutes.
- La matrice complète des droits est affichée en bas de l'écran *Utilisateurs*.

## 3. Cycle de vie d'une fiche

```
Saisie (commissaire, opérateur, import)  →  EN ATTENTE  →  validation coordonnateur  →  ACTIF
                                                ↑                                      │
                                     correction │                                      ▼
                                           À VÉRIFIER  ←──── signalement        DÉSACTIVÉ (motif obligatoire)
```

Aucune fiche n'est supprimée physiquement : la désactivation conserve l'historique et peut être annulée.
Un militant qui exerce son **droit d'opposition** est désactivé avec le motif « Opposition au traitement des données » ;
pour un effacement définitif exigé par la loi, l'opération se fait en base par l'administrateur et doit être consignée.

## 4. Qualité des données

- **Doublons** : écran *Qualité des données*. Pour chaque paire : « Conserver cette fiche » désactive l'autre avec le
  motif *Doublon fusionné* ; « Ce sont deux personnes différentes » écarte définitivement la paire.
- **Fiches à mettre à jour** : statut « À vérifier », sans téléphone, ou non revues depuis 12 mois
  (paramètre `DELAI_MISE_A_JOUR_MOIS` dans `shared/referentiel.js`).
- **Personnes non informées** : à régulariser en priorité (obligation légale).

## 5. Imports

1. *Import / Export* › **Télécharger le modèle Excel** (onglets *Référentiel* et *Sources* inclus).
2. Une ligne par militant. Colonnes obligatoires : Nom, Prénom(s), Sexe, Commune, Quartier.
3. **Simuler** : aucune écriture, rapport des erreurs (commune/quartier inconnus, téléphone invalide…) et des doublons.
4. Corriger puis **Importer**. Les doublons sont ignorés sauf si l'option est cochée.
5. L'historique des imports conserve l'empreinte SHA-256 de chaque fichier.

Limites : 10 Mo et 20 000 lignes par fichier (`IMPORT_MAX_ROWS`).

## 6. Journal d'audit

- Toutes les connexions (réussies ou non), consultations de fiche, créations, modifications, validations,
  désactivations, imports et exports sont enregistrés avec l'utilisateur, l'heure et l'adresse IP.
- Le bouton **Vérifier l'intégrité** recalcule la chaîne d'empreintes SHA-256 : toute modification ou suppression d'une
  ligne en base serait détectée. La base refuse d'ailleurs toute modification du journal.
- Revue conseillée : chaque semaine, filtrer « Échecs uniquement » et les exports.

## 7. Sauvegardes et restauration

- Le service `backup` produit chaque jour `sauvegardes/kiiraay_AAAAMMJJ_HHMMSS.dump.enc` (chiffré AES-256, avec
  empreinte `.sha256`), conservé 30 jours (`RETENTION_JOURS`).
- **Copiez les sauvegardes hors du serveur** (disque externe chiffré ou stockage distant) : une sauvegarde sur la même
  machine ne protège pas d'une panne disque ou d'un vol.
- Test de restauration mensuel, dans une base séparée :
  ```bash
  BACKUP_PASSPHRASE=… PGPASSWORD=… PGHOST=localhost ./scripts/restore.sh sauvegardes/kiiraay_….dump.enc kiiraay_test
  ```
  Le script vérifie l'empreinte, restaure et affiche le nombre de fiches et d'entrées de journal.

## 8. Secrets

| Secret | Rôle | Si perdu |
|---|---|---|
| `JWT_SECRET` | Signature des sessions | Régénérer : tout le monde se reconnecte |
| `DATA_ENCRYPTION_KEY` | Chiffrement des téléphones | **Téléphones illisibles** — conserver dans un coffre-fort |
| `DATA_INDEX_KEY` | Recherche par téléphone, doublons | Recherche par téléphone inopérante |
| `BACKUP_PASSPHRASE` | Chiffrement des sauvegardes | **Sauvegardes inutilisables** |
| `POSTGRES_PASSWORD` | Accès base | Réinitialisable par l'hébergeur |

En cas de fuite suspectée d'un secret : le changer, redémarrer, réinitialiser les mots de passe, et examiner le journal.
