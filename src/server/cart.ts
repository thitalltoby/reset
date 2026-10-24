import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { db } from './db';
import { env } from './env';
import { randomToken, sha256 } from './crypto';
import { AppError, invalid } from './errors';
import { availableOf, productPhoto, publicProductWhere, reservedUnits, servableMedia } from './catalog';
import { checkCoupon, computeTotals, type CouponLike, type Totals, type ZoneLike } from '@/lib/pricing';

export const CART_COOKIE = 'reset_cart';
const CART_TTL_MS = 60 * 24 * 60 * 60 * 1000;

export interface CartLine {
  productId: string; slug: string; name: string; brand: string | null; packSize: string | null; art: string; image: string | null; imageAlt: string;
  unitKobo: number; quantity: number; lineKobo: number; available: number; maxPerOrder: number;
  /** Why this line cannot be bought right now. The checkout stays closed until it is fixed. */
  issue: string | null;
}

export interface CartView {
  id: string | null;
  lines: CartLine[];
  count: number;
  couponCode: string | null;
  couponMessage: string | null;
  totals: Totals;
  blocked: boolean;
}

const EMPTY: CartView = { id: null, lines: [], count: 0, couponCode: null, couponMessage: null, totals: { subtotalKobo: 0, discountKobo: 0, deliveryKobo: 0, totalKobo: 0 }, blocked: false };

async function currentCart() {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return null;
  const c = await db.cart.findUnique({ where: { tokenHash: sha256(token) }, include: { items: true } });
  if (!c || Date.now() - c.updatedAt.getTime() > CART_TTL_MS) return null;
  return c;
}

async function ensureCart(userId?: string | null) {
  const existing = await currentCart();
  if (existing) return existing;
  const token = randomToken(24);
  const c = await db.cart.create({ data: { tokenHash: sha256(token), userId: userId ?? null }, include: { items: true } });
  const jar = await cookies();
  jar.set(CART_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: env.APP_URL.startsWith('https://'), path: '/', maxAge: CART_TTL_MS / 1000 });
  return c;
}

/** Cart contents with live prices and availability. Prices always come from the database. */
export async function buildCartView(items: { productId: string; quantity: number }[], couponCode: string | null, delivery?: { fulfilment: 'DELIVERY' | 'PICKUP'; zone?: ZoneLike | null }): Promise<CartView> {
  if (!items.length) return { ...EMPTY, couponCode: null };
  const products = await db.product.findMany({ where: { id: { in: items.map((i) => i.productId) } }, include: { category: true } });
  const visible = new Set((await db.product.findMany({ where: publicProductWhere({ id: { in: products.map((p) => p.id) } }), select: { id: true } })).map((p) => p.id));
  const reserved = await reservedUnits(products.map((p) => p.id));
  const media = await servableMedia(products.map((p) => p.imageId).filter((x): x is string => !!x));
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: CartLine[] = [];
  for (const it of items) {
    const p = byId.get(it.productId);
    if (!p) continue;
    const available = availableOf(p.stock, reserved.get(p.id) ?? 0);
    let issue: string | null = null;
    if (!visible.has(p.id)) issue = 'No longer available';
    else if (p.classification !== 'OTC') issue = 'Not sold online';
    else if (available <= 0) issue = 'Out of stock';
    else if (it.quantity > available) issue = `Only ${available} left`;
    else if (it.quantity > p.maxPerOrder) issue = `Limit of ${p.maxPerOrder} per order`;
    lines.push({
      productId: p.id, slug: p.slug, name: p.name, brand: p.brand, packSize: p.packSize, art: p.art, image: productPhoto(p, media).src, imageAlt: p.imageAlt ?? productPhoto(p, media).alt,
      unitKobo: p.priceKobo, quantity: it.quantity, lineKobo: p.priceKobo * it.quantity, available, maxPerOrder: p.maxPerOrder, issue,
    });
  }
  let coupon: CouponLike | null = null;
  let couponMessage: string | null = null;
  if (couponCode) {
    coupon = await db.coupon.findUnique({ where: { code: couponCode } });
    const subtotal = lines.reduce((a, l) => a + l.lineKobo, 0);
    const ck = checkCoupon(coupon, subtotal);
    if (!ck.ok) { couponMessage = ck.reason; coupon = null; }
  }
  const totals = computeTotals(lines.map((l) => ({ unitKobo: l.unitKobo, quantity: l.quantity })), { coupon, fulfilment: delivery?.fulfilment ?? 'PICKUP', zone: delivery?.zone ?? null });
  return { id: null, lines, count: lines.reduce((a, l) => a + l.quantity, 0), couponCode: coupon ? couponCode : null, couponMessage, totals, blocked: lines.some((l) => l.issue) };
}

export const getCartView = cache(async (): Promise<CartView> => {
  const c = await currentCart();
  if (!c) return EMPTY;
  const v = await buildCartView(c.items.map((i) => ({ productId: i.productId, quantity: i.quantity })), c.couponCode);
  return { ...v, id: c.id };
});

export const cartCount = cache(async (): Promise<number> => {
  const c = await currentCart();
  return c ? c.items.reduce((a, i) => a + i.quantity, 0) : 0;
});

async function assertBuyable(productId: string) {
  const p = await db.product.findFirst({ where: publicProductWhere({ id: productId }) });
  if (!p) throw new AppError('NOT_FOUND', 'That product is no longer available.');
  if (p.classification !== 'OTC') throw invalid('This item is supplied through the pharmacist and cannot be added to the basket. Please ask us or send a prescription.');
  const reserved = (await reservedUnits([p.id])).get(p.id) ?? 0;
  const available = availableOf(p.stock, reserved);
  if (available <= 0) throw invalid(`${p.name} is out of stock.`);
  return { p, available, cap: Math.min(available, p.maxPerOrder) };
}

export async function addToCart(productId: string, quantity: number, userId?: string | null): Promise<{ added: number; message: string }> {
  if (!Number.isInteger(quantity) || quantity < 1) throw invalid('Choose how many you want.');
  const { p, cap } = await assertBuyable(productId);
  const cart = await ensureCart(userId);
  const have = cart.items.find((i) => i.productId === productId)?.quantity ?? 0;
  const target = Math.min(cap, have + quantity);
  if (target === have) throw invalid(have >= p.maxPerOrder ? `You can buy up to ${p.maxPerOrder} of ${p.name} in one order.` : `There are only ${cap} of ${p.name} available.`);
  await db.cartItem.upsert({ where: { cartId_productId: { cartId: cart.id, productId } }, create: { cartId: cart.id, productId, quantity: target }, update: { quantity: target } });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  const trimmed = target < have + quantity;
  return { added: target - have, message: trimmed ? `Added. We could only add ${target - have} more — ${target} in your basket is the most available.` : `${p.name} added to your basket.` };
}

export async function setCartQuantity(productId: string, quantity: number) {
  const cart = await currentCart();
  if (!cart) throw invalid('Your basket is empty.');
  if (quantity <= 0) { await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } }); return; }
  const { cap } = await assertBuyable(productId);
  await db.cartItem.update({ where: { cartId_productId: { cartId: cart.id, productId } }, data: { quantity: Math.min(quantity, cap) } });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
}

export async function removeFromCart(productId: string) {
  const cart = await currentCart();
  if (cart) await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
}

export async function applyCouponCode(raw: string) {
  const code = raw.trim().toUpperCase();
  if (!code) throw invalid('Enter a code.');
  const cart = await currentCart();
  if (!cart || !cart.items.length) throw invalid('Add something to your basket first.');
  const view = await buildCartView(cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })), null);
  const coupon = await db.coupon.findUnique({ where: { code } });
  const ck = checkCoupon(coupon, view.totals.subtotalKobo);
  if (!ck.ok) throw invalid(ck.reason);
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: code } });
}

export async function removeCoupon() {
  const cart = await currentCart();
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
}

export async function clearCartById(cartId: string) {
  await db.cartItem.deleteMany({ where: { cartId } });
  await db.cart.update({ where: { id: cartId }, data: { couponCode: null } }).catch(() => undefined);
}

/** After sign-in, the basket the visitor already filled becomes their account's basket (quantities are added to any earlier one). */
export async function adoptCart(userId: string) {
  const guest = await currentCart();
  if (!guest) return;
  const mine = await db.cart.findMany({ where: { userId, NOT: { id: guest.id } }, include: { items: true } });
  for (const old of mine) {
    for (const it of old.items) {
      const g = guest.items.find((x) => x.productId === it.productId);
      await db.cartItem.upsert({ where: { cartId_productId: { cartId: guest.id, productId: it.productId } }, create: { cartId: guest.id, productId: it.productId, quantity: it.quantity }, update: { quantity: (g?.quantity ?? 0) + it.quantity } });
    }
    await db.cart.delete({ where: { id: old.id } });
  }
  await db.cart.update({ where: { id: guest.id }, data: { userId } });
}

/** Housekeeping: baskets untouched for 60 days. */
export async function purgeStaleCarts() {
  const r = await db.cart.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - CART_TTL_MS) } } });
  return r.count;
}
