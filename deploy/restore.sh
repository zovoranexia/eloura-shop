#!/usr/bin/env bash
# Eloura Chic - restore a backup made by deploy/backup.sh.
#
#   ./deploy/restore.sh /var/backups/eloura/db-20261124-020000.sql.gz /var/backups/eloura/uploads-20261124-020000.tar.gz
#   ./deploy/restore.sh --yes db-....sql.gz uploads-....tar.gz        # no confirmation prompt
#
# DESTRUCTIVE: replaces the current database content (and extracts the uploads over the existing files).
# The app container is stopped during the restore and started again at the end.
set -euo pipefail

cd "$(dirname "$0")/.."

ASSUME_YES=0
if [ "${1:-}" = "--yes" ]; then ASSUME_YES=1; shift; fi
DB_FILE="${1:-}"; UP_FILE="${2:-}"
[ -f "$DB_FILE" ] && [ -f "$UP_FILE" ] || { echo "usage: $0 [--yes] <db-*.sql.gz> <uploads-*.tar.gz>" >&2; exit 2; }
gzip -t "$DB_FILE"
tar --force-local -tzf "$UP_FILE" > /dev/null

if [ "$ASSUME_YES" -ne 1 ]; then
  echo "This will REPLACE the live database and uploads with:"
  echo "  $DB_FILE"
  echo "  $UP_FILE"
  read -r -p "Type YES to continue: " answer
  [ "$answer" = "YES" ] || { echo "aborted"; exit 1; }
fi

echo "[restore] stopping the app"
docker compose stop app

echo "[restore] restoring the database"
gzip -dc "$DB_FILE" | docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > /dev/null

echo "[restore] restoring uploads"
docker compose run --rm -T --no-deps --entrypoint tar app xzf - -C /data < "$UP_FILE"

echo "[restore] starting the app"
docker compose up -d app
echo "[restore] done. Check: docker compose ps && curl -s http://127.0.0.1:\${APP_PORT:-3000}/api/health"
