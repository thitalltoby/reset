import 'server-only';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import type { ProductClass, PublishStatus } from '@/generated/prisma/enums';
import { db } from './db';
import { audit } from './audit';
import { conflict, invalid, notFound } from './errors';
import { assertCan, actorOf, type Principal } from './rbac';
import { moveStock, alertLowStock } from './orders';
import { checkImageId } from './media';
import { slugify } from '@/lib/format';
import { parseNairaToKobo } from '@/lib/money';
import { fieldErrors } from '@/lib/validation';

// ─── Admin lists ───────────────────────────────────────────────────

export interface AdminProductFilter { q?: string; category?: string; status?: string; classification?: string; stock?: 'low' | 'out'; page?: number }

export async function adminListProducts(user: Principal, f: AdminProductFilter = {}) {
  assertCan(user, 'product.view');
  const q = f.q?.trim();
  const where: Prisma.ProductWhereInput = {
    ...(f.category ? { categoryId: f.category } : {}),
    ...(f.status ? { status: f.status as PublishStatus } : {}),
    ...(f.classification ? { classification: f.classification as ProductClass } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }, { barcode: { contains: q } }, { brand: { contains: q, mode: 'insensitive' } }] } : {}),
  };
  const page = Math.max(1, f.page ?? 1);
  const all = await db.product.findMany({ where, include: { category: { select: { name: true } } }, orderBy: [{ name: 'asc' }], skip: (page - 1) * 50, take: 50 });
  const rows = f.stock === 'out' ? all.filter((p) => p.stock <= 0) : f.stock === 'low' ? all.filter((p) => p.stock <= p.reorderLevel) : all;
  return { rows, total: await db.product.count({ where }), page, pages: Math.max(1, Math.ceil((await db.product.count({ where })) / 50)) };
}

export const adminGetProduct = (user: Principal, id: string) => { assertCan(user, 'product.view'); return db.product.findUnique({ where: { id }, include: { category: true } }); };
export const adminCategories = () => db.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: true } }, parent: { select: { name: true } } } });

// ─── Save a product ────────────────────────────────────────────────

const bool = z.boolean().default(false);
const productSchema = z.object({
  name: z.string().trim().min(2, 'Enter the product name.').max(160),
  slug: z.string().trim().max(120).optional().default(''),
  sku: z.string().trim().min(2, 'Enter a stock code (SKU).').max(40).regex(/^[A-Za-z0-9._\-/]+$/, 'Letters, numbers and . _ - / only.'),
  barcode: z.string().trim().max(40).optional().default(''),
  brand: z.string().trim().max(80).optional().default(''),
  categoryId: z.string().min(1, 'Choose a category.'),
  summary: z.string().trim().min(10, 'Write a one-line summary (at least 10 characters).').max(240),
  description: z.string().trim().max(10000).default(''),
  howToUse: z.string().trim().max(3000).optional().default(''),
  warnings: z.string().trim().max(3000).optional().default(''),
  ingredients: z.string().trim().max(3000).optional().default(''),
  nafdacNumber: z.string().trim().max(40).optional().default(''),
  classification: z.enum(['OTC', 'PHARMACY_ONLY', 'PRESCRIPTION']).default('OTC'),
  packSize: z.string().trim().max(60).optional().default(''),
  groupKey: z.string().trim().max(60).optional().default(''),
  price: z.string().trim().min(1, 'Enter the price.'),
  compareAt: z.string().trim().optional().default(''),
  reorderLevel: z.coerce.number().int().min(0).max(100000).default(5),
  maxPerOrder: z.coerce.number().int().min(1).max(1000).default(10),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  featured: bool,
  art: z.string().trim().max(30).default('pill'),
  image: z.string().optional().default(''),
  tags: z.string().default(''),
  manufacturer: z.string().trim().max(120).optional().default(''),
  activeIngredients: z.string().trim().max(600).optional().default(''),
  strength: z.string().trim().max(120).optional().default(''),
  storage: z.string().trim().max(400).optional().default(''),
  brandConfirmed: bool,
  infoStatus: z.enum(['AWAITING', 'PROVISIONAL', 'VERIFIED']).default('AWAITING'),
  infoSource: z.string().trim().max(1500).optional().default(''),
  imageAlt: z.string().trim().max(200).optional().default(''),
  imageSource: z.string().trim().max(600).optional().default(''),
  imageRights: z.enum(['NONE', 'CLIENT_SUPPLIED', 'MANUFACTURER_APPROVED', 'LICENSED', 'OWN_PHOTO']).default('NONE'),
  packMarket: z.string().trim().max(120).optional().default(''),
  priceConfirmed: bool,
  /** Further photographs: bundled paths or /media/<id> links */
  gallery: z.array(z.string().regex(/^(\/products\/[A-Za-z0-9._-]+\.(webp|jpe?g|png)|\/media\/[A-Za-z0-9_-]+)$/, 'Not a valid picture link.')).max(8).default([]),
});

export async function saveProduct(user: Principal, id: string | null, raw: unknown) {
  assertCan(user, 'product.manage');
  const p = productSchema.safeParse(raw);
  if (!p.success) throw invalid('Please check the highlighted fields.', fieldErrors(p.error));
  const d = p.data;
  const price = parseNairaToKobo(d.price);
  if (price === null || price <= 0) throw invalid('Enter the price in naira, for example 1,500 or 1500.50.', { price: 'Enter a price above zero.' });
  const compare = d.compareAt ? parseNairaToKobo(d.compareAt) : null;
  if (d.compareAt && (compare === null || compare <= price)) throw invalid('The “was” price must be higher than the price.', { compareAt: 'Must be higher than the price.' });
  const cat = await db.category.findUnique({ where: { id: d.categoryId } });
  if (!cat) throw invalid('Choose a category.', { categoryId: 'Not found.' });
  const slug = slugify(d.slug || `${d.name} ${d.packSize}`);
  const clash = await db.product.findFirst({ where: { OR: [{ slug }, { sku: d.sku }], ...(id ? { NOT: { id } } : {}) }, select: { slug: true, sku: true } });
  if (clash) throw conflict(clash.sku === d.sku ? 'Another product already uses that stock code (SKU).' : 'Another product already uses that web address. Change the name, pack size or address.');
  const imageId = await checkImageId(d.image);
  const before = id ? await db.product.findUnique({ where: { id }, select: { isDemo: true, photo: true } }) : null;
  if (d.status === 'PUBLISHED' && !before?.isDemo && !d.priceConfirmed) throw invalid('Confirm the price before publishing. Tick “Price confirmed” once a manager has checked it.', { priceConfirmed: 'Confirm the price first.' });
  if (d.infoStatus === 'VERIFIED' && d.infoSource.length < 10) throw invalid('Say where the label information was checked (leaflet, pack or regulator record).', { infoSource: 'Required when information is marked verified.' });
  const hasPhoto = !!imageId || !!before?.photo || d.gallery.length > 0;
  if (hasPhoto && d.imageRights === 'NONE') throw invalid('Say where the photograph came from and whether you may use it.', { imageRights: 'Choose the photo permission.' });
  const tags = d.tags.split(/[,\n]/).map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20);
  const data = {
    name: d.name, slug, sku: d.sku, barcode: d.barcode || null, brand: d.brand || null, categoryId: d.categoryId, summary: d.summary, description: d.description,
    howToUse: d.howToUse || null, warnings: d.warnings || null, ingredients: d.ingredients || null, nafdacNumber: d.nafdacNumber || null,
    classification: d.classification as ProductClass, packSize: d.packSize || null, groupKey: d.groupKey || null, priceKobo: price, compareAtKobo: compare,
    reorderLevel: d.reorderLevel, maxPerOrder: d.maxPerOrder, status: d.status as PublishStatus, featured: d.featured, art: d.art, imageId, tags,
    manufacturer: d.manufacturer || null, activeIngredients: d.activeIngredients || null, strength: d.strength || null, storage: d.storage || null, brandConfirmed: d.brandConfirmed,
    infoStatus: d.infoStatus, infoSource: d.infoSource || null, imageAlt: d.imageAlt || null, imageSource: d.imageSource || null, imageRights: d.imageRights, packMarket: d.packMarket || null,
    priceConfirmed: d.priceConfirmed, gallery: d.gallery,
  };
  const row = id
    ? await db.product.update({ where: { id }, data })
    : await db.product.create({ data });
  await audit(actorOf(user), id ? 'product.updated' : 'product.created', 'Product', row.id, { sku: row.sku, status: row.status, price: row.priceKobo, priceConfirmed: row.priceConfirmed, info: row.infoStatus, imageRights: row.imageRights });
  return row;
}

export async function setProductsStatus(user: Principal, ids: string[], status: PublishStatus) {
  assertCan(user, 'product.manage');
  if (!ids.length) throw invalid('Select at least one product.');
  if (status === 'PUBLISHED') {
    const unpriced = await db.product.findMany({ where: { id: { in: ids }, isDemo: false, priceConfirmed: false }, select: { name: true }, take: 5 });
    if (unpriced.length) throw invalid(`Confirm the price before publishing: ${unpriced.map((p) => p.name).join(', ')}${unpriced.length === 5 ? ' and others' : ''}. Open each product and tick “Price confirmed”.`);
  }
  const r = await db.product.updateMany({ where: { id: { in: ids } }, data: { status } });
  await audit(actorOf(user), 'product.status', 'Product', null, { count: r.count, status });
  return r.count;
}

export async function deleteProduct(user: Principal, id: string): Promise<string> {
  assertCan(user, 'product.manage');
  const used = await db.orderItem.count({ where: { productId: id } });
  if (used > 0) {
    await db.product.update({ where: { id }, data: { status: 'DRAFT' } });
    await audit(actorOf(user), 'product.unpublished', 'Product', id, { reason: 'has orders' });
    return 'This product appears on past orders, so it was taken off the shop instead of deleted.';
  }
  await db.product.delete({ where: { id } }).catch(() => { throw notFound('Product not found.'); });
  await audit(actorOf(user), 'product.deleted', 'Product', id);
  return 'Product deleted.';
}

// ─── Categories ────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Enter a name.').max(60), slug: z.string().trim().max(60).optional().default(''), blurb: z.string().trim().max(160).default(''),
  art: z.string().trim().max(30).default('pill'), parentId: z.string().optional().default(''), sortOrder: z.coerce.number().int().min(0).max(999).default(0), visible: bool,
});
export async function saveCategory(user: Principal, id: string | null, raw: unknown) {
  assertCan(user, 'product.manage');
  const p = categorySchema.safeParse(raw);
  if (!p.success) throw invalid('Please check the highlighted fields.', fieldErrors(p.error));
  const d = p.data;
  const slug = slugify(d.slug || d.name);
  if (await db.category.findFirst({ where: { slug, ...(id ? { NOT: { id } } : {}) } })) throw conflict('Another category already uses that web address.');
  if (d.parentId) {
    if (d.parentId === id) throw invalid('A category cannot be its own parent.');
    const parent = await db.category.findUnique({ where: { id: d.parentId } });
    if (!parent || parent.parentId) throw invalid('Choose a top-level category as the parent (categories go two levels deep).');
    if (id && (await db.category.count({ where: { parentId: id } })) > 0) throw invalid('This category has sub-categories, so it cannot be placed under another one.');
  }
  const data = { name: d.name, slug, blurb: d.blurb, art: d.art, parentId: d.parentId || null, sortOrder: d.sortOrder, visible: d.visible };
  const row = id ? await db.category.update({ where: { id }, data }) : await db.category.create({ data });
  await audit(actorOf(user), id ? 'category.updated' : 'category.created', 'Category', row.id, { name: row.name });
}
export async function deleteCategory(user: Principal, id: string) {
  assertCan(user, 'product.manage');
  if ((await db.product.count({ where: { categoryId: id } })) > 0) throw conflict('This category still has products. Move or remove them first.');
  if ((await db.category.count({ where: { parentId: id } })) > 0) throw conflict('This category has sub-categories. Remove them first.');
  await db.category.delete({ where: { id } }).catch(() => { throw notFound('Category not found.'); });
  await audit(actorOf(user), 'category.deleted', 'Category', id);
}

// ─── Stock ─────────────────────────────────────────────────────────

export const STOCK_REASONS = [
  { value: 'RESTOCK', label: 'Stock received', sign: 1 },
  { value: 'RETURN', label: 'Customer return', sign: 1 },
  { value: 'DAMAGE', label: 'Damaged or expired', sign: -1 },
  { value: 'ADJUSTMENT', label: 'Count correction', sign: 0 },
] as const;

/** Add or remove units, or set the counted quantity. Every change is written to the stock history. */
export async function adjustStock(user: Principal, productId: string, input: { mode: 'add' | 'set'; quantity: number; reason: string; note?: string }) {
  assertCan(user, 'inventory.manage');
  if (!Number.isInteger(input.quantity) || input.quantity < 0 || input.quantity > 1_000_000) throw invalid('Enter a whole number of units.', { quantity: 'Whole number, 0 or more.' });
  const reason = STOCK_REASONS.find((r) => r.value === input.reason);
  if (!reason) throw invalid('Choose a reason.', { reason: 'Required.' });
  if ((input.reason === 'DAMAGE' || input.reason === 'ADJUSTMENT') && !input.note?.trim()) throw invalid('Add a short note so the history makes sense later.', { note: 'Required.' });
  const balance = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
    const p = await tx.product.findUnique({ where: { id: productId }, select: { stock: true } });
    if (!p) throw notFound('Product not found.');
    const delta = input.mode === 'set' ? input.quantity - p.stock : reason.sign < 0 ? -input.quantity : input.quantity;
    if (delta === 0) throw invalid('That does not change the stock.');
    if (p.stock + delta < 0) throw invalid(`There are only ${p.stock} in stock.`, { quantity: 'More than is in stock.' });
    return moveStock(tx, { productId, delta, reason: input.mode === 'set' ? 'ADJUSTMENT' : input.reason, note: input.note?.trim() || undefined, actor: actorOf(user) });
  });
  await audit(actorOf(user), 'stock.adjusted', 'Product', productId, { mode: input.mode, quantity: input.quantity, reason: input.reason, balance });
  await alertLowStock([productId]);
  return balance;
}

export async function stockHistory(user: Principal, productId: string, take = 60) {
  assertCan(user, 'inventory.manage');
  return db.stockMovement.findMany({ where: { productId }, orderBy: { createdAt: 'desc' }, take });
}

// ─── CSV import / export ───────────────────────────────────────────

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inQ) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(field); field = ''; if (row.some((x) => x.trim() !== '')) rows.push(row); row = []; }
    else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

export const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  // Cells that start with = + - @ can run as formulas when the file is opened in a spreadsheet
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const PRODUCT_CSV_COLUMNS = ['sku', 'name', 'brand', 'category', 'summary', 'description', 'price', 'compare_at', 'stock', 'reorder_level', 'classification', 'pack_size', 'barcode', 'nafdac_number', 'status', 'featured', 'tags'] as const;
export const PRODUCT_CSV_TEMPLATE = `${PRODUCT_CSV_COLUMNS.join(',')}\nEXAMPLE-001,Example Product 500mg,Example Brand,first-aid,A short one-line summary of the product,Longer description,1500,,20,5,OTC,Pack of 20,,,DRAFT,no,"example, sample"\n`;

export async function exportProductsCsv(user: Principal): Promise<string> {
  assertCan(user, 'product.view');
  const rows = await db.product.findMany({ include: { category: { select: { slug: true } } }, orderBy: { sku: 'asc' } });
  const out = [PRODUCT_CSV_COLUMNS.join(',')];
  for (const p of rows) out.push([p.sku, p.name, p.brand, p.category.slug, p.summary, p.description, (p.priceKobo / 100).toFixed(2), p.compareAtKobo ? (p.compareAtKobo / 100).toFixed(2) : '', p.stock, p.reorderLevel, p.classification, p.packSize, p.barcode, p.nafdacNumber, p.status, p.featured ? 'yes' : 'no', p.tags.join(', ')].map(csvCell).join(','));
  return out.join('\r\n') + '\r\n';
}

export interface ImportRow { line: number; sku: string; action: 'create' | 'update'; errors: string[] }
export interface ImportReport { rows: ImportRow[]; created: number; updated: number; errors: number; applied: boolean }

/** Validate every row first; nothing is written unless every row is valid (and `apply` is true). */
export async function importProductsCsv(user: Principal, text: string, apply: boolean): Promise<ImportReport> {
  assertCan(user, 'product.manage');
  if (text.length > 5_000_000) throw invalid('The file is too large. Split it into smaller files.');
  const table = parseCsv(text);
  if (table.length < 2) throw invalid('The file has no product rows.');
  const header = table[0]!.map((h) => h.trim().toLowerCase());
  const missing = ['sku', 'name', 'category', 'summary', 'price'].filter((c) => !header.includes(c));
  if (missing.length) throw invalid(`The first row must contain the columns: ${missing.join(', ')}. Download the template to see them all.`);
  if (table.length > 5001) throw invalid('At most 5,000 rows per import.');
  const col = (r: string[], name: string) => (r[header.indexOf(name)] ?? '').trim();
  const cats = await db.category.findMany();
  const catBy = new Map<string, string>();
  for (const c of cats) { catBy.set(c.slug.toLowerCase(), c.id); catBy.set(c.name.toLowerCase(), c.id); }
  const existing = new Map((await db.product.findMany({ select: { id: true, sku: true, stock: true, slug: true } })).map((p) => [p.sku.toLowerCase(), p]));
  const usedSlugs = new Set((await db.product.findMany({ select: { slug: true } })).map((p) => p.slug));
  const seen = new Set<string>();
  const report: ImportReport = { rows: [], created: 0, updated: 0, errors: 0, applied: false };
  const plans: { data: Prisma.ProductUncheckedCreateInput; id?: string; stock: number | null; oldStock: number }[] = [];
  for (let i = 1; i < table.length; i++) {
    const r = table[i]!;
    const errors: string[] = [];
    const sku = col(r, 'sku');
    const found = existing.get(sku.toLowerCase());
    if (!sku) errors.push('Missing SKU');
    else if (seen.has(sku.toLowerCase())) errors.push('SKU appears twice in this file');
    seen.add(sku.toLowerCase());
    const name = col(r, 'name'); if (name.length < 2) errors.push('Missing name');
    const summary = col(r, 'summary'); if (summary.length < 10) errors.push('Summary needs at least 10 characters');
    const categoryId = catBy.get(col(r, 'category').toLowerCase()); if (!categoryId) errors.push(`Unknown category “${col(r, 'category')}”`);
    const price = parseNairaToKobo(col(r, 'price')); if (price === null || price <= 0) errors.push('Price must be above zero');
    const compareRaw = col(r, 'compare_at'); const compare = compareRaw ? parseNairaToKobo(compareRaw) : null;
    if (compareRaw && (compare === null || (price !== null && compare <= price))) errors.push('compare_at must be higher than the price');
    const stockRaw = col(r, 'stock'); const stock = stockRaw === '' ? null : Number(stockRaw);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) errors.push('Stock must be a whole number');
    const reorder = col(r, 'reorder_level') === '' ? 5 : Number(col(r, 'reorder_level')); if (!Number.isInteger(reorder) || reorder < 0) errors.push('reorder_level must be a whole number');
    const cls = (col(r, 'classification') || 'OTC').toUpperCase(); if (!['OTC', 'PHARMACY_ONLY', 'PRESCRIPTION'].includes(cls)) errors.push('classification must be OTC, PHARMACY_ONLY or PRESCRIPTION');
    const status = (col(r, 'status') || 'DRAFT').toUpperCase(); if (!['DRAFT', 'PUBLISHED'].includes(status)) errors.push('status must be DRAFT or PUBLISHED');
    if (!found && stock === null) errors.push('New products need a stock number');
    if (errors.length === 0 && categoryId && price !== null) {
      let slug = found?.slug ?? slugify(`${name} ${col(r, 'pack_size')}`);
      if (!found) { let n = 2; const base = slug; while (usedSlugs.has(slug)) slug = `${base}-${n++}`; usedSlugs.add(slug); }
      plans.push({
        id: found?.id, stock, oldStock: found?.stock ?? 0,
        data: {
          sku, slug, name, brand: col(r, 'brand') || null, categoryId, summary, description: col(r, 'description'), priceKobo: price, compareAtKobo: compare,
          priceConfirmed: true, reorderLevel: reorder, classification: cls as ProductClass, packSize: col(r, 'pack_size') || null, barcode: col(r, 'barcode') || null, nafdacNumber: col(r, 'nafdac_number') || null,
          status: status as PublishStatus, featured: /^(yes|true|1|y)$/i.test(col(r, 'featured')), tags: col(r, 'tags').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
        },
      });
    }
    report.rows.push({ line: i + 1, sku, action: found ? 'update' : 'create', errors });
    if (errors.length) report.errors++; else if (found) report.updated++; else report.created++;
  }
  if (apply && report.errors === 0) {
    await db.$transaction(async (tx) => {
      for (const p of plans) {
        if (p.id) {
          await tx.product.update({ where: { id: p.id }, data: p.data });
          if (p.stock !== null && p.stock !== p.oldStock) await moveStock(tx, { productId: p.id, delta: p.stock - p.oldStock, reason: 'ADJUSTMENT', note: 'Spreadsheet import', actor: actorOf(user) });
        } else {
          const created = await tx.product.create({ data: { ...p.data, stock: 0 } });
          if (p.stock) await moveStock(tx, { productId: created.id, delta: p.stock, reason: 'OPENING', note: 'Spreadsheet import', actor: actorOf(user) });
        }
      }
    }, { timeout: 60_000, maxWait: 10_000 });
    await audit(actorOf(user), 'product.imported', 'Product', null, { created: report.created, updated: report.updated });
    report.applied = true;
  }
  return report;
}
