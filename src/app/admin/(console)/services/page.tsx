import { requireStaff } from '@/server/rbac';
import { db } from '@/server/db';
import { PageHeader, Badge, Alert } from '@/components/ui';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { ART_KEYS, ART_LABELS } from '@/components/ProductArt';
import { deleteServiceAction, saveServiceAction } from '../content-actions';

export const metadata = { title: 'Services' };

type S = { id: string; title: string; slug: string; summary: string; description: string; benefits: string[]; conditions: string | null; action: string; ctaLabel: string; icon: string; confirmed: boolean; sortOrder: number; isDemo: boolean };
function SForm({ s }: { s?: S }) {
  return (
    <ActionForm action={saveServiceAction} className="space-y-3" resetOnSuccess={!s}>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-3 sm:grid-cols-2"><Field name="title" label="Service name" required defaultValue={s?.title} /><Field name="slug" label="Web address (optional)" defaultValue={s?.slug} hint="Made from the name if left empty." /></div>
      <Field name="summary" label="One-line summary" required defaultValue={s?.summary} maxLength={300} />
      <Field name="description" type="textarea" rows={5} label="Full description" defaultValue={s?.description} />
      <Field name="benefits" type="textarea" rows={4} label="What is included (one per line)" defaultValue={s?.benefits.join('\n')} />
      <Field name="conditions" type="textarea" rows={2} label="Conditions or limits (optional)" defaultValue={s?.conditions} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field name="action" type="select" label="Button leads to" defaultValue={s?.action ?? 'ENQUIRY'} options={[{ value: 'ENQUIRY', label: 'An enquiry form' }, { value: 'PRESCRIPTION', label: 'Send a prescription' }, { value: 'CONTACT', label: 'Contact page' }]} />
        <Field name="ctaLabel" label="Button text" defaultValue={s?.ctaLabel ?? 'Ask about this service'} />
        <Field name="icon" type="select" label="Picture" defaultValue={s?.icon ?? 'pill'} options={ART_KEYS.map((k) => ({ value: k, label: ART_LABELS[k] ?? k }))} />
        <Field name="sortOrder" type="number" min={0} label="Order" defaultValue={s?.sortOrder ?? 0} />
      </div>
      <Field name="confirmed" type="checkbox" label="Reset confirms it offers this service — show it publicly" defaultValue={s?.confirmed ?? false} hint="Tick only once the service is real, staffed and permitted." />
      <SubmitButton className="btn btn-primary btn-sm">{s ? 'Save' : 'Add service'}</SubmitButton>
    </ActionForm>
  );
}

export default async function Services() {
  await requireStaff('content.manage');
  const rows = await db.pharmacyService.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Pharmacy services" eyebrow="Website">What Reset offers in person. On the live site a service appears only after you tick “confirmed”.</PageHeader>
      <div className="mb-5"><Alert tone="warn">Samples shipped in demo mode are placeholders. Replace or delete them and add only services Reset really provides.</Alert></div>
      <details className="panel panel-pad mb-5"><summary className="cursor-pointer font-display font-semibold">Add a service</summary><div className="mt-4"><SForm /></div></details>
      <ul className="space-y-3">{rows.map((s) => (
        <li key={s.id} className="panel"><details><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4"><span className="font-medium">{s.title}</span><span className="flex gap-2">{s.isDemo && <Badge tone="info">Demo sample</Badge>}{s.confirmed ? <Badge tone="good">Confirmed</Badge> : <Badge tone="warn">Not confirmed</Badge>}</span></summary>
          <div className="space-y-4 border-t border-line p-4"><SForm s={s} /><ActionForm action={deleteServiceAction}><input type="hidden" name="id" value={s.id} /><SubmitButton className="btn btn-danger btn-sm">Delete service</SubmitButton></ActionForm></div></details></li>
      ))}</ul>
    </div>
  );
}
