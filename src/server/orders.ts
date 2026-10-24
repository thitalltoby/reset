import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import type { Fulfilment, OrderStatus, PaymentMethod } from '@/generated/prisma/enums';
import { db, type Tx } from './db';
import { env } from './env';
import { randomToken } from './crypto';
import { AppError, conflict, forbidden, invalid, notFound } from './errors';
import { audit, SYSTEM_ACTOR, type Actor } from './audit';
import { assertCan, actorOf, type Principal } from './rbac';
import { getSetting } from './settings';
import { availableOf, publicProductWhere, reservedUnits } from './catalog';
import { enqueueEmail, notifyInternal } from './notify';
import { emailTemplate } from './email-templates';
import { emitEvent } from './integrations/events';
import { initializeTransaction, paystackConfig, verifyTransaction, type Verification } from './paystack';
import { checkCoupon, computeTotals } from '@/lib/pricing';
import { formatNaira } from '@/lib/money';
import { canTransition, ORDER_STATUS_LABELS } from '@/lib/order-flow';

// ─── Numbers ─────────────────────────────────────────────────────────

/** Next reference such as RP-100012. Atomic, so two orders never share a number. */
export async function nextNumber(prefix: string, key: string, start: number, tx?: Tx): Promise<string> {
  const c = tx ?? db;
  const rows = await c.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("key", "value") VALUES (${key}, ${start})
    ON CONFLICT ("key") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"`;
  return `${prefix}-${rows[0]!.value}`;
}

// ─── Stock ───────────────────────────────────────────────────────────

/** Change a product's stock and record why. Returns the new balance. */
export async function moveStock(tx: Tx, p: { productId: string; delta: number; reason: string; orderId?: string; note?: string; actor?: Actor }): Promise<number> {
  const rows = await tx.$queryRaw<{ stock: number }[]>`UPDATE "Product" SET "stock" = "stock" + ${p.delta}, "updatedAt" = NOW() WHERE "id" = ${p.productId} RETURNING "stock"`;
  const balance = rows[0]?.stock ?? 0;
  await tx.stockMovement.create({
    data: { productId: p.productId, delta: p.delta, reason: p.reason, balance, orderId: p.orderId, note: p.note, actorId: p.actor?.id ?? null, actorLabel: p.actor?.label ?? 'System' },
  });
  return balance;
}

// ─── Checkout ────────────────────────────────────────────────────────

export interface CheckoutInput {
  userId?: string | null;
  name: string;
  email: string;
  phone: string;
  fulfilment: Fulfilment;
  zoneId?: string | null;
  address?: { line1: string; line2?: string; city: string; state: string; notes?: string } | null;
  paymentMethod: PaymentMethod;
  note?: string;
  marketingOptIn?: boolean;
  smsOptIn?: boolean;
  items: { productId: string; quantity: number }[];
  couponCode?: string | null;
}

export interface CheckoutResult {
  orderId: string;
  token: string;
  number: string;
  /** Where to send the customer to pay (card payments only) */
  payUrl: string | null;
}

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const shop = await getSetting('shop');
  if (!shop.onlineShop) throw invalid('Online ordering is not open yet. Please contact the pharmacy.');
  if (input.paymentMethod === 'PAYSTACK') {
    if (!shop.paystack || !(await paystackConfig())) throw invalid('Card payment is not available right now. Please choose another way to pay.');
  } else if (!shop.payOnDelivery) throw invalid('Paying on delivery or collection is not available.');
  if (input.fulfilment === 'DELIVERY' && !shop.delivery) throw invalid('Delivery is not available. Please choose collection.');
  if (input.fulfilment === 'PICKUP' && !shop.pickup) throw invalid('Collection is not available. Please choose delivery.');
  if (!input.items.length) throw invalid('Your basket is empty.');
  if (input.items.length > 40) throw invalid('Please split very large orders into two.');

  const ids = [...new Set(input.items.map((i) => i.productId))].sort();
  const wantedQty = new Map<string, number>();
  for (const it of input.items) {
    if (!Number.isInteger(it.quantity) || it.quantity < 1) throw invalid('One of the quantities is not valid.');
    wantedQty.set(it.productId, (wantedQty.get(it.productId) ?? 0) + it.quantity);
  }

  const trackToken = randomToken(18);
  const payNow = input.paymentMethod === 'PAYSTACK';

  const order = await db.$transaction(async (tx) => {
    // Lock the products in a fixed order so two checkouts for the same item cannot both take the last unit
    await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ANY(${ids}) ORDER BY "id" FOR UPDATE`;
    const products = await tx.product.findMany({ where: publicProductWhere({ id: { in: ids } }) });
    if (products.length !== ids.length) throw invalid('Something in your basket is no longer available. Please review your basket.');
    const reserved = await reservedUnits(ids);
    const problems: string[] = [];
    for (const p of products) {
      const q = wantedQty.get(p.id)!;
      if (p.classification !== 'OTC') problems.push(`${p.name} is supplied through the pharmacist and cannot be ordered online.`);
      else if (q > p.maxPerOrder) problems.push(`${p.name}: the limit is ${p.maxPerOrder} per order.`);
      else if (q > availableOf(p.stock, reserved.get(p.id) ?? 0)) problems.push(`${p.name}: only ${availableOf(p.stock, reserved.get(p.id) ?? 0)} available.`);
    }
    if (problems.length) throw invalid(problems.join(' '));

    let zone = null as null | { id: string; name: string; feeKobo: number; freeOverKobo: number | null };
    if (input.fulfilment === 'DELIVERY') {
      zone = input.zoneId ? await tx.deliveryZone.findFirst({ where: { id: input.zoneId, active: true } }) : null;
      if (!zone) throw invalid('Choose where we should deliver.', { zoneId: 'Required.' });
      if (!input.address?.line1 || !input.address.city || !input.address.state) throw invalid('Enter the delivery address.', { line1: 'Required.' });
    }
    const lines = products.map((p) => ({ p, quantity: wantedQty.get(p.id)! }));
    const coupon = input.couponCode ? await tx.coupon.findUnique({ where: { code: input.couponCode } }) : null;
    const subtotalCheck = lines.reduce((a, l) => a + l.p.priceKobo * l.quantity, 0);
    if (input.couponCode) {
      const ck = checkCoupon(coupon, subtotalCheck);
      if (!ck.ok) throw invalid(ck.reason);
    }
    const totals = computeTotals(lines.map((l) => ({ unitKobo: l.p.priceKobo, quantity: l.quantity })), { coupon, fulfilment: input.fulfilment, zone });
    if (totals.subtotalKobo < shop.minOrderKobo) throw invalid(`The smallest order we accept is ${formatNaira(shop.minOrderKobo)}.`);

    const number = await nextNumber('RP', 'order', 100001, tx);
    const created = await tx.order.create({
      data: {
        number, trackToken, userId: input.userId ?? null,
        status: payNow ? 'AWAITING_PAYMENT' : 'PLACED',
        paymentStatus: 'UNPAID', paymentMethod: input.paymentMethod, fulfilment: input.fulfilment,
        customerName: input.name, email: input.email.toLowerCase(), phone: input.phone,
        shipLine1: input.address?.line1, shipLine2: input.address?.line2 || null, shipCity: input.address?.city, shipState: input.address?.state, shipNotes: input.address?.notes || null,
        zoneName: zone?.name ?? null,
        subtotalKobo: totals.subtotalKobo, discountKobo: totals.discountKobo, deliveryKobo: totals.deliveryKobo, totalKobo: totals.totalKobo,
        couponCode: totals.discountKobo > 0 ? coupon!.code : null,
        customerNote: input.note || null, marketingOptIn: !!input.marketingOptIn, smsOptIn: !!input.smsOptIn,
        expiresAt: payNow ? new Date(Date.now() + shop.orderHoldMinutes * 60_000) : null,
        items: { create: lines.map((l) => ({ productId: l.p.id, name: l.p.name, sku: l.p.sku, packSize: l.p.packSize, quantity: l.quantity, unitKobo: l.p.priceKobo })) },
        events: { create: { label: payNow ? 'Order created — waiting for payment' : 'Order received', actorLabel: 'Customer' } },
      },
    });
    if (!payNow) {
      for (const l of lines) await moveStock(tx, { productId: l.p.id, delta: -l.quantity, reason: 'SALE', orderId: created.id, note: created.number });
      if (totals.discountKobo > 0) await tx.coupon.update({ where: { id: coupon!.id }, data: { usedCount: { increment: 1 } } });
    }
    return created;
  }, { timeout: 15_000 });

  let payUrl: string | null = null;
  if (payNow) {
    try {
      payUrl = await startPayment(order.id);
    } catch (e) {
      // The order never reached the customer's card: release it so nothing is held
      await db.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', paymentStatus: 'FAILED' } });
      await db.orderEvent.create({ data: { orderId: order.id, label: 'Payment could not be started', note: e instanceof Error ? e.message.slice(0, 300) : null } });
      throw new AppError('CONFLICT', 'We could not reach the payment service. Nothing has been charged. Please try again in a moment, or choose another way to pay.');
    }
  } else {
    await afterOrderActive(order.id);
  }
  return { orderId: order.id, token: order.trackToken, number: order.number, payUrl };
}

/** Create a payment reference and ask Paystack for the payment page. Safe to call again for the same unpaid order (a new reference each time). */
export async function startPayment(orderId: string): Promise<string> {
  const cfg = await paystackConfig();
  if (!cfg) throw new Error('Card payment is not set up.');
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.paymentStatus === 'PAID') throw conflict('This order has already been paid.');
  if (order.status !== 'AWAITING_PAYMENT') throw conflict('This order can no longer be paid.');
  const reference = `${order.number}-${randomToken(5).replace(/[^A-Za-z0-9]/g, 'x').slice(0, 7)}`;
  const init = await initializeTransaction(cfg, {
    email: order.email, amountKobo: order.totalKobo, reference,
    callbackUrl: `${env.APP_URL}/checkout/return`,
    metadata: { order: order.number, custom_fields: [{ display_name: 'Order', variable_name: 'order', value: order.number }] },
  });
  await db.paymentTransaction.create({ data: { orderId, reference, amountKobo: order.totalKobo } });
  await db.order.update({ where: { id: orderId }, data: { paymentStatus: 'PENDING', expiresAt: new Date(Date.now() + (await getSetting('shop')).orderHoldMinutes * 60_000) } });
  await db.orderEvent.create({ data: { orderId, label: 'Sent to the payment page', actorLabel: 'Customer' } });
  return init.authorizationUrl;
}

// ─── Payment confirmation ────────────────────────────────────────────

export type SettleOutcome = 'paid' | 'already-paid' | 'failed' | 'pending' | 'mismatch' | 'unknown-reference';

/**
 * Apply what Paystack says about a payment. Called with a result fetched from Paystack's own verify endpoint, never with
 * anything taken from a browser or an unverified request. Safe to repeat: a second call for a paid order changes nothing.
 */
export async function settlePayment(v: Verification): Promise<{ outcome: SettleOutcome; orderId?: string; token?: string }> {
  const trx = await db.paymentTransaction.findUnique({ where: { reference: v.reference } });
  if (!trx) return { outcome: 'unknown-reference' };
  let newlyPaid = false;
  let mismatch = false;
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${trx.orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: trx.orderId }, include: { items: true } });
    const out = { orderId: order.id, token: order.trackToken };
    if (order.paymentStatus === 'PAID') return { outcome: 'already-paid' as const, ...out };

    if (v.status === 'success') {
      if (v.amountKobo !== order.totalKobo || v.currency !== 'NGN') {
        mismatch = true;
        await tx.paymentTransaction.update({ where: { id: trx.id }, data: { status: 'FAILED', gatewayMessage: `Amount or currency did not match (received ${v.amountKobo} ${v.currency}, expected ${order.totalKobo} NGN)`, paidAmountKobo: v.amountKobo } });
        await tx.orderEvent.create({ data: { orderId: order.id, label: 'Payment did not match the order — held for review', note: `Paystack reported ${formatNaira(v.amountKobo)} ${v.currency}; the order is ${formatNaira(order.totalKobo)}.` } });
        await tx.order.update({ where: { id: order.id }, data: { staffNote: [order.staffNote, 'PAYMENT AMOUNT MISMATCH — check with Paystack before supplying anything.'].filter(Boolean).join('\n') } });
        return { outcome: 'mismatch' as const, ...out };
      }
      await tx.paymentTransaction.update({ where: { id: trx.id }, data: { status: 'SUCCESS', channel: v.channel, gatewayMessage: v.gatewayResponse, paidAmountKobo: v.amountKobo, verifiedAt: new Date() } });
      const cancelledAlready = order.status === 'CANCELLED';
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID', paidAt: new Date(),
          status: cancelledAlready ? 'CANCELLED' : 'PLACED', expiresAt: null,
          ...(cancelledAlready ? { staffNote: [order.staffNote, 'Payment arrived after the order was cancelled: refund due.'].filter(Boolean).join('\n') } : {}),
        },
      });
      if (cancelledAlready) {
        await tx.orderEvent.create({ data: { orderId: order.id, label: 'Payment received after cancellation — refund due' } });
      } else {
        await tx.orderEvent.create({ data: { orderId: order.id, label: 'Payment confirmed', note: v.channel ? `Paid by ${v.channel}` : null } });
        const short: string[] = [];
        for (const it of order.items) {
          if (!it.productId) continue;
          const bal = await moveStock(tx, { productId: it.productId, delta: -it.quantity, reason: 'SALE', orderId: order.id, note: order.number });
          if (bal < 0) short.push(`${it.name} (${bal})`);
        }
        if (short.length) {
          await tx.order.update({ where: { id: order.id }, data: { staffNote: [order.staffNote, `STOCK SHORT after payment: ${short.join(', ')}. Contact the customer or refund.`].filter(Boolean).join('\n') } });
          await tx.orderEvent.create({ data: { orderId: order.id, label: 'Stock ran short while payment was pending', note: short.join(', ') } });
        }
        if (order.couponCode) await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
        newlyPaid = true;
      }
      return { outcome: 'paid' as const, ...out };
    }
    if (v.status === 'failed' || v.status === 'abandoned') {
      await tx.paymentTransaction.update({ where: { id: trx.id }, data: { status: v.status === 'failed' ? 'FAILED' : 'ABANDONED', channel: v.channel, gatewayMessage: v.gatewayResponse } });
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: order.status === 'AWAITING_PAYMENT' ? 'FAILED' : order.paymentStatus } });
      await tx.orderEvent.create({ data: { orderId: order.id, label: v.status === 'failed' ? 'Payment failed' : 'Payment not completed', note: v.gatewayResponse } });
      return { outcome: 'failed' as const, ...out };
    }
    return { outcome: 'pending' as const, ...out };
  }, { timeout: 15_000 });

  if (mismatch) {
    await notifyInternal('newOrderTo', 'Payment amount mismatch — check before supplying', 'A card payment did not match its order', ['Paystack reported a different amount from the order total. The order has not been marked paid.'], `/admin/orders/${trx.orderId}`, undefined, trx.orderId);
  }
  if (newlyPaid) await afterOrderActive(trx.orderId, true);
  return result;
}

/** Verify with Paystack and apply the result. Used by the return page and the webhook. */
export async function confirmByReference(reference: string): Promise<{ outcome: SettleOutcome; orderId?: string; token?: string }> {
  const cfg = await paystackConfig();
  if (!cfg) throw new Error('Card payment is not set up.');
  const known = await db.paymentTransaction.findUnique({ where: { reference }, select: { id: true } });
  if (!known) return { outcome: 'unknown-reference' };
  const v = await verifyTransaction(cfg, reference);
  return settlePayment({ ...v, reference });
}

/** Messages and integration events once an order is real: received (pay on delivery) or paid. */
async function afterOrderActive(orderId: string, paid = false) {
  const o = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!o) return;
  const tpl = emailTemplate({
    heading: paid ? `Payment received — thank you, ${o.customerName.split(' ')[0]}` : `We have your order, ${o.customerName.split(' ')[0]}`,
    paragraphs: [
      paid ? 'Your payment went through and your order is with our team.' : 'Your order is with our team. You will pay when it is handed over.',
      o.fulfilment === 'PICKUP' ? 'We will email you as soon as it is ready for collection.' : 'We will email you when it is on its way.',
    ],
    details: [
      ['Order', o.number],
      ...o.items.map((i) => [`${i.quantity} × ${i.name}${i.packSize ? ` (${i.packSize})` : ''}`, formatNaira(i.unitKobo * i.quantity)] as [string, string]),
      ...(o.discountKobo ? [['Discount', `−${formatNaira(o.discountKobo)}`] as [string, string]] : []),
      ...(o.fulfilment === 'DELIVERY' ? [['Delivery', formatNaira(o.deliveryKobo)] as [string, string]] : []),
      ['Total', formatNaira(o.totalKobo)],
    ],
    cta: { label: 'Track your order', url: `${env.APP_URL}/order/${o.trackToken}` },
    footnote: 'If anything looks wrong, reply to this email or contact the pharmacy and quote your order number.',
  });
  await enqueueEmail({ type: paid ? 'order.paid' : 'order.placed', to: o.email, subject: `Reset Pharmacy order ${o.number}`, ...tpl, refId: o.id });
  await notifyInternal('newOrderTo', `New order ${o.number}`, `New order ${o.number}`, [`${o.items.length} item${o.items.length === 1 ? '' : 's'}, ${formatNaira(o.totalKobo)}. ${paid ? 'Paid online.' : 'Pay on delivery or collection.'}`], `/admin/orders/${o.id}`, undefined, o.id);
  await emitEvent('order.placed', { number: o.number, total: o.totalKobo, paid, fulfilment: o.fulfilment }, `${o.id}:${paid ? 'paid' : 'placed'}`);
  await alertLowStock(o.items.map((i) => i.productId).filter((x): x is string => !!x));
}

/** Tell the team when a sale takes an item to or below its re-order level. */
export async function alertLowStock(productIds: string[]) {
  if (!productIds.length) return;
  const rows = await db.product.findMany({ where: { id: { in: productIds }, classification: { not: 'PRESCRIPTION' } }, select: { id: true, name: true, sku: true, stock: true, reorderLevel: true } });
  const low = rows.filter((r) => r.stock <= r.reorderLevel);
  if (!low.length) return;
  await notifyInternal('lowStockTo', `Low stock: ${low.map((l) => l.name).slice(0, 3).join(', ')}${low.length > 3 ? '…' : ''}`, 'Items running low', ['These items are at or below their re-order level.'], '/admin/inventory', low.map((l) => [`${l.name} (${l.sku})`, `${l.stock} left`] as [string, string]));
  await emitEvent('stock.low', { items: low.map((l) => ({ sku: l.sku, stock: l.stock })) }, `low:${low.map((l) => l.id).join(',')}:${low.map((l) => l.stock).join(',')}`);
}

// ─── Customers: look up, cancel, retry ───────────────────────────────

export const orderInclude = { items: true, events: { orderBy: { createdAt: 'asc' as const } } };

export async function getOrderByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  return db.order.findUnique({ where: { trackToken: token }, include: orderInclude });
}

export async function findOrderForTracking(number: string, email: string) {
  return db.order.findFirst({ where: { number: number.trim().toUpperCase(), email: email.trim().toLowerCase() }, select: { trackToken: true } });
}

/** A customer abandons an unpaid card order: it is released immediately. */
export async function cancelUnpaidOrder(token: string): Promise<{ orderId: string; items: { productId: string; quantity: number }[] }> {
  const o = await db.order.findUnique({ where: { trackToken: token }, include: { items: true } });
  if (!o) throw notFound('Order not found.');
  if (o.status !== 'AWAITING_PAYMENT' || o.paymentStatus === 'PAID') throw conflict('This order can no longer be cancelled here. Please contact the pharmacy.');
  await db.order.update({ where: { id: o.id }, data: { status: 'CANCELLED', paymentStatus: 'CANCELLED', expiresAt: null } });
  await db.orderEvent.create({ data: { orderId: o.id, label: 'Cancelled by the customer before paying', actorLabel: 'Customer' } });
  return { orderId: o.id, items: o.items.filter((i) => i.productId).map((i) => ({ productId: i.productId!, quantity: i.quantity })) };
}

/** Unpaid card orders whose stock hold has run out. Run by the scheduler. */
export async function expireUnpaidOrders(): Promise<number> {
  const due = await db.order.findMany({ where: { status: 'AWAITING_PAYMENT', expiresAt: { lt: new Date() } }, select: { id: true } });
  for (const o of due) {
    await db.order.updateMany({ where: { id: o.id, status: 'AWAITING_PAYMENT' }, data: { status: 'EXPIRED', expiresAt: null } });
    await db.orderEvent.create({ data: { orderId: o.id, label: 'Expired: not paid in time. Stock released.' } });
  }
  return due.length;
}

// ─── Staff: move an order along ──────────────────────────────────────

const CUSTOMER_STATUS_COPY: Partial<Record<OrderStatus, (f: Fulfilment) => { subject: string; heading: string; line: string }>> = {
  PROCESSING: () => ({ subject: 'is being prepared', heading: 'We are preparing your order', line: 'Our team has started getting your items together.' }),
  READY: () => ({ subject: 'is ready for collection', heading: 'Your order is ready for collection', line: 'You can collect it from the pharmacy. Please bring your order number.' }),
  OUT_FOR_DELIVERY: () => ({ subject: 'is on its way', heading: 'Your order is on its way', line: 'It has left the pharmacy. Please keep your phone close in case the rider calls.' }),
  COMPLETED: (f) => ({ subject: f === 'PICKUP' ? 'has been collected' : 'has been delivered', heading: 'Order complete', line: 'Thank you for choosing Reset Pharmacy. If anything is not right, tell us and we will sort it out.' }),
  CANCELLED: () => ({ subject: 'has been cancelled', heading: 'Your order has been cancelled', line: 'If you paid online, we will refund you and tell you when it has been sent. If this was not expected, please contact us.' }),
};

export async function changeOrderStatus(user: Principal, orderId: string, to: OrderStatus, note?: string) {
  assertCan(user, to === 'CANCELLED' ? 'order.cancel' : 'order.manage');
  let order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw notFound('Order not found.');
  const from = order.status;
  if (!canTransition(from, to, order.fulfilment)) throw conflict(`An order that is "${ORDER_STATUS_LABELS[from]}" cannot move to "${ORDER_STATUS_LABELS[to]}".`);
  if (to === 'CANCELLED' && !note?.trim()) throw invalid('Say why the order is being cancelled.', { note: 'Required.' });
  const actor = actorOf(user);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (order.status !== from) throw conflict('Someone else has just changed this order. Reload to see it.');
    const data: Prisma.OrderUpdateInput = { status: to };
    if (to === 'COMPLETED') {
      data.completedAt = new Date();
      if (order.paymentStatus !== 'PAID') { data.paymentStatus = 'PAID'; data.paidAt = new Date(); }
    }
    if (to === 'CANCELLED') {
      for (const it of order.items) if (it.productId) await moveStock(tx, { productId: it.productId, delta: it.quantity, reason: 'CANCELLATION', orderId, note: order.number, actor });
      if (order.paymentStatus === 'PAID') data.staffNote = [order.staffNote, 'Cancelled after payment: refund due.'].filter(Boolean).join('\n');
      else data.paymentStatus = 'CANCELLED';
    }
    await tx.order.update({ where: { id: orderId }, data });
    await tx.orderEvent.create({ data: { orderId, label: ORDER_STATUS_LABELS[to], note: note?.trim() || null, actorId: actor.id, actorLabel: actor.label } });
    await audit(actor, 'order.status', 'Order', orderId, { from, to }, null, tx);
  }, { timeout: 15_000 });

  const copy = CUSTOMER_STATUS_COPY[to]?.(order!.fulfilment);
  if (copy) {
    const tpl = emailTemplate({
      heading: copy.heading, paragraphs: [copy.line, ...(note?.trim() && to !== 'CANCELLED' ? [note.trim()] : [])],
      details: [['Order', order!.number]], cta: { label: 'View your order', url: `${env.APP_URL}/order/${order!.trackToken}` },
    });
    await enqueueEmail({ type: 'order.status', to: order!.email, subject: `Reset Pharmacy order ${order!.number} ${copy.subject}`, ...tpl, refId: orderId });
  }
  await emitEvent('order.status_changed', { number: order!.number, from, to }, `${orderId}:${to}`);
  if (to === 'CANCELLED') await alertLowStock([]);
}

export async function addOrderNote(user: Principal, orderId: string, note: string) {
  assertCan(user, 'order.manage');
  const text = note.trim();
  if (!text) throw invalid('Write a note first.', { note: 'Required.' });
  if (text.length > 1000) throw invalid('Keep the note under 1,000 characters.', { note: 'Too long.' });
  await db.orderEvent.create({ data: { orderId, label: 'Staff note', note: text, actorId: user.id, actorLabel: user.name } });
}

/** After a cancelled order has been refunded in the Paystack dashboard, record it. Paystack refunds themselves are made there. */
export async function markRefunded(user: Principal, orderId: string, note: string) {
  assertCan(user, 'order.cancel');
  const o = await db.order.findUnique({ where: { id: orderId } });
  if (!o) throw notFound('Order not found.');
  if (o.status !== 'CANCELLED' || o.paymentStatus !== 'PAID') throw conflict('Only a cancelled order that was paid can be marked refunded.');
  if (!note.trim()) throw invalid('Enter the refund reference or a short note.', { note: 'Required.' });
  await db.order.update({ where: { id: orderId }, data: { paymentStatus: 'REFUNDED' } });
  await db.orderEvent.create({ data: { orderId, label: 'Refund recorded', note: note.trim(), actorId: user.id, actorLabel: user.name } });
  await audit(actorOf(user), 'order.refund', 'Order', orderId, { note: note.trim() });
  const tpl = emailTemplate({ heading: 'Your refund has been sent', paragraphs: ['We have refunded your payment. It can take a few working days to show in your account, depending on your bank.'], details: [['Order', o.number]] });
  await enqueueEmail({ type: 'order.refund', to: o.email, subject: `Reset Pharmacy order ${o.number}: refund sent`, ...tpl, refId: orderId });
}

// ─── Staff views ─────────────────────────────────────────────────────

export interface AdminOrderFilter { q?: string; status?: string; payment?: string; fulfilment?: string; page?: number }

export async function adminListOrders(user: Principal, f: AdminOrderFilter = {}) {
  assertCan(user, 'order.view');
  const q = f.q?.trim();
  const where: Prisma.OrderWhereInput = {
    ...(f.status ? { status: f.status as OrderStatus } : { NOT: { status: 'EXPIRED' as const } }),
    ...(f.payment ? { paymentStatus: f.payment as Prisma.EnumPaymentStatusFilter['equals'] } : {}),
    ...(f.fulfilment ? { fulfilment: f.fulfilment as Fulfilment } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { customerName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {}),
  };
  const page = Math.max(1, f.page ?? 1);
  const [rows, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 40, take: 40, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / 40)) };
}

export async function adminGetOrder(user: Principal, id: string) {
  assertCan(user, 'order.view');
  return db.order.findUnique({ where: { id }, include: { items: true, events: { orderBy: { createdAt: 'desc' } }, transactions: { orderBy: { createdAt: 'desc' } }, user: { select: { id: true, name: true } } } });
}

export { SYSTEM_ACTOR, forbidden };
