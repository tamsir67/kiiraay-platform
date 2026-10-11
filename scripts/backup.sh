#!/bin/sh
# Sauvegarde quotidienne chiffrée (AES-256) de la base KIIRAAY — CDC §10 « Disponibilité »
# Variables : PGHOST (défaut db), PGUSER, PGPASSWORD, BACKUP_PASSPHRASE, RETENTION_JOURS
set -eu
PGHOST=${PGHOST:-db}; PGUSER=${PGUSER:-kiiraay}; DB=${PGDATABASE:-kiiraay}
DEST=${BACKUP_DIR:-/sauvegardes}
HORO=$(date +%Y%m%d_%H%M%S)
FICHIER="$DEST/kiiraay_$HORO.dump.enc"
mkdir -p "$DEST"
pg_dump -h "$PGHOST" -U "$PGUSER" -d "$DB" -Fc \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE -out "$FICHIER"
sha256sum "$FICHIER" > "$FICHIER.sha256"
find "$DEST" -name 'kiiraay_*.dump.enc*' -mtime +"${RETENTION_JOURS:-30}" -delete
echo "$(date -Iseconds) Sauvegarde OK : $FICHIER ($(du -h "$FICHIER" | cut -f1))"
