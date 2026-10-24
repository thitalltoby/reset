/** All prices are whole kobo (₦1 = 100 kobo) so totals are exact: there is no floating-point money anywhere. */

export const koboFromNaira = (naira: number): number => Math.round(naira * 100);

export function formatNaira(kobo: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (kobo === null || kobo === undefined) return '—';
  const n = kobo / 100;
  const whole = Number.isInteger(n);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: whole || opts.compact ? 0 : 2, maximumFractionDigits: 2,
  }).format(n);
}

/** Parse a price typed by staff ("1,250", "₦1250.50", "1250.5") into kobo. Returns null if it is not a valid non-negative amount. */
export function parseNairaToKobo(input: string): number | null {
  const s = input.replace(/[₦,\s]|NGN/gi, '');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ''] = s.split('.');
  return Number(w) * 100 + Number((f + '00').slice(0, 2));
}

/** Discount for a coupon, never more than the goods total. PERCENT value is a whole percent; FIXED value is kobo. */
export function couponDiscount(kind: string, value: number, subtotalKobo: number): number {
  const raw = kind === 'PERCENT' ? Math.floor((subtotalKobo * value) / 100) : value;
  return Math.max(0, Math.min(raw, subtotalKobo));
}

export interface PricedLine { unitKobo: number; quantity: number }
export const lineTotal = (l: PricedLine) => l.unitKobo * l.quantity;
export const sumLines = (ls: PricedLine[]) => ls.reduce((a, l) => a + lineTotal(l), 0);
