BEGIN;

ALTER TABLE militants
  ADD COLUMN numero_cni_chiffre bytea,
  ADD COLUMN numero_cni_index bytea;

CREATE UNIQUE INDEX militants_numero_cni_unique
  ON militants (numero_cni_index) WHERE numero_cni_index IS NOT NULL;

CREATE OR REPLACE FUNCTION trg_militant_historique() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  exclus text[] := ARRAY['telephone_chiffre','telephone_index','telephone2_chiffre','telephone2_index',
                         'numero_cni_chiffre','numero_cni_index','recherche','identite_norm','geom',
                         'version','updated_at','updated_by'];
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
  IF OLD.numero_cni_index IS DISTINCT FROM NEW.numero_cni_index THEN diff := array_append(diff, 'numero_cni'); END IF;
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

COMMIT;