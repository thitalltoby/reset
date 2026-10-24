import 'server-only';
import { db } from './db';
import { audit } from './audit';
import { assertCan, type Principal } from './rbac';
import { invalid, notFound } from './errors';
import { saveUpload, deleteStored, readStored } from './storage';
import { isServable } from './scan';

/** Photographs (product and article images) are stored as public Documents under this section name. */
export const MEDIA_SECTION = 'media';
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

export async function saveMedia(user: Principal, file: File, alt: string) {
  assertCan(user, 'product.manage');
  const text = alt.trim().replace(/\s+/g, ' ');
  if (text.length < 5) throw invalid('Describe the photo in a few words (for people who cannot see it).', { alt: 'Required, at least 5 characters.' });
  if (text.length > 200) throw invalid('Keep the description under 200 characters.', { alt: 'Too long.' });
  if (!file || file.size === 0) throw invalid('Choose a photo to upload.', { file: 'Required.' });
  if (!IMAGE_EXT.test(file.name)) throw invalid('Photos must be JPG, PNG or WebP files.', { file: 'Choose a JPG, PNG or WebP.' });
  const stored = await saveUpload(file);
  try {
    const d = await db.document.create({ data: { ...stored, visibility: 'PUBLIC', section: MEDIA_SECTION, title: text, uploadedById: user.id, uploadedByLabel: user.name } });
    await audit({ id: user.id, label: user.name }, 'media.added', 'Document', d.id, { alt: text, name: stored.originalName });
    return d;
  } catch (e) {
    await deleteStored(stored.storageKey).catch(() => undefined);
    throw e;
  }
}

export async function listMedia(opts: { includeHeld?: boolean } = {}) {
  const docs = await db.document.findMany({ where: { visibility: 'PUBLIC', section: MEDIA_SECTION }, orderBy: { createdAt: 'desc' } });
  return opts.includeHeld ? docs : docs.filter((d) => isServable(d.scanStatus));
}

/** Where a library photo is used, so it is never deleted from under a page. */
export async function mediaUsage(id: string): Promise<string[]> {
  const [products, articles] = await Promise.all([
    db.product.findMany({ where: { OR: [{ imageId: id }, { gallery: { has: `/media/${id}` } }] }, select: { name: true } }),
    db.article.findMany({ where: { imageId: id }, select: { title: true } }),
  ]);
  return [...products.map((p) => `Product: ${p.name}`), ...articles.map((a) => `Article: ${a.title}`)];
}

export async function deleteMedia(user: Principal, id: string) {
  assertCan(user, 'product.manage');
  const d = await db.document.findFirst({ where: { id, visibility: 'PUBLIC', section: MEDIA_SECTION } });
  if (!d) throw notFound('Photo not found.');
  const used = await mediaUsage(id);
  if (used.length) throw invalid(`This photo is in use (${used.join('; ')}). Choose a different photo there first.`);
  await db.document.delete({ where: { id } });
  await deleteStored(d.storageKey).catch(() => undefined);
  await audit({ id: user.id, label: user.name }, 'media.removed', 'Document', id, { alt: d.title });
}

/** Public image: only library photos that passed the scan. */
export async function getPublicMedia(id: string) {
  const d = await db.document.findFirst({ where: { id, visibility: 'PUBLIC', section: MEDIA_SECTION } });
  if (!d || !isServable(d.scanStatus)) return null;
  const data = await readStored(d.storageKey).catch(() => null);
  return data ? { doc: d, data } : null;
}

/** An image reference is '' (use the line illustration) or the id of a servable library photo. Returns the id or null. */
export async function checkImageId(raw: string | null | undefined): Promise<string | null> {
  const v = (raw ?? '').trim();
  if (!v) return null;
  const d = await db.document.findFirst({ where: { id: v, visibility: 'PUBLIC', section: MEDIA_SECTION } });
  if (d && isServable(d.scanStatus)) return d.id;
  throw invalid('Choose a photo from the library.', { image: 'Not an available photo.' });
}
