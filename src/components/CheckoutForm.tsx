'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ActionForm, Field, SubmitButton } from './ActionForm';
import { Icon } from './Icon';
import { formatNaira } from '@/lib/money';
import { computeTotals } from '@/lib/pricing';
import type { FormState } from '@/server/action-utils';

export interface ZoneOpt { id: string; name: string; areas: string; feeKobo: number; freeOverKobo: number | null; etaText: string }
export interface SavedAddress { id: string; label: string; recipient: string; phone: string; line1: string; line2: string | null; city: string; state: string; notes: string | null; isDefault: boolean }
export interface CheckoutLine { productId: string; name: string; packSize: string | null; quantity: number; lineKobo: number }

export function CheckoutForm(p: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  lines: CheckoutLine[]; subtotalKobo: number; discountKobo: number; couponCode: string | null; minOrderKobo: number;
  zones: ZoneOpt[]; delivery: boolean; pickup: boolean; paystack: boolean; payOnDelivery: boolean; pickupNote: string; pickupAddress: string;
  customer: { name: string; email: string; phone: string; marketing: boolean } | null; addresses: SavedAddress[];
}) {
  const [fulfilment, setFulfilment] = useState<'DELIVERY' | 'PICKUP'>(p.delivery ? 'DELIVERY' : 'PICKUP');
  const [pay, setPay] = useState<'PAYSTACK' | 'ON_DELIVERY'>(p.paystack ? 'PAYSTACK' : 'ON_DELIVERY');
  const [zoneId, setZoneId] = useState(p.zones[0]?.id ?? '');
  const [addrId, setAddrId] = useState(p.addresses.find((a) => a.isDefault)?.id ?? p.addresses[0]?.id ?? '');
  const addr = p.addresses.find((a) => a.id === addrId);
  const zone = p.zones.find((z) => z.id === zoneId) ?? null;

  const totals = useMemo(
    () => computeTotals([{ unitKobo: p.subtotalKobo, quantity: 1 }], {
      coupon: p.discountKobo > 0 ? { kind: 'FIXED', value: p.discountKobo, minSubtotalKobo: 0, startsAt: null, endsAt: null, usageLimit: null, usedCount: 0, active: true } : null,
      fulfilment, zone,
    }),
    [p.subtotalKobo, p.discountKobo, fulfilment, zone],
  );
  const belowMin = p.minOrderKobo > 0 && p.subtotalKobo < p.minOrderKobo;
  const needsZone = fulfilment === 'DELIVERY' && !zone;

  return (
    <ActionForm action={p.action} className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <section className="card card-pad" aria-labelledby="ck-contact">
          <h2 id="ck-contact" className="!text-xl">1. Your details</h2>
          {!p.customer && <p className="mt-1 text-sm text-muted">Checking out as a guest. Already have an account? <Link href="/login?next=/checkout">Sign in</Link>.</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Full name" required autoComplete="name" defaultValue={p.customer?.name ?? ''} className="sm:col-span-2" />
            <Field name="email" type="email" label="Email address" required autoComplete="email" defaultValue={p.customer?.email ?? ''} hint="Your confirmation and tracking link go here." />
            <Field name="phone" type="tel" label="Phone number" required autoComplete="tel" defaultValue={p.customer?.phone ?? ''} hint="Only used if we need to reach you about this order." />
          </div>
        </section>

        <section className="card card-pad" aria-labelledby="ck-ful">
          <h2 id="ck-ful" className="!text-xl">2. Delivery or collection</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="ck-ful">
            {p.delivery && (
              <label className="choice"><input type="radio" name="fulfilment" value="DELIVERY" checked={fulfilment === 'DELIVERY'} onChange={() => setFulfilment('DELIVERY')} className="mt-1 accent-[#006b45]" />
                <span><span className="flex items-center gap-2 font-display font-semibold"><Icon name="truck" size={18} />Delivery</span><span className="block text-sm text-muted">To your door</span></span></label>
            )}
            {p.pickup && (
              <label className="choice"><input type="radio" name="fulfilment" value="PICKUP" checked={fulfilment === 'PICKUP'} onChange={() => setFulfilment('PICKUP')} className="mt-1 accent-[#006b45]" />
                <span><span className="flex items-center gap-2 font-display font-semibold"><Icon name="store" size={18} />Collect in store</span><span className="block text-sm text-muted">Free. We tell you when it is ready.</span></span></label>
            )}
          </div>

          {fulfilment === 'PICKUP' && (p.pickupNote || p.pickupAddress) && (
            <div className="mt-4 rounded-2xl bg-mist p-4 text-[.95rem]">{p.pickupAddress && <p className="whitespace-pre-line"><strong>Collect from:</strong> {p.pickupAddress}</p>}{p.pickupNote && <p className="mt-1 whitespace-pre-line">{p.pickupNote}</p>}</div>
          )}

          {fulfilment === 'DELIVERY' && (
            <div className="mt-5 space-y-4">
              {p.addresses.length > 0 && (
                <div>
                  <label htmlFor="saved-addr" className="label">Use a saved address</label>
                  <select id="saved-addr" className="select" value={addrId} onChange={(e) => setAddrId(e.target.value)}>
                    <option value="">Enter a new address</option>
                    {p.addresses.map((a) => <option key={a.id} value={a.id}>{a.label}: {a.line1}, {a.city}</option>)}
                  </select>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2" key={addrId || 'new'}>
                <Field name="line1" label="Street address" required autoComplete="address-line1" defaultValue={addr?.line1 ?? ''} className="sm:col-span-2" />
                <Field name="line2" label="Apartment, landmark (optional)" autoComplete="address-line2" defaultValue={addr?.line2 ?? ''} className="sm:col-span-2" />
                <Field name="city" label="Town or city" required autoComplete="address-level2" defaultValue={addr?.city ?? ''} />
                <Field name="state" label="State" required autoComplete="address-level1" defaultValue={addr?.state ?? ''} />
                <Field name="addrNotes" label="Delivery notes (optional)" defaultValue={addr?.notes ?? ''} className="sm:col-span-2" hint="Gate code, nearest landmark, who to ask for." />
              </div>
              <div>
                <p className="label" id="zone-l">Delivery area<span className="req" aria-hidden="true">*</span></p>
                {p.zones.length === 0 ? <p className="text-sm text-red-ink">Delivery areas have not been set up yet. Please choose collection or contact us.</p> : (
                  <div className="grid gap-3" role="radiogroup" aria-labelledby="zone-l">
                    {p.zones.map((z) => (
                      <label key={z.id} className="choice">
                        <input type="radio" name="zoneId" value={z.id} checked={zoneId === z.id} onChange={() => setZoneId(z.id)} className="mt-1 accent-[#006b45]" />
                        <span className="flex-1">
                          <span className="flex flex-wrap justify-between gap-2 font-display font-semibold"><span>{z.name}</span><span>{formatNaira(z.feeKobo)}</span></span>
                          <span className="block text-sm text-muted">{[z.areas, z.etaText, z.freeOverKobo !== null ? `Free over ${formatNaira(z.freeOverKobo)}` : ''].filter(Boolean).join(' · ')}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {p.customer && <Field name="saveAddress" type="checkbox" label="Save this address to my account" />}
            </div>
          )}
        </section>

        <section className="card card-pad" aria-labelledby="ck-pay">
          <h2 id="ck-pay" className="!text-xl">3. Payment</h2>
          <div className="mt-4 grid gap-3" role="radiogroup" aria-labelledby="ck-pay">
            {p.paystack && (
              <label className="choice"><input type="radio" name="paymentMethod" value="PAYSTACK" checked={pay === 'PAYSTACK'} onChange={() => setPay('PAYSTACK')} className="mt-1 accent-[#006b45]" />
                <span><span className="flex items-center gap-2 font-display font-semibold"><Icon name="card" size={18} />Card, bank transfer or USSD</span><span className="block text-sm text-muted">Secure payment on Paystack. We never see your card details. Your order is confirmed once Paystack confirms the payment.</span></span></label>
            )}
            {p.payOnDelivery && (
              <label className="choice"><input type="radio" name="paymentMethod" value="ON_DELIVERY" checked={pay === 'ON_DELIVERY'} onChange={() => setPay('ON_DELIVERY')} className="mt-1 accent-[#006b45]" />
                <span><span className="flex items-center gap-2 font-display font-semibold"><Icon name="cash" size={18} />Pay when {fulfilment === 'PICKUP' ? 'you collect' : 'it is delivered'}</span><span className="block text-sm text-muted">Your order is confirmed straight away.</span></span></label>
            )}
          </div>
          <div className="mt-5"><Field name="note" type="textarea" rows={2} label="Anything we should know? (optional)" hint="Please do not put medical details here." /></div>
        </section>

        <section className="card card-pad space-y-3" aria-label="Communication preferences">
          <Field name="marketing" type="checkbox" label="Email me offers and health tips (optional)" defaultValue={p.customer?.marketing ?? false} hint="Order messages are always sent. Unsubscribe any time." />
          <Field name="sms" type="checkbox" label="Text me delivery updates (optional)" />
        </section>
      </div>

      <aside className="lg:sticky lg:top-32 self-start" aria-label="Order summary">
        <div className="card card-pad">
          <h2 className="!text-xl">Your order</h2>
          <ul className="mt-3 divide-y divide-line text-[.95rem]">
            {p.lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-3 py-2.5">
                <span className="min-w-0"><span className="font-medium">{l.quantity} × {l.name}</span>{l.packSize && <span className="block text-sm text-muted">{l.packSize}</span>}</span>
                <span className="tabular-nums">{formatNaira(l.lineKobo)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2 border-t border-line pt-3">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatNaira(totals.subtotalKobo)}</dd></div>
            {totals.discountKobo > 0 && <div className="flex justify-between text-forest"><dt>Code {p.couponCode}</dt><dd className="tabular-nums">−{formatNaira(totals.discountKobo)}</dd></div>}
            <div className="flex justify-between"><dt>{fulfilment === 'PICKUP' ? 'Collection' : 'Delivery'}</dt><dd className="tabular-nums">{fulfilment === 'PICKUP' ? 'Free' : zone ? (totals.deliveryKobo === 0 ? 'Free' : formatNaira(totals.deliveryKobo)) : 'Choose an area'}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 font-display text-xl font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatNaira(totals.totalKobo)}</dd></div>
          </dl>
          {belowMin && <p className="mt-3 text-sm text-red-ink" role="alert">The smallest order we accept is {formatNaira(p.minOrderKobo)}.</p>}
          <SubmitButton className="btn btn-primary btn-lg btn-block mt-5" pending={pay === 'PAYSTACK' ? 'Taking you to payment…' : 'Placing your order…'}>
            {pay === 'PAYSTACK' ? `Pay ${formatNaira(totals.totalKobo)}` : 'Place order'}
          </SubmitButton>
          {needsZone && <p className="mt-2 text-sm text-muted">Choose a delivery area to continue.</p>}
          <p className="mt-4 flex items-start gap-2 text-sm text-muted"><Icon name="lock" size={16} className="mt-0.5 flex-none text-forest" /><span>Prices and stock are checked again when you order. By ordering you agree to our <Link href="/terms">terms of sale</Link>.</span></p>
        </div>
        <p className="mt-4 text-center"><Link href="/cart" className="link-arrow">Back to basket</Link></p>
      </aside>
    </ActionForm>
  );
}
