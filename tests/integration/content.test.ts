import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/server/db';
import { getEnv } from '@/server/env';
import { getArticles, getServices, getTestimonials, getFaqs, saveArticle, saveTestimonial } from '@/server/content';
import { listProducts } from '@/server/catalog';
import { AppError } from '@/server/errors';
import { resetDb, makeProduct, makeUser, principal } from './helpers';

const setMode = (m: 'demo' | 'live') => { (getEnv() as { SITE_MODE: string }).SITE_MODE = m; };
beforeEach(async () => { await resetDb(); setMode('live'); });
afterEach(() => setMode('demo'));

const article = (o: object = {}) => ({ slug: 'a', title: 'Article', excerpt: 'x', body: 'y', category: 'c', art: 'leaf', status: 'PUBLISHED' as const, needsReview: true, publishedAt: new Date(Date.now() - 1000), ...o });

describe('what the public can see in live mode', () => {
  it('hides sample products and sample services, and shows only confirmed real ones', async () => {
    await makeProduct({ name: 'Sample thing', isDemo: true });
    await makeProduct({ name: 'Real thing', isDemo: false });
    expect((await listProducts({})).items.map((p) => p.name)).toEqual(['Real thing']);
    await db.pharmacyService.createMany({ data: [
      { slug: 'demo', title: 'Demo', summary: 's', benefits: [], confirmed: true, isDemo: true },
      { slug: 'unconfirmed', title: 'Unconfirmed', summary: 's', benefits: [], confirmed: false },
      { slug: 'real', title: 'Real', summary: 's', benefits: [], confirmed: true },
    ] });
    expect((await getServices()).map((s) => s.slug)).toEqual(['real']);
  });

  it('shows articles only after a reviewer has signed them off', async () => {
    await db.article.create({ data: article({ slug: 'draft', status: 'DRAFT' }) });
    await db.article.create({ data: article({ slug: 'unreviewed' }) });
    await db.article.create({ data: article({ slug: 'future', needsReview: false, publishedAt: new Date(Date.now() + 86_400_000) }) });
    await db.article.create({ data: article({ slug: 'ok', needsReview: false, reviewedBy: 'A. Pharmacist' }) });
    expect((await getArticles()).map((a) => a.slug)).toEqual(['ok']);
    setMode('demo');
    expect((await getArticles()).map((a) => a.slug).sort()).toEqual(['ok', 'unreviewed']);
  });

  it('shows only approved testimonials and visible FAQs', async () => {
    await db.testimonial.createMany({ data: [{ name: 'A', quote: 'approved quote text', approved: true }, { name: 'B', quote: 'not approved text', approved: false }] });
    await db.faq.createMany({ data: [{ question: 'Visible question?', answer: 'Yes yes', visible: true }, { question: 'Hidden question?', answer: 'No no', visible: false }] });
    expect((await getTestimonials()).map((t) => t.name)).toEqual(['A']);
    expect((await getFaqs()).map((f) => f.question)).toEqual(['Visible question?']);
  });
});

describe('editing content', () => {
  const body = 'A'.repeat(120);
  const raw = { title: 'Staying hydrated', excerpt: 'How much water you really need each day.', body, category: 'Everyday health', art: 'drop', image: '', status: 'PUBLISHED', needsReview: false, reviewedBy: '', readMinutes: 3, sources: '' };

  it('will not mark an article reviewed without naming the reviewer, and checks source links', async () => {
    const editor = principal(await makeUser('EDITOR'));
    await expect(saveArticle(editor, null, raw)).rejects.toThrow(/reviewed/i);
    await expect(saveArticle(editor, null, { ...raw, reviewedBy: 'A. Pharmacist', sources: 'WHO | http://insecure.example' })).rejects.toBeInstanceOf(AppError);
    const row = await saveArticle(editor, null, { ...raw, reviewedBy: 'A. Pharmacist', sources: 'WHO | https://www.who.int/' });
    expect(row).toMatchObject({ needsReview: false, reviewedBy: 'A. Pharmacist', slug: 'staying-hydrated' });
    expect(row.reviewedAt).toBeInstanceOf(Date);
  });

  it('is limited to people with the content permission', async () => {
    const clerk = principal(await makeUser('STAFF'));
    await expect(saveArticle(clerk, null, raw)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(saveTestimonial(clerk, null, { name: 'X', quote: 'a long enough quote' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
