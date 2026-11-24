import 'server-only';
import { PaymentMethodKey, type PaymentMethodConfig, type DeliveryZone, type Suco } from '@prisma/client';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { loc, type Locale } from '@/lib/i18n';
import { isMobile, normalizePhone } from '@/lib/phone';
import { getSetting } from './settings';

/**
 * Payment methods (all configurable in the admin dashboard):
 *  BANK_BNCTL  bank transfer to the shop's BNCTL account        -> proof upload, manual verification
 *  ATM_BNCTL   ATM / P24 transfer to the shop's BNCTL account   -> receipt photo + reference, manual verification
 *  TPAY        T-Pay merchant number / QR                       -> transaction ID + screenshot, manual verification
 *  MOSAN       Mosan merchant number / QR                       -> transaction reference + screenshot, manual verification
 *  COD         Cash on delivery, Dili only (see codRule)
 */
export const METHOD_KEYS = Object.values(PaymentMethodKey) as PaymentMethodKey[];
export const MANUAL_METHODS: PaymentMethodKey[] = ['BANK_BNCTL', 'ATM_BNCTL', 'TPAY', 'MOSAN'];

export type MethodConfig = {
  accountHolder?: string; accountNumber?: string; bankName?: string; branch?: string; swift?: string;
  merchantName?: string; merchantNumber?: string; qrImage?: string;
};
export type MethodRow = Omit<PaymentMethodConfig, 'config'> & { config: MethodConfig };

export async function allMethods(): Promise<MethodRow[]> {
  const rows = await prisma.paymentMethodConfig.findMany({ orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }] });
  return rows.map((r) => ({ ...r, config: (r.config ?? {}) as MethodConfig }));
}
export async function getMethod(key: PaymentMethodKey): Promise<MethodRow | null> {
  const r = await prisma.paymentMethodConfig.findUnique({ where: { key } });
  return r ? { ...r, config: (r.config ?? {}) as MethodConfig } : null;
}

const realNumber = (n?: string) => typeof n === 'string' && /\d{6,}/.test(n) && !/^[\s0+\-]+$/.test(n);

/** "Configured" = real receiving details entered (not seeded placeholders). */
export function isConfigured(m: MethodRow): boolean {
  if (m.key === 'COD') return true;
  if (m.key === 'BANK_BNCTL' || m.key === 'ATM_BNCTL') return realNumber(m.config.accountNumber);
  return realNumber(m.config.merchantNumber) || !!m.config.qrImage;
}
/** In production unconfigured methods are hidden so nobody pays into a placeholder account. */
export const isOffered = (m: MethodRow) => m.enabled && (isConfigured(m) || !env.isProd);

/** Details the customer needs to pay (shown on the order page after checkout). */
export function receivingDetails(m: MethodRow) {
  const c = m.config;
  if (m.key === 'BANK_BNCTL' || m.key === 'ATM_BNCTL') {
    return { bankName: c.bankName || 'BNCTL', accountHolder: c.accountHolder || '', accountNumber: c.accountNumber || '', branch: c.branch || '', swift: c.swift || '' };
  }
  if (m.key === 'TPAY' || m.key === 'MOSAN') return { merchantName: c.merchantName || '', merchantNumber: c.merchantNumber || '', qrImage: c.qrImage || '' };
  return {};
}

/* ------------------------------------------------------------------ COD rules */
export type ZoneWithSucos = DeliveryZone & { sucos: Suco[] };

export type CodContext = {
  zone: ZoneWithSucos | null;
  suco?: string | null;
  street?: string | null;
  phone?: string | null;
  /** order total WITHOUT the COD fee */
  amountCents: number;
  userCodBlocked?: boolean;
};

/**
 * Cash-on-delivery eligibility ("ketentuan yang berlaku"):
 *  1. Delivery address must be in the DILI municipality and inside an admin-approved COD zone
 *     (administrative post `codEnabled`, and - when the post lists sucos - the chosen suco `codEnabled`).
 *     Atauro and every other municipality are never eligible.
 *  2. Complete address: street (+ suco where the zone lists sucos).
 *  3. A reachable +670 MOBILE number (the shop confirms by phone / WhatsApp before dispatch).
 *  4. Order total within [codMinCents, codMaxCents].
 *  5. Customer account not flagged for repeated COD refusals.
 * Terms acceptance is verified separately when the order is placed.
 */
export async function codRule(ctx: CodContext): Promise<{ ok: true; feeCents: number } | { ok: false; code: string; max?: number; min?: number }> {
  const c = await getSetting('commerce');
  const z = ctx.zone;
  if (!z || z.municipality !== 'dili' || !z.codEnabled || !z.isActive) return { ok: false, code: 'COD_ONLY_DILI' };
  const activeSucos = z.sucos.filter((s) => s.isActive);
  if (!ctx.street) return { ok: false, code: 'COD_NEEDS_ADDRESS' };
  if (activeSucos.length) {
    const s = activeSucos.find((x) => x.name === ctx.suco);
    if (!s) return { ok: false, code: 'COD_NEEDS_ADDRESS' };
    if (!s.codEnabled) return { ok: false, code: 'COD_ZONE_UNAVAILABLE' };
  }
  if (!isMobile(ctx.phone)) return { ok: false, code: 'COD_NEEDS_MOBILE' };
  if (ctx.userCodBlocked) return { ok: false, code: 'COD_BLOCKED' };
  if (ctx.amountCents > c.codMaxCents) return { ok: false, code: 'COD_LIMIT', max: c.codMaxCents };
  if (ctx.amountCents < c.codMinCents) return { ok: false, code: 'COD_MINIMUM', min: c.codMinCents };
  return { ok: true, feeCents: c.codFeeCents || 0 };
}

/** Is COD hidden for this phone number because a flagged customer account uses it? (stops guest-checkout workarounds) */
export async function phoneCodBlocked(phone: string | null | undefined): Promise<boolean> {
  const p = normalizePhone(phone);
  if (!p.valid) return false;
  return !!(await prisma.user.findFirst({ where: { phone: p.e164, codBlocked: true }, select: { id: true } }));
}

export type MethodOption = { key: PaymentMethodKey; name: string; available: boolean; reason: string | null; feeCents: number; demo: boolean; max?: number; min?: number };

export async function methodsFor(ctx: CodContext, locale: Locale): Promise<MethodOption[]> {
  const methods = (await allMethods()).filter(isOffered);
  const out: MethodOption[] = [];
  for (const m of methods) {
    if (m.key === 'COD') {
      const r = await codRule(ctx);
      out.push({ key: m.key, name: loc(m.name, locale), available: r.ok, reason: r.ok ? null : r.code, feeCents: r.ok ? r.feeCents : 0, demo: false, max: !r.ok ? r.max : undefined, min: !r.ok ? r.min : undefined });
    } else {
      out.push({ key: m.key, name: loc(m.name, locale), available: true, reason: null, feeCents: 0, demo: !isConfigured(m) });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ wallet adapters (future live API) */
export type WalletCheck = { status: 'paid' | 'pending' | 'unknown' };
export interface WalletProvider {
  key: 'TPAY' | 'MOSAN';
  /** Ask the wallet operator whether `reference` is a settled payment of `amountCents` to the shop's merchant account. */
  checkTransaction(reference: string, amountCents: number): Promise<WalletCheck>;
}
/** Default: no merchant API connected -> finance verifies manually against the wallet statement. */
const manual = (key: 'TPAY' | 'MOSAN'): WalletProvider => ({ key, async checkTransaction() { return { status: 'unknown' }; } });
/** Replace an entry with a real client (and/or a webhook route that calls `reviewProof`) once merchant API credentials exist. */
export const walletProviders: Record<'TPAY' | 'MOSAN', WalletProvider> = { TPAY: manual('TPAY'), MOSAN: manual('MOSAN') };
