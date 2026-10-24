'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { applyCouponAction, removeItemAction, setQuantityAction } from '@/app/(site)/shop-actions';
import { Icon } from './Icon';

function Btn({ q, label, icon, disabled }: { q: number; label: string; icon: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" name="quantity" value={q} aria-label={label} disabled={disabled || pending}><Icon name={icon} size={17} /></button>;
}

export function CartQty({ productId, quantity, max, name }: { productId: string; quantity: number; max: number; name: string }) {
  const [state, action] = useActionState(setQuantityAction, null);
  return (
    <form action={action} className="inline-flex flex-col items-start">
      <input type="hidden" name="productId" value={productId} />
      <div className="stepper" role="group" aria-label={`Quantity of ${name}`}>
        <Btn q={quantity - 1} label={`One fewer ${name}`} icon="minus" disabled={quantity <= 1} />
        <output aria-live="polite">{quantity}</output>
        <Btn q={quantity + 1} label={`One more ${name}`} icon="plus" disabled={quantity >= max} />
      </div>
      {state?.error && <p className="field-error" role="alert">{state.error}</p>}
    </form>
  );
}

export function RemoveItem({ productId, name }: { productId: string; name: string }) {
  const [, action] = useActionState(removeItemAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-red-ink min-h-[2.25rem]" aria-label={`Remove ${name}`}><Icon name="trash" size={16} />Remove</button>
    </form>
  );
}

export function CouponForm() {
  const [state, action] = useActionState(applyCouponAction, null);
  return (
    <form action={action} className="mt-4">
      <label htmlFor="coupon" className="label">Promo code</label>
      <div className="flex gap-2"><input id="coupon" name="code" className="input uppercase" autoComplete="off" placeholder="Enter code" maxLength={30} /><button className="btn btn-outline" type="submit">Apply</button></div>
      {state?.error && <p className="field-error" role="alert">{state.error}</p>}
      {state?.ok && <p className="hint" role="status">{state.message}</p>}
    </form>
  );
}
