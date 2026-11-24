#!/usr/bin/env bash
# Eloura Chic - emergency password reset for ANY account (use when every Super Admin password is lost).
#
#   ./deploy/reset-admin-password.sh admin@your-domain.com
#
# Asks for the new password (not echoed), hashes it with bcrypt (cost 12), signs the account out everywhere and clears any lockout.
# Normal resets are done in the dashboard: Admin -> Staff -> reset password.
set -euo pipefail

cd "$(dirname "$0")/.."
EMAIL="${1:-}"
[ -n "$EMAIL" ] || { echo "usage: $0 <account-email>" >&2; exit 2; }

read -r -s -p "New password (min 12 characters, letters + digits): " NEWPW; echo
read -r -s -p "Repeat: " NEWPW2; echo
[ "$NEWPW" = "$NEWPW2" ] || { echo "passwords differ" >&2; exit 1; }
[ "${#NEWPW}" -ge 12 ] || { echo "too short (min 12 characters)" >&2; exit 1; }
printf '%s' "$NEWPW" | grep -q '[A-Za-z]' && printf '%s' "$NEWPW" | grep -q '[0-9]' || { echo "needs letters and digits" >&2; exit 1; }

# `docker compose exec` does not inherit the DATABASE_URL the entrypoint builds, so rebuild it here from the POSTGRES_* variables.
docker compose exec -T -e EMAIL="$EMAIL" -e NEWPW="$NEWPW" app node - <<'JS'
const e = process.env, enc = encodeURIComponent;
process.env.DATABASE_URL = `postgresql://${enc(e.POSTGRES_USER || 'eloura')}:${enc(e.POSTGRES_PASSWORD || '')}@${e.POSTGRES_HOST || 'db'}:5432/${enc(e.POSTGRES_DB || 'eloura')}?schema=public`;
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
(async () => {
  const prisma = new PrismaClient();
  try {
    const u = await prisma.user.update({
      where: { email: e.EMAIL.toLowerCase() },
      data: { passwordHash: await bcrypt.hash(e.NEWPW, 12), tokenVersion: { increment: 1 }, failedLogins: 0, lockedUntil: null },
    });
    console.log(`password reset for ${u.email} (id ${u.id}); every session of this account was signed out`);
  } catch (err) {
    console.error(err.code === 'P2025' ? 'no account with that e-mail' : String(err.message).split('\n').pop());
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
JS
