import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { createHmac } from 'node:crypto';
import { db } from '@/server/db';
import { placeOrder, settlePayment, confirmByReference, expireUnpaidOrders, cancelUnpaidOrder, changeOrderStatus } from '@/server/orders';
import { addToCart, getCartView } from '@/server/cart';
import { reservedUnits } from '@/server/catalog';
import { AppError } from '@/server/errors';
import { POST as webhook } from '@/app/api/webhooks/paystack/route';
import { startMockPaystack } from '../support/mock-paystack';
import { __jar } from '../next-headers-stub';
import { resetDb, openShop, makeProduct, makeZone, makeUser, principal, customer } from './helpers';

let mock: Awaited<ReturnType<typeof startMockPaystack>>;
beforeAll(async () => { mock = await startMockPaystack(4015, 'sk_test_mock', ''); });
afterAll(async () => { await mock.close(); });
beforeEach(async () => { await resetDb(); __jar.clear(); await openShop(); });

const err = async (p: Promise<unknown>) => p.then(() => null, (e) => (e instanceof AppError ? e : (e as Error)));
const pickup = (items: { productId: string; quantity: number }[], over: object = {}) => ({ ...customer, fulfilment: 'PICKUP' as const, paymentMethod: 'ON_DELIVERY' as const, items, ...over });
const card = (items: { productId: string; quantity: number }[], over: object = {}) => ({ ...customer, fulfilment: 'PICKUP' as const, paymentMethod: 'PAYSTACK' as const, items, ...over });
const refOf = async (orderId: string) => (await db.paymentTransaction.findFirstOrThrow({ where: { orderId } })).reference;
const stock = async (id: string) => (await db.product.findUniqueOrThrow({ where: { id } })).stock;

describe('placing orders', () => {
  it('prices from the database and takes stock at once for pay-on-delivery orders', async () => {
    const p = await makeProduct({ priceKobo: 250_000, stock: 5 });
    const r = await placeOrder(pickup([{ productId: p.id, quantity: 2 }]));
    const o = await db.order.findUniqueOrThrow({ where: { id: r.orderId }, include: { items: true } });
    expect(o).toMatchObject({ status: 'PLACED', paymentStatus: 'UNPAID', totalKobo: 500_000, subtotalKobo: 500_000 });
    expect(o.items[0]).toMatchObject({ unitKobo: 250_000, quantity: 2, name: p.name });
    expect(await stock(p.id)).toBe(3);
    expect(await db.stockMovement.count({ where: { productId: p.id, reason: 'SALE' } })).toBe(1);
  });

  it('refuses more than is available, more than the per-order limit, prescription-only lines and hidden products', async () => {
    const few = await makeProduct({ stock: 2 });
    const limited = await makeProduct({ stock: 50, maxPerOrder: 3 });
    const rx = await makeProduct({ classification: 'PRESCRIPTION' });
    const ask = await makeProduct({ classification: 'PHARMACY_ONLY' });
    const draft = await makeProduct({ status: 'DRAFT' });
    const hiddenCat = await makeProduct({ categoryVisible: false });
    expect((await err(placeOrder(pickup([{ productId: few.id, quantity: 3 }]))))?.message).toMatch(/only 2 available/);
    expect((await err(placeOrder(pickup([{ productId: limited.id, quantity: 4 }]))))?.message).toMatch(/limit is 3/);
    for (const x of [rx, draft, hiddenCat]) expect(await err(placeOrder(pickup([{ productId: x.id, quantity: 1 }])))).toBeInstanceOf(AppError);
    expect((await err(placeOrder(pickup([{ productId: ask.id, quantity: 1 }]))))?.message).toMatch(/pharmacist/);
    expect(await db.order.count()).toBe(0);
  });

  it('never oversells when two customers want the last unit at once', async () => {
    const p = await makeProduct({ stock: 1 });
    const results = await Promise.all([placeOrder(pickup([{ productId: p.id, quantity: 1 }])), placeOrder(pickup([{ productId: p.id, quantity: 1 }], { email: 'b@example.test' }))].map((x) => x.then(() => 'ok', () => 'fail')));
    expect(results.sort()).toEqual(['fail', 'ok']);
    expect(await stock(p.id)).toBe(0);
  });

  it('refuses quantities that are not whole positive numbers', async () => {
    const p = await makeProduct();
    for (const q of [0, -1, 1.5]) expect(await err(placeOrder(pickup([{ productId: p.id, quantity: q }])))).toBeInstanceOf(AppError);
  });

  it('respects the shop switches', async () => {
    const p = await makeProduct();
    await openShop({ payOnDelivery: false });
    expect((await err(placeOrder(pickup([{ productId: p.id, quantity: 1 }]))))?.message).toMatch(/Paying on delivery/);
    await openShop({ delivery: false });
    expect((await err(placeOrder(pickup([{ productId: p.id, quantity: 1 }], { fulfilment: 'DELIVERY' }))))?.message).toMatch(/Delivery is not available/);
    await openShop({ onlineShop: false });
    expect((await err(placeOrder(pickup([{ productId: p.id, quantity: 1 }]))))?.message).toMatch(/not open/);
  });

  it('needs a real zone and address for delivery, and adds the zone fee', async () => {
    const p = await makeProduct({ priceKobo: 100_000 });
    const z = await makeZone({ feeKobo: 150_000 });
    expect(await err(placeOrder(pickup([{ productId: p.id, quantity: 1 }], { fulfilment: 'DELIVERY' })))).toBeInstanceOf(AppError);
    const addr = { line1: '12 Test Street', city: 'Lagos', state: 'Lagos' };
    const r = await placeOrder(pickup([{ productId: p.id, quantity: 1 }], { fulfilment: 'DELIVERY', zoneId: z.id, address: addr }));
    expect(await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).toMatchObject({ deliveryKobo: 150_000, totalKobo: 250_000, zoneName: 'Zone A' });
  });

  it('applies a valid coupon once and counts its use; rejects an invalid one', async () => {
    const p = await makeProduct({ priceKobo: 200_000 });
    await db.coupon.create({ data: { code: 'TEN', kind: 'PERCENT', value: 10 } });
    const r = await placeOrder(pickup([{ productId: p.id, quantity: 1 }], { couponCode: 'TEN' }));
    expect(await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).toMatchObject({ discountKobo: 20_000, totalKobo: 180_000, couponCode: 'TEN' });
    expect((await db.coupon.findUniqueOrThrow({ where: { code: 'TEN' } })).usedCount).toBe(1);
    expect(await err(placeOrder(pickup([{ productId: p.id, quantity: 1 }], { couponCode: 'NOPE' })))).toBeInstanceOf(AppError);
  });
});

describe('card payments (against the local Paystack stand-in)', () => {
  it('holds stock while unpaid, takes it only when payment is verified, and is idempotent', async () => {
    const p = await makeProduct({ priceKobo: 300_000, stock: 4 });
    const r = await placeOrder(card([{ productId: p.id, quantity: 3 }]));
    expect(r.payUrl).toContain('localhost:4015/pay/');
    const o1 = await db.order.findUniqueOrThrow({ where: { id: r.orderId } });
    expect(o1).toMatchObject({ status: 'AWAITING_PAYMENT', paymentStatus: 'PENDING' });
    expect(await stock(p.id)).toBe(4);                                   // not taken yet…
    expect((await reservedUnits([p.id])).get(p.id)).toBe(3);             // …but held
    // someone else cannot buy what is held
    expect((await err(placeOrder(pickup([{ productId: p.id, quantity: 2 }]))))?.message).toMatch(/only 1 available/);

    const ref = await refOf(r.orderId);
    expect((await confirmByReference(ref)).outcome).toBe('pending');      // customer has not paid yet
    mock.txs.get(ref)!.status = 'success';
    expect((await confirmByReference(ref)).outcome).toBe('paid');
    expect((await confirmByReference(ref)).outcome).toBe('already-paid');
    const o2 = await db.order.findUniqueOrThrow({ where: { id: r.orderId } });
    expect(o2).toMatchObject({ status: 'PLACED', paymentStatus: 'PAID' });
    expect(await stock(p.id)).toBe(1);                                    // taken exactly once
    expect(await db.stockMovement.count({ where: { productId: p.id, reason: 'SALE' } })).toBe(1);
  });

  it('does not trust the browser: an unpaid order stays unpaid however the return page is reached', async () => {
    const p = await makeProduct();
    const r = await placeOrder(card([{ productId: p.id, quantity: 1 }]));
    expect((await confirmByReference(await refOf(r.orderId))).outcome).toBe('pending');
    expect((await confirmByReference('RP-000-unknown')).outcome).toBe('unknown-reference');
    expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).paymentStatus).toBe('PENDING');
  });

  it('holds an order for review when the amount or currency does not match', async () => {
    const p = await makeProduct({ priceKobo: 100_000, stock: 5 });
    for (const bad of [{ amount: 1_000 }, { currency: 'USD' }]) {
      const r = await placeOrder(card([{ productId: p.id, quantity: 1 }]));
      const ref = await refOf(r.orderId);
      mock.txs.get(ref)!.status = 'success';
      mock.overrides.set(ref, bad);
      expect((await confirmByReference(ref)).outcome).toBe('mismatch');
      const o = await db.order.findUniqueOrThrow({ where: { id: r.orderId } });
      expect(o.paymentStatus).not.toBe('PAID');
      expect(o.staffNote).toMatch(/MISMATCH/);
    }
    expect(await stock(p.id)).toBe(5);
  });

  it('records failed and abandoned payments without taking stock', async () => {
    const p = await makeProduct({ stock: 5 });
    for (const status of ['failed', 'abandoned'] as const) {
      const r = await placeOrder(card([{ productId: p.id, quantity: 1 }]));
      const ref = await refOf(r.orderId);
      mock.txs.get(ref)!.status = status;
      expect((await confirmByReference(ref)).outcome).toBe('failed');
      expect((await db.paymentTransaction.findFirstOrThrow({ where: { reference: ref } })).status).toBe(status === 'failed' ? 'FAILED' : 'ABANDONED');
    }
    expect(await stock(p.id)).toBe(5);
  });

  it('releases the hold when an unpaid order expires or is cancelled, and flags a late payment for refund', async () => {
    const p = await makeProduct({ stock: 2 });
    const a = await placeOrder(card([{ productId: p.id, quantity: 2 }]));
    await db.order.update({ where: { id: a.orderId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await expireUnpaidOrders()).toBe(1);
    expect((await reservedUnits([p.id])).get(p.id) ?? 0).toBe(0);
    const b = await placeOrder(card([{ productId: p.id, quantity: 2 }]));
    await cancelUnpaidOrder(b.token);
    expect((await reservedUnits([p.id])).get(p.id) ?? 0).toBe(0);
    // the customer pays after cancelling
    const ref = await refOf(b.orderId);
    mock.txs.get(ref)!.status = 'success';
    expect((await confirmByReference(ref)).outcome).toBe('paid');
    const o = await db.order.findUniqueOrThrow({ where: { id: b.orderId } });
    expect(o).toMatchObject({ status: 'CANCELLED', paymentStatus: 'PAID' });
    expect(o.staffNote).toMatch(/refund due/);
    expect(await stock(p.id)).toBe(2);
  });

  it('settlePayment ignores a reference it never issued', async () => {
    expect((await settlePayment({ reference: 'forged', status: 'success', amountKobo: 1, currency: 'NGN', channel: null, gatewayResponse: null })).outcome).toBe('unknown-reference');
  });
});

describe('the Paystack webhook', () => {
  const send = (body: object, sig?: string | null) => {
    const raw = JSON.stringify(body);
    const signature = sig === undefined ? createHmac('sha512', 'sk_test_mock').update(raw).digest('hex') : sig;
    return webhook(new Request('http://localhost/api/webhooks/paystack', { method: 'POST', body: raw, headers: signature ? { 'x-paystack-signature': signature } : {} }));
  };

  it('rejects missing or wrong signatures and changes nothing', async () => {
    const p = await makeProduct();
    const r = await placeOrder(card([{ productId: p.id, quantity: 1 }]));
    const ref = await refOf(r.orderId);
    mock.txs.get(ref)!.status = 'success';
    const body = { event: 'charge.success', data: { reference: ref, id: 1 } };
    expect((await send(body, null)).status).toBe(401);
    expect((await send(body, 'deadbeef')).status).toBe(401);
    expect((await send(body, createHmac('sha512', 'wrong-key').update(JSON.stringify(body)).digest('hex'))).status).toBe(401);
    expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).paymentStatus).toBe('PENDING');
  });

  it('confirms a verified payment once, however many times it is delivered', async () => {
    const p = await makeProduct({ stock: 3 });
    const r = await placeOrder(card([{ productId: p.id, quantity: 1 }]));
    const ref = await refOf(r.orderId);
    mock.txs.get(ref)!.status = 'success';
    const body = { event: 'charge.success', data: { reference: ref, id: 99 } };
    expect(await (await send(body)).json()).toMatchObject({ outcome: 'paid' });
    expect(await (await send(body)).json()).toMatchObject({ outcome: 'already-paid' });
    expect(await stock(p.id)).toBe(2);
  });

  it('does not mark an order paid just because the webhook says so', async () => {
    const p = await makeProduct();
    const r = await placeOrder(card([{ productId: p.id, quantity: 1 }]));
    const ref = await refOf(r.orderId);            // Paystack (the stand-in) still says "pending"
    expect(await (await send({ event: 'charge.success', data: { reference: ref, id: 5, status: 'success' } })).json()).toMatchObject({ outcome: 'pending' });
    expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).paymentStatus).toBe('PENDING');
  });

  it('ignores other events', async () => {
    expect(await (await send({ event: 'transfer.success', data: { reference: 'x' } })).json()).toMatchObject({ ignored: true });
  });
});

describe('basket', () => {
  it('adds, caps at what is available, and refuses non-OTC items', async () => {
    const p = await makeProduct({ stock: 3 });
    const ask = await makeProduct({ classification: 'PHARMACY_ONLY' });
    await addToCart(p.id, 2);
    expect((await addToCart(p.id, 5)).message).toMatch(/could only add 1/);
    expect(await err(addToCart(p.id, 1))).toBeInstanceOf(AppError);
    expect(await err(addToCart(ask.id, 1))).toBeInstanceOf(AppError);
    const v = await getCartView();
    expect(v.count).toBe(3);
    expect(v.blocked).toBe(false);
  });

  it('flags a line whose stock disappeared after it was added', async () => {
    const p = await makeProduct({ stock: 3 });
    await addToCart(p.id, 2);
    await db.product.update({ where: { id: p.id }, data: { stock: 1 } });
    __jar.set('x', 'y');
    const v = await getCartView();
    expect(v.lines[0]!.issue).toMatch(/Only 1 left/);
    expect(v.blocked).toBe(true);
  });
});

describe('staff handling an order', () => {
  it('restores stock when a pay-on-delivery order is cancelled, and only managers may cancel', async () => {
    const p = await makeProduct({ stock: 5 });
    const r = await placeOrder(pickup([{ productId: p.id, quantity: 2 }]));
    const clerk = principal(await makeUser('STAFF'));
    const mgr = principal(await makeUser('MANAGER'));
    expect((await err(changeOrderStatus(clerk, r.orderId, 'CANCELLED', 'x')))).toBeInstanceOf(AppError);
    expect(await stock(p.id)).toBe(3);
    await changeOrderStatus(mgr, r.orderId, 'CANCELLED', 'Customer asked');
    expect(await stock(p.id)).toBe(5);
    expect(await err(changeOrderStatus(mgr, r.orderId, 'PROCESSING'))).toBeInstanceOf(AppError); // a cancelled order cannot restart
  });
});
