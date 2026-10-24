import type { Metadata } from 'next';
import Link from 'next/link';
import { getCartView } from '@/server/cart';
import { getSite } from '@/server/site';
import { CartQty, CouponForm, RemoveItem } from '@/components/CartControls';
import { ProductImage } from '@/components/ProductCard';
import { removeCouponAction } from '../shop-actions';
import { Alert } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ProductArt } from '@/components/ProductArt';
import { formatNaira } from '@/lib/money';

export const metadata: Metadata = { title: 'Your basket', robots: { index: false } };

export default async function CartPage() {
  const [cart, site] = await Promise.all([getCartView(), getSite()]);
  if (!cart.lines.length) {
    return (
      <div className="container-x py-16 text-center">
        <ProductArt kind="bottle" size={110} className="mx-auto" />
        <h1 className="!text-3xl mt-4">Your basket is empty</h1>
        <p className="lead mx-auto mt-2">Find everyday health essentials, vitamins, first aid and more.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Link className="btn btn-primary btn-lg" href="/shop">Start shopping</Link>{site.shop.prescriptions && <Link className="btn btn-outline btn-lg" href="/prescriptions">Send a prescription</Link>}</div>
      </div>
    );
  }
  const open = site.shop.onlineShop && (site.shop.delivery || site.shop.pickup) && (site.shop.paystack || site.shop.payOnDelivery);
  return (
    <div className="container-x py-8 md:py-12">
      <h1 className="!text-[2rem] md:!text-[2.6rem]">Your basket <span className="text-muted font-normal text-2xl">({cart.count})</span></h1>
      {cart.couponMessage && <div className="mt-4"><Alert tone="warn">{cart.couponMessage}</Alert></div>}
      {cart.blocked && <div className="mt-4"><Alert tone="warn">Some items need your attention before you can check out. Change the quantity or remove them.</Alert></div>}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <ul className="space-y-3">
          {cart.lines.map((l) => (
            <li key={l.productId} className="card flex gap-4 p-3 sm:p-4">
              <Link href={`/product/${l.slug}`} className="pcard-art !m-0 !aspect-square w-24 sm:w-28 flex-none" aria-label={l.name} tabIndex={-1}><ProductImage card={{ image: l.image, imageAlt: l.imageAlt, name: l.name }} sizes="112px" /></Link>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    {l.brand && <p className="text-[.75rem] uppercase tracking-wider text-muted font-semibold">{l.brand}</p>}
                    <Link href={`/product/${l.slug}`} className="font-display font-semibold text-ink no-underline hover:underline">{l.name}</Link>
                    {l.packSize && <p className="text-sm text-muted">{l.packSize}</p>}
                  </div>
                  <p className="price flex-none">{formatNaira(l.lineKobo)}</p>
                </div>
                {l.issue && <p className="mt-1"><span className="badge badge-bad"><Icon name="alert" size={13} />{l.issue}</span></p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <CartQty productId={l.productId} quantity={l.quantity} max={Math.max(1, Math.min(l.available, l.maxPerOrder))} name={l.name} />
                  <div className="flex items-center gap-4"><span className="text-sm text-muted">{formatNaira(l.unitKobo)} each</span><RemoveItem productId={l.productId} name={l.name} /></div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="lg:sticky lg:top-32 self-start" aria-label="Order summary">
          <div className="card card-pad">
            <h2 className="!text-xl">Summary</h2>
            <dl className="mt-4 space-y-2 text-[.98rem]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold tabular-nums">{formatNaira(cart.totals.subtotalKobo)}</dd></div>
              {cart.totals.discountKobo > 0 && <div className="flex justify-between text-forest"><dt>Code {cart.couponCode}</dt><dd className="font-semibold tabular-nums">−{formatNaira(cart.totals.discountKobo)}</dd></div>}
              <div className="flex justify-between text-muted"><dt>Delivery</dt><dd>Chosen at checkout</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-lg font-display font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatNaira(cart.totals.totalKobo)}</dd></div>
            </dl>
            {cart.couponCode ? <form action={removeCouponAction} className="mt-3"><button className="text-sm text-muted underline" type="submit">Remove code {cart.couponCode}</button></form> : <CouponForm />}
            {open
              ? (cart.blocked ? <button className="btn btn-primary btn-lg btn-block mt-5" disabled>Fix the items above to continue</button> : <Link className="btn btn-primary btn-lg btn-block mt-5" href="/checkout">Checkout<Icon name="arrow" size={18} /></Link>)
              : <div className="mt-5"><Alert tone="info">Online checkout is not open yet. <Link href="/contact">Contact the pharmacy</Link> to order.</Alert></div>}
            <p className="mt-4 flex items-center gap-2 text-sm text-muted"><Icon name="lock" size={16} className="text-forest" />Prices are confirmed again at checkout.</p>
          </div>
          <p className="mt-4 text-center"><Link href="/shop" className="link-arrow">Keep shopping<Icon name="arrow" size={16} /></Link></p>
        </aside>
      </div>
    </div>
  );
}
