import { describe, it, expect } from 'vitest';
import { checkCoupon, computeTotals, type CouponLike } from '@/lib/pricing';
import { couponDiscount, formatNaira, parseNairaToKobo } from '@/lib/money';
import { canTransition, nextStatuses } from '@/lib/order-flow';

const coupon = (o: Partial<CouponLike> = {}): CouponLike => ({ kind: 'PERCENT', value: 10, minSubtotalKobo: 0, startsAt: null, endsAt: null, usageLimit: null, usedCount: 0, active: true, ...o });
const lines = [{ unitKobo: 150_000, quantity: 2 }, { unitKobo: 60_000, quantity: 1 }]; // 360,000 = ₦3,600

describe('totals', () => {
  it('adds up goods in whole kobo', () => {
    expect(computeTotals(lines, { fulfilment: 'PICKUP' })).toEqual({ subtotalKobo: 360_000, discountKobo: 0, deliveryKobo: 0, totalKobo: 360_000 });
  });
  it('charges delivery only for delivery orders, and waives it above the free-delivery level', () => {
    const zone = { feeKobo: 120_000, freeOverKobo: 500_000 };
    expect(computeTotals(lines, { fulfilment: 'DELIVERY', zone }).totalKobo).toBe(480_000);
    expect(computeTotals(lines, { fulfilment: 'PICKUP', zone }).deliveryKobo).toBe(0);
    expect(computeTotals([{ unitKobo: 500_000, quantity: 1 }], { fulfilment: 'DELIVERY', zone }).deliveryKobo).toBe(0);
  });
  it('applies the coupon before the free-delivery test, and never discounts below zero', () => {
    const zone = { feeKobo: 120_000, freeOverKobo: 320_000 };
    expect(computeTotals(lines, { fulfilment: 'DELIVERY', zone, coupon: coupon() })).toMatchObject({ discountKobo: 36_000, deliveryKobo: 0, totalKobo: 324_000 });
    // the coupon takes the goods below the free-delivery level, so delivery is charged
    expect(computeTotals(lines, { fulfilment: 'DELIVERY', zone: { feeKobo: 120_000, freeOverKobo: 340_000 }, coupon: coupon() })).toMatchObject({ deliveryKobo: 120_000, totalKobo: 444_000 });
    expect(computeTotals([{ unitKobo: 10_000, quantity: 1 }], { fulfilment: 'PICKUP', coupon: coupon({ kind: 'FIXED', value: 999_999 }) }).totalKobo).toBe(0);
  });
  it('ignores a coupon that does not qualify', () => {
    expect(computeTotals(lines, { fulfilment: 'PICKUP', coupon: coupon({ minSubtotalKobo: 1_000_000 }) }).discountKobo).toBe(0);
  });
});

describe('coupons', () => {
  const now = new Date('2026-06-01T12:00:00Z');
  it('explains why a code cannot be used', () => {
    expect(checkCoupon(null, 1000)).toMatchObject({ ok: false });
    expect(checkCoupon(coupon({ active: false }), 1000)).toMatchObject({ ok: false });
    expect(checkCoupon(coupon({ startsAt: new Date('2026-07-01') }), 1000, now)).toMatchObject({ ok: false, reason: expect.stringContaining('not active') });
    expect(checkCoupon(coupon({ endsAt: new Date('2026-05-01') }), 1000, now)).toMatchObject({ ok: false, reason: expect.stringContaining('expired') });
    expect(checkCoupon(coupon({ usageLimit: 5, usedCount: 5 }), 1000, now)).toMatchObject({ ok: false, reason: expect.stringContaining('fully used') });
    expect(checkCoupon(coupon({ minSubtotalKobo: 5000 }), 1000, now)).toMatchObject({ ok: false });
    expect(checkCoupon(coupon(), 1000, now)).toEqual({ ok: true });
  });
  it('computes percentage and fixed discounts', () => {
    expect(couponDiscount('PERCENT', 15, 200_000)).toBe(30_000);
    expect(couponDiscount('FIXED', 50_000, 200_000)).toBe(50_000);
    expect(couponDiscount('FIXED', 500_000, 200_000)).toBe(200_000);
  });
});

describe('money', () => {
  it('formats naira and parses typed amounts', () => {
    expect(formatNaira(150_000)).toContain('1,500');
    expect(parseNairaToKobo('1,500.50')).toBe(150_050);
    expect(parseNairaToKobo('abc')).toBeNull();
  });
});

describe('order status flow', () => {
  it('only allows sensible moves, and pickup orders skip delivery steps', () => {
    expect(canTransition('PLACED', 'PROCESSING', 'DELIVERY')).toBe(true);
    expect(canTransition('COMPLETED', 'PLACED', 'DELIVERY')).toBe(false);
    expect(canTransition('CANCELLED', 'PROCESSING', 'PICKUP')).toBe(false);
    expect(nextStatuses('PROCESSING', 'PICKUP')).not.toContain('OUT_FOR_DELIVERY');
  });
});
