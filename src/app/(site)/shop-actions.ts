'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { runAction, str, type FormState } from '@/server/action-utils';
import { addToCart, applyCouponCode, removeCoupon, removeFromCart, setCartQuantity } from '@/server/cart';
import { getSessionUser } from '@/server/session';
import { toggleFavourite } from '@/server/account';
import { invalid } from '@/server/errors';

const refresh = () => revalidatePath('/', 'layout');

export async function addToCartAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await getSessionUser();
    const qty = Math.max(1, Math.min(99, Number(str(fd, 'quantity') || 1) | 0));
    const r = await addToCart(str(fd, 'productId'), qty, u?.role === 'CUSTOMER' ? u.id : null);
    refresh();
    return r.message;
  });
}

export async function setQuantityAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const q = Number(str(fd, 'quantity'));
    if (!Number.isFinite(q)) throw invalid('Enter a number.');
    await setCartQuantity(str(fd, 'productId'), Math.max(0, Math.min(99, Math.floor(q))));
    refresh();
  });
}

export async function removeItemAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { await removeFromCart(str(fd, 'productId')); refresh(); });
}

export async function applyCouponAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { await applyCouponCode(str(fd, 'code')); refresh(); return 'Code applied.'; });
}

export async function removeCouponAction(): Promise<void> {
  await removeCoupon();
  refresh();
}

export async function toggleFavouriteAction(_p: FormState, fd: FormData): Promise<FormState> {
  const u = await getSessionUser();
  if (!u || u.role !== 'CUSTOMER') redirect(`/login?next=${encodeURIComponent(str(fd, 'next') || '/shop')}`);
  return runAction(async () => {
    const on = await toggleFavourite(u, str(fd, 'productId'));
    revalidatePath('/account/favourites');
    return on ? 'Saved to your favourites.' : 'Removed from your favourites.';
  });
}
