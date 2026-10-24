import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrderByToken } from '@/server/orders';
import { getSite, telHref, whatsappHref } from '@/server/site';
import { OrderBadge, PaymentBadge, Alert } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { AutoRefresh } from '@/components/AutoRefresh';
import { formatNaira } from '@/lib/money';
import { fmtDateTime } from '@/lib/format';
import { stepIndex, trackerSteps } from '@/lib/order-flow';
import { cancelOrderAction, payNowAction } from './actions';

export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function OrderPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string; paid?: string }> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const [o, site] = await Promise.all([getOrderByToken(token), getSite()]);
  if (!o) notFound();
  const c = site.company;
  const waiting = o.status === 'AWAITING_PAYMENT';
  const confirming = waiting && o.paymentStatus === 'PENDING' && sp.paid === 'pending';
  const steps = trackerSteps(o.fulfilment);
  const idx = stepIndex(o.status);
  const dead = o.status === 'CANCELLED' || o.status === 'EXPIRED';
  const wa = whatsappHref(c.whatsapp, `Hello Reset Pharmacy, about order ${o.number}`);
  const tel = telHref(c.phone);
  const headline = dead ? 'This order was not completed' : waiting ? 'Almost there: payment needed' : sp.new || sp.paid ? `Thank you, ${o.customerName.split(' ')[0]}` : `Order ${o.number}`;

  return (
    <div className="container-x py-8 md:py-12">
      {confirming && <AutoRefresh />}
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Order {o.number}</p>
        <h1 className="mt-1 !text-[2rem] md:!text-[2.6rem]">{headline}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2"><OrderBadge status={o.status} /><PaymentBadge status={o.paymentStatus} /><span className="text-sm text-muted">Placed {fmtDateTime(o.createdAt)}</span></div>

        <div className="mt-5 space-y-3">
          {sp.paid === 'failed' && <Alert tone="error">The payment did not go through, and you have not been charged. You can try again below.</Alert>}
          {confirming && <Alert tone="info">We are waiting for Paystack to confirm your payment. This page updates by itself. You do not need to pay again.</Alert>}
          {sp.paid === 'mismatch' && <Alert tone="warn">We could not match your payment to this order, so a team member is checking it. You will not be charged twice. Please contact us if you do not hear from us soon.</Alert>}
          {waiting && o.expiresAt && !confirming && <Alert tone="warn">We are holding your items until {fmtDateTime(o.expiresAt)}. After that they are released for other customers.</Alert>}
          {o.status === 'EXPIRED' && <Alert tone="info">The time to pay ran out and the items were released. If you still want them, please <Link href="/shop">start a new basket</Link>.</Alert>}
          {(sp.new || sp.paid === 'paid' || sp.paid === 'already-paid') && !waiting && !dead && <Alert tone="ok">We have your order and sent a confirmation to {o.email}. Keep this page: it is your tracking link.</Alert>}
        </div>

        {!dead && !waiting && (
          <section className="card card-pad mt-6" aria-label="Order progress">
            <ol className="track">
              {steps.map((s, i) => (
                <li key={s.key} data-done={idx >= i} data-current={idx === i} aria-current={idx === i ? 'step' : undefined}>
                  <span className="dot">{idx >= i ? <Icon name="check" size={18} /> : <span className="text-sm">{i + 1}</span>}</span>
                  <span>{s.label}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {waiting && !confirming && (
          <section className="card card-pad mt-6" aria-label="Pay for this order">
            <h2 className="!text-xl">Pay {formatNaira(o.totalKobo)}</h2>
            <p className="mt-1 text-muted">Pay securely by card, bank transfer or USSD on Paystack.</p>
            <div className="mt-4 flex flex-wrap items-start gap-3">
              <ActionForm action={payNowAction} className="inline"><input type="hidden" name="token" value={token} /><SubmitButton className="btn btn-primary btn-lg" pending="Opening payment…">Pay now</SubmitButton></ActionForm>
              <ActionForm action={cancelOrderAction} className="inline"><input type="hidden" name="token" value={token} /><SubmitButton className="btn btn-outline btn-lg" pending="Cancelling…">Cancel this order</SubmitButton></ActionForm>
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <section className="card card-pad" aria-labelledby="oi">
            <h2 id="oi" className="!text-xl">Items</h2>
            <ul className="mt-3 divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-3">
                  <span className="min-w-0">{i.quantity} × {i.name}{i.packSize && <span className="block text-sm text-muted">{i.packSize}</span>}</span>
                  <span className="tabular-nums">{formatNaira(i.unitKobo * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-2 border-t border-line pt-3">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatNaira(o.subtotalKobo)}</dd></div>
              {o.discountKobo > 0 && <div className="flex justify-between text-forest"><dt>Code {o.couponCode}</dt><dd className="tabular-nums">−{formatNaira(o.discountKobo)}</dd></div>}
              <div className="flex justify-between"><dt>{o.fulfilment === 'PICKUP' ? 'Collection' : 'Delivery'}</dt><dd className="tabular-nums">{o.deliveryKobo ? formatNaira(o.deliveryKobo) : 'Free'}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 font-display text-lg font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatNaira(o.totalKobo)}</dd></div>
            </dl>
          </section>
          <div className="space-y-6">
            <section className="card card-pad" aria-labelledby="od">
              <h2 id="od" className="!text-xl">{o.fulfilment === 'PICKUP' ? 'Collection' : 'Delivery'}</h2>
              <p className="mt-2 whitespace-pre-line text-[.98rem]">
                {o.fulfilment === 'PICKUP'
                  ? [o.customerName, c.address ? `Collect from:\n${c.address}` : 'We will tell you where and when to collect.', site.shop.pickupNote].filter(Boolean).join('\n')
                  : [o.customerName, o.shipLine1, o.shipLine2, [o.shipCity, o.shipState].filter(Boolean).join(', '), o.shipNotes && `Note: ${o.shipNotes}`, o.zoneName && `Area: ${o.zoneName}`].filter(Boolean).join('\n')}
              </p>
              <p className="mt-3 text-sm text-muted">Payment: {o.paymentMethod === 'PAYSTACK' ? 'Card, transfer or USSD (Paystack)' : o.fulfilment === 'PICKUP' ? 'When you collect' : 'On delivery'}</p>
            </section>
            <section className="card card-pad" aria-labelledby="oh">
              <h2 id="oh" className="!text-xl">Need help?</h2>
              <p className="mt-1 text-sm text-muted">Quote {o.number}.</p>
              <ul className="mt-3 space-y-2 text-[.96rem]">
                <li><Link href={`/contact?topic=order&order=${o.number}`} className="link-arrow"><Icon name="mail" size={16} />Message the pharmacy</Link></li>
                {wa && <li><a href={wa} rel="noopener noreferrer" className="link-arrow"><Icon name="chat" size={16} />WhatsApp</a></li>}
                {tel && <li><a href={tel} className="link-arrow"><Icon name="phone" size={16} />{c.phone}</a></li>}
              </ul>
            </section>
          </div>
        </div>

        <section className="mt-6" aria-labelledby="oe">
          <h2 id="oe" className="!text-xl">History</h2>
          <ol className="mt-3 space-y-2 border-l-2 border-line pl-5">
            {[...o.events].reverse().map((e) => (
              <li key={e.id} className="relative"><span className="absolute -left-[1.7rem] top-2 h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" /><p className="font-medium">{e.label}</p><p className="text-sm text-muted">{fmtDateTime(e.createdAt)}</p></li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
