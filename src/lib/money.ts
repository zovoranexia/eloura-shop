const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** 2900 -> "$29.00", 125050 -> "$1,250.50". All amounts in the system are integer USD cents. */
export const formatUSD = (cents: number | null | undefined) => fmt.format((cents ?? 0) / 100);

/** "12.5" / "12,50" -> 1250 (cents), or null when invalid. */
export function parseUSD(input: string | number): number | null {
  const n = typeof input === 'number' ? input : Number(String(input).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
export const centsToInput = (cents: number | null | undefined) => (cents == null ? '' : (cents / 100).toFixed(2));
