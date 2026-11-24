// Integration tests for the business services, run against the seeded development database:
//   npm run test:services      (uses `--conditions=react-server` so the `server-only` guard is a no-op outside Next.js)
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { createOrder, expireStaleOrders, cancelOrder, quote, advanceOrder } from '../src/server/orders';
import { getSetting, setSetting } from '../src/server/settings';
import { AppError } from '../src/lib/errors';

const addr = { municipality: 'dili', adminPost: 'cristo_rei', suco: 'Becora', street: 'Rua de Teste 1' };
let v: { id: number; stock: number };
let commerce0: Awaited<ReturnType<typeof getSetting<'commerce'>>>;
const cleanup: (() => Promise<unknown>)[] = [];
const rndPhone = () => `+6707${Math.floor(1e6 + Math.random() * 9e6)}`;

const order = (over: Record<string, unknown> = {}, qty = 1) =>
  createOrder({
    user: null, locale: 'en',
    input: { items: [{ variantId: v.id, qty }], name: 'Service Test', phone: rndPhone(), paymentMethod: 'BANK_BNCTL', ...addr, ...over } as never,
  });
const codeOf = async (e: Promise<unknown>) => { try { await e; return null; } catch (err) { return err instanceof AppError ? err.code : String(err); } };

before(async () => {
  commerce0 = await getSetting('commerce');
  const row = await prisma.productVariant.findFirstOrThrow({ where: { sku: 'EC-TOP-001-L' } });
  await prisma.productVariant.update({ where: { id: row.id }, data: { stock: 100, isActive: true } });
  v = { id: row.id, stock: 100 };
});
after(async () => {
  for (const fn of cleanup.reverse()) await fn().catch(() => undefined);
  await setSetting('commerce', commerce0);
  await prisma.productVariant.update({ where: { id: v.id }, data: { stock: 6 } });
  await prisma.$disconnect();
});

test('unpaid orders past the deadline are cancelled and their stock released; verified/awaiting ones are not', async () => {
  const stock = async () => (await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock;
  const s0 = await stock();
  const expired = await order();
  const awaiting = await order();
  assert.equal(await stock(), s0 - 2);
  await prisma.order.update({ where: { code: expired.code }, data: { expiresAt: new Date(Date.now() - 1000) } });
  await prisma.order.update({ where: { code: awaiting.code }, data: { expiresAt: new Date(Date.now() - 1000), status: 'AWAITING_VERIFICATION', paymentStatus: 'AWAITING_VERIFICATION' } });
  const n = await expireStaleOrders();
  assert.ok(n >= 1);
  const a = await prisma.order.findUniqueOrThrow({ where: { code: expired.code } });
  const b = await prisma.order.findUniqueOrThrow({ where: { code: awaiting.code } });
  assert.equal(a.status, 'CANCELLED');
  assert.equal(a.cancelReason, 'PAYMENT_DEADLINE_EXPIRED');
  assert.equal(b.status, 'AWAITING_VERIFICATION', 'an order whose proof is being verified must not be auto-cancelled');
  assert.equal(await stock(), s0 - 1, 'only the expired order released its stock');
  await cancelOrder(b.id, null, { reason: 'test cleanup' });
  assert.equal(await stock(), s0, 'cancelling twice never restocks twice');
  await assert.rejects(() => cancelOrder(a.id, null, { reason: 'again' }), (e: AppError) => e.code === 'INVALID_TRANSITION');
  assert.equal(await stock(), s0);
});

test('coupon usage limit is enforced atomically and released on cancellation', async () => {
  const code = `T${Date.now().toString(36).toUpperCase()}`;
  const c = await prisma.coupon.create({ data: { code, type: 'PERCENT', value: 10, usageLimit: 1 } });
  cleanup.push(() => prisma.coupon.deleteMany({ where: { id: c.id } }));
  const first = await order({ coupon: code });
  const row = () => prisma.coupon.findUniqueOrThrow({ where: { id: c.id } });
  assert.equal((await row()).usedCount, 1);
  assert.equal(await codeOf(order({ coupon: code })), 'COUPON_EXHAUSTED');
  assert.equal((await row()).usedCount, 1, 'a refused order must not consume the coupon');
  await cancelOrder((await prisma.order.findUniqueOrThrow({ where: { code: first.code } })).id, null, { reason: 'test' });
  assert.equal((await row()).usedCount, 0, 'cancelling releases the coupon');
  const again = await order({ coupon: code });
  assert.ok(again.code);
  await cancelOrder((await prisma.order.findUniqueOrThrow({ where: { code: again.code } })).id, null, { reason: 'test' });
  assert.equal(await codeOf(order({ coupon: 'NOPE-NOT-A-COUPON' })), 'COUPON_INVALID');
});

test('free-delivery threshold is inclusive and uses the subtotal AFTER the discount', async () => {
  const price = (await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id }, include: { product: true } })).product.priceCents;
  const zone = await prisma.deliveryZone.findFirstOrThrow({ where: { municipality: 'dili', adminPost: 'cristo_rei' } });
  const threshold = zone.freeOverCents!;
  const qty = Math.ceil((threshold + 1) / price) + 1;
  const subtotal = qty * price;
  const quoteWith = async (discount: number) => {
    const code = `D${Date.now().toString(36).toUpperCase()}${discount}`;
    const c = await prisma.coupon.create({ data: { code, type: 'FIXED', value: Math.max(discount, 1) } });
    cleanup.push(() => prisma.coupon.deleteMany({ where: { id: c.id } }));
    return quote({ items: [{ variantId: v.id, qty }], ...addr, coupon: code }, 'en');
  };
  const exactly = await quoteWith(subtotal - threshold);
  assert.equal(exactly.subtotalCents - exactly.discountCents, threshold);
  assert.equal(exactly.shippingCents, 0, 'exactly at the threshold ships free');
  const below = await quoteWith(subtotal - threshold + 1);
  assert.equal(below.subtotalCents - below.discountCents, threshold - 1);
  assert.equal(below.shippingCents, zone.deliveryFeeCents, 'one cent below the threshold pays the fee');
});

test('COD cap is inclusive; totals always add up; COD fee is included', async () => {
  const q0 = await quote({ items: [{ variantId: v.id, qty: 3 }], ...addr, phone: '+67077001234' }, 'en');
  const total = q0.subtotalCents - q0.discountCents + q0.shippingCents;
  await setSetting('commerce', { ...commerce0, codMaxCents: total, codMinCents: 0, codFeeCents: 0 });
  const atCap = await quote({ items: [{ variantId: v.id, qty: 3 }], ...addr, phone: '+67077001234' }, 'en');
  assert.equal(atCap.methods.find((m) => m.key === 'COD')!.available, true, 'a total exactly at the cap is allowed');
  await setSetting('commerce', { ...commerce0, codMaxCents: total - 1, codMinCents: 0, codFeeCents: 0 });
  const over = await quote({ items: [{ variantId: v.id, qty: 3 }], ...addr, phone: '+67077001234' }, 'en');
  assert.equal(over.methods.find((m) => m.key === 'COD')!.reason, 'COD_LIMIT');
  await setSetting('commerce', { ...commerce0, codMaxCents: total + 1000, codMinCents: total + 1, codFeeCents: 0 });
  const under = await quote({ items: [{ variantId: v.id, qty: 3 }], ...addr, phone: '+67077001234' }, 'en');
  assert.equal(under.methods.find((m) => m.key === 'COD')!.reason, 'COD_MINIMUM');

  await setSetting('commerce', { ...commerce0, codMaxCents: total + 1000, codMinCents: 0, codFeeCents: 150 });
  const placed = await order({ paymentMethod: 'COD', acceptCodTerms: true, phone: '+67077001234' }, 3);
  const o = await prisma.order.findUniqueOrThrow({ where: { code: placed.code } });
  assert.equal(o.codFeeCents, 150);
  assert.equal(o.totalCents, o.subtotalCents - o.discountCents + o.shippingCents + o.codFeeCents, 'total = subtotal - discount + shipping + COD fee');
  assert.equal(o.status, 'PENDING_CONFIRMATION');
  assert.ok(o.codTermsAcceptedAt && o.codTermsVersion, 'COD terms acceptance is stored with the order');
  await cancelOrder(o.id, null, { reason: 'test' });
});

test('COD pre-conditions: dispatch needs a courier, delivery records exact cash, prepaid orders cannot be delivered unpaid', async () => {
  const staff = { id: (await prisma.user.findFirstOrThrow({ where: { email: 'fulfilment@eloura.local' } })).id, name: 'Test' };
  const placed = await order({ paymentMethod: 'COD', acceptCodTerms: true, phone: '+67077001234' });
  const id = (await prisma.order.findUniqueOrThrow({ where: { code: placed.code } })).id;
  await advanceOrder(id, staff); // PENDING_CONFIRMATION -> PROCESSING
  await advanceOrder(id, staff); // -> PACKED
  assert.equal(await codeOf(advanceOrder(id, staff)), 'COURIER_REQUIRED');
  await prisma.order.update({ where: { id }, data: { assignedCourierId: staff.id } });
  await advanceOrder(id, staff); // -> OUT_FOR_DELIVERY
  assert.equal(await codeOf(advanceOrder(id, staff, { collectedCents: 1 })), 'COD_AMOUNT_MISMATCH');
  const done = await advanceOrder(id, staff);
  assert.equal(done.status, 'DELIVERED');
  assert.equal(done.paymentStatus, 'PAID');
  assert.equal(done.codCollectedCents, done.totalCents);
  assert.equal(await codeOf(cancelOrder(id, staff, { reason: 'late' })), 'INVALID_TRANSITION', 'delivered orders cannot be cancelled');

  const prepaid = await order();
  const pid = (await prisma.order.findUniqueOrThrow({ where: { code: prepaid.code } })).id;
  await prisma.order.update({ where: { id: pid }, data: { status: 'OUT_FOR_DELIVERY' } });
  assert.equal(await codeOf(advanceOrder(pid, staff)), 'PAYMENT_NOT_VERIFIED', 'unpaid prepaid order must not be delivered');
  await prisma.order.update({ where: { id: pid }, data: { status: 'PENDING_PAYMENT' } });
  await cancelOrder(pid, null, { reason: 'test' });
});

test('concurrency: the last unit and the last coupon use can only be bought once', async () => {
  await prisma.productVariant.update({ where: { id: v.id }, data: { stock: 1 } });
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => order()));
  const won = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{ code: string }>[];
  const lost = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  assert.equal(won.length, 1, 'exactly one of 8 parallel buyers gets the last unit');
  assert.ok(lost.every((r) => r.reason instanceof AppError && r.reason.code === 'OUT_OF_STOCK'), 'the others get OUT_OF_STOCK, not a crash');
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock, 0, 'stock never goes negative');
  await cancelOrder((await prisma.order.findUniqueOrThrow({ where: { code: won[0].value.code } })).id, null, { reason: 'test' });

  await prisma.productVariant.update({ where: { id: v.id }, data: { stock: 100 } });
  const code = `R${Date.now().toString(36).toUpperCase()}`;
  const c = await prisma.coupon.create({ data: { code, type: 'FIXED', value: 100, usageLimit: 1 } });
  cleanup.push(() => prisma.coupon.deleteMany({ where: { id: c.id } }));
  const r2 = await Promise.allSettled(Array.from({ length: 8 }, () => order({ coupon: code })));
  const ok2 = r2.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{ code: string }>[];
  assert.equal(ok2.length, 1, 'a coupon with usageLimit=1 is redeemed once even under parallel checkout');
  assert.equal((await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } })).usedCount, 1);
  assert.equal(await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } }).then((x) => x.stock), 99, 'refused orders did not keep any stock reserved');
  await cancelOrder((await prisma.order.findUniqueOrThrow({ where: { code: ok2[0].value.code } })).id, null, { reason: 'test' });
});

test('idempotency: a retried checkout (same key) returns the same order and reserves stock once', async () => {
  const stock = async () => (await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock;
  await prisma.productVariant.update({ where: { id: v.id }, data: { stock: 50 } });
  const key = `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const mk = () => createOrder({
    user: null, locale: 'en', idempotencyKey: key,
    input: { items: [{ variantId: v.id, qty: 2 }], name: 'Retry Test', phone: '+67077005555', paymentMethod: 'BANK_BNCTL', ...addr } as never,
  });
  const first = await mk();
  const again = await mk();
  assert.equal(again.code, first.code, 'the retry returns the original order');
  assert.equal(again.token, first.token);
  assert.equal(await stock(), 48, 'stock was reserved exactly once');

  const key2 = `${key}-par`;
  const par = await Promise.allSettled(Array.from({ length: 6 }, () => createOrder({
    user: null, locale: 'en', idempotencyKey: key2,
    input: { items: [{ variantId: v.id, qty: 1 }], name: 'Retry Test', phone: '+67077005555', paymentMethod: 'BANK_BNCTL', ...addr } as never,
  })));
  const codes = new Set(par.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<{ code: string }>).value.code));
  assert.equal(codes.size, 1, 'six simultaneous retries collapse into one order');
  assert.equal(await stock(), 47, 'and only one more unit is reserved');
  assert.equal(await prisma.order.count({ where: { idempotencyKey: { in: [key, key2] } } }), 2);

  for (const code of [first.code, ...codes]) await cancelOrder((await prisma.order.findUniqueOrThrow({ where: { code } })).id, null, { reason: 'test' });
  assert.equal(await stock(), 50);
});
