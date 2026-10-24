/** Remove the demonstration catalogue and content before going live. Usage: npm run demo:clear */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const withOrders = await db.orderItem.findMany({ where: { product: { isDemo: true } }, select: { productId: true }, distinct: ['productId'] });
  const keep = withOrders.map((o) => o.productId).filter((x): x is string => !!x);
  const del = await db.product.deleteMany({ where: { isDemo: true, id: { notIn: keep } } });
  await db.product.updateMany({ where: { isDemo: true, id: { in: keep } }, data: { status: 'DRAFT' } });
  const svc = await db.pharmacyService.deleteMany({ where: { isDemo: true } });
  const zones = await db.deliveryZone.deleteMany({ where: { name: { contains: '(demo)' } } });
  const coupons = await db.coupon.deleteMany({ where: { code: 'DEMO10', usedCount: 0 } });
  const promos = await db.promotion.deleteMany({ where: { couponCode: 'DEMO10' } });
  console.log(`Removed ${del.count} sample products (${keep.length} kept as drafts because they appear on test orders), ${svc.count} sample services, ${zones.count} sample delivery zones, ${coupons.count} sample codes, ${promos.count} sample promotions.`);
  console.log('Set SITE_MODE=live and run the seed again: the 24 Reset Pharmacy products are loaded as drafts (no stock, prices unconfirmed) for you to review and publish. Or load your own catalogue in the admin console (Products → Import).');
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
