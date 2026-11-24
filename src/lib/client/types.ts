export type { ProductCard } from '@/server/catalog';
export type { StoreConfig, StoreBanner, CustomerAddress } from '@/server/storefront';

export type PublicUser = {
  id: number; email: string; name: string; phone: string | null; locale: string;
  roles: { key: string; name: string }[]; permissions: string[]; isStaff: boolean; codBlocked: boolean;
};

export type CartItem = { variantId: number; qty: number };

export type QuoteLine =
  | { variantId: number; qty: number; missing: true }
  | {
      variantId: number; productId: number; slug: string; sku: string; size: string | null; color: string | null; colorHex: string | null; image: string | null;
      unitPriceCents: number; stock: number; qty: number; available: boolean; enough: boolean; name: string;
    };

export type MethodOption = {
  key: 'BANK_BNCTL' | 'ATM_BNCTL' | 'TPAY' | 'MOSAN' | 'COD'; name: string; available: boolean; reason: string | null; feeCents: number; demo: boolean; max?: number; min?: number;
};

export type Quote = {
  lines: QuoteLine[]; subtotalCents: number; discountCents: number; couponCode: string | null; couponError: string | null; shippingCents: number;
  zone: { municipality: string; adminPost: string | null; name: string; etaText: string | null; freeOverCents: number | null; deliveryFeeCents: number } | null;
  methods: MethodOption[];
};

export const isLine = (l: QuoteLine): l is Exclude<QuoteLine, { missing: true }> => !('missing' in l);
