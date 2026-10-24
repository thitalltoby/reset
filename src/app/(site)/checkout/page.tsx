import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCartView } from '@/server/cart';
import { getSite } from '@/server/site';
import { getSessionUser } from '@/server/session';
import { db } from '@/server/db';
import { listAddresses } from '@/server/account';
import { CheckoutForm } from '@/components/CheckoutForm';
import { Alert } from '@/components/ui';
import { placeOrderAction } from './actions';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, site, user] = await Promise.all([getCartView(), getSite(), getSessionUser()]);
  if (!cart.lines.length) redirect('/cart');
  if (cart.blocked) redirect('/cart');
  const { shop, company } = site;
  const payable = shop.paystack || shop.payOnDelivery;
  const fulfil = shop.delivery || shop.pickup;
  if (!shop.onlineShop || !payable || !fulfil) {
    return (
      <div className="container-x py-12 max-w-2xl">
        <h1 className="!text-3xl">Online checkout is not open yet</h1>
        <div className="mt-4"><Alert tone="info">The pharmacy has not finished setting up delivery or payment, so we cannot take orders here at the moment. Please <Link href="/contact">contact us</Link> and we will help you directly.</Alert></div>
        <p className="mt-6"><Link className="btn btn-outline" href="/cart">Back to basket</Link></p>
      </div>
    );
  }
  const customer = user?.role === 'CUSTOMER' ? await db.user.findUnique({ where: { id: user.id }, select: { id: true, name: true, email: true, phone: true, marketingOptInAt: true } }) : null;
  const [zones, addresses] = await Promise.all([
    shop.delivery ? db.deliveryZone.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { feeKobo: 'asc' }] }) : [],
    customer ? listAddresses(customer.id) : [],
  ]);
  return (
    <div className="container-x py-8 md:py-12">
      <h1 className="!text-[2rem] md:!text-[2.6rem]">Checkout</h1>
      {cart.couponMessage && <div className="mt-4"><Alert tone="warn">{cart.couponMessage}</Alert></div>}
      <div className="mt-6">
        <CheckoutForm
          action={placeOrderAction}
          lines={cart.lines.map((l) => ({ productId: l.productId, name: l.name, packSize: l.packSize, quantity: l.quantity, lineKobo: l.lineKobo }))}
          subtotalKobo={cart.totals.subtotalKobo} discountKobo={cart.totals.discountKobo} couponCode={cart.couponCode} minOrderKobo={shop.minOrderKobo}
          zones={zones.map((z) => ({ id: z.id, name: z.name, areas: z.areas, feeKobo: z.feeKobo, freeOverKobo: z.freeOverKobo, etaText: z.etaText }))}
          delivery={shop.delivery} pickup={shop.pickup} paystack={shop.paystack} payOnDelivery={shop.payOnDelivery} pickupNote={shop.pickupNote} pickupAddress={company.address}
          customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone ?? '', marketing: !!customer.marketingOptInAt } : null}
          addresses={addresses.map((a) => ({ id: a.id, label: a.label, recipient: a.recipient, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, notes: a.notes, isDefault: a.isDefault }))}
        />
      </div>
    </div>
  );
}
