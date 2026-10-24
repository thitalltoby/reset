import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';
import { CATEGORIES, RX_SAMPLES, DEMO_ZONES } from '../src/content/catalogue';
import { RESET_CATALOGUE } from '../src/content/reset-catalogue';
import { FAQS, SERVICES } from '../src/content/site-content';
import { ARTICLES } from '../src/content/articles';
import { DEFAULTS } from '../src/server/settings-defaults';

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const DEMO = (process.env.SITE_MODE ?? 'live') === 'demo';
const slugify = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  // ── Settings: created once, never overwritten ──
  const settings: Record<string, object> = { ...DEFAULTS };
  if (DEMO) settings.shop = { ...DEFAULTS.shop, delivery: true, pickup: true, payOnDelivery: true, paystack: !!process.env.PAYSTACK_SECRET_KEY, prescriptions: true, pickupNote: 'Sample note: collection details will be confirmed by the pharmacy.' };
  for (const [key, value] of Object.entries(settings)) await db.siteSetting.upsert({ where: { key }, create: { key, value: value as object }, update: {} });

  // ── Categories ──
  const ids = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await db.category.upsert({ where: { slug: c.slug }, create: { slug: c.slug, name: c.name, blurb: c.blurb, art: c.art, sortOrder: i }, update: {} });
    ids.set(c.slug, row.id);
  }

  // ── Questions and services (once) ──
  if ((await db.faq.count()) === 0) await db.faq.createMany({ data: FAQS.map((f, i) => ({ ...f, sortOrder: i })) });
  if ((await db.pharmacyService.count()) === 0) {
    for (const s of SERVICES) await db.pharmacyService.create({ data: { slug: s.slug, title: s.title, summary: s.summary, description: s.description, benefits: s.benefits, action: s.action, ctaLabel: s.ctaLabel, icon: s.icon, sortOrder: s.sortOrder, confirmed: DEMO, isDemo: DEMO } });
  }

  // ── Health articles: drafts that need a pharmacist's review. In demonstration mode they are visible, with a notice. ──
  if ((await db.article.count()) === 0) {
    for (const [i, a] of ARTICLES.entries()) {
      await db.article.create({
        data: {
          slug: slugify(a.title), title: a.title, excerpt: a.excerpt, body: a.body, category: a.category, art: a.art, readMinutes: a.readMinutes, sources: a.sources as object,
          status: DEMO ? 'PUBLISHED' : 'DRAFT', needsReview: true, publishedAt: DEMO ? new Date(Date.now() - i * 86_400_000) : null,
        },
      });
    }
  }

  // ── Reset catalogue (24 products with real pack photographs) ──
  // Demonstration mode: published sample entries with sample stock. Live mode: drafts with no stock and an unconfirmed price,
  // so nothing reaches customers until the pharmacy has checked the details, confirmed the price and published it.
  // Existing products are never overwritten, except that CATALOGUE_SYNC=1 refreshes photographs and verification notes only.
  for (const p of RESET_CATALOGUE) {
    const info = {
      manufacturer: p.manufacturer, activeIngredients: p.activeIngredients, strength: p.strength, storage: p.storage, brandConfirmed: p.brandConfirmed,
      infoStatus: p.infoStatus, infoSource: p.infoSource, photo: p.photo, imageAlt: p.imageAlt, imageSource: p.imageSource, packMarket: p.packMarket,
      imageRights: p.photo ? ('CLIENT_SUPPLIED' as const) : ('NONE' as const),
    };
    const exists = await db.product.findUnique({ where: { sku: p.sku }, select: { id: true } });
    if (exists) { if (process.env.CATALOGUE_SYNC === '1') await db.product.update({ where: { id: exists.id }, data: { ...info, brand: p.brand } }); continue; }
    const created = await db.product.create({
      data: {
        sku: p.sku, slug: slugify(`${p.brand ?? ''} ${p.name}`), name: p.name, brand: p.brand, categoryId: ids.get(p.cat)!, summary: p.summary, packSize: p.packSize,
        description: p.description, howToUse: p.howToUse, warnings: p.warnings, ingredients: null, nafdacNumber: null,
        classification: p.cls, priceKobo: p.naira * 100, priceConfirmed: false, stock: 0, reorderLevel: p.reorder ?? 5,
        status: DEMO ? 'PUBLISHED' : 'DRAFT', featured: !!p.feat, isDemo: DEMO, art: p.art, tags: p.tags, ...info,
      },
    });
    if (DEMO && p.stock > 0) await db.$transaction([
      db.product.update({ where: { id: created.id }, data: { stock: p.stock } }),
      db.stockMovement.create({ data: { productId: created.id, delta: p.stock, reason: 'OPENING', balance: p.stock, note: 'Sample opening stock' } }),
    ]);
  }

  // ── Sample delivery zones and prescription-only samples: demonstration mode only ──
  if (DEMO) {
    for (const p of RX_SAMPLES) {
      if (await db.product.findUnique({ where: { sku: p.sku }, select: { id: true } })) continue;
      await db.product.create({ data: { sku: p.sku, slug: slugify(`${p.name} ${p.pack}`), name: p.name, categoryId: ids.get(p.cat)!, summary: p.summary, packSize: p.pack, description: p.summary, classification: p.cls ?? 'PRESCRIPTION', priceKobo: p.naira * 100, stock: p.stock, status: 'PUBLISHED', isDemo: true, art: p.art, tags: [] } });
    }
    if ((await db.deliveryZone.count()) === 0) await db.deliveryZone.createMany({ data: DEMO_ZONES });
    await db.coupon.upsert({ where: { code: 'DEMO10' }, create: { code: 'DEMO10', description: 'Demonstration code', kind: 'PERCENT', value: 10, minSubtotalKobo: 200_000 }, update: {} });
    if ((await db.promotion.count()) === 0) await db.promotion.create({ data: { title: 'Demo offer: 10% off your basket', body: 'Use code DEMO10 at checkout. This is a sample offer to show how promotions work.', ctaLabel: 'Shop now', ctaHref: '/shop', tone: 'GREEN', couponCode: 'DEMO10', visible: true } });
  }

  // ── Staff accounts ──
  const email = (process.env.SEED_ADMIN_EMAIL ?? '').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  const prod = process.env.NODE_ENV === 'production';
  if (email && password) { await upsertUser(email, 'Super Admin', 'SUPER_ADMIN', password); console.log(`Super Admin ready: ${email}`); }
  else if (!prod) { await upsertUser('admin@reset.local', 'Dev Super Admin', 'SUPER_ADMIN', 'DevPassword-123'); console.log('Development admin: admin@reset.local / DevPassword-123  (not created in production)'); }
  else console.log('No admin created. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, or run `npm run admin:create`.');
  if (!prod && process.env.SEED_DEMO_USERS === 'true') {
    const pw = 'DevPassword-123';
    await upsertUser('manager@reset.local', 'Dev Manager', 'MANAGER', pw);
    await upsertUser('pharmacist@reset.local', 'Dev Pharmacist', 'PHARMACIST', pw);
    await upsertUser('staff@reset.local', 'Dev Store Staff', 'STAFF', pw);
    await upsertUser('editor@reset.local', 'Dev Editor', 'EDITOR', pw);
    await upsertUser('customer@reset.local', 'Demo Customer', 'CUSTOMER', pw);
    console.log('Development staff and customer accounts created (password DevPassword-123).');
  }
  console.log(`Seed complete (${DEMO ? 'demonstration' : 'live'} mode).`);
}

async function upsertUser(email: string, name: string, role: 'SUPER_ADMIN' | 'MANAGER' | 'PHARMACIST' | 'STAFF' | 'EDITOR' | 'CUSTOMER', password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({ where: { email }, create: { email, name, role, passwordHash, emailVerifiedAt: new Date() }, update: {} });
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
