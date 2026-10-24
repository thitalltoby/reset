'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { bool, runAction, str, type FormState } from '@/server/action-utils';
import { clearCartById, getCartView } from '@/server/cart';
import { placeOrder } from '@/server/orders';
import { getSessionUser } from '@/server/session';
import { saveAddress } from '@/server/account';
import { clientIp, rateLimit } from '@/server/rate-limit';
import { db } from '@/server/db';
import { AppError, invalid } from '@/server/errors';
import { addressSchema, checkoutSchema, fieldErrors } from '@/lib/validation';

export async function placeOrderAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await getSessionUser();
    const customer = u?.role === 'CUSTOMER' ? u : null;
    if (!(await rateLimit(`checkout:ip:${await clientIp()}`, 20, 3600))) throw new AppError('RATE_LIMITED', 'Too many orders from this connection. Please try again later, or call the pharmacy.');

    const parsed = checkoutSchema.safeParse({
      name: str(fd, 'name'), email: str(fd, 'email'), phone: str(fd, 'phone'), fulfilment: str(fd, 'fulfilment'), paymentMethod: str(fd, 'paymentMethod'),
      zoneId: str(fd, 'zoneId'), note: str(fd, 'note'), marketing: bool(fd, 'marketing'), sms: bool(fd, 'sms'), saveAddress: bool(fd, 'saveAddress'),
    });
    if (!parsed.success) throw invalid('Please check the highlighted fields.', fieldErrors(parsed.error));
    const d = parsed.data;

    let address: { line1: string; line2?: string; city: string; state: string; notes?: string } | null = null;
    if (d.fulfilment === 'DELIVERY') {
      const a = addressSchema.safeParse({ line1: str(fd, 'line1'), line2: str(fd, 'line2'), city: str(fd, 'city'), state: str(fd, 'state'), notes: str(fd, 'addrNotes') });
      if (!a.success) throw invalid('Please check the delivery address.', fieldErrors(a.error));
      address = a.data;
    }

    const cart = await getCartView();
    if (!cart.id || !cart.lines.length) throw invalid('Your basket is empty.');
    if (cart.blocked) throw invalid('Some items in your basket need attention. Please review your basket.');

    const r = await placeOrder({
      userId: customer?.id ?? null, name: d.name, email: d.email, phone: d.phone, fulfilment: d.fulfilment, zoneId: d.zoneId ?? null, address,
      paymentMethod: d.paymentMethod, note: d.note, marketingOptIn: d.marketing, smsOptIn: d.sms,
      items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })), couponCode: cart.couponCode,
    });

    // Housekeeping that must never undo a placed order
    try {
      await clearCartById(cart.id);
      if (customer && d.marketing) await db.user.update({ where: { id: customer.id }, data: { marketingOptInAt: new Date() } });
      if (customer && d.saveAddress && address) await saveAddress(customer, null, { label: 'Home', recipient: d.name, phone: d.phone, ...address, isDefault: false });
    } catch { /* ignored: the order is already placed */ }
    revalidatePath('/', 'layout');
    redirect(r.payUrl ?? `/order/${r.token}?new=1`);
  });
}
