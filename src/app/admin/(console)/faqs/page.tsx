import { requireStaff } from '@/server/rbac';
import { db } from '@/server/db';
import { PageHeader, Badge } from '@/components/ui';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { deleteFaqAction, saveFaqAction } from '../content-actions';

export const metadata = { title: 'FAQs' };

function FaqForm({ f }: { f?: { id: string; question: string; answer: string; category: string; sortOrder: number; visible: boolean } }) {
  return (
    <ActionForm action={saveFaqAction} className="space-y-3" resetOnSuccess={!f}>
      {f && <input type="hidden" name="id" value={f.id} />}
      <Field name="question" label="Question" required defaultValue={f?.question} />
      <Field name="answer" type="textarea" rows={4} label="Answer" required defaultValue={f?.answer} />
      <div className="grid gap-3 sm:grid-cols-3"><Field name="category" label="Group" defaultValue={f?.category ?? 'General'} /><Field name="sortOrder" type="number" label="Order" defaultValue={f?.sortOrder ?? 0} min={0} /><Field name="visible" type="checkbox" label="Show on the website" defaultValue={f?.visible ?? true} className="self-end pb-3" /></div>
      <SubmitButton className="btn btn-primary btn-sm">{f ? 'Save' : 'Add question'}</SubmitButton>
    </ActionForm>
  );
}

export default async function Faqs() {
  await requireStaff('content.manage');
  const rows = await db.faq.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
  return (
    <div className="max-w-4xl">
      <PageHeader title="FAQs" eyebrow="Website">Questions shown on the Help page. Write answers you can stand behind; do not give medical advice here.</PageHeader>
      <details className="panel panel-pad mb-5"><summary className="cursor-pointer font-display font-semibold">Add a question</summary><div className="mt-4"><FaqForm /></div></details>
      <ul className="space-y-3">{rows.map((f) => (
        <li key={f.id} className="panel"><details><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4"><span className="font-medium">{f.question}</span><span className="flex gap-2"><Badge>{f.category}</Badge>{f.visible ? <Badge tone="good">Shown</Badge> : <Badge tone="warn">Hidden</Badge>}</span></summary>
          <div className="space-y-4 border-t border-line p-4"><FaqForm f={f} />
            <ActionForm action={deleteFaqAction}><input type="hidden" name="id" value={f.id} /><SubmitButton className="btn btn-danger btn-sm">Delete question</SubmitButton></ActionForm></div></details></li>
      ))}</ul>
      {rows.length === 0 && <p className="text-muted">No questions yet.</p>}
    </div>
  );
}
