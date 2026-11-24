# syntax=docker/dockerfile:1
# Eloura Chic - multi-stage production image.
#
# NODE_IMAGE defaults to node:20-alpine. On very old hosts (e.g. Ubuntu 16.04 with Docker < 20.10.10 / old libseccomp) Alpine 3.14+ and
# Debian bookworm images can fail with "operation not permitted" errors; build with a bullseye image instead:
#   NODE_IMAGE=node:20-bullseye-slim docker compose build
# (the Prisma schema already lists the debian-openssl-1.1.x / 3.0.x engines). Package installs below work on both apk and apt bases.
ARG NODE_IMAGE=node:20-alpine

# ---------------------------------------------------------------- base
FROM ${NODE_IMAGE} AS base
RUN if command -v apk >/dev/null 2>&1; then apk add --no-cache openssl libc6-compat tzdata; \
    else apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates tzdata && rm -rf /var/lib/apt/lists/*; fi
ENV NEXT_TELEMETRY_DISABLED=1 TZ=Asia/Dili
WORKDIR /app

# ---------------------------------------------------------------- deps (cached unless package*.json change)
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts && npx prisma generate

# ---------------------------------------------------------------- build
FROM deps AS builder
COPY . .
# Bundle the seed script to plain JS so the runtime image needs neither tsx nor TypeScript.
RUN npx esbuild prisma/seed.ts --bundle --platform=node --target=node20 --outfile=prisma/seed.cjs \
      --external:@prisma/client --external:bcryptjs --log-level=warning
ENV NODE_ENV=production
# Build-time placeholders only (never baked into the runtime image): the app is compiled, not executed, against them.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" AUTH_SECRET="build-time-placeholder-build-time-placeholder" npx next build

# ---------------------------------------------------------------- Prisma CLI for `migrate deploy` at container start
FROM base AS prisma-cli
RUN mkdir -p /prisma-cli && cd /prisma-cli && npm init -y >/dev/null 2>&1 && npm install --omit=dev --no-audit --no-fund prisma@5.22.0

# ---------------------------------------------------------------- runtime
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/data/uploads
RUN addgroup -S -g 1001 app 2>/dev/null || groupadd -g 1001 app; \
    adduser -S -u 1001 -G app app 2>/dev/null || useradd -u 1001 -g app -m app; \
    mkdir -p /data/uploads && chown -R 1001:1001 /data /app

COPY --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/.next/static ./.next/static
COPY --from=builder --chown=1001:1001 /app/public ./public
COPY --from=builder --chown=1001:1001 /app/prisma ./prisma
COPY --from=prisma-cli --chown=1001:1001 /prisma-cli /prisma-cli
COPY --chown=1001:1001 docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER 1001
EXPOSE 3000
VOLUME ["/data/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/entrypoint.sh"]
