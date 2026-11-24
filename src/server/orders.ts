import 'server-only';
import crypto from 'node:crypto';
import { Prisma, type Order, type OrderStatus, type PaymentMethodKey } from '@prisma/client';
import { prisma, type Tx } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { loc, type Locale } from '@/lib/i18n';
import { normalizePhone } from '@/lib/phone';
import type { SessionUser } from '@/lib/auth';
import { getSetting } from './settings';
import { allMethods, getMethod, isOffered, receivingDetails, codRule, methodsFor, phoneCodBlocked, walletProviders, type ZoneWithSucos } from './payments';
import { assertCouponUsable, couponDiscount, findCoupon } from './coupons';
import { notifyOrder, type OrderMailKind } from './notify';
import { saveProof, deleteProof } from '@/lib/upload';

/* ================================================================== pricing */

export type Line = {
  variantId: number; productId: number; slug: string; nameJson: unknown; sku: string; size: string | null; color: string | null;
  colorHex: string | null; image: string | null; unitPriceCents: number; stock: number; qty: number; available: boolean; enough: boolean;
};

/** Resolve basket lines from the database - client prices are never trusted. */
export async function resolveLines(items: { variantId: number; qty: number }[], tx: Tx | typeof prisma = prisma): Promise<(Line | { variantId: number; qty: number; missing: true })[]> {
  const { maxQtyPerLine } = await getSetting('commerce');
  const merged = new Map<number, number>();
  for (const it of items) merged.set(it.variantId, Math.min((merged.get(it.variantId) ?? 0) + it.qty, maxQtyPerLine));
  if (!merged.size) return [];
  const rows = await tx.productVariant.findMany({
    where: { id: { in: [...merged.keys()] } },
    include: { product: { include: { images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], take: 1 } } } },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return [...merged].map(([variantId, qty]) => {
    const v = byId.get(variantId);
    if (!v) return { variantId, qty, missing: true as const };
    return {
      variantId, productId: v.productId, slug: v.product.slug, nameJson: v.product.name, sku: v.sku, size: v.size, color: v.color, colorHex: v.colorHex,
      image: v.product.images[0]?.url ?? null, unitPriceCents: v.priceCents ?? v.product.priceCents, stock: v.stock, qty,
      available: v.isActive && v.product.isActive, enough: v.stock >= qty,
    };
  });
}

export async function zoneFor(municipality: string, adminPost?: string | null): Promise<ZoneWithSucos | null> {
  return prisma.deliveryZone.findFirst({
    where: { municipality, isActive: true, adminPost: municipality === 'dili' ? (adminPost ?? '__none__') : null },
    include: { sucos: { orderBy: { name: 'asc' } } },
  });
}

export function shippingFor(zone: ZoneWithSucos | null, subtotalAfterDiscount: number) {
  if (!zone) return 0;
  if (zone.freeOverCents != null && subtotalAfterDiscount >= zone.freeOverCents) return 0;
  return zone.deliveryFeeCents;
}

export type QuoteInput = {
  items: { variantId: number; qty: number }[]; municipality?: string; adminPost?: string; suco?: string; street?: string; phone?: string; coupon?: string; userId?: number | null;
};

/** Live basket quote for the cart / checkout UI. */
export async function quote(input: QuoteInput, locale: Locale) {
  const lines = await resolveLines(input.items);
  const ok = lines.filter((l): l is Line => !('missing' in l) && l.available);
  const subtotal = ok.reduce((s, l) => s + l.unitPriceCents * Math.min(l.qty, l.stock), 0);

  let discount = 0, couponError: string | null = null, couponCode: string | null = null;
  if (input.coupon?.trim()) {
    try {
      const c = assertCouponUsable(await findCoupon(input.coupon), subtotal);
      discount = couponDiscount(c, subtotal);
      couponCode = c.code;
    } catch (e) { couponError = e instanceof AppError ? e.code : 'COUPON_INVALID'; }
  }
  const afterDiscount = subtotal - discount;
  const zone = input.municipality ? await zoneFor(input.municipality, input.adminPost) : null;
  const shipping = zone ? shippingFor(zone, afterDiscount) : 0;
  const user = input.userId ? await prisma.user.findUnique({ where: { id: input.userId }, select: { codBlocked: true } }) : null;
  const blocked = !!user?.codBlocked || (await phoneCodBlocked(input.phone));
  const methods = await methodsFor(
    { zone, suco: input.suco, street: input.street, phone: input.phone, amountCents: afterDiscount + shipping, userCodBlocked: blocked }, locale);
  return {
    lines: lines.map((l) => ('missing' in l ? l : { ...l, name: loc(l.nameJson, locale), nameJson: undefined })),
    subtotalCents: subtotal, discountCents: discount, couponCode, couponError, shippingCents: shipping,
    zone: zone ? { municipality: zone.municipality, adminPost: zone.adminPost, name: zone.name, etaText: zone.etaText, freeOverCents: zone.freeOverCents, deliveryFeeCents: zone.deliveryFeeCents } : null,
    methods,
  };
}

/* ================================================================== events & notifications */

export type Actor = { id: number; name: string } | null | undefined; // user | null = system | undefined = customer

export function addEvent(tx: Tx | typeof prisma, orderId: number, type: string, o: { from?: OrderStatus | null; to?: OrderStatus | null; actor?: Actor; note?: string | null } = {}) {
  return tx.orderEvent.create({
    data: {
      orderId, type, fromStatus: o.from ?? null, toStatus: o.to ?? null, actorId: o.actor?.id ?? null,
      actorLabel: o.actor ? o.actor.name : o.actor === null ? 'system' : 'customer', note: o.note ?? null,
    },
  });
}
const mail = (o: Order, kind: OrderMailKind, note?: string | null) => { void notifyOrder(o, kind, { note }); };

/* ================================================================== create */

const newCode = () => {
  const d = new Date(Date.now() + 9 * 3600e3); // Dili date
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const suffix = Array.from(crypto.randomBytes(4), (b) => alphabet[b % alphabet.length]).join('');
  return `EC-${ymd}-${suffix}`;
};

export type CheckoutInput = {
  items: { variantId: number; qty: number }[]; name: string; email?: string; phone: string; municipality: string; adminPost?: string; suco?: string;
  street: string; addressNotes?: string; note?: string; paymentMethod: PaymentMethodKey; coupon?: string; acceptCodTerms?: boolean;
};

const orderSummary = (o: Order) => ({ code: o.code, token: o.accessToken, totalCents: o.totalCents, paymentMethod: o.paymentMethod, status: o.status, expiresAt: o.expiresAt });

export async function createOrder(args: { user: SessionUser | null; input: CheckoutInput; locale: Locale; idempotencyKey?: string | null }) {
  const { user, input, locale, idempotencyKey } = args;
  if (idempotencyKey) {
    // a retry of the same checkout attempt: return the order that was already created
    const done = await prisma.order.findUnique({ where: { idempotencyKey } });
    if (done) return orderSummary(done);
  }
  const phone = normalizePhone(input.phone);
  if (!phone.valid) throw new AppError(422, 'INVALID_PHONE');

  const zone = await zoneFor(input.municipality, input.adminPost);
  if (!zone) throw new AppError(422, 'ZONE_UNAVAILABLE');
  const method = await getMethod(input.paymentMethod);
  if (!method || !isOffered(method)) throw new AppError(422, 'PAYMENT_METHOD_UNAVAILABLE');
  const commerce = await getSetting('commerce');
  const isCod = method.key === 'COD';
  if (isCod && !input.acceptCodTerms) throw new AppError(422, 'COD_TERMS_REQUIRED');

  const expires = isCod ? null : new Date(Date.now() + commerce.paymentDeadlineHours * 3600e3);
  const token = crypto.randomBytes(18).toString('base64url');

  let order: Order;
  try {
  order = await prisma.$transaction(async (tx) => {
    const lines = await resolveLines(input.items, tx);
    if (!lines.length) throw new AppError(422, 'EMPTY_CART');
    for (const l of lines) {
      if ('missing' in l || !l.available) throw new AppError(409, 'ITEM_UNAVAILABLE', { variantId: l.variantId });
      if (!l.enough) throw new AppError(409, 'OUT_OF_STOCK', { variantId: l.variantId, stock: l.stock });
    }
    const goods = lines as Line[];
    const subtotal = goods.reduce((s, l) => s + l.unitPriceCents * l.qty, 0);

    let discount = 0, couponCode: string | null = null;
    if (input.coupon?.trim()) {
      const c = assertCouponUsable(await tx.coupon.findUnique({ where: { code: input.coupon.trim().toUpperCase() } }), subtotal);
      const claimed = await tx.coupon.updateMany({
        where: { id: c.id, ...(c.usageLimit != null ? { usedCount: { lt: c.usageLimit } } : {}) }, data: { usedCount: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new AppError(422, 'COUPON_EXHAUSTED');
      discount = couponDiscount(c, subtotal);
      couponCode = c.code;
    }
    const shipping = shippingFor(zone, subtotal - discount);

    let codFee = 0;
    if (isCod) {
      const flagged = !!user?.codBlocked || (await phoneCodBlocked(phone.e164));
      const r = await codRule({ zone, suco: input.suco, street: input.street, phone: phone.e164, amountCents: subtotal - discount + shipping, userCodBlocked: flagged });
      if (!r.ok) throw new AppError(422, r.code, { max: r.max, min: r.min });
      codFee = r.feeCents;
    }
    const total = subtotal - discount + shipping + codFee;

    // Atomic stock reservation: fails if someone else bought the last unit meanwhile.
    for (const l of goods) {
      const r = await tx.productVariant.updateMany({ where: { id: l.variantId, isActive: true, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
      if (r.count !== 1) throw new AppError(409, 'OUT_OF_STOCK', { variantId: l.variantId });
    }
    const created = await tx.order.create({
      data: {
        code: newCode(), accessToken: token, idempotencyKey: idempotencyKey ?? null, userId: user?.id ?? null,
        status: isCod ? 'PENDING_CONFIRMATION' : 'PENDING_PAYMENT', paymentStatus: 'UNPAID', paymentMethod: method.key,
        subtotalCents: subtotal, discountCents: discount, couponCode, shippingCents: shipping, codFeeCents: codFee, totalCents: total,
        customerName: input.name, customerEmail: input.email || user?.email || null, customerPhone: phone.e164,
        municipality: input.municipality, adminPost: input.adminPost || null, suco: input.suco || null, street: input.street,
        addressNotes: input.addressNotes || null, customerNote: input.note || null, locale, expiresAt: expires,
        codTermsAcceptedAt: isCod ? new Date() : null, codTermsVersion: isCod ? commerce.codTermsVersion : null,
        items: {
          create: goods.map((l) => ({
            productId: l.productId, variantId: l.variantId, name: l.nameJson as Prisma.InputJsonValue, sku: l.sku, size: l.size, color: l.color,
            image: l.image, unitPriceCents: l.unitPriceCents, qty: l.qty,
          })),
        },
      },
    });
    await addEvent(tx, created.id, 'created', { to: created.status, note: method.key });
    return created;
  });
  } catch (e) {
    // two simultaneous requests with the same key: the loser's transaction (and its stock reservation) rolled back; return the winner's order
    if (idempotencyKey && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const winner = await prisma.order.findUnique({ where: { idempotencyKey } });
      if (winner) return orderSummary(winner);
    }
    throw e;
  }

  mail(order, 'created');
  return orderSummary(order);
}

/* ================================================================== read */

const orderInclude = {
  items: { orderBy: { id: 'asc' as const } },
  proofs: { orderBy: { id: 'desc' as const } },
  events: { orderBy: { id: 'asc' as const } },
  assignedCourier: { select: { id: true, name: true } },
} satisfies Prisma.OrderInclude;
export type OrderFull = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export const findOrderByCode = (code: string) => prisma.order.findUnique({ where: { code: String(code).toUpperCase() }, include: orderInclude });
export const findOrderById = (id: number) => prisma.order.findUnique({ where: { id }, include: orderInclude });

const PUBLIC_EVENTS = new Set(['created', 'status', 'payment_submitted', 'payment_approved', 'payment_rejected', 'cancelled', 'refund']);

/** Serialisable order for the UI. `staff` includes internal notes, actors, courier and proof details. */
export async function orderView(o: OrderFull, locale: Locale, opts: { staff?: boolean; hideProofs?: boolean } = {}) {
  const staff = !!opts.staff;
  // payer name/account and the reference are payment data: staff without payments.view must not receive them
  const showPayer = staff && !opts.hideProofs;
  const method = await getMethod(o.paymentMethod);
  const payable = (o.status === 'PENDING_PAYMENT' || o.status === 'AWAITING_VERIFICATION') && o.paymentMethod !== 'COD';
  return {
    id: o.id, code: o.code, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod,
    paymentMethodName: method ? loc(method.name, locale) : o.paymentMethod,
    subtotalCents: o.subtotalCents, discountCents: o.discountCents, couponCode: o.couponCode, shippingCents: o.shippingCents, codFeeCents: o.codFeeCents, totalCents: o.totalCents,
    customer: { name: o.customerName, email: o.customerEmail, phone: o.customerPhone },
    address: { municipality: o.municipality, adminPost: o.adminPost, suco: o.suco, street: o.street, notes: o.addressNotes },
    note: o.customerNote, expiresAt: o.expiresAt?.toISOString() ?? null, createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null, deliveredAt: o.deliveredAt?.toISOString() ?? null, cancelReason: o.cancelReason,
    userId: o.userId, locale: o.locale,
    items: o.items.map((i) => ({ id: i.id, productId: i.productId, name: loc(i.name, locale), nameI18n: i.name as Record<string, string>, sku: i.sku, size: i.size, color: i.color, image: i.image, unitPriceCents: i.unitPriceCents, qty: i.qty })),
    proofs: o.proofs.map((p) => ({
      id: p.id, method: p.method, amountCents: p.amountCents, status: p.status, bankKey: p.bankKey, reference: staff && opts.hideProofs ? null : p.reference,
      payerName: showPayer ? p.payerName : undefined, payerAccount: showPayer ? p.payerAccount : undefined, paidAt: p.paidAt?.toISOString() ?? null,
      hasFile: !!p.fileKey, fileMime: p.fileMime, reviewNote: p.reviewNote, reviewedAt: p.reviewedAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(),
    })),
    events: o.events.filter((e) => staff || PUBLIC_EVENTS.has(e.type)).map((e) => ({
      id: e.id, type: e.type, from: e.fromStatus, to: e.toStatus, actor: staff ? e.actorLabel : undefined,
      note: staff || e.type === 'payment_rejected' ? e.note : undefined, createdAt: e.createdAt.toISOString(),
    })),
    pay: method && payable ? { key: method.key, name: loc(method.name, locale), instructions: loc(method.instructions, locale), ...receivingDetails(method) }
      : method?.key === 'COD' ? { key: 'COD', name: loc(method.name, locale), instructions: loc(method.instructions, locale) } : null,
    cod: o.paymentMethod === 'COD' ? {
      termsAcceptedAt: o.codTermsAcceptedAt?.toISOString() ?? null, termsVersion: o.codTermsVersion,
      courier: staff || o.status === 'OUT_FOR_DELIVERY' ? o.assignedCourier : undefined, courierNote: staff ? o.courierNote : undefined,
      collectedCents: o.codCollectedCents, collectedAt: o.codCollectedAt?.toISOString() ?? null, reconciledAt: o.codReconciledAt?.toISOString() ?? null,
    } : null,
  };
}
export type OrderView = Awaited<ReturnType<typeof orderView>>;

/* ================================================================== cancel / restock */

async function restock(tx: Tx, order: Order) {
  if (order.stockRestored) return;
  const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
  for (const i of items) if (i.variantId) await tx.productVariant.update({ where: { id: i.variantId }, data: { stock: { increment: i.qty } } });
  if (order.couponCode) await tx.coupon.updateMany({ where: { code: order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
  await tx.order.update({ where: { id: order.id }, data: { stockRestored: true } });
}

const CANCELLABLE: OrderStatus[] = ['PENDING_PAYMENT', 'AWAITING_VERIFICATION', 'PENDING_CONFIRMATION', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY'];

export async function cancelOrder(orderId: number, actor: Actor, opts: { reason?: string; note?: string | null; codRefused?: boolean } = {}) {
  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) throw notFound();
    if (!CANCELLABLE.includes(o.status)) throw new AppError(409, 'INVALID_TRANSITION');
    await restock(tx, o);
    const needsRefund = o.paymentStatus === 'PAID' || o.paymentStatus === 'AWAITING_VERIFICATION';
    await tx.paymentProof.updateMany({ where: { orderId: o.id, status: 'SUBMITTED' }, data: { status: 'VOID' } });
    const next = await tx.order.update({
      where: { id: o.id },
      data: { status: 'CANCELLED', paymentStatus: needsRefund ? 'REFUND_PENDING' : o.paymentStatus, cancelReason: opts.reason ?? null },
    });
    await addEvent(tx, o.id, 'cancelled', { from: o.status, to: 'CANCELLED', actor, note: opts.reason ? `${opts.reason}${opts.note ? ` - ${opts.note}` : ''}` : opts.note });

    // COD abuse control: count refused COD deliveries and auto-flag repeat offenders.
    if (opts.codRefused && o.paymentMethod === 'COD' && o.userId) {
      const limit = (await getSetting('commerce')).codAutoBlockAfter;
      const u = await tx.user.update({ where: { id: o.userId }, data: { codRefusals: { increment: 1 } } });
      if (limit > 0 && u.codRefusals >= limit && !u.codBlocked) {
        await tx.user.update({ where: { id: u.id }, data: { codBlocked: true, codBlockedReason: `AUTO: ${u.codRefusals} refused COD deliveries` } });
        await addEvent(tx, o.id, 'cod_flagged', { actor: null, note: `customer ${u.id} auto-flagged` });
      }
    }
    return next;
  });
  mail(updated, 'cancelled', opts.note);
  return updated;
}

export async function customerCancel(code: string) {
  const o = await prisma.order.findUnique({ where: { code } });
  if (!o) throw notFound('ORDER_NOT_FOUND');
  if (!['PENDING_PAYMENT', 'PENDING_CONFIRMATION'].includes(o.status) || o.paymentStatus === 'PAID') throw new AppError(409, 'CANNOT_CANCEL');
  return cancelOrder(o.id, undefined, { reason: 'CUSTOMER_REQUEST' });
}

export async function expireStaleOrders() {
  const stale = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID', expiresAt: { lt: new Date() }, paymentMethod: { not: 'COD' } }, select: { id: true },
  });
  for (const o of stale) {
    try { await cancelOrder(o.id, null, { reason: 'PAYMENT_DEADLINE_EXPIRED' }); } catch (e) { console.error('[expire] failed', o.id, e); }
  }
  return stale.length;
}

/* ================================================================== payment proof */

export type ProofInput = { bankKey?: string; reference?: string; payerName?: string; payerAccount?: string; paidAt?: Date | null; file?: File | null };

export async function submitProof(orderId: number, input: ProofInput) {
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o) throw notFound('ORDER_NOT_FOUND');
  const method = await getMethod(o.paymentMethod);
  if (!method || method.key === 'COD') throw new AppError(409, 'ORDER_NOT_PAYABLE');
  if (!['PENDING_PAYMENT', 'AWAITING_VERIFICATION'].includes(o.status)) throw new AppError(409, 'ORDER_NOT_PAYABLE');
  if (o.expiresAt && o.expiresAt < new Date()) throw new AppError(409, 'ORDER_EXPIRED');

  const reference = (input.reference ?? '').trim();
  // Every manual method needs the receipt / screenshot (JPG, PNG or PDF) AND the bank reference / ATM receipt no. / wallet transaction ID.
  // ATM transfers additionally need the transaction timestamp printed on the receipt.
  if (!input.file) throw new AppError(422, 'PROOF_REQUIRED');
  if (!reference) throw new AppError(422, 'REFERENCE_REQUIRED');
  if (method.key === 'ATM_BNCTL' && !input.paidAt) throw new AppError(422, 'TIMESTAMP_REQUIRED');

  if (reference) {
    const dup = await prisma.paymentProof.findFirst({
      where: { method: method.key, reference: { equals: reference, mode: 'insensitive' }, orderId: { not: o.id }, status: { in: ['SUBMITTED', 'APPROVED'] } }, select: { id: true },
    });
    if (dup) throw new AppError(409, 'DUPLICATE_REFERENCE');
  }
  const stored = await saveProof(input.file);

  let proof: Awaited<ReturnType<typeof prisma.paymentProof.create>>;
  try {
    proof = await prisma.$transaction(async (tx) => {
    await tx.paymentProof.updateMany({ where: { orderId: o.id, status: 'SUBMITTED' }, data: { status: 'VOID' } });
    const p = await tx.paymentProof.create({
      data: {
        orderId: o.id, method: method.key, amountCents: o.totalCents, bankKey: method.key === 'ATM_BNCTL' || method.key === 'BANK_BNCTL' ? 'bnctl' : null,
        reference: reference || null, payerName: input.payerName || null, payerAccount: input.payerAccount || null, paidAt: input.paidAt ?? null,
        fileKey: stored.fileKey, fileMime: stored.mime, fileSize: stored.size,
      },
    });
    await tx.order.update({ where: { id: o.id }, data: { status: 'AWAITING_VERIFICATION', paymentStatus: 'AWAITING_VERIFICATION' } });
    await addEvent(tx, o.id, 'payment_submitted', { from: o.status, to: 'AWAITING_VERIFICATION', note: reference || null });
    return p;
  });
  } catch (e) {
    await deleteProof(stored.fileKey); // do not leave an orphan file when the DB write fails
    throw e;
  }
  mail(o, 'payment_received');

  // Future live integration: if the wallet operator confirms the transaction, approve automatically.
  if ((method.key === 'TPAY' || method.key === 'MOSAN') && reference) {
    try {
      const r = await walletProviders[method.key].checkTransaction(reference, o.totalCents);
      if (r.status === 'paid') await reviewProof(proof.id, null, { approve: true, note: 'AUTO: wallet API confirmed' });
    } catch (e) { console.error('[wallet] check failed', e); }
  }
  return proof;
}

export async function reviewProof(proofId: number, staff: Actor, opts: { approve: boolean; note?: string | null }) {
  const out = await prisma.$transaction(async (tx) => {
    const p = await tx.paymentProof.findUnique({ where: { id: proofId } });
    if (!p) throw notFound();
    if (p.status !== 'SUBMITTED') throw new AppError(409, 'PAYMENT_NOT_PENDING');
    const o = await tx.order.findUnique({ where: { id: p.orderId } });
    if (!o || o.status !== 'AWAITING_VERIFICATION') throw new AppError(409, 'INVALID_TRANSITION');
    const now = new Date();
    if (opts.approve) {
      await tx.paymentProof.update({ where: { id: p.id }, data: { status: 'APPROVED', reviewerId: staff?.id ?? null, reviewedAt: now, reviewNote: opts.note ?? null } });
      const next = await tx.order.update({ where: { id: o.id }, data: { status: 'PROCESSING', paymentStatus: 'PAID', paidAt: now, expiresAt: null } });
      await addEvent(tx, o.id, 'payment_approved', { from: 'AWAITING_VERIFICATION', to: 'PROCESSING', actor: staff, note: opts.note });
      return { order: next, kind: 'payment_approved' as const };
    }
    await tx.paymentProof.update({ where: { id: p.id }, data: { status: 'REJECTED', reviewerId: staff?.id ?? null, reviewedAt: now, reviewNote: opts.note ?? null } });
    // give the customer a fair window to resubmit
    const extend = new Date(Math.max(Date.now() + 12 * 3600e3, o.expiresAt?.getTime() ?? 0));
    const next = await tx.order.update({ where: { id: o.id }, data: { status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID', expiresAt: extend } });
    await addEvent(tx, o.id, 'payment_rejected', { from: 'AWAITING_VERIFICATION', to: 'PENDING_PAYMENT', actor: staff, note: opts.note });
    return { order: next, kind: 'payment_rejected' as const };
  });
  mail(out.order, out.kind, opts.note);
  return out.order;
}

export async function markRefunded(orderId: number, staff: Actor, note?: string | null) {
  return prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) throw notFound();
    if (o.paymentStatus !== 'REFUND_PENDING') throw new AppError(409, 'INVALID_TRANSITION');
    const next = await tx.order.update({ where: { id: o.id }, data: { paymentStatus: 'REFUNDED' } });
    await addEvent(tx, o.id, 'refund', { actor: staff, note });
    return next;
  });
}

/* ================================================================== fulfilment */

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING_CONFIRMATION: 'PROCESSING', // COD: confirmed by phone / WhatsApp
  PROCESSING: 'PACKED',
  PACKED: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};
const MAIL_FOR: Partial<Record<OrderStatus, OrderMailKind>> = { PROCESSING: 'cod_confirmed', PACKED: 'packed', OUT_FOR_DELIVERY: 'out_for_delivery', DELIVERED: 'delivered' };

/** Moves an order one step forward. For COD the DELIVERED step records the cash collected by the courier. */
export async function advanceOrder(orderId: number, staff: NonNullable<Actor>, opts: { note?: string | null; collectedCents?: number } = {}) {
  const out = await prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) throw notFound();
    const to = NEXT[o.status];
    if (!to) throw new AppError(409, 'INVALID_TRANSITION');
    const isCod = o.paymentMethod === 'COD';
    if (o.status === 'PENDING_CONFIRMATION' && !isCod) throw new AppError(409, 'INVALID_TRANSITION');
    if (to === 'DELIVERED' && !isCod && o.paymentStatus !== 'PAID') throw new AppError(409, 'PAYMENT_NOT_VERIFIED');
    if (to === 'OUT_FOR_DELIVERY' && isCod && !o.assignedCourierId) throw new AppError(409, 'COURIER_REQUIRED');

    const data: Prisma.OrderUpdateInput = { status: to };
    if (to === 'DELIVERED') {
      data.deliveredAt = new Date();
      if (isCod) {
        const collected = opts.collectedCents ?? o.totalCents;
        if (collected !== o.totalCents) throw new AppError(422, 'COD_AMOUNT_MISMATCH', { expected: o.totalCents });
        Object.assign(data, { paymentStatus: 'PAID', paidAt: new Date(), codCollectedCents: collected, codCollectedAt: new Date(), codCollectedById: staff.id });
      }
    }
    const next = await tx.order.update({ where: { id: o.id }, data });
    await addEvent(tx, o.id, 'status', { from: o.status, to, actor: staff, note: opts.note ?? (to === 'DELIVERED' && isCod ? 'COD cash collected' : null) });
    return next;
  });
  const k = MAIL_FOR[out.status];
  if (k && !(k === 'cod_confirmed' && out.paymentMethod !== 'COD')) mail(out, k);
  return out;
}

export async function assignCourier(orderId: number, staff: NonNullable<Actor>, courierId: number | null, note?: string | null) {
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o) throw notFound();
  if (courierId) {
    const c = await prisma.user.findFirst({ where: { id: courierId, isActive: true, roles: { some: { role: { key: { in: ['ORDER_FULFILLMENT', 'STORE_MANAGER', 'SUPER_ADMIN'] } } } } } });
    if (!c) throw new AppError(422, 'COURIER_INVALID');
  }
  const courier = courierId ? await prisma.user.findUnique({ where: { id: courierId }, select: { name: true } }) : null;
  const next = await prisma.order.update({
    where: { id: orderId },
    data: { assignedCourierId: courierId, courierNote: note === undefined ? o.courierNote : note || null },
  });
  await addEvent(prisma, orderId, 'courier_assigned', { actor: staff, note: [courier ? courier.name : 'unassigned', note].filter(Boolean).join(' - ') });
  return next;
}

/** Finance: courier handed the cash over. */
export async function reconcileCod(orderIds: number[], staff: NonNullable<Actor>) {
  const where = { id: { in: orderIds }, paymentMethod: 'COD' as const, status: 'DELIVERED' as const, codCollectedAt: { not: null }, codReconciledAt: null };
  const eligible = (await prisma.order.findMany({ where, select: { id: true } })).map((o) => o.id);
  if (!eligible.length) return 0;
  const r = await prisma.order.updateMany({ where: { ...where, id: { in: eligible } }, data: { codReconciledAt: new Date(), codReconciledById: staff.id } });
  for (const id of eligible) await addEvent(prisma, id, 'cod_reconciled', { actor: staff });
  return r.count;
}

export async function setCodBlock(userId: number, blocked: boolean, reason: string | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { codBlocked: blocked, codBlockedReason: blocked ? reason : null, ...(blocked ? {} : { codRefusals: 0 }) },
  });
}

export { allMethods };
