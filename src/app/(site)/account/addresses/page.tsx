import { requireCustomer } from '@/server/rbac';
import { listAddresses } from '@/server/account';
import { ActionForm, ActionButton, Field, SubmitButton } from '@/components/ActionForm';
import { Badge } from '@/components/ui';
import { deleteAddressAction, saveAddressAction } from '../actions';

export const metadata = { title: 'Your addresses' };

type A = Awaited<ReturnType<typeof listAddresses>>[number];

function AddressForm({ a, name, phone }: { a?: A; name: string; phone: string }) {
  return (
    <ActionForm action={saveAddressAction} className="space-y-4" resetOnSuccess={!a}>
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="label" label="Label" defaultValue={a?.label ?? 'Home'} hint="Home, Work, Mum’s…" />
        <Field name="recipient" label="Who will receive it" required defaultValue={a?.recipient ?? name} />
        <Field name="phone" type="tel" label="Phone" required defaultValue={a?.phone ?? phone} />
        <Field name="line1" label="Street address" required defaultValue={a?.line1 ?? ''} />
        <Field name="line2" label="Apartment, landmark" defaultValue={a?.line2 ?? ''} />
        <Field name="city" label="Town or city" required defaultValue={a?.city ?? ''} />
        <Field name="state" label="State" required defaultValue={a?.state ?? ''} />
        <Field name="notes" label="Delivery notes" defaultValue={a?.notes ?? ''} />
      </div>
      <Field name="isDefault" type="checkbox" label="Use as my default address" defaultValue={a?.isDefault ?? false} />
      <SubmitButton className="btn btn-primary btn-sm">{a ? 'Save changes' : 'Add address'}</SubmitButton>
    </ActionForm>
  );
}

export default async function Addresses() {
  const u = await requireCustomer('/account/addresses');
  const list = await listAddresses(u.id);
  return (
    <div className="space-y-6">
      <h2 className="!text-xl">Saved addresses</h2>
      {list.map((a) => (
        <details key={a.id} className="card card-pad">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 font-display font-semibold"><span>{a.label} {a.isDefault && <Badge tone="good">Default</Badge>}<span className="block text-sm font-normal text-muted">{a.line1}, {a.city}, {a.state}</span></span><span className="text-sm text-forest">Edit</span></summary>
          <div className="mt-4"><AddressForm a={a} name={u.name} phone="" /><div className="mt-3"><ActionButton action={deleteAddressAction} hidden={{ id: a.id }} className="btn btn-danger btn-sm">Remove this address</ActionButton></div></div>
        </details>
      ))}
      <section className="card card-pad" aria-labelledby="na"><h3 id="na" className="!text-lg">Add an address</h3><div className="mt-4"><AddressForm name={u.name} phone="" /></div></section>
    </div>
  );
}
