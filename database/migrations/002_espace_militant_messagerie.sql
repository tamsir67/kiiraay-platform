BEGIN;

ALTER TYPE role_utilisateur ADD VALUE 'MILITANT';

ALTER TABLE utilisateurs
  ADD COLUMN militant_id uuid REFERENCES militants(id) ON DELETE SET NULL,
  ADD COLUMN telephone_chiffre bytea,
  ADD COLUMN telephone_index bytea;

CREATE UNIQUE INDEX utilisateurs_militant_unique
  ON utilisateurs (militant_id) WHERE militant_id IS NOT NULL;

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a integer NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  participant_b integer NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (participant_a < participant_b),
  UNIQUE (participant_a, participant_b)
);

CREATE TABLE messages (
  id bigserial PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  auteur_id integer NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  contenu varchar(4000) NOT NULL CHECK (length(trim(contenu)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  lu_le timestamptz
);

CREATE INDEX messages_conversation_idx ON messages (conversation_id, id);

COMMIT;