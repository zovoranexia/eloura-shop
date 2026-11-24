import { DILI_POSTS, MUNICIPALITIES } from '@/lib/geo';

export const ORDER_STATUSES = ['PENDING_PAYMENT', 'AWAITING_VERIFICATION', 'PENDING_CONFIRMATION', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const;
export const PAYMENT_STATUSES = ['UNPAID', 'AWAITING_VERIFICATION', 'PAID', 'REFUND_PENDING', 'REFUNDED'] as const;
export const METHODS = ['BANK_BNCTL', 'ATM_BNCTL', 'TPAY', 'MOSAN', 'COD'] as const;
export const PROOF_STATUSES = ['SUBMITTED', 'APPROVED', 'REJECTED', 'VOID'] as const;
export const CANCEL_REASONS = ['CUSTOMER_REQUEST', 'UNREACHABLE', 'COD_REFUSED', 'OUT_OF_STOCK', 'PAYMENT_PROBLEM', 'OTHER'] as const;

export const postName = (key: string | null | undefined) => DILI_POSTS.find((p) => p.key === key)?.name ?? key ?? '';
export const municipalityName = (key: string | null | undefined) => MUNICIPALITIES.find((m) => m.key === key)?.name ?? key ?? '';

/** "Vera Cruz · Caicoli" for Dili, municipality name elsewhere. */
export function areaLabel(a: { municipality: string; adminPost?: string | null; suco?: string | null }) {
  if (a.municipality === 'dili') return [postName(a.adminPost), a.suco].filter(Boolean).join(' · ') || 'Dili';
  return municipalityName(a.municipality);
}

/** WhatsApp / customer-facing texts are written in the CUSTOMER's language (order.locale), not the staff UI language. */
export const WA_MESSAGES: Record<string, (v: { name: string; code: string; total: string; store: string }) => string> = {
  tet: (v) => `Bondia ${v.name}, ami husi ${v.store}. Ami hakarak konfirma ita-nia pedidu ${v.code} (selu bainhira simu, total ${v.total}). Favor prepara osan-kash USD ho folin loos. Enderesu no oras entrega loos ka? Obrigadu/a!`,
  pt: (v) => `Olá ${v.name}, fala a ${v.store}. Queremos confirmar a sua encomenda ${v.code} (pagamento na entrega, total ${v.total}). Por favor prepare o valor exato em dinheiro (USD). O endereço e o horário de entrega estão corretos? Obrigado!`,
  en: (v) => `Hello ${v.name}, this is ${v.store}. We would like to confirm your order ${v.code} (cash on delivery, total ${v.total}). Please prepare the exact amount in USD cash. Are the address and delivery time correct? Thank you!`,
  id: (v) => `Halo ${v.name}, ini ${v.store}. Kami ingin mengonfirmasi pesanan ${v.code} Anda (bayar di tempat, total ${v.total}). Mohon siapkan uang tunai USD dengan jumlah pas. Apakah alamat dan waktu pengiriman sudah benar? Terima kasih!`,
};

/** System roles are translated by key (their DB names are English); custom roles keep the name typed by the admin. */
export function roleLabel(t: (k: string) => string, key: string, fallback: string) {
  const k = `admin.roles.names.${key}`;
  const v = t(k);
  return v === k ? fallback : v;
}
export function roleDescription(t: (k: string) => string, key: string, fallback: string | null) {
  const k = `admin.roles.descriptions.${key}`;
  const v = t(k);
  return v === k ? fallback ?? '' : v;
}
export const PERMISSION_GROUP_KEYS: Record<string, string> = {
  Dashboard: 'dashboard', Catalogue: 'catalogue', 'Storefront CMS': 'cms', Orders: 'orders', Payments: 'payments', Customers: 'customers',
  Reports: 'reports', Settings: 'settings', 'Access control': 'access',
};
