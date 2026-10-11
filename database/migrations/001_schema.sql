-- =====================================================================
-- KIIRAAY — Plateforme de gestion des militants — Guédiawaye 2027
-- Migration 001 : schéma principal (PostgreSQL 14+ / PostGIS 3.3+)
-- =====================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- unaccent() n'est pas IMMUTABLE : enveloppe pour pouvoir l'indexer
CREATE OR REPLACE FUNCTION f_norm(txt text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT lower(regexp_replace(public.unaccent('public.unaccent'::regdictionary, coalesce(txt, '')), '\s+', ' ', 'g')) $$;

-- ---------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------
CREATE TYPE role_utilisateur AS ENUM ('ADMIN','COORDONNATEUR','SUPERVISEUR','COMMISSAIRE','OPERATEUR','DECIDEUR');
CREATE TYPE fonction_responsable AS ENUM ('COORDONNATEUR','SUPERVISEUR','COMMISSAIRE');
CREATE TYPE statut_militant AS ENUM ('EN_ATTENTE','ACTIF','A_VERIFIER','INACTIF');
CREATE TYPE sexe AS ENUM ('M','F');

-- ---------------------------------------------------------------------
-- Référentiel territorial (CDC §3, §5.3)
-- ---------------------------------------------------------------------
CREATE TABLE communes (
  id          smallserial PRIMARY KEY,
  code        varchar(8)  NOT NULL UNIQUE,
  nom         varchar(80) NOT NULL UNIQUE,
  nom_court   varchar(30) NOT NULL,
  objectif_militants integer NOT NULL DEFAULT 0 CHECK (objectif_militants >= 0),
  geom        geometry(MultiPolygon, 4326),
  actif       boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX communes_geom_gix ON communes USING gist (geom);

CREATE TABLE quartiers (
  id          serial PRIMARY KEY,
  commune_id  smallint NOT NULL REFERENCES communes(id),
  code        varchar(12) NOT NULL UNIQUE,
  nom         varchar(120) NOT NULL,
  objectif_militants integer NOT NULL DEFAULT 0 CHECK (objectif_militants >= 0),
  geom        geometry(MultiPolygon, 4326),
  actif       boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commune_id, nom)
);
CREATE INDEX quartiers_commune_idx ON quartiers (commune_id);
CREATE INDEX quartiers_geom_gix ON quartiers USING gist (geom);

CREATE TABLE secteurs (
  id          serial PRIMARY KEY,
  quartier_id integer NOT NULL REFERENCES quartiers(id),
  code        varchar(20) NOT NULL UNIQUE,
  nom         varchar(120) NOT NULL,
  geom        geometry(MultiPolygon, 4326),
  actif       boolean NOT NULL DEFAULT true,
  UNIQUE (quartier_id, nom)
);

-- ---------------------------------------------------------------------
-- Autres référentiels (CDC §6.2)
-- ---------------------------------------------------------------------
CREATE TABLE sources_collecte (
  code     varchar(20) PRIMARY KEY,
  libelle  varchar(120) NOT NULL,
  actif    boolean NOT NULL DEFAULT true
);
CREATE TABLE motifs_desactivation (
  code     varchar(20) PRIMARY KEY,
  libelle  varchar(120) NOT NULL,
  actif    boolean NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- Chaîne de responsabilité (CDC §5.4)
-- coordonnateur (commune) -> superviseur (groupe de quartiers) -> commissaire (quartier)
-- ---------------------------------------------------------------------
CREATE TABLE responsables (
  id          serial PRIMARY KEY,
  fonction    fonction_responsable NOT NULL,
  nom         varchar(80)  NOT NULL,
  prenoms     varchar(120) NOT NULL,
  sexe        sexe,
  telephone_chiffre bytea,
  telephone_index   bytea,
  parent_id   integer REFERENCES responsables(id),
  actif       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_id IS DISTINCT FROM id)
);
CREATE INDEX responsables_parent_idx ON responsables (parent_id);

CREATE TABLE responsable_perimetres (
  responsable_id integer  NOT NULL REFERENCES responsables(id) ON DELETE CASCADE,
  commune_id     smallint NOT NULL REFERENCES communes(id),
  quartier_id    integer  REFERENCES quartiers(id),   -- NULL = toute la commune
  UNIQUE (responsable_id, commune_id, quartier_id)
);
CREATE INDEX resp_perim_quartier_idx ON responsable_perimetres (quartier_id);

-- ---------------------------------------------------------------------
-- Utilisateurs & sécurité (CDC §4, §10)
-- ---------------------------------------------------------------------
CREATE TABLE utilisateurs (
  id              serial PRIMARY KEY,
  identifiant     varchar(60) NOT NULL UNIQUE,
  email           varchar(160),
  nom             varchar(80) NOT NULL,
  prenoms         varchar(120) NOT NULL,
  role            role_utilisateur NOT NULL,
  responsable_id  integer REFERENCES responsables(id),
  mot_de_passe_hash text NOT NULL,
  doit_changer_mdp boolean NOT NULL DEFAULT true,
  actif           boolean NOT NULL DEFAULT true,
  echecs_connexion smallint NOT NULL DEFAULT 0,
  verrouille_jusqua timestamptz,
  derniere_connexion timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Périmètre territorial d'un utilisateur (vide = tout le département si le rôle le permet)
CREATE TABLE utilisateur_perimetres (
  utilisateur_id integer  NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  commune_id     smallint NOT NULL REFERENCES communes(id),
  quartier_id    integer  REFERENCES quartiers(id),
  UNIQUE (utilisateur_id, commune_id, quartier_id)
);

-- Jetons de rafraîchissement (stockés hachés, rotation à chaque usage)
CREATE TABLE sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  integer NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  jeton_hash      bytea NOT NULL UNIQUE,
  ip              inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expire_le       timestamptz NOT NULL,
  revoque_le      timestamptz
);
CREATE INDEX sessions_user_idx ON sessions (utilisateur_id);

-- ---------------------------------------------------------------------
-- Militants (CDC §6.1)
-- Téléphones chiffrés AES-256-GCM côté application + index aveugle HMAC
-- pour la recherche exacte et la détection de doublons.
-- ---------------------------------------------------------------------
CREATE SEQUENCE militant_numero_seq START 1;

CREATE TABLE militants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          varchar(20) NOT NULL UNIQUE
                  DEFAULT ('KRY-GDW-' || lpad(nextval('militant_numero_seq')::text, 6, '0')),
  -- Identification
  nom             varchar(80)  NOT NULL CHECK (length(trim(nom)) > 0),
  prenoms         varchar(120) NOT NULL CHECK (length(trim(prenoms)) > 0),
  sexe            sexe NOT NULL,
  date_naissance  date CHECK (date_naissance IS NULL OR date_naissance BETWEEN '1900-01-01' AND current_date),
  -- Coordonnées
  telephone_chiffre   bytea,
  telephone_index     bytea,          -- HMAC-SHA256(numéro E.164)
  telephone_suffixe   char(4),        -- 4 derniers chiffres (recherche partielle)
  telephone2_chiffre  bytea,
  telephone2_index    bytea,
  email           varchar(160),
  adresse         varchar(255),
  repere          varchar(255),
  -- Localisation
  commune_id      smallint NOT NULL REFERENCES communes(id),
  quartier_id     integer  NOT NULL REFERENCES quartiers(id),
  secteur_id      integer  REFERENCES secteurs(id),
  latitude        numeric(9,6) CHECK (latitude  BETWEEN -90  AND 90),
  longitude       numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  geom            geometry(Point, 4326) GENERATED ALWAYS AS (
                    CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
                         THEN ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326) END) STORED,
  -- Organisation
  coordonnateur_id integer REFERENCES responsables(id),
  superviseur_id   integer REFERENCES responsables(id),
  commissaire_id   integer REFERENCES responsables(id),
  statut          statut_militant NOT NULL DEFAULT 'EN_ATTENTE',
  date_enregistrement date NOT NULL DEFAULT current_date,
  motif_desactivation varchar(20) REFERENCES motifs_desactivation(code),
  valide_par      integer REFERENCES utilisateurs(id),
  valide_le       timestamptz,
  -- Suivi
  source          varchar(20) REFERENCES sources_collecte(code),
  observations    text,
  information_personne boolean NOT NULL DEFAULT false,  -- personne informée du traitement (CDC §15)
  information_date date,
  import_id       integer,
  version         integer NOT NULL DEFAULT 1,
  created_by      integer REFERENCES utilisateurs(id),
  updated_by      integer REFERENCES utilisateurs(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- Recherche plein texte normalisée (nom, prénoms, adresse, repère)
  recherche       text GENERATED ALWAYS AS (
                    f_norm(nom || ' ' || prenoms || ' ' || coalesce(adresse, '') || ' ' || coalesce(repere, ''))) STORED,
  identite_norm   text GENERATED ALWAYS AS (f_norm(nom || ' ' || prenoms)) STORED,
  CONSTRAINT motif_si_inactif CHECK (statut <> 'INACTIF' OR motif_desactivation IS NOT NULL)
);

CREATE INDEX militants_quartier_idx    ON militants (quartier_id, statut);
CREATE INDEX militants_commune_idx     ON militants (commune_id, statut);
CREATE INDEX militants_statut_idx      ON militants (statut);
CREATE INDEX militants_created_idx     ON militants (created_at);
CREATE INDEX militants_updated_idx     ON militants (updated_at);
CREATE INDEX militants_commissaire_idx ON militants (commissaire_id);
CREATE INDEX militants_superviseur_idx ON militants (superviseur_id);
CREATE INDEX militants_coord_idx       ON militants (coordonnateur_id);
CREATE INDEX militants_tel_idx         ON militants (telephone_index);
CREATE INDEX militants_tel2_idx        ON militants (telephone2_index);
CREATE INDEX militants_tel_suffixe_idx ON militants (telephone_suffixe);
CREATE INDEX militants_recherche_trgm  ON militants USING gin (recherche gin_trgm_ops);
CREATE INDEX militants_identite_trgm   ON militants USING gist (identite_norm gist_trgm_ops);
CREATE INDEX militants_geom_gix        ON militants USING gist (geom);

-- Cohérence quartier / commune / secteur
CREATE OR REPLACE FUNCTION trg_militant_coherence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM quartiers q WHERE q.id = NEW.quartier_id AND q.commune_id = NEW.commune_id) THEN
    RAISE EXCEPTION 'Le quartier % n''appartient pas à la commune %', NEW.quartier_id, NEW.commune_id USING ERRCODE = '23514';
  END IF;
  IF NEW.secteur_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM secteurs s WHERE s.id = NEW.secteur_id AND s.quartier_id = NEW.quartier_id) THEN
    RAISE EXCEPTION 'Le secteur % n''appartient pas au quartier %', NEW.secteur_id, NEW.quartier_id USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.version := OLD.version + 1;
    NEW.updated_at := now();
  END IF;
  IF NEW.statut <> 'INACTIF' THEN NEW.motif_desactivation := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER militants_coherence BEFORE INSERT OR UPDATE ON militants
  FOR EACH ROW EXECUTE FUNCTION trg_militant_coherence();

-- ---------------------------------------------------------------------
-- Historisation des fiches (CDC §5.1) — alimentée par trigger
-- L'utilisateur courant est transmis par l'API via SET LOCAL app.user_id
-- ---------------------------------------------------------------------
CREATE TABLE militants_historique (
  id           bigserial PRIMARY KEY,
  militant_id  uuid NOT NULL REFERENCES militants(id) ON DELETE CASCADE,
  operation    varchar(20) NOT NULL,
  utilisateur_id integer,
  modifie_le   timestamptz NOT NULL DEFAULT now(),
  champs       text[],
  avant        jsonb,
  apres        jsonb
);
CREATE INDEX militants_hist_idx ON militants_historique (militant_id, modifie_le DESC);

CREATE OR REPLACE FUNCTION trg_militant_historique() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  exclus text[] := ARRAY['telephone_chiffre','telephone_index','telephone2_chiffre','telephone2_index',
                         'recherche','identite_norm','geom','version','updated_at','updated_by'];
  o jsonb; n jsonb; diff text[];
  uid integer := nullif(current_setting('app.user_id', true), '')::integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO militants_historique (militant_id, operation, utilisateur_id, apres)
    VALUES (NEW.id, 'CREATION', coalesce(uid, NEW.created_by), to_jsonb(NEW) - exclus);
    RETURN NEW;
  END IF;
  o := to_jsonb(OLD) - exclus;  n := to_jsonb(NEW) - exclus;
  SELECT array_agg(k) INTO diff FROM jsonb_object_keys(n) k WHERE n->k IS DISTINCT FROM o->k;
  IF OLD.telephone_index IS DISTINCT FROM NEW.telephone_index THEN diff := array_append(diff, 'telephone'); END IF;
  IF OLD.telephone2_index IS DISTINCT FROM NEW.telephone2_index THEN diff := array_append(diff, 'telephone2'); END IF;
  IF diff IS NULL THEN RETURN NEW; END IF;
  INSERT INTO militants_historique (militant_id, operation, utilisateur_id, champs, avant, apres)
  VALUES (NEW.id,
          CASE WHEN OLD.statut <> NEW.statut AND NEW.statut = 'INACTIF' THEN 'DESACTIVATION'
               WHEN OLD.statut <> NEW.statut AND NEW.statut = 'ACTIF' AND OLD.statut = 'EN_ATTENTE' THEN 'VALIDATION'
               WHEN OLD.statut = 'INACTIF' AND NEW.statut <> 'INACTIF' THEN 'REACTIVATION'
               ELSE 'MODIFICATION' END,
          coalesce(uid, NEW.updated_by), diff,
          (SELECT jsonb_object_agg(k, o->k) FROM unnest(diff) k WHERE o ? k),
          (SELECT jsonb_object_agg(k, n->k) FROM unnest(diff) k WHERE n ? k));
  RETURN NEW;
END $$;
CREATE TRIGGER militants_historique AFTER INSERT OR UPDATE ON militants
  FOR EACH ROW EXECUTE FUNCTION trg_militant_historique();

-- Paires examinées et déclarées « pas un doublon »
CREATE TABLE doublons_ecartes (
  militant_a   uuid NOT NULL REFERENCES militants(id) ON DELETE CASCADE,
  militant_b   uuid NOT NULL REFERENCES militants(id) ON DELETE CASCADE,
  ecarte_par   integer REFERENCES utilisateurs(id),
  ecarte_le    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (militant_a, militant_b),
  CHECK (militant_a < militant_b)
);

-- ---------------------------------------------------------------------
-- Imports (CDC §5.5)
-- ---------------------------------------------------------------------
CREATE TABLE imports (
  id            serial PRIMARY KEY,
  utilisateur_id integer NOT NULL REFERENCES utilisateurs(id),
  fichier       varchar(255) NOT NULL,
  empreinte_sha256 char(64) NOT NULL,
  lignes_total  integer NOT NULL,
  lignes_inserees integer NOT NULL,
  lignes_rejetees integer NOT NULL,
  doublons      integer NOT NULL DEFAULT 0,
  rapport       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE militants ADD CONSTRAINT militants_import_fk FOREIGN KEY (import_id) REFERENCES imports(id);

-- ---------------------------------------------------------------------
-- Journal d'audit (CDC §5.6) — APPEND-ONLY
-- ---------------------------------------------------------------------
CREATE TABLE journal_audit (
  id            bigserial PRIMARY KEY,
  horodatage    timestamptz NOT NULL DEFAULT now(),
  utilisateur_id integer,
  identifiant   varchar(60),
  role          role_utilisateur,
  action        varchar(40) NOT NULL,
  entite        varchar(40),
  entite_id     text,
  succes        boolean NOT NULL DEFAULT true,
  ip            inet,
  user_agent    text,
  details       jsonb,
  -- Chaînage : chaque ligne contient l'empreinte de la précédente (anti-falsification)
  empreinte     bytea
);
CREATE INDEX journal_horodatage_idx ON journal_audit (horodatage DESC);
CREATE INDEX journal_user_idx ON journal_audit (utilisateur_id, horodatage DESC);
CREATE INDEX journal_action_idx ON journal_audit (action, horodatage DESC);

CREATE OR REPLACE FUNCTION trg_journal_chainage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prev bytea;
BEGIN
  PERFORM pg_advisory_xact_lock(727274);
  SELECT empreinte INTO prev FROM journal_audit ORDER BY id DESC LIMIT 1;
  NEW.empreinte := digest(coalesce(prev, '\x'::bytea) || convert_to(
      to_char(NEW.horodatage AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' || coalesce(NEW.utilisateur_id::text, '') || '|' || NEW.action || '|' ||
      coalesce(NEW.entite, '') || '|' || coalesce(NEW.entite_id, '') || '|' || NEW.succes::text || '|' ||
      coalesce(NEW.details::text, ''), 'UTF8'), 'sha256');
  RETURN NEW;
END $$;
CREATE TRIGGER journal_chainage BEFORE INSERT ON journal_audit
  FOR EACH ROW EXECUTE FUNCTION trg_journal_chainage();

CREATE OR REPLACE FUNCTION trg_journal_immuable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Le journal d''audit est en ajout seul (opération % interdite)', TG_OP USING ERRCODE = '42501';
END $$;
CREATE TRIGGER journal_immuable BEFORE UPDATE OR DELETE OR TRUNCATE ON journal_audit
  FOR EACH STATEMENT EXECUTE FUNCTION trg_journal_immuable();

-- ---------------------------------------------------------------------
-- Vues utiles au dashboard
-- ---------------------------------------------------------------------
-- Commissaires actifs par quartier
CREATE VIEW v_quartiers_encadrement AS
SELECT q.id AS quartier_id,
       count(DISTINCT r.id) FILTER (WHERE r.fonction = 'COMMISSAIRE') AS nb_commissaires,
       count(DISTINCT r.id) FILTER (WHERE r.fonction = 'SUPERVISEUR') AS nb_superviseurs
FROM quartiers q
LEFT JOIN responsable_perimetres rp ON rp.quartier_id = q.id
LEFT JOIN responsables r ON r.id = rp.responsable_id AND r.actif
GROUP BY q.id;

CREATE TABLE schema_migrations (version varchar(40) PRIMARY KEY, appliquee_le timestamptz NOT NULL DEFAULT now());
INSERT INTO schema_migrations (version) VALUES ('001_schema');

COMMIT;
