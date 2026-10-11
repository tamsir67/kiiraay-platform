#!/bin/sh
# Restauration d'une sauvegarde chiffrée — à tester chaque mois (CDC §14 « sauvegarde restaurable »)
# Usage : BACKUP_PASSPHRASE=... PGPASSWORD=... ./scripts/restore.sh sauvegardes/kiiraay_YYYYMMDD_HHMMSS.dump.enc [base_cible]
# PostGIS exige un superutilisateur pour créer l'extension : PGSUPERUSER (défaut : utilisateur courant PGUSER)
set -eu
FICHIER=$1; CIBLE=${2:-kiiraay_restauration}
PGHOST=${PGHOST:-localhost}; PGUSER=${PGUSER:-kiiraay}; SU=${PGSUPERUSER:-$PGUSER}
sha256sum -c "$FICHIER.sha256"
createdb -h "$PGHOST" -U "$PGUSER" "$CIBLE"
psql -h "$PGHOST" -U "$SU" -d "$CIBLE" -q -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS pgcrypto;"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "$FICHIER" \
  | pg_restore -h "$PGHOST" -U "$PGUSER" -d "$CIBLE" --no-owner 2>&1 | grep -v -i "extension" || true
echo "Contrôle : $(psql -h "$PGHOST" -U "$PGUSER" -d "$CIBLE" -Atc 'SELECT count(*) FROM militants') fiches militants, $(psql -h "$PGHOST" -U "$PGUSER" -d "$CIBLE" -Atc 'SELECT count(*) FROM journal_audit') entrées de journal."
echo "Restauré dans la base « $CIBLE ». Vérifiez puis basculez DATABASE_URL si nécessaire."
