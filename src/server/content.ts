import 'server-only';
import { z } from 'zod';
import { db } from './db';
import { env } from './env';
import { audit } from './audit';
import { conflict, invalid, notFound } from './errors';
import { assertCan, actorOf, type Principal } from './rbac';
import { slugify } from '@/lib/format';
import { checkImageId } from './media';
import { fieldErrors } from '@/lib/validation';

// ─── Public reads ──────────────────────────────────────────────────

const live = () => env.SITE_MODE === 'live';

/** Services appear only after the pharmacy has confirmed it provides them. */
export const getServices = () => db.pharmacyService.findMany({ where: { confirmed: true, ...(live() ? { isDemo: false } : {}) }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
export const getServiceBySlug = (slug: string) => db.pharmacyService.findFirst({ where: { slug, confirmed: true, ...(live() ? { isDemo: false } : {}) } });

/** Health articles are public once published; in live mode only after a named reviewer has signed them off. */
export function publicArticleWhere() {
  return { status: 'PUBLISHED' as const, publishedAt: { lte: new Date() }, ...(live() ? { needsReview: false } : {}) };
}
export const getArticles = (take = 60, category?: string) => db.article.findMany({ where: { ...publicArticleWhere(), ...(category ? { category } : {}) }, orderBy: { publishedAt: 'desc' }, take });
export const getArticleBySlug = (slug: string) => db.article.findFirst({ where: { ...publicArticleWhere(), slug } });
export const getArticleCategories = async () => (await db.article.groupBy({ by: ['category'], where: publicArticleWhere(), _count: { _all: true } })).map((g) => ({ name: g.category, count: g._count._all })).sort((a, b) => a.name.localeCompare(b.name));
export const getFaqs = () => db.faq.findMany({ where: { visible: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
export const getTestimonials = () => db.testimonial.findMany({ where: { approved: true }, orderBy: { sortOrder: 'asc' }, take: 12 });
export function getPromotions() {
  const now = new Date();
  return db.promotion.findMany({
    where: { visible: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
    orderBy: { sortOrder: 'asc' }, take: 6,
  });
}

export interface ArticleSource { title: string; url: string }
export function articleSources(a: { sources: unknown }): ArticleSource[] {
  return Array.isArray(a.sources) ? (a.sources as unknown[]).filter((s): s is ArticleSource => !!s && typeof (s as ArticleSource).title === 'string' && typeof (s as ArticleSource).url === 'string') : [];
}

// ─── Helpers ───────────────────────────────────────────────────────

const bad = (e: z.ZodError) => invalid('Please check the highlighted fields.', fieldErrors(e));
const lines = (s: string) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const num = (max = 9999) => z.coerce.number().int().min(0).max(max).default(0);
const date = z.string().trim().optional().or(z.literal('')).transform((v) => (v ? new Date(`${v}T00:00:00+01:00`) : null)).refine((d) => d === null || !Number.isNaN(d.getTime()), 'Enter a valid date.');

async function uniqueSlug(model: 'pharmacyService' | 'article', base: string, id: string | null) {
  const slug = slugify(base);
  if (!slug) throw invalid('Enter a title.');
  const clash = await (db[model] as unknown as { findFirst(a: object): Promise<unknown> }).findFirst({ where: { slug, ...(id ? { NOT: { id } } : {}) } });
  if (clash) throw conflict('Another item already uses that web address. Change the title or the address.');
  return slug;
}

// ─── Services ──────────────────────────────────────────────────────

const serviceSchema = z.object({
  title: z.string().trim().min(3, 'Enter a name.').max(120),
  slug: z.string().trim().max(80).optional().default(''),
  summary: z.string().trim().min(10, 'Write a short summary.').max(300),
  description: z.string().trim().max(8000).default(''),
  benefits: z.string().default(''),
  conditions: z.string().trim().max(1000).optional().default(''),
  action: z.enum(['ENQUIRY', 'PRESCRIPTION', 'CONTACT']).default('ENQUIRY'),
  ctaLabel: z.string().trim().min(2).max(40).default('Ask about this service'),
  icon: z.string().trim().max(30).default('pill'),
  confirmed: z.boolean().default(false),
  sortOrder: num(999),
});

export async function saveService(user: Principal, id: string | null, raw: unknown) {
  assertCan(user, 'content.manage');
  const p = serviceSchema.safeParse(raw);
  if (!p.success) throw bad(p.error);
  const d = p.data;
  const data = { title: d.title, slug: await uniqueSlug('pharmacyService', d.slug || d.title, id), summary: d.summary, description: d.description, benefits: lines(d.benefits).slice(0, 12), conditions: d.conditions || null, action: d.action, ctaLabel: d.ctaLabel, icon: d.icon, confirmed: d.confirmed, sortOrder: d.sortOrder };
  const row = id ? await db.pharmacyService.update({ where: { id }, data }) : await db.pharmacyService.create({ data });
  await audit(actorOf(user), id ? 'service.updated' : 'service.created', 'PharmacyService', row.id, { title: row.title, confirmed: row.confirmed });
  return row;
}

export async function deleteService(user: Principal, id: string) {
  assertCan(user, 'content.manage');
  await db.pharmacyService.delete({ where: { id } }).catch(() => { throw notFound('Service not found.'); });
  await audit(actorOf(user), 'service.deleted', 'PharmacyService', id);
}

// ─── Articles ──────────────────────────────────────────────────────

const articleSchema = z.object({
  title: z.string().trim().min(5, 'Enter a title.').max(160),
  slug: z.string().trim().max(100).optional().default(''),
  excerpt: z.string().trim().min(20, 'Write a short summary (at least 20 characters).').max(300),
  body: z.string().trim().min(100, 'The article needs a body (at least 100 characters).').max(40000),
  category: z.string().trim().min(2).max(60).default('Everyday health'),
  art: z.string().trim().max(30).default('leaf'),
  image: z.string().optional().default(''),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  needsReview: z.boolean().default(true),
  reviewedBy: z.string().trim().max(120).optional().default(''),
  readMinutes: z.coerce.number().int().min(1).max(60).default(4),
  sources: z.string().default(''),
});

/** One source per line: "Title | https://address". */
export function parseSources(text: string): ArticleSource[] {
  return lines(text).slice(0, 12).map((l) => {
    const [title, url] = l.split('|').map((x) => x.trim());
    if (!title || !url || !/^https:\/\/[^\s]+$/.test(url)) throw invalid(`Each source needs a title and an https address, separated by “|”. Check: “${l.slice(0, 60)}”.`, { sources: 'Format: Title | https://address' });
    return { title, url };
  });
}

export async function saveArticle(user: Principal, id: string | null, raw: unknown) {
  assertCan(user, 'content.manage');
  const p = articleSchema.safeParse(raw);
  if (!p.success) throw bad(p.error);
  const d = p.data;
  if (!d.needsReview && !d.reviewedBy) throw invalid('Name the pharmacist or health professional who reviewed this article before marking it reviewed.', { reviewedBy: 'Required once reviewed.' });
  const prev = id ? await db.article.findUnique({ where: { id } }) : null;
  const imageId = await checkImageId(d.image);
  const sources = parseSources(d.sources);
  const publishing = d.status === 'PUBLISHED';
  const data = {
    title: d.title, slug: await uniqueSlug('article', d.slug || d.title, id), excerpt: d.excerpt, body: d.body, category: d.category, art: d.art, imageId,
    status: d.status, needsReview: d.needsReview, reviewedBy: d.needsReview ? null : d.reviewedBy,
    reviewedAt: d.needsReview ? null : prev?.reviewedAt && prev.reviewedBy === d.reviewedBy ? prev.reviewedAt : new Date(),
    readMinutes: d.readMinutes, sources: sources as unknown as object,
    publishedAt: publishing ? (prev?.publishedAt ?? new Date()) : null,
  };
  const row = id ? await db.article.update({ where: { id }, data }) : await db.article.create({ data });
  await audit(actorOf(user), id ? 'article.updated' : 'article.created', 'Article', row.id, { status: d.status, reviewed: !d.needsReview });
  return row;
}

export async function deleteArticle(user: Principal, id: string) {
  assertCan(user, 'content.manage');
  await db.article.delete({ where: { id } }).catch(() => { throw notFound('Article not found.'); });
  await audit(actorOf(user), 'article.deleted', 'Article', id);
}

// ─── FAQs, testimonials, promotions ────────────────────────────────

const faqSchema = z.object({ question: z.string().trim().min(5, 'Enter the question.').max(200), answer: z.string().trim().min(5, 'Enter the answer.').max(3000), category: z.string().trim().min(2).max(40).default('General'), sortOrder: num(999), visible: z.boolean().default(true) });
export async function saveFaq(user: Principal, id: string | null, raw: unknown) {
  assertCan(user, 'content.manage');
  const p = faqSchema.safeParse(raw);
  if (!p.success) throw bad(p.error);
  const row = id ? await db.faq.update({ where: { id }, data: p.data }) : await db.faq.create({ data: p.data });
  await audit(actorOf(user), id ? 'faq.updated' : 'faq.created', 'Faq', row.id);
}
export async function deleteFaq(user: Principal, id: string) { assertCan(user, 'content.manage'); await db.faq.delete({ where: { id } }).catch(() => undefined); await audit(actorOf(user), 'faq.deleted', 'Faq', id); }

const testimonialSchema = z.object({ name: z.string().trim().min(2, 'Enter the customer’s name.').max(80), detail: z.string().trim().max(80).optional().default(''), quote: z.string().trim().min(10, 'Enter what they said.').max(600), approved: z.boolean().default(false), sortOrder: num(999) });
export async function saveTestimonial(user: Principal, id: string | null, raw: unknown) {
  assertCan(user, 'content.manage');
  const p = testimonialSchema.safeParse(raw);
  if (!p.success) throw bad(p.error);
  const data = { ...p.data, detail: p.data.detail || null };
  const row = id ? await db.testimonial.update({ where: { id }, data }) : await db.testimonial.create({ data });
  await audit(actorOf(user), id ? 'testimonial.updated' : 'testimonial.created', 'Testimonial', row.id, { approved: row.approved });
}
export async function deleteTestimonial(user: Principal, id: string) { assertCan(user, 'content.manage'); await db.testimonial.delete({ where: { id } }).catch(() => undefined); await audit(actorOf(user), 'testimonial.deleted', 'Testimonial', id); }

const promoSchema = z.object({
  title: z.string().trim().min(3, 'Enter a headline.').max(100), body: z.string().trim().max(240).default(''), ctaLabel: z.string().trim().min(2).max(30).default('Shop now'),
  ctaHref: z.string().trim().max(200).default('/shop').refine((v) => v.startsWith('/') && !v.startsWith('//') || /^https:\/\//.test(v), 'Use a path such as /shop or an https:// address.'),
  tone: z.enum(['MINT', 'GREEN', 'RED']).default('MINT'), couponCode: z.string().trim().toUpperCase().max(30).optional().default(''),
  startsAt: date, endsAt: date, visible: z.boolean().default(false), sortOrder: num(999),
});
export async function savePromotion(user: Principal, id: string | null, raw: unknown) {
  assertCan(user, 'promo.manage');
  const p = promoSchema.safeParse(raw);
  if (!p.success) throw bad(p.error);
  const d = p.data;
  if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) throw invalid('The end date is before the start date.', { endsAt: 'Must be after the start.' });
  if (d.endsAt) d.endsAt.setHours(23, 59, 59);
  const data = { ...d, couponCode: d.couponCode || null };
  const row = id ? await db.promotion.update({ where: { id }, data }) : await db.promotion.create({ data });
  await audit(actorOf(user), id ? 'promotion.updated' : 'promotion.created', 'Promotion', row.id, { visible: row.visible });
}
export async function deletePromotion(user: Principal, id: string) { assertCan(user, 'promo.manage'); await db.promotion.delete({ where: { id } }).catch(() => undefined); await audit(actorOf(user), 'promotion.deleted', 'Promotion', id); }

// ─── Coupons and delivery zones ────────────────────────────────────

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Use 3–30 letters, numbers, - or _.'),
  description: z.string().trim().max(120).default(''),
  kind: z.enum(['PERCENT', 'FIXED']), value: z.coerce.number().min(1, 'Enter an amount.'),
  minSubtotal: z.coerce.number().min(0).default(0), startsAt: date, endsAt: date,
  usageLimit: z.string().trim().optional().default('').transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v > 0), 'Enter a whole number.'),
  active: z.boolean().default(true),
});
export async function saveCoupon(user: Principal, id: string | null, raw: unknown) {
  assertCan(user, 'promo.manage');
  const p = couponSchema.safeParse(raw);
  if (!p.success) throw bad(p.error);
  const d = p.data;
  if (d.kind === 'PERCENT' && (d.value > 90 || !Number.isInteger(d.value))) throw invalid('A percentage must be a whole number up to 90.', { value: 'Whole number, 1–90.' });
  if (d.endsAt) d.endsAt.setHours(23, 59, 59);
  const data = { code: d.code, description: d.description, kind: d.kind, value: d.kind === 'FIXED' ? Math.round(d.value * 100) : d.value, minSubtotalKobo: Math.round(d.minSubtotal * 100), startsAt: d.startsAt, endsAt: d.endsAt, usageLimit: d.usageLimit, active: d.active };
  const clash = await db.coupon.findFirst({ where: { code: d.code, ...(id ? { NOT: { id } } : {}) } });
  if (clash) throw conflict('That code already exists.');
  const row = id ? await db.coupon.update({ where: { id }, data }) : await db.coupon.create({ data });
  await audit(actorOf(user), id ? 'coupon.updated' : 'coupon.created', 'Coupon', row.id, { code: row.code });
}
export async function deleteCoupon(user: Principal, id: string) {
  assertCan(user, 'promo.manage');
  const c = await db.coupon.findUnique({ where: { id } });
  if (!c) throw notFound('Coupon not found.');
  if (c.usedCount > 0) { await db.coupon.update({ where: { id }, data: { active: false } }); await audit(actorOf(user), 'coupon.deactivated', 'Coupon', id); return 'This code has been used, so it was switched off instead of deleted.'; }
  await db.coupon.delete({ where: { id } });
  await audit(actorOf(user), 'coupon.deleted', 'Coupon', id);
}

const zoneSchema = z.object({ name: z.string().trim().min(2, 'Enter a name.').max(80), areas: z.string().trim().max(600).default(''), fee: z.coerce.number().min(0, 'Enter the delivery charge.').max(1_000_000), freeOver: z.string().trim().optional().default('').transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (Number.isFinite(v) && v >= 0), 'Enter an amount.'), etaText: z.string().trim().max(80).default(''), active: z.boolean().default(true), sortOrder: num(999) });
export async function saveZone(user: Principal, id: string | null, raw: unknown) {
  assertCan(user, 'promo.manage');
  const p = zoneSchema.safeParse(raw);
  if (!p.success) throw bad(p.error);
  const d = p.data;
  const data = { name: d.name, areas: d.areas, feeKobo: Math.round(d.fee * 100), freeOverKobo: d.freeOver === null ? null : Math.round(d.freeOver * 100), etaText: d.etaText, active: d.active, sortOrder: d.sortOrder };
  const row = id ? await db.deliveryZone.update({ where: { id }, data }) : await db.deliveryZone.create({ data });
  await audit(actorOf(user), id ? 'zone.updated' : 'zone.created', 'DeliveryZone', row.id, { name: row.name });
}
export async function deleteZone(user: Principal, id: string) { assertCan(user, 'promo.manage'); await db.deliveryZone.delete({ where: { id } }).catch(() => undefined); await audit(actorOf(user), 'zone.deleted', 'DeliveryZone', id); }
