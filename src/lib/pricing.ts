import { couponDiscount, sumLines, type PricedLine } from './money';

export interface CouponLike {
  kind: string;
  value: number;
  minSubtotalKobo: number;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
}

export type CouponCheck = { ok: true } | { ok: false; reason: string };

/** Why a coupon can or cannot be used right now. The wording is shown to the customer. */
export function checkCoupon(c: CouponLike | null, subtotalKobo: number, now = new Date()): CouponCheck {
  if (!c || !c.active) return { ok: false, reason: 'That code is not valid.' };
  if (c.startsAt && c.startsAt > now) return { ok: false, reason: 'That code is not active yet.' };
  if (c.endsAt && c.endsAt < now) return { ok: false, reason: 'That code has expired.' };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { ok: false, reason: 'That code has been fully used.' };
  if (subtotalKobo < c.minSubtotalKobo) return { ok: false, reason: `Spend a little more to use that code (minimum ${(c.minSubtotalKobo / 100).toLocaleString('en-NG')} naira).` };
  return { ok: true };
}

export interface ZoneLike { feeKobo: number; freeOverKobo: number | null }

export interface Totals { subtotalKobo: number; discountKobo: number; deliveryKobo: number; totalKobo: number }

/**
 * Every figure on an order comes from here, from database prices: goods, minus the coupon (never more than the goods),
 * plus delivery. Delivery is free for pickup, or when the goods total (after the coupon) reaches the zone's free-delivery level.
 */
export function computeTotals(lines: PricedLine[], opts: { coupon?: CouponLike | null; fulfilment: 'DELIVERY' | 'PICKUP'; zone?: ZoneLike | null; now?: Date }): Totals {
  const subtotalKobo = sumLines(lines);
  const ck = opts.coupon ? checkCoupon(opts.coupon, subtotalKobo, opts.now) : null;
  const discountKobo = opts.coupon && ck?.ok ? couponDiscount(opts.coupon.kind, opts.coupon.value, subtotalKobo) : 0;
  const goods = subtotalKobo - discountKobo;
  let deliveryKobo = 0;
  if (opts.fulfilment === 'DELIVERY' && opts.zone) deliveryKobo = opts.zone.freeOverKobo !== null && goods >= opts.zone.freeOverKobo ? 0 : opts.zone.feeKobo;
  return { subtotalKobo, discountKobo, deliveryKobo, totalKobo: goods + deliveryKobo };
}
