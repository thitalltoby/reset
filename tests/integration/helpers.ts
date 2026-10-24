import bcrypt from 'bcryptjs';
import { db } from '@/server/db';
import { setSetting, DEFAULTS, type ShopSettings } from '@/server/settings';
import type { Role } from '@/generated/prisma/enums';

/** Empty every table in the dedicated test database. Refuses to run against anything that is not the test database. */
export async function resetDb() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/reset_test/.test(url)) throw new Error(`Refusing to reset a database that is not the test database: ${url.replace(/:[^@]*@/, ':***@')}`);
  const rows = await db.$queryRawUnsafe<{ tablename: string }[]>(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '\\_prisma%'`);
  if (rows.length) await db.$executeRawUnsafe(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

let n = 0;
export const PASSWORD = 'Test-Password-2026';
let hash: string | undefined;

export async function makeUser(role: Role, over: Partial<{ email: string; name: string; verified: boolean; isActive: boolean }> = {}) {
  hash ??= await bcrypt.hash(PASSWORD, 4);
  n++;
  return db.user.create({
    data: {
      email: over.email ?? `${role.toLowerCase()}.${n}@example.test`,
      name: over.name ?? `${role} ${n}`,
      passwordHash: hash,
      role,
      emailVerifiedAt: over.verified === false ? null : new Date(),
      isActive: over.isActive ?? true,
    },
  });
}

export const principal = (u: { id: string; name: string; email: string; role: Role }) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

/** Shop switched fully on (the defaults are everything off until the pharmacy chooses). */
export async function openShop(over: Partial<ShopSettings> = {}) {
  await setSetting('shop', { ...DEFAULTS.shop, delivery: true, pickup: true, payOnDelivery: true, paystack: true, prescriptions: true, ...over });
}

let p = 0;
export async function makeProduct(over: Partial<{ name: string; priceKobo: number; stock: number; classification: 'OTC' | 'PHARMACY_ONLY' | 'PRESCRIPTION'; status: 'DRAFT' | 'PUBLISHED'; maxPerOrder: number; isDemo: boolean; categoryVisible: boolean }> = {}) {
  p++;
  const cat = await db.category.upsert({ where: { slug: over.categoryVisible === false ? 'hidden' : 'pain' }, create: { slug: over.categoryVisible === false ? 'hidden' : 'pain', name: 'Pain', visible: over.categoryVisible !== false }, update: {} });
  return db.product.create({
    data: {
      slug: `product-${p}`, sku: `SKU-${p}`, name: over.name ?? `Product ${p}`, categoryId: cat.id, summary: 'Test product',
      priceKobo: over.priceKobo ?? 100_000, stock: over.stock ?? 10, classification: over.classification ?? 'OTC',
      tags: [], status: over.status ?? 'PUBLISHED', maxPerOrder: over.maxPerOrder ?? 10, isDemo: over.isDemo ?? true,
    },
  });
}

export async function makeZone(over: Partial<{ feeKobo: number; freeOverKobo: number | null }> = {}) {
  return db.deliveryZone.create({ data: { name: 'Zone A', feeKobo: over.feeKobo ?? 150_000, freeOverKobo: over.freeOverKobo === undefined ? null : over.freeOverKobo, active: true } });
}

export const customer = { name: 'Ada Okafor', email: 'ada@example.test', phone: '+234 800 000 0001' };
