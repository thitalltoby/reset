import 'server-only';
import { z } from 'zod';
import { db } from './db';
import { audit } from './audit';
import { conflict, invalid, notFound } from './errors';
import { addToCart } from './cart';
import { deleteStored } from './storage';
import { revokeUserSessions } from './session';
import { addressSchema, fieldErrors, phoneSchema } from '@/lib/validation';

type Who = { id: string; name: string };

// ─── Profile ───────────────────────────────────────────────────────

const profileSchema = z.object({ name: z.string().trim().min(2, 'Enter your name.').max(120), phone: phoneSchema.optional().or(z.literal('')).transform((v) => v || null), marketing: z.boolean().default(false) });

export async function updateProfile(u: Who, raw: unknown) {
  const p = profileSchema.safeParse(raw);
  if (!p.success) throw invalid('Please check the highlighted fields.', fieldErrors(p.error));
  const cur = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { marketingOptInAt: true } });
  await db.user.update({ where: { id: u.id }, data: { name: p.data.name, phone: p.data.phone, marketingOptInAt: p.data.marketing ? (cur.marketingOptInAt ?? new Date()) : null } });
  await audit({ id: u.id, label: u.name }, 'account.profile', 'User', u.id, { marketing: p.data.marketing });
}

// ─── Addresses ─────────────────────────────────────────────────────

const addrFull = addressSchema.extend({ label: z.string().trim().max(30).default('Home'), recipient: z.string().trim().min(2, 'Enter who will receive it.').max(120), phone: phoneSchema, isDefault: z.boolean().default(false) });

export const listAddresses = (userId: string) => db.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });

export async function saveAddress(u: Who, id: string | null, raw: unknown) {
  const p = addrFull.safeParse(raw);
  if (!p.success) throw invalid('Please check the highlighted fields.', fieldErrors(p.error));
  if (id && !(await db.address.findFirst({ where: { id, userId: u.id } }))) throw notFound('Address not found.');
  if (!id && (await db.address.count({ where: { userId: u.id } })) >= 10) throw conflict('You can keep up to 10 addresses. Remove one first.');
  const d = p.data;
  const first = (await db.address.count({ where: { userId: u.id } })) === 0;
  const data = { label: d.label, recipient: d.recipient, phone: d.phone, line1: d.line1, line2: d.line2 ?? null, city: d.city, state: d.state, notes: d.notes ?? null, isDefault: d.isDefault || first };
  await db.$transaction(async (tx) => {
    if (data.isDefault) await tx.address.updateMany({ where: { userId: u.id }, data: { isDefault: false } });
    if (id) await tx.address.update({ where: { id }, data }); else await tx.address.create({ data: { ...data, userId: u.id } });
  });
}

export async function deleteAddress(u: Who, id: string) {
  const a = await db.address.findFirst({ where: { id, userId: u.id } });
  if (!a) throw notFound('Address not found.');
  await db.address.delete({ where: { id } });
  if (a.isDefault) { const next = await db.address.findFirst({ where: { userId: u.id }, orderBy: { createdAt: 'asc' } }); if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } }); }
}

// ─── Favourites ────────────────────────────────────────────────────

export async function toggleFavourite(u: Who, productId: string): Promise<boolean> {
  const key = { userId_productId: { userId: u.id, productId } };
  if (await db.favourite.findUnique({ where: key })) { await db.favourite.delete({ where: key }); return false; }
  if (!(await db.product.findUnique({ where: { id: productId }, select: { id: true } }))) throw notFound('Product not found.');
  await db.favourite.create({ data: { userId: u.id, productId } });
  return true;
}
export const favouriteIds = async (userId: string) => new Set((await db.favourite.findMany({ where: { userId }, select: { productId: true } })).map((f) => f.productId));

// ─── Orders ────────────────────────────────────────────────────────

export const myOrders = (userId: string) => db.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { items: true }, take: 100 });
export const myPrescriptions = (userId: string) => db.prescription.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });

/** Put the items of a past order back in the basket, skipping anything no longer available. */
export async function reorder(u: Who, orderId: string): Promise<string> {
  const o = await db.order.findFirst({ where: { id: orderId, userId: u.id }, include: { items: true } });
  if (!o) throw notFound('Order not found.');
  let added = 0; const skipped: string[] = [];
  for (const it of o.items) {
    if (!it.productId) { skipped.push(it.name); continue; }
    try { const r = await addToCart(it.productId, it.quantity, u.id); if (r.added > 0) added++; else skipped.push(it.name); } catch { skipped.push(it.name); }
  }
  if (!added) throw invalid('None of the items in that order can be added right now.');
  return skipped.length ? `Added ${added} item${added === 1 ? '' : 's'}. Not available: ${skipped.join(', ')}.` : `Added ${added} item${added === 1 ? '' : 's'} to your basket.`;
}

// ─── Your data ─────────────────────────────────────────────────────

/** A machine-readable copy of what we hold about the person (data-protection access request). */
export async function exportMyData(userId: string) {
  const [user, addresses, orders, prescriptions, favourites, enquiries] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, phone: true, createdAt: true, marketingOptInAt: true } }),
    db.address.findMany({ where: { userId } }),
    db.order.findMany({ where: { userId }, include: { items: true } }),
    db.prescription.findMany({ where: { userId }, select: { number: true, status: true, createdAt: true, preference: true, customerNote: true, pharmacistNote: true } }),
    db.favourite.findMany({ where: { userId }, include: { product: { select: { name: true, sku: true } } } }),
    db.user.findUnique({ where: { id: userId }, select: { email: true } }).then((u) => (u ? db.enquiry.findMany({ where: { email: u.email }, select: { number: true, type: true, message: true, createdAt: true } }) : [])),
  ]);
  return { exportedAt: new Date().toISOString(), account: user, addresses, orders, prescriptions, favourites: favourites.map((f) => f.product), enquiries };
}

/**
 * Close the account. The login, saved addresses, favourites and uploaded prescription files are removed.
 * Orders are kept without a link to the person for the pharmacy's financial and regulatory records.
 */
export async function deleteMyAccount(u: Who & { email: string }, password: string, verify: (hash: string, pw: string) => Promise<boolean>) {
  const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!(await verify(row.passwordHash, password))) throw invalid('That password is not right.', { password: 'Incorrect password.' });
  const docs = await db.document.findMany({ where: { prescription: { userId: u.id } } });
  for (const d of docs) await deleteStored(d.storageKey).catch(() => undefined);
  await db.$transaction(async (tx) => {
    await tx.document.deleteMany({ where: { prescription: { userId: u.id } } });
    await tx.prescription.updateMany({ where: { userId: u.id }, data: { userId: null, name: 'Deleted customer', phone: '', customerNote: null } });
    await tx.order.updateMany({ where: { userId: u.id }, data: { userId: null } });
    await tx.user.delete({ where: { id: u.id } });
  });
  await audit({ id: null, label: 'Customer' }, 'account.deleted', 'User', u.id);
  await revokeUserSessions(u.id).catch(() => undefined);
}
