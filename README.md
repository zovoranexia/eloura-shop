# Eloura Chic — Fashion & Accessories (Dili, Timor-Leste)

Full-stack e-commerce for a women's fashion & accessories boutique: storefront, REST API, PostgreSQL database, admin dashboard with
granular RBAC, four languages (**Tetum default**, Portuguese, English, Indonesian) and Timor-Leste payment methods
(BNCTL bank transfer, BNCTL ATM transfer, T-Pay, Mosan, and Cash on Delivery for Dili only).

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 16 (App Router, Turbopack, route handlers, `proxy.ts`), React 19, TypeScript, Tailwind CSS 3, Lucide icons |
| Database | PostgreSQL 15 via Prisma 5 (migrations + seed) |
| Auth | JWT in HTTP-only cookie (jose), bcrypt (cost 12), CSRF double-submit token, per-IP rate limits, account lockout |
| Uploads | Re-encoded with sharp (images) / magic-byte checked (PDF); payment proofs stored **privately** |
| i18n | Cookie-based (`ec_lang`), dictionaries in `src/messages`, DB content as JSONB `{tet,pt,en,id}` with fallback to Tetum |
| Deploy | Multi-stage `Dockerfile` (Node 20 Alpine), `docker-compose.yml` (app + Postgres + persistent volumes) |

Currency is **USD only**, stored as integer cents. The business timezone is **Asia/Dili (UTC+9)**: timestamps are stored in UTC and
every display, day bucket (sales charts, reports, CSV exports) and promo/coupon window uses Dili time.

## Quick start (Docker)

```powershell
copy .env.example .env      # set POSTGRES_PASSWORD, AUTH_SECRET (openssl rand -base64 48), APP_URL, SEED_ADMIN_PASSWORD
                            # quote values containing '#', e.g. SEED_ADMIN_PASSWORD="Str0ng#Pass-2026" (unquoted '#' starts a comment)
docker compose up -d --build
```

The container waits for Postgres, applies migrations, seeds reference data (idempotent) and starts on `127.0.0.1:3000`.
Put nginx/Caddy/Cloudflare in front for HTTPS (it must send `X-Forwarded-For`; keep `TRUST_PROXY=1`).
Sign in at `/admin/login` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

### Ubuntu 16.04 / legacy hosts
Ubuntu 16.04 is end-of-life. The stack runs there through Docker (`docker-compose` 1.x is supported: the compose file is format 3.8),
but old Docker/libseccomp versions can reject newer base images (Alpine 3.14+, Debian bookworm) with *"operation not permitted"*.
If that happens, set in `.env`:

```
NODE_IMAGE=node:20-bullseye-slim
POSTGRES_IMAGE=postgres:15-bullseye
```

The Prisma schema already targets `debian-openssl-1.1.x` and `3.0.x`. This repository was verified with a current Docker only;
upgrading the host OS is the real fix.

## Local development

```powershell
docker run -d --name eloura-postgres -e POSTGRES_USER=eloura -e POSTGRES_PASSWORD=eloura_dev_only -e POSTGRES_DB=eloura `
  -p 127.0.0.1:15432:5432 postgres:15-alpine postgres -c timezone=Asia/Dili
copy .env.example .env     # set DATABASE_URL="postgresql://eloura:eloura_dev_only@127.0.0.1:15432/eloura?schema=public", NODE_ENV=development, AUTH_SECRET
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev                # http://localhost:3000
```

Development seed accounts (`NODE_ENV!=production`, password = `SEED_DEMO_PASSWORD`): `admin@`, `manager@`, `finance@`, `fulfilment@`,
`support@`, `customer@eloura.local`. Demo accounts are **never** created in production.

| Command | What it does |
|---|---|
| `npm test` | unit tests (phone, money, Asia/Dili days, i18n fallback, RBAC catalogue, geography) |
| `npm run test:api` | 57 end-to-end API checks against a running server with seeded demo accounts (COD rules, payments, RBAC, audit immutability…). Start the server with `TRUST_PROXY=1`; the suite configures test payment details itself, so it also works against a production build |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / ESLint 9 flat config (`eslint-config-next` 16) |
| `npm run test:services` | 7 integration tests of the business services (expiry, coupons, delivery thresholds, COD caps, concurrency, idempotency) |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:reset` | Prisma migrations and seeding |
| `npm run assets` | regenerates logo variants, favicon, hero/category/product images from `design/source` |

## Project layout

```
prisma/                 schema.prisma, migrations (incl. immutable audit trigger), seed.ts, seed-content.ts (4-language seed data)
src/app/(store)/        storefront pages            src/app/admin/       admin dashboard (RBAC-gated)
src/app/api/            REST route handlers         src/app/media/       public uploaded images
src/proxy.ts            CSRF cookie + /admin gate (Next 16 `proxy`, formerly middleware)
src/lib/                auth, rbac, i18n, api wrapper (CSRF, rate limit, errors), money, time (Asia/Dili), phone, geo, uploads, audit
src/server/             services: catalog, orders (checkout, proofs, fulfilment), payments (methods, COD rules), coupons, reports, notify
src/messages/           tet.json pt.json en.json id.json (+ admin/*.json for the dashboard)
public/images/          brand logos, hero banners, categories, products          design/source/  original design files
docker/entrypoint.sh    wait for DB → migrate → seed → start
tests/                  unit + API smoke tests
```

## What is in the app

**Storefront** (`/`): sticky header with 4-language switcher, hero slider (banners editable in the CMS), category strip, featured carousel,
promo banner, value bar, curved footer with newsletter · shop with filters (category, size, colour, price, sale) and sorting · product page
(gallery, variants, stock, description/shipping/COD tabs, verified reviews) · cart drawer + cart page · 3-step checkout · order page with payment
instructions, QR/accounts, proof upload and deadline countdown · order tracking by code + phone/e-mail · account (profile, saved addresses, orders,
wishlist) · CMS pages (About, COD terms, Privacy, Terms, Shipping & returns) · contact form.

**Admin** (`/admin`): analytics (revenue today/month/14 days in Dili time, orders by status, payment mix, low stock, queues) · products with 4-language
editor + variant matrix + image upload · categories · inventory · coupons · orders (timeline, WhatsApp confirmation, courier, notes, refunds, invoice & packing slip)
· payment verification center (proof preview/zoom, approve/reject) · COD cash reconciliation · customers (+ COD flag) · Dili zone & suco manager ·
payment methods · store settings (COD cap, fee, auto-flag) · banners · CMS pages · reviews · inquiries · newsletter · reports/CSV · staff · roles matrix · audit log.

## Roles & permissions (RBAC)

Permissions are fixed in code (`src/lib/rbac.ts`, e.g. `products.create`, `payments.verify`, `orders.update_status`, `settings.manage`);
roles are data and editable in **Admin → Staff & Roles**. Enforcement happens in three places: API routes (`route({ perm })`), admin pages
(server-side) and the sidebar/buttons (UI). Privilege escalation is blocked: nobody can grant permissions they do not hold, `SUPER_ADMIN`
is locked, you cannot demote/deactivate yourself, and the last active Super Admin cannot be removed. Changing a role, password or
active flag revokes the affected users' tokens immediately (`tokenVersion`).

| Role | Scope |
|---|---|
| `SUPER_ADMIN` | everything: roles, staff, settings, audit |
| `STORE_MANAGER` | products, variants, inventory, categories, coupons, banners, CMS, orders (status/cancel), reports |
| `FINANCE_STAFF` | payment verification queue, refunds, COD reconciliation, COD flags, revenue reports + CSV exports |
| `ORDER_FULFILLMENT` | pack → out for delivery → delivered, courier assignment (Dili COD), cancel/refused COD, invoices & packing slips |
| `CUSTOMER_SUPPORT` | customers, orders (read), contact inquiries, review moderation |
| `CUSTOMER` | storefront only — blocked from `/admin` and `/api/admin` |

## Payments

| Method | Customer does | Becomes |
|---|---|---|
| Bank transfer BNCTL | transfers to the shop's BNCTL account (order code as reference), uploads proof (JPG/PNG/PDF ≤ 5 MB) + reference | `AWAITING_VERIFICATION` |
| ATM transfer BNCTL | follows the ATM/P24 steps, uploads receipt photo + reference + receipt date/time | `AWAITING_VERIFICATION` |
| T-Pay | pays the merchant number / QR, submits transaction ID + screenshot | `AWAITING_VERIFICATION` |
| Mosan | pays the merchant number / QR, submits transaction reference + screenshot | `AWAITING_VERIFICATION` |
| Cash on delivery | accepts the COD terms (mandatory) | `PENDING_CONFIRMATION` → shop confirms by phone/WhatsApp |

Finance approves or rejects (rejection needs a reason, the customer may resubmit; unpaid orders are cancelled after
`paymentDeadlineHours` and stock/coupons are released by a background job). A reference can be used for **one** order only.
Account numbers, merchant numbers and QR images are edited in **Admin → Payment methods**; in production a method without real
details is hidden from customers so nobody pays a placeholder account.

**T-Pay and Mosan are verified manually** (finance checks the wallet statement). No merchant-API credentials exist, so nothing is
auto-confirmed; `walletProviders` in `src/server/payments.ts` is the seam where an official API/webhook can be plugged in later.

### Cash on delivery — rules enforced server-side (`codRule()`)
1. Delivery address in **Dili municipality** and inside an admin-approved COD zone (administrative post switch, plus per-suco switch).
   Atauro and every other municipality are never eligible, whatever the form sends. Metinaro ships switched **off** (admin may enable it).
2. Complete address (administrative post, suco, street).
3. A reachable **+670 mobile** number (the shop confirms before dispatch; WhatsApp link in the order screen).
4. Order total within the COD min/max cap (default max **$150**, configurable) plus an optional COD fee.
5. Explicit acceptance of the COD terms (version stored on the order).
6. Customers flagged for repeated refusals never see COD. Staff can flag/unflag; accounts are auto-flagged after N refused COD
   deliveries (default 2). Guest checkouts are matched by phone number against flagged accounts.
7. A COD order cannot go *out for delivery* without a courier; *delivered* records the exact cash collected; finance reconciles it.

## Security notes
CSRF double-submit + Origin check on every mutating request · SameSite=Lax HTTP-only cookies (Secure when `APP_URL` is https) ·
staff sessions 12 h · bcrypt · login lockout (5 fails / 15 min) + IP rate limits · prices, stock, discounts, delivery fees and COD
eligibility are always recomputed server-side · atomic stock reservation · uploads are decoded and re-encoded (EXIF stripped), PDFs
magic-byte checked and served sandboxed, proofs never publicly reachable · CSV exports guard against spreadsheet formula injection ·
CSP and security headers · **audit log is append-only at database level** (trigger rejects UPDATE/DELETE/TRUNCATE).
The rate limiter is in-memory (single instance); use Redis/proxy limits if you scale out.

## Things you must do before going live
* Enter the real BNCTL account, T-Pay and Mosan merchant details (+ QR images) in **Admin → Payment methods**; set store contact details in **Settings**.
* Replace the sample catalogue/photos (the product photos are crops of the design template; upload real photos in **Admin → Products**).
  The hero banners are 1024 px wide source images and look soft on large screens: supply higher-resolution versions via **Admin → Banners**.
* Have a native Tetum speaker proof-read `src/messages/tet.json`, `src/messages/admin/tet.json` and `prisma/seed-content.ts`.
  Delivery times, the 7-day return window and delivery fees in the seed are placeholders to adjust to your real policy.
* Set up SMTP (`SMTP_*`) for order e-mails; without it they are only logged.
* Take database backups (`pg_dump`) and back up the `uploads` volume (it contains private payment proofs).

## Framework version notes (Next.js 16)
* Requires **Node.js >= 20.9**. `cookies()`, `headers()`, `params` and `searchParams` are asynchronous everywhere (`await getT()`, `await getLocale()`;
  the `route()` wrapper awaits the route `params`, so numeric ids are still validated centrally).
* `src/proxy.ts` replaces `middleware.ts` and runs on the Node.js runtime. `next lint` no longer exists: use `npm run lint` (ESLint 9).
  The React-Compiler advisory rule `react-hooks/set-state-in-effect` is a warning, not an error: those effects intentionally sync props/URL/storage into state.
* `next dev` and `next build` use Turbopack. Background job for unpaid-order expiry starts from `src/instrumentation.ts` (automatic, no flag needed).
* `react-dom` 19 treats `inert` as a boolean prop (`inert={!active}`); the old `inert=""` form silently disables it.
