 
// Idempotent seed: RBAC roles/permissions, Super Admin, Dili delivery zones + sucos, payment configs, banners,
// CMS pages, 6 categories and 8 sample products in 4 languages. Run: npm run db:seed
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, SYSTEM_ROLES } from '../src/lib/rbac';
import { DILI_POSTS, DILI_SUCOS, MUNICIPALITIES } from '../src/lib/geo';
import { CATEGORIES, PRODUCTS, HERO_BANNERS, PROMO_BANNER, PAYMENT_METHODS, CMS_PAGES, COUPON_DEMO } from './seed-content';

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === 'production';
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

async function main() {
  /* ---- permissions & roles ---- */
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key: p.key }, update: { group: p.group, description: p.description }, create: p });
  }
  for (const r of SYSTEM_ROLES) {
    const existing = await prisma.role.findUnique({ where: { key: r.key } });
    if (existing) { await prisma.role.update({ where: { id: existing.id }, data: { name: r.name, description: r.description, isSystem: true } }); continue; }
    await prisma.role.create({
      data: { key: r.key, name: r.name, description: r.description, isSystem: true, permissions: { create: r.permissions.map((permissionKey) => ({ permissionKey })) } },
    });
  }
  const role = async (key: string) => (await prisma.role.findUniqueOrThrow({ where: { key } })).id;

  /* ---- super admin ---- */
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@eloura.local').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || '';
  if (!(await prisma.user.findUnique({ where: { email: adminEmail } }))) {
    if (isProd && (adminPassword.length < 12 || adminPassword === 'Admin#Eloura2026')) {
      throw new Error('Production seed: set SEED_ADMIN_PASSWORD to a strong password (>= 12 characters).');
    }
    const pw = adminPassword || 'Admin#Eloura2026';
    await prisma.user.create({
      data: { email: adminEmail, name: process.env.SEED_ADMIN_NAME || 'Eloura Admin', passwordHash: await bcrypt.hash(pw, 12), roles: { create: { roleId: await role('SUPER_ADMIN') } } },
    });
    console.log(`✔ Super admin created: ${adminEmail}`);
  }

  /* ---- demo staff + customer (development only) ---- */
  if (!isProd && process.env.SEED_DEMO_STAFF !== '0') {
    const pw = await bcrypt.hash(process.env.SEED_DEMO_PASSWORD || 'Demo#Eloura2026', 12);
    const demo: [string, string, string][] = [
      ['manager@eloura.local', 'Store Manager (demo)', 'STORE_MANAGER'], ['finance@eloura.local', 'Finance Staff (demo)', 'FINANCE_STAFF'],
      ['fulfilment@eloura.local', 'Order Fulfilment (demo)', 'ORDER_FULFILLMENT'], ['support@eloura.local', 'Customer Support (demo)', 'CUSTOMER_SUPPORT'],
      ['customer@eloura.local', 'Demo Customer', 'CUSTOMER'],
    ];
    for (const [email, name, r] of demo) {
      if (await prisma.user.findUnique({ where: { email } })) continue;
      await prisma.user.create({ data: { email, name, phone: r === 'CUSTOMER' ? '+67077001234' : null, passwordHash: pw, roles: { create: { roleId: await role(r) } } } });
    }
    console.log('✔ Demo staff accounts (one per role) + demo customer ready');
  }

  /* ---- delivery zones: Dili posts (COD capable) + other municipalities (never COD) ---- */
  const diliFees: Record<string, { fee: number; free: number | null; eta: string; cod: boolean }> = {
    cristo_rei: { fee: 200, free: 5000, eta: '1-2', cod: true },
    dom_aleixo: { fee: 200, free: 5000, eta: '1-2', cod: true },
    nain_feto: { fee: 200, free: 5000, eta: '1-2', cod: true },
    vera_cruz: { fee: 200, free: 5000, eta: '1-2', cod: true },
    metinaro: { fee: 400, free: 8000, eta: '2-3', cod: false }, // optional COD zone: admin can switch it on
  };
  let order = 0;
  for (const p of DILI_POSTS) {
    const cfg = diliFees[p.key];
    let zone = await prisma.deliveryZone.findFirst({ where: { municipality: 'dili', adminPost: p.key } });
    const zoneIsNew = !zone;
    if (!zone) {
      zone = await prisma.deliveryZone.create({
        data: { municipality: 'dili', adminPost: p.key, name: p.name, codEnabled: cfg.cod, deliveryFeeCents: cfg.fee, freeOverCents: cfg.free, etaText: cfg.eta, sortOrder: order },
      });
    }
    // Only seed the sucos together with a NEW zone: the seed runs on every container start and must not resurrect sucos an admin removed.
    if (zoneIsNew) {
      for (const s of DILI_SUCOS[p.key] ?? []) {
        await prisma.suco.upsert({ where: { zoneId_name: { zoneId: zone.id, name: s } }, update: {}, create: { zoneId: zone.id, name: s, codEnabled: true } });
      }
    }
    order++;
  }
  for (const m of MUNICIPALITIES.filter((x) => x.key !== 'dili')) {
    if (await prisma.deliveryZone.findFirst({ where: { municipality: m.key, adminPost: null } })) continue;
    const far = m.key === 'oecusse' || m.key === 'atauro';
    await prisma.deliveryZone.create({
      data: { municipality: m.key, adminPost: null, name: m.name, codEnabled: false, deliveryFeeCents: m.key === 'oecusse' ? 1000 : m.key === 'atauro' ? 800 : 600, freeOverCents: far ? null : 10000, etaText: far ? '4-7' : '3-5', sortOrder: order++ },
    });
  }
  console.log('✔ Delivery zones (Dili posts + sucos, other municipalities)');

  /* ---- payment methods ---- */
  for (const m of PAYMENT_METHODS) {
    await prisma.paymentMethodConfig.upsert({
      where: { key: m.key }, update: {},
      create: { key: m.key, enabled: true, sortOrder: m.sortOrder, name: m.name, instructions: m.instructions, config: m.config },
    });
  }

  /* ---- CMS pages ---- */
  for (const p of CMS_PAGES) await prisma.cmsPage.upsert({ where: { slug: p.slug }, update: {}, create: { slug: p.slug, title: p.title, body: p.body } });

  /* ---- store settings defaults are applied in code; nothing to seed ---- */

  /* ---- catalogue ---- */
  // The sample catalogue is seeded ONCE (flag in StoreSetting), never again: otherwise deleted sample products, categories or
  // banners would reappear on every container restart (the seed runs at each start).
  const seedState = ((await prisma.storeSetting.findUnique({ where: { key: 'seedState' } }))?.value ?? {}) as { catalog?: boolean };
  if (process.env.SEED_CATALOG !== '0' && !seedState.catalog && (await prisma.product.count()) === 0) {
    const catIds = new Map<string, number>();
    let i = 0;
    for (const c of CATEGORIES) {
      const row = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: { slug: c.slug, name: c.name, image: c.image, sortOrder: i++ } });
      catIds.set(c.slug, row.id);
    }
    for (const p of PRODUCTS) {
      if (await prisma.product.findUnique({ where: { slug: p.slug } })) continue;
      await prisma.product.create({
        data: {
          slug: p.slug, sku: p.sku, categoryId: catIds.get(p.category), name: p.name, description: p.description, priceCents: p.price, compareAtCents: p.compareAt ?? null,
          isFeatured: !!p.featured, searchText: norm([p.sku, ...Object.values(p.name)].join(' ')),
          images: { create: [{ url: p.image, sortOrder: 0 }] },
          variants: { create: p.variants.map((v) => ({ sku: v.sku, size: v.size ?? null, color: v.color ?? null, colorHex: v.hex ?? null, stock: v.stock })) },
        },
      });
    }
    if ((await prisma.banner.count()) === 0) {
      let n = 0;
      for (const b of HERO_BANNERS) await prisma.banner.create({ data: { placement: 'HERO', image: b.image, badge: b.badge, title: b.title, highlight: b.highlight, subtitle: b.subtitle, ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl, sortOrder: n++ } });
      await prisma.banner.create({ data: { placement: 'PROMO', image: PROMO_BANNER.image, badge: PROMO_BANNER.badge, title: PROMO_BANNER.title, highlight: PROMO_BANNER.highlight, subtitle: PROMO_BANNER.subtitle, ctaLabel: PROMO_BANNER.ctaLabel, ctaUrl: PROMO_BANNER.ctaUrl } });
    }
    await prisma.coupon.upsert({ where: { code: COUPON_DEMO.code }, update: {}, create: COUPON_DEMO });
    await prisma.storeSetting.upsert({ where: { key: 'seedState' }, update: { value: { ...seedState, catalog: true } }, create: { key: 'seedState', value: { catalog: true } } });
    console.log(`✔ Catalogue: ${CATEGORIES.length} categories, ${PRODUCTS.length} products, ${HERO_BANNERS.length} hero banners + promo`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
