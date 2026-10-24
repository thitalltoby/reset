import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { db } from '@/server/db';
import { saveProduct, setProductsStatus } from '@/server/products';
import { getProductBySlug, listProducts, relatedProducts, categoryTree, productGallery } from '@/server/catalog';
import { RESET_CATALOGUE, UNUSED_SUPPLIED_IMAGES, BRIEF_REVIEW_NOTE } from '@/content/reset-catalogue';
import { AppError } from '@/server/errors';
import { resetDb, makeProduct, makeUser, principal } from './helpers';

const BRIEF_NAMES = [
  'Cough syrup for dry cough', 'Digital thermometer', 'Fabric plasters, assorted sizes', 'Fluoride toothpaste', 'Home first-aid kit', 'Oral rehydration salts', 'Paracetamol 500mg tablets',
  'Saline nasal spray', 'Sunscreen SPF 50', 'Vitamin C 500mg effervescent tablets', 'Alcohol hand sanitiser', 'Alcohol-free mouthwash', 'Antacid chewable tablets, mint', 'Antifungal cream',
  'Antihistamine allergy tablets', 'Antiseptic liquid', 'Baby feeding bottle', 'Baby saline nose drops', 'Burn gel', 'Children’s paracetamol suspension', 'Cold and flu relief capsules',
  'Crepe bandage 7.5cm', 'Daily moisturising lotion', 'Disposable face masks',
];
const BRIEF_PRICES = [1800, 3800, 1500, 1300, 9800, 1600, 600, 2200, 6500, 2500, 1600, 2600, 1300, 2800, 3500, 1700, 3900, 2100, 2300, 1900, 2100, 900, 3400, 3500];

describe('the Reset catalogue data', () => {
  it('has exactly the 24 named products from the brief, once each, at the brief’s sample prices', () => {
    expect(RESET_CATALOGUE.map((p) => p.name)).toEqual(BRIEF_NAMES);
    expect(RESET_CATALOGUE.map((p) => p.naira)).toEqual(BRIEF_PRICES);
    expect(new Set(RESET_CATALOGUE.map((p) => p.sku)).size).toBe(24);
    expect(new Set(RESET_CATALOGUE.map((p) => p.name.toLowerCase())).size).toBe(24);
  });

  it('never publishes the review note (entry 25) as a product', () => {
    expect(BRIEF_REVIEW_NOTE).toMatch(/do not create a fictional product/);
    expect(RESET_CATALOGUE.some((p) => /home healthcare essentials/i.test(p.name))).toBe(false);
  });

  it('has no NAFDAC numbers, because none was verified', () => {
    expect(RESET_CATALOGUE.every((p) => !('nafdacNumber' in p) || !(p as unknown as { nafdacNumber?: string }).nafdacNumber)).toBe(true);
  });

  it('gives every photographed product a real, consistent 800×800 WebP in public/products, and lists each photo’s rights', async () => {
    const withPhoto = RESET_CATALOGUE.filter((p) => p.photo);
    expect(withPhoto).toHaveLength(13);
    const files = new Set<string>();
    for (const p of withPhoto) {
      expect(files.has(p.photo!), `${p.name} reuses a photo`).toBe(false);
      files.add(p.photo!);
      const f = join(process.cwd(), 'public', p.photo!);
      expect(existsSync(f), p.photo!).toBe(true);
      const meta = await sharp(f).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(['webp', 800, 800]);
      expect(p.imageAlt && p.imageAlt.length > 15).toBe(true);
      expect(p.imageSource).toMatch(/permission to reuse not confirmed/i);
    }
  });

  it('keeps unused supplied photographs out of the public folder', () => {
    for (const u of UNUSED_SUPPLIED_IMAGES) {
      expect(existsSync(join(process.cwd(), u.file))).toBe(true);
      expect(existsSync(join(process.cwd(), 'public/products', u.file.split('/').pop()!))).toBe(false);
    }
  });

  it('marks medicines with a controlled or unconfirmed formulation as pharmacist-only, and never invents directions for unverified entries', () => {
    const cls = (n: number) => RESET_CATALOGUE.find((p) => p.no === n)!.cls;
    expect([cls(1), cls(15), cls(21)]).toEqual(['PHARMACY_ONLY', 'PHARMACY_ONLY', 'PHARMACY_ONLY']);
    for (const p of RESET_CATALOGUE.filter((x) => x.infoStatus === 'VERIFIED')) expect(p.infoSource.length).toBeGreaterThan(30);
    for (const p of RESET_CATALOGUE.filter((x) => !x.photo)) { expect(p.brand).toBeNull(); expect(p.brandConfirmed).toBe(false); expect(p.packSize).toBeNull(); }
  });
});

describe('admin rules for catalogue entries', () => {
  beforeEach(resetDb);
  const raw = (categoryId: string, over: Record<string, unknown> = {}) => ({
    name: 'Test remedy', sku: 'T-1', categoryId, summary: 'A test remedy for the suite.', price: '1500', status: 'DRAFT', ...over,
  });
  const setup = async () => {
    const seed = await makeProduct({ isDemo: false });
    const mgr = principal(await makeUser('MANAGER'));
    return { cat: seed.categoryId, mgr };
  };

  it('refuses to publish a live product whose price has not been confirmed, singly or in bulk', async () => {
    const { cat, mgr } = await setup();
    await expect(saveProduct(mgr, null, raw(cat, { status: 'PUBLISHED', priceConfirmed: false }))).rejects.toThrow(/Confirm the price/);
    const row = await saveProduct(mgr, null, raw(cat, { status: 'DRAFT' }));
    await expect(setProductsStatus(mgr, [row.id], 'PUBLISHED')).rejects.toThrow(/Confirm the price/);
    const ok = await saveProduct(mgr, row.id, raw(cat, { status: 'PUBLISHED', priceConfirmed: true }));
    expect(ok.status).toBe('PUBLISHED');
    expect(ok.priceConfirmed).toBe(true);
  });

  it('requires a stated source before information can be marked verified', async () => {
    const { cat, mgr } = await setup();
    await expect(saveProduct(mgr, null, raw(cat, { infoStatus: 'VERIFIED', infoSource: '' }))).rejects.toThrow(/where the label information was checked/);
    const row = await saveProduct(mgr, null, raw(cat, { infoStatus: 'VERIFIED', infoSource: 'Pack leaflet, checked 24 Oct 2026' }));
    expect(row.infoStatus).toBe('VERIFIED');
  });

  it('requires a photo permission status whenever a photograph is attached, and validates gallery links', async () => {
    const { cat, mgr } = await setup();
    await expect(saveProduct(mgr, null, raw(cat, { gallery: ['/products/x.webp'], imageRights: 'NONE' }))).rejects.toThrow(/whether you may use it/);
    await expect(saveProduct(mgr, null, raw(cat, { gallery: ['https://evil.example/x.png'], imageRights: 'OWN_PHOTO' }))).rejects.toBeInstanceOf(AppError);
    const row = await saveProduct(mgr, null, raw(cat, { gallery: ['/products/x.webp'], imageRights: 'OWN_PHOTO', imageSource: 'Shot in store' }));
    expect(row.gallery).toEqual(['/products/x.webp']);
  });
});

describe('what customers see', () => {
  beforeEach(resetDb);

  it('uses the bundled photo, lets a cleared upload replace it, and ignores one that is not servable', async () => {
    const p = await makeProduct({ name: 'Photo product' });
    await db.product.update({ where: { id: p.id }, data: { photo: '/products/a.webp', gallery: ['/products/b.webp'], brand: 'Acme' } });
    const first = (await listProducts({})).items[0]!;
    expect(first.image).toBe('/products/a.webp');
    expect(first.imageAlt).toContain('Acme');
    const doc = await db.document.create({ data: { storageKey: 'k1', originalName: 'x.png', mimeType: 'image/png', sizeBytes: 5, sha256: 'x', visibility: 'PUBLIC', section: 'media', title: 'New pack photo', uploadedByLabel: 't', scanStatus: 'PENDING' } });
    await db.product.update({ where: { id: p.id }, data: { imageId: doc.id } });
    expect((await listProducts({})).items[0]!.image).toBe('/products/a.webp'); // still pending scan
    await db.document.update({ where: { id: doc.id }, data: { scanStatus: 'CLEAN' } });
    const after = await getProductBySlug(p.slug);
    expect(after!.card.image).toBe(`/media/${doc.id}`);
    expect(after!.gallery.map((g) => g.src)).toEqual([`/media/${doc.id}`, '/products/b.webp']);
  });

  it('shows a placeholder state (no image) for a product without a photograph', async () => {
    await makeProduct({ name: 'No photo' });
    expect((await listProducts({})).items[0]!.image).toBeNull();
  });

  it('drops gallery uploads that have not cleared the scan', () => {
    const g = productGallery({ name: 'X', brand: null, imageId: null, photo: '/products/a.webp', gallery: ['/media/abc'], imageAlt: null }, new Set());
    expect(g.map((x) => x.src)).toEqual(['/products/a.webp']);
  });

  it('fills related products from other categories so the row is never thin, and hides empty categories', async () => {
    const a = await makeProduct({ name: 'A' });
    await makeProduct({ name: 'B' }); await makeProduct({ name: 'C' }); await makeProduct({ name: 'D' });
    const other = await db.category.create({ data: { slug: 'other', name: 'Other', visible: true } });
    await db.product.create({ data: { slug: 'o1', sku: 'O-1', name: 'Other one', categoryId: other.id, summary: 'Another test product', priceKobo: 1000, stock: 5, status: 'PUBLISHED', tags: [], isDemo: true } });
    await db.category.create({ data: { slug: 'empty', name: 'Empty', visible: true } });
    const rel = await relatedProducts({ id: a.id, categoryId: a.categoryId });
    expect(rel).toHaveLength(4);
    expect(rel.map((r) => r.name)).toContain('Other one');
    expect((await categoryTree()).map((c) => c.slug).sort()).toEqual(['other', 'pain']);
  });

  it('finds products by active ingredient', async () => {
    const p = await makeProduct({ name: 'Mystery tablets' });
    await db.product.update({ where: { id: p.id }, data: { activeIngredients: 'Cetirizine hydrochloride 10mg' } });
    expect((await listProducts({ q: 'cetirizine' })).items.map((x) => x.name)).toEqual(['Mystery tablets']);
  });
});
