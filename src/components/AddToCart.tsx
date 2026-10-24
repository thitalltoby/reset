'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { addToCartAction } from '@/app/(site)/shop-actions';
import { Icon } from './Icon';

function Toast({ ok, text }: { ok: boolean; text: string }) {
  const [shown, setShown] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShown(false), ok ? 4500 : 7000); return () => clearTimeout(t); }, [ok, text]);
  if (!shown) return null;
  return (
    <div className="toast" role={ok ? 'status' : 'alert'} style={ok ? undefined : { background: '#8e1c17' }}>
      <span>{text}</span>
      {ok && <Link href="/cart">View basket</Link>}
      <button type="button" aria-label="Dismiss" onClick={() => setShown(false)} className="text-white/80"><Icon name="x" size={16} /></button>
    </div>
  );
}

function IconSubmit({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="add-btn" disabled={pending} aria-label={`Add ${name} to basket`}>{pending ? <Icon name="refresh" size={20} className="animate-spin" /> : <Icon name="plus" size={22} />}</button>;
}
function FullSubmit({ pendingText }: { pendingText: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-primary btn-lg flex-1" disabled={pending}><Icon name="bag" size={20} />{pending ? pendingText : 'Add to basket'}</button>;
}

/** Round "+" button for product cards. */
export function AddToCartIcon({ productId, name }: { productId: string; name: string }) {
  const [state, action] = useActionState(addToCartAction, null);
  return (
    <form action={action} className="raise">
      <input type="hidden" name="productId" value={productId} /><input type="hidden" name="quantity" value="1" />
      <IconSubmit name={name} />
      {state && (state.message || state.error) && <Toast key={state.nonce} ok={!!state.ok} text={(state.ok ? state.message : state.error) ?? ''} />}
    </form>
  );
}

/** Quantity stepper and "Add to basket" for the product page. */
export function AddToCartFull({ productId, max }: { productId: string; max: number }) {
  const [state, action] = useActionState(addToCartAction, null);
  const [qty, setQty] = useState(1);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="productId" value={productId} /><input type="hidden" name="quantity" value={qty} />
      <div className="stepper" role="group" aria-label="Quantity">
        <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="One fewer"><Icon name="minus" size={18} /></button>
        <output aria-live="polite">{qty}</output>
        <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} aria-label="One more"><Icon name="plus" size={18} /></button>
      </div>
      <FullSubmit pendingText="Adding…" />
      {state && (state.message || state.error) && <Toast key={state.nonce} ok={!!state.ok} text={(state.ok ? state.message : state.error) ?? ''} />}
    </form>
  );
}
