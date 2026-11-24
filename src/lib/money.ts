const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** 2900 -> "$29.00", 125050 -> "$1,250.50". All amounts in the system are integer USD cents. */
export const formatUSD = (cents: number | null | undefined) => fmt.format((cents ?? 0) / 100);

/** "12.5" / "12,50" -> 1250 (cents), or null when empty/invalid. Rounds half up on the decimal string (1.005 -> 101), never via binary floats. */
export function parseUSD(input: string | number): number | null {
  const raw = String(input).trim().replace(',', '.');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(raw)) return null;
  const [int, frac = ''] = raw.replace(/^\./, '0.').split('.');
  const cents = BigInt(int) * 100n + BigInt((frac + '00').slice(0, 2));
  const roundUp = frac.length > 2 && frac.charCodeAt(2) >= 53; // third decimal >= 5
  const out = Number(cents + (roundUp ? 1n : 0n));
  return Number.isSafeInteger(out) ? out : null;
}
export const centsToInput = (cents: number | null | undefined) => (cents == null ? '' : (cents / 100).toFixed(2));
