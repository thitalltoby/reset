import { requireStaff } from '@/server/rbac';
import { db } from '@/server/db';
import { PageHeader, Badge, Alert } from '@/components/ui';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { formatNaira } from '@/lib/money';
import { deleteZoneAction, saveZoneAction } from '../content-actions';

export const metadata = { title: 'Delivery zones' };

type Z = { id: string; name: string; areas: string; feeKobo: number; freeOverKobo: number | null; etaText: string; active: boolean; sortOrder: number };
function ZForm({ z }: { z?: Z }) {
  return (
    <ActionForm action={saveZoneAction} className="space-y-3" resetOnSuccess={!z}>
      {z && <input type="hidden" name="id" value={z.id} />}
      <div className="grid gap-3 sm:grid-cols-2"><Field name="name" label="Zone name" required defaultValue={z?.name} /><Field name="etaText" label="Typical time" hint="For example “Same day if ordered before 2pm”." defaultValue={z?.etaText} /></div>
      <Field name="areas" type="textarea" rows={2} label="Areas covered" defaultValue={z?.areas} hint="Shown to customers at checkout." />
      <div className="grid gap-3 sm:grid-cols-3"><Field name="fee" type="number" step="0.01" min={0} label="Delivery charge (₦)" required defaultValue={z ? z.feeKobo / 100 : ''} /><Field name="freeOver" type="number" step="0.01" min={0} label="Free above (₦, optional)" defaultValue={z?.freeOverKobo != null ? z.freeOverKobo / 100 : ''} /><Field name="sortOrder" type="number" min={0} label="Order" defaultValue={z?.sortOrder ?? 0} /></div>
      <Field name="active" type="checkbox" label="Offer this zone at checkout" defaultValue={z?.active ?? true} />
      <SubmitButton className="btn btn-primary btn-sm">{z ? 'Save' : 'Add zone'}</SubmitButton>
    </ActionForm>
  );
}

export default async function Delivery() {
  await requireStaff('promo.manage');
  const rows = await db.deliveryZone.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Delivery zones" eyebrow="Sell">Where you deliver, what it costs and how long it takes. With no active zone, checkout offers pickup only.</PageHeader>
      <div className="mb-5"><Alert tone="warn">Delivery areas, charges and times are set by the pharmacy. Enter only what you can honour.</Alert></div>
      <details className="panel panel-pad mb-5"><summary className="cursor-pointer font-display font-semibold">Add a zone</summary><div className="mt-4"><ZForm /></div></details>
      <ul className="space-y-3">{rows.map((z) => (
        <li key={z.id} className="panel"><details><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4"><span className="font-medium">{z.name} <span className="text-sm font-normal text-muted">{formatNaira(z.feeKobo)}</span></span>{z.active ? <Badge tone="good">Active</Badge> : <Badge>Off</Badge>}</summary>
          <div className="space-y-4 border-t border-line p-4"><ZForm z={z} /><ActionForm action={deleteZoneAction}><input type="hidden" name="id" value={z.id} /><SubmitButton className="btn btn-danger btn-sm">Delete zone</SubmitButton></ActionForm></div></details></li>
      ))}</ul>
      {rows.length === 0 && <p className="text-muted">No zones yet — checkout is pickup only.</p>}
    </div>
  );
}
