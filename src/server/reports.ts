import 'server-only';
import { db } from './db';
import { assertCan, type Principal } from './rbac';
import { lowStock } from './catalog';
import { csvCell } from './products';
import { can } from '@/lib/permissions';

const DAY = 86_400_000;
const lagosDay = (d: Date) => new Date(d.getTime() + 3_600_000).toISOString().slice(0, 10);

export async function dashboard(user: Principal) {
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * DAY);
  const since30 = new Date(now.getTime() - 30 * DAY);
  const canOrders = can(user.role, 'order.view');
  const canRx = can(user.role, 'prescription.review');
  const canEnq = can(user.role, 'enquiry.manage');
  const canReports = can(user.role, 'report.view');
  const paid = { paymentStatus: 'PAID' as const, NOT: { status: 'CANCELLED' as const } };
  const [toProcess, awaitingPay, refundsDue, rx, enq, low, rev7, rev30, orders30] = await Promise.all([
    canOrders ? db.order.count({ where: { status: { in: ['PLACED', 'PROCESSING'] } } }) : 0,
    canOrders ? db.order.count({ where: { status: 'AWAITING_PAYMENT', expiresAt: { gt: now } } }) : 0,
    canOrders ? db.order.count({ where: { status: 'CANCELLED', paymentStatus: 'PAID' } }) : 0,
    canRx ? db.prescription.count({ where: { status: { in: ['RECEIVED', 'IN_REVIEW'] } } }) : 0,
    canEnq ? db.enquiry.count({ where: { status: { in: ['NEW', 'IN_PROGRESS'] } } }) : 0,
    can(user.role, 'inventory.manage') || can(user.role, 'product.view') ? lowStock(8) : [],
    canReports ? db.order.aggregate({ where: { ...paid, createdAt: { gte: since7 } }, _sum: { totalKobo: true }, _count: { _all: true } }) : null,
    canReports ? db.order.aggregate({ where: { ...paid, createdAt: { gte: since30 } }, _sum: { totalKobo: true }, _count: { _all: true } }) : null,
    canReports ? db.order.findMany({ where: { ...paid, createdAt: { gte: since30 } }, select: { createdAt: true, totalKobo: true } }) : [],
  ]);
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) byDay.set(lagosDay(new Date(now.getTime() - i * DAY)), 0);
  for (const o of orders30) { const k = lagosDay(o.createdAt); if (byDay.has(k)) byDay.set(k, byDay.get(k)! + o.totalKobo); }
  return {
    toProcess, awaitingPay, refundsDue, rx, enq, low,
    sales7: rev7 ? { totalKobo: rev7._sum.totalKobo ?? 0, orders: rev7._count._all } : null,
    sales30: rev30 ? { totalKobo: rev30._sum.totalKobo ?? 0, orders: rev30._count._all } : null,
    series: canReports ? [...byDay].map(([day, kobo]) => ({ day, kobo })) : [],
  };
}

export async function salesReport(user: Principal, days: number) {
  assertCan(user, 'report.view');
  const since = new Date(Date.now() - days * DAY);
  const [byStatus, top, byMethod, byFulfilment, coupons] = await Promise.all([
    db.order.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { _all: true }, _sum: { totalKobo: true } }),
    db.$queryRaw<{ name: string; sku: string; units: number; revenue: number }[]>`
      SELECT oi."name", oi."sku", SUM(oi."quantity")::int AS units, SUM(oi."quantity" * oi."unitKobo")::int AS revenue
      FROM "OrderItem" oi JOIN "Order" o ON o."id" = oi."orderId"
      WHERE o."createdAt" >= ${since} AND o."paymentStatus" = 'PAID' AND o."status" <> 'CANCELLED'
      GROUP BY oi."name", oi."sku" ORDER BY units DESC, revenue DESC LIMIT 15`,
    db.order.groupBy({ by: ['paymentMethod'], where: { createdAt: { gte: since }, paymentStatus: 'PAID', NOT: { status: 'CANCELLED' } }, _count: { _all: true }, _sum: { totalKobo: true } }),
    db.order.groupBy({ by: ['fulfilment'], where: { createdAt: { gte: since }, paymentStatus: 'PAID', NOT: { status: 'CANCELLED' } }, _count: { _all: true }, _sum: { totalKobo: true } }),
    db.order.groupBy({ by: ['couponCode'], where: { createdAt: { gte: since }, couponCode: { not: null }, NOT: { status: { in: ['CANCELLED', 'EXPIRED'] } } }, _count: { _all: true }, _sum: { discountKobo: true } }),
  ]);
  return { byStatus, top, byMethod, byFulfilment, coupons, since };
}

export async function ordersCsv(user: Principal, days: number): Promise<string> {
  assertCan(user, 'report.view');
  const rows = await db.order.findMany({ where: { createdAt: { gte: new Date(Date.now() - days * DAY) } }, orderBy: { createdAt: 'desc' }, take: 20000 });
  const head = ['order', 'date', 'status', 'payment_status', 'payment_method', 'fulfilment', 'subtotal_ngn', 'discount_ngn', 'delivery_ngn', 'total_ngn', 'coupon'];
  const out = [head.join(',')];
  for (const o of rows) out.push([o.number, o.createdAt.toISOString(), o.status, o.paymentStatus, o.paymentMethod, o.fulfilment, (o.subtotalKobo / 100).toFixed(2), (o.discountKobo / 100).toFixed(2), (o.deliveryKobo / 100).toFixed(2), (o.totalKobo / 100).toFixed(2), o.couponCode].map(csvCell).join(','));
  return out.join('\r\n') + '\r\n';
}

export async function inventoryValue(user: Principal) {
  assertCan(user, 'report.view');
  const r = await db.$queryRaw<{ units: number; cost_at_price: number; skus: number }[]>`SELECT COALESCE(SUM("stock"),0)::int AS units, COALESCE(SUM("stock" * "priceKobo"),0)::bigint::float8 AS cost_at_price, COUNT(*)::int AS skus FROM "Product" WHERE "stock" > 0 AND "classification" <> 'PRESCRIPTION'`;
  return r[0]!;
}
