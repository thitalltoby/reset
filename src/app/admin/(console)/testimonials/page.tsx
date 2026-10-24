import { requireStaff } from '@/server/rbac';
import { db } from '@/server/db';
import { PageHeader, Badge, Alert } from '@/components/ui';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { deleteTestimonialAction, saveTestimonialAction } from '../content-actions';

export const metadata = { title: 'Testimonials' };

type T = { id: string; name: string; detail: string | null; quote: string; approved: boolean; sortOrder: number };
function TForm({ t }: { t?: T }) {
  return (
    <ActionForm action={saveTestimonialAction} className="space-y-3" resetOnSuccess={!t}>
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="grid gap-3 sm:grid-cols-2"><Field name="name" label="Name as they agreed to be shown" required defaultValue={t?.name} /><Field name="detail" label="Detail (optional)" hint="For example “Customer since 2024”." defaultValue={t?.detail} /></div>
      <Field name="quote" type="textarea" rows={3} label="What they said" required defaultValue={t?.quote} hint="Their own words. Do not edit meaning." />
      <div className="grid gap-3 sm:grid-cols-2"><Field name="sortOrder" type="number" label="Order" min={0} defaultValue={t?.sortOrder ?? 0} /><Field name="approved" type="checkbox" label="They agreed to this being shown publicly" defaultValue={t?.approved ?? false} className="self-end pb-3" /></div>
      <SubmitButton className="btn btn-primary btn-sm">{t ? 'Save' : 'Add testimonial'}</SubmitButton>
    </ActionForm>
  );
}

export default async function Testimonials() {
  await requireStaff('content.manage');
  const rows = await db.testimonial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Testimonials" eyebrow="Website">Only real words from real customers who said yes. Nothing is shown on the live site until you tick the agreement box.</PageHeader>
      <div className="mb-5"><Alert tone="warn">Never write or “tidy” a testimonial yourself. Keep proof of the customer’s permission.</Alert></div>
      <details className="panel panel-pad mb-5"><summary className="cursor-pointer font-display font-semibold">Add a testimonial</summary><div className="mt-4"><TForm /></div></details>
      <ul className="space-y-3">{rows.map((t) => (
        <li key={t.id} className="panel"><details><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4"><span><span className="font-medium">{t.name}</span> <span className="line-clamp-1 text-sm text-muted">{t.quote}</span></span>{t.approved ? <Badge tone="good">Approved</Badge> : <Badge tone="warn">Not approved</Badge>}</summary>
          <div className="space-y-4 border-t border-line p-4"><TForm t={t} /><ActionForm action={deleteTestimonialAction}><input type="hidden" name="id" value={t.id} /><SubmitButton className="btn btn-danger btn-sm">Delete</SubmitButton></ActionForm></div></details></li>
      ))}</ul>
      {rows.length === 0 && <p className="text-muted">None yet.</p>}
    </div>
  );
}
