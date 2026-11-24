#!/usr/bin/env bash
# Eloura Chic - backup of the PostgreSQL database and the uploads volume (product images + PRIVATE payment proofs).
#
#   ./deploy/backup.sh                       # writes to /var/backups/eloura, keeps 14 days
#   BACKUP_DIR=/mnt/backup KEEP_DAYS=30 ./deploy/backup.sh
#
# Run it from anywhere: it changes into the repository folder (where docker-compose.yml lives).
# Safe for cron (no TTY needed). Exits non-zero on any failure and never leaves half-written files behind.
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-/var/backups/eloura}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

umask 077   # backups contain customer data and payment proofs: owner-only
mkdir -p "$BACKUP_DIR"

DB_FILE="$BACKUP_DIR/db-$STAMP.sql.gz"
UP_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
cleanup() { rm -f "$DB_FILE.part" "$UP_FILE.part"; }
trap cleanup EXIT

echo "[backup] database -> $DB_FILE"
# --clean --if-exists: the dump can be restored over an existing database (see restore.sh)
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  | gzip -9 > "$DB_FILE.part"
gzip -t "$DB_FILE.part"
[ "$(gzip -dc "$DB_FILE.part" | head -c 2000 | grep -c 'PostgreSQL database dump')" -ge 1 ] || { echo "[backup] database dump looks empty" >&2; exit 1; }
mv "$DB_FILE.part" "$DB_FILE"

echo "[backup] uploads  -> $UP_FILE"
docker compose exec -T app tar czf - -C /data uploads > "$UP_FILE.part"
tar --force-local -tzf "$UP_FILE.part" > /dev/null
mv "$UP_FILE.part" "$UP_FILE"

echo "[backup] removing backups older than $KEEP_DAYS days"
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete

echo "[backup] done: $(du -h "$DB_FILE" | cut -f1) database, $(du -h "$UP_FILE" | cut -f1) uploads"
