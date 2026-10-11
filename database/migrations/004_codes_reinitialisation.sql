BEGIN;

CREATE TABLE codes_reinitialisation (
  id bigserial PRIMARY KEY,
  utilisateur_id integer NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  code_hash bytea NOT NULL,
  cree_le timestamptz NOT NULL DEFAULT now(),
  expire_le timestamptz NOT NULL,
  utilise_le timestamptz,
  tentatives smallint NOT NULL DEFAULT 0 CHECK (tentatives BETWEEN 0 AND 5)
);

CREATE INDEX codes_reinitialisation_utilisateur_idx
  ON codes_reinitialisation (utilisateur_id, cree_le DESC);

COMMIT;