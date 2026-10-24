import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { db } from './db';
import { env } from './env';
import { isServable } from './scan';

/** Products shown on the public site: published, not prescription-only, and (in live mode) never sample items. */
export function publicProductWhere(extra: Prisma.ProductWhereInput = {}): Prisma.ProductWhereInput {
  return {
    status: 'PUBLISHED',
    classification: { not: 'PRESCRIPTION' },
    ...(env.SITE_MODE === 'live' ? { isDemo: false } : {}),
    category: { is: { visible: true } },
    ...extra,
  };
}

/** Units currently held by unpaid card checkouts that have not yet expired. */
export async function reservedUnits(productIds: string[]): Promise<Map<string, number>> {
  if (!productIds.length) return new Map();
  const rows = await db.$queryRaw<{ id: string; reserved: number }[]>`
    SELECT oi."productId" AS id, COALESCE(SUM(oi."quantity"), 0)::int AS reserved
    FROM "OrderItem" oi JOIN "Order" o ON o."id" = oi."orderId"
    WHERE o."status" = 'AWAITING_PAYMENT' AND o."expiresAt" > NOW() AND oi."productId" = ANY(${productIds})
    GROUP BY oi."productId"`;
  return new Map(rows.map((r) => [r.id, r.reserved]));
}

export const availableOf = (stock: number, reserved: number) => Math.max(0, stock - reserved);

export interface ProductCard {
  id: string; slug: string; name: string; brand: string | null; summary: string; packSize: string | null;
  priceKobo: number; compareAtKobo: number | null; available: number; classification: 'OTC' | 'PHARMACY_ONLY' | 'PRESCRIPTION';
  art: string; /** Public URL of the photograph (uploaded replacement first, then the bundled photo), or null while there is none */ image: string | null; imageAlt: string;
  categoryName: string; categorySlug: string; isDemo: boolean; featured: boolean;
}

export interface GalleryImage { src: string; alt: string }

type ImageFields = { name: string; brand: string | null; imageId: string | null; photo: string | null; gallery: string[]; imageAlt?: string | null };

/** The photograph for a product: an uploaded replacement that the scanner has cleared wins over the bundled photograph. */
export function productPhoto(p: ImageFields, servable: Set<string>): { src: string | null; alt: string } {
  const alt = `${p.brand ? `${p.brand} ` : ''}${p.name}: product pack`;
  if (p.imageId && servable.has(p.imageId)) return { src: `/media/${p.imageId}`, alt };
  return { src: p.photo, alt };
}

/** Primary photograph followed by any further photographs (bundled paths or cleared uploads). */
export function productGallery(p: ImageFields, servable: Set<string>): GalleryImage[] {
  const main = productPhoto(p, servable);
  const out: GalleryImage[] = main.src ? [{ src: main.src, alt: p.imageAlt || main.alt }] : [];
  p.gallery.forEach((g, i) => {
    const m = /^\/media\/([A-Za-z0-9_-]+)$/.exec(g);
    if (m && !servable.has(m[1]!)) return;
    out.push({ src: g, alt: `${main.alt.replace(/: product pack$/, '')}: photo ${i + 2}` });
  });
  return out;
}

const mediaIdsOf = (p: ImageFields) => [p.imageId, ...p.gallery.map((g) => /^\/media\/([A-Za-z0-9_-]+)$/.exec(g)?.[1])].filter((x): x is string => !!x);

type Row = Prisma.ProductGetPayload<{ include: { category: true } }>;

export async function toCards(rows: Row[]): Promise<ProductCard[]> {
  const reserved = await reservedUnits(rows.map((r) => r.id));
  const media = await servableMedia(rows.flatMap(mediaIdsOf));
  return rows.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, brand: p.brand, summary: p.summary, packSize: p.packSize,
    priceKobo: p.priceKobo, compareAtKobo: p.compareAtKobo && p.compareAtKobo > p.priceKobo ? p.compareAtKobo : null,
    available: availableOf(p.stock, reserved.get(p.id) ?? 0), classification: p.classification,
    art: p.art, image: productPhoto(p, media).src, imageAlt: p.imageAlt ?? productPhoto(p, media).alt,
    categoryName: p.category.name, categorySlug: p.category.slug, isDemo: p.isDemo, featured: p.featured,
  }));
}

/** Of these document ids, the ones that are published photographs the scanner has cleared. */
export async function servableMedia(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const docs = await db.document.findMany({ where: { id: { in: ids }, section: 'media', visibility: 'PUBLIC' }, select: { id: true, scanStatus: true } });
  return new Set(docs.filter((d) => isServable(d.scanStatus)).map((d) => d.id));
}

export interface ListQuery {
  category?: string; // slug (parent categories include their children)
  q?: string;
  min?: number; // kobo
  max?: number;
  inStock?: boolean;
  sort?: 'relevance' | 'new' | 'price-asc' | 'price-desc' | 'name';
  page?: number;
  pageSize?: number;
  featured?: boolean;
  onSale?: boolean;
}

export const SORTS: { value: NonNullable<ListQuery['sort']>; label: string }[] = [
  { value: 'relevance', label: 'Recommended' },
  { value: 'new', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

const terms = (q: string) => q.toLowerCase().split(/[^a-z0-9%]+/i).filter((t) => t.length >= 2).slice(0, 6);

export function searchWhere(q: string): Prisma.ProductWhereInput[] {
  return terms(q).map((t) => ({
    OR: [
      { name: { contains: t, mode: 'insensitive' } },
      { brand: { contains: t, mode: 'insensitive' } },
      { activeIngredients: { contains: t, mode: 'insensitive' } },
      { summary: { contains: t, mode: 'insensitive' } },
      { tags: { has: t } },
      { category: { is: { name: { contains: t, mode: 'insensitive' } } } },
    ],
  }));
}

export async function listProducts(query: ListQuery): Promise<{ items: ProductCard[]; total: number; page: number; pages: number }> {
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? 24));
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const and: Prisma.ProductWhereInput[] = [];
  if (query.category) {
    const cat = await db.category.findUnique({ where: { slug: query.category }, include: { children: { select: { id: true } } } });
    if (!cat) return { items: [], total: 0, page: 1, pages: 1 };
    and.push({ categoryId: { in: [cat.id, ...cat.children.map((c) => c.id)] } });
  }
  if (query.q) and.push(...searchWhere(query.q));
  if (query.min !== undefined) and.push({ priceKobo: { gte: query.min } });
  if (query.max !== undefined) and.push({ priceKobo: { lte: query.max } });
  if (query.inStock) and.push({ stock: { gt: 0 }, classification: 'OTC' });
  if (query.featured) and.push({ featured: true });
  if (query.onSale) and.push({ compareAtKobo: { not: null } });
  const where = publicProductWhere(and.length ? { AND: and } : {});
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    query.sort === 'price-asc' ? [{ priceKobo: 'asc' }] :
    query.sort === 'price-desc' ? [{ priceKobo: 'desc' }] :
    query.sort === 'name' ? [{ name: 'asc' }] :
    query.sort === 'new' ? [{ createdAt: 'desc' }] :
    [{ featured: 'desc' }, { name: 'asc' }];
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: { category: true } }),
  ]);
  return { items: await toCards(rows), total, page, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getProductBySlug(slug: string) {
  const p = await db.product.findFirst({ where: publicProductWhere({ slug }), include: { category: { include: { parent: true } } } });
  if (!p) return null;
  const [card] = await toCards([p]);
  const gallery = productGallery(p, await servableMedia(mediaIdsOf(p)));
  const siblings = p.groupKey ? await db.product.findMany({ where: publicProductWhere({ groupKey: p.groupKey, NOT: { id: p.id } }), include: { category: true }, orderBy: { priceKobo: 'asc' } }) : [];
  return { product: p, card: card!, gallery, siblings: await toCards(siblings) };
}

/** Same-category items that can be bought online come first; other categories fill any gap so the row is never thin. */
export async function relatedProducts(p: { id: string; categoryId: string }, take = 4) {
  const same = await db.product.findMany({ where: publicProductWhere({ categoryId: p.categoryId, NOT: { id: p.id } }), include: { category: true }, orderBy: [{ classification: 'asc' }, { featured: 'desc' }, { name: 'asc' }], take });
  const rows = [...same];
  if (rows.length < take) {
    const more = await db.product.findMany({ where: publicProductWhere({ id: { notIn: [p.id, ...rows.map((r) => r.id)] }, classification: 'OTC' }), include: { category: true }, orderBy: [{ featured: 'desc' }, { name: 'asc' }], take: take - rows.length });
    rows.push(...more);
  }
  return toCards(rows);
}

export interface CategoryNode { id: string; slug: string; name: string; blurb: string; art: string; count: number; children: CategoryNode[] }

/** Visible categories as a tree with product counts (counting only what the public can see). */
export async function categoryTree(): Promise<CategoryNode[]> {
  const cats = await db.category.findMany({ where: { visible: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  const counts = await db.product.groupBy({ by: ['categoryId'], where: publicProductWhere({ category: undefined }), _count: { _all: true } });
  const cm = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  const nodes = new Map<string, CategoryNode>(cats.map((c) => [c.id, { id: c.id, slug: c.slug, name: c.name, blurb: c.blurb, art: c.art, count: cm.get(c.id) ?? 0, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const c of cats) {
    const n = nodes.get(c.id)!;
    const parent = c.parentId ? nodes.get(c.parentId) : undefined;
    if (parent) { parent.children.push(n); parent.count += n.count; } else roots.push(n);
  }
  // Categories with nothing the public can see are left out of navigation and the shop filters
  const prune = (list: CategoryNode[]): CategoryNode[] => list.filter((n) => n.count > 0).map((n) => ({ ...n, children: prune(n.children) }));
  return prune(roots);
}

export async function suggest(q: string): Promise<{ products: { slug: string; name: string; priceKobo: number; classification: string; packSize: string | null }[]; categories: { slug: string; name: string }[] }> {
  const t = terms(q);
  if (!t.length) return { products: [], categories: [] };
  const products = await db.product.findMany({ where: publicProductWhere({ AND: searchWhere(q) }), select: { slug: true, name: true, priceKobo: true, classification: true, packSize: true }, orderBy: [{ featured: 'desc' }, { name: 'asc' }], take: 6 });
  const categories = await db.category.findMany({ where: { visible: true, OR: t.map((x) => ({ name: { contains: x, mode: 'insensitive' as const } })) }, select: { slug: true, name: true }, take: 3 });
  return { products, categories };
}

export interface LowStockRow { id: string; sku: string; name: string; stock: number; reorderLevel: number }
export async function lowStock(limit = 100): Promise<LowStockRow[]> {
  const demo = env.SITE_MODE === 'live' ? Prisma.sql`AND "isDemo" = false` : Prisma.empty;
  return db.$queryRaw<LowStockRow[]>(Prisma.sql`SELECT "id", "sku", "name", "stock", "reorderLevel" FROM "Product" WHERE "stock" <= "reorderLevel" AND "classification" <> 'PRESCRIPTION' ${demo} ORDER BY ("stock" - "reorderLevel") ASC, "name" ASC LIMIT ${limit}`);
}
