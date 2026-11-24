#!/bin/sh
# Container start: wait for PostgreSQL, apply migrations, seed (idempotent), start Next.js.
set -e

# Build DATABASE_URL from the POSTGRES_* variables with URL-encoded credentials, so passwords containing @ / # : % ? still work.
if [ -z "$DATABASE_URL" ]; then
  DATABASE_URL="$(node -e 'const e=process.env,u=encodeURIComponent;process.stdout.write(`postgresql://${u(e.POSTGRES_USER||"eloura")}:${u(e.POSTGRES_PASSWORD||"")}@${e.POSTGRES_HOST||"db"}:5432/${u(e.POSTGRES_DB||"eloura")}?schema=public`)')"
  export DATABASE_URL
fi

PRISMA="/prisma-cli/node_modules/.bin/prisma"
echo "[entrypoint] applying database migrations..."
tries=0
until "$PRISMA" migrate deploy --schema=/app/prisma/schema.prisma; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "[entrypoint] database not reachable after 30 attempts, giving up" >&2
    exit 1
  fi
  echo "[entrypoint] database not ready (attempt $tries/30), retrying in 3s..."
  sleep 3
done

if [ "${RUN_SEED:-1}" = "1" ]; then
  echo "[entrypoint] seeding reference data (idempotent)..."
  node /app/prisma/seed.cjs
fi

echo "[entrypoint] starting Eloura Chic on port ${PORT:-3000}"
exec node /app/server.js
