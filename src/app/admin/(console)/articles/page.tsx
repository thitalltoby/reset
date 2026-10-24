import { requireStaff } from '@/server/rbac';
import { db } from '@/server/db';
import { PageHeader, Badge, Alert } from '@/components/ui';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { ART_KEYS, ART_LABELS } from '@/components/ProductArt';
import { articleSources } from '@/server/content';
import { listMedia } from '@/server/media';
import { deleteArticleAction, saveArticleAction } from '../content-actions';

export const metadata = { title: 'Health articles' };

type A = { id: string; title: string; slug: string; excerpt: string; body: string; category: string; art: string; imageId: string | null; status: string; needsReview: boolean; reviewedBy: string | null; readMinutes: number; sources: unknown };
function AForm({ a, media }: { a?: A; media: { id: string; title: string | null }[] }) {
  const src = a ? articleSources(a).map((s) => `${s.title} | ${s.url}`).join('\n') : '';
  return (
    <ActionForm action={saveArticleAction} className="space-y-3" resetOnSuccess={!a} encType="multipart/form-data">
      {a && <input type="hidden" name="id" value={a.id} />}
      <Field name="title" label="Title" required defaultValue={a?.title} />
      <Field name="excerpt" type="textarea" rows={2} label="Summary" required defaultValue={a?.excerpt} />
      <Field name="body" type="textarea" rows={14} label="Article (Markdown)" required defaultValue={a?.body} hint="Use ## headings, - lists and **bold**. Raw HTML is removed." />
      <Field name="sources" type="textarea" rows={3} label="Sources (one per line)" defaultValue={src} hint="Title | https://address — use authoritative health sources." />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field name="category" label="Topic" defaultValue={a?.category ?? 'Everyday health'} />
        <Field name="readMinutes" type="number" min={1} max={60} label="Minutes to read" defaultValue={a?.readMinutes ?? 4} />
        <Field name="art" type="select" label="Picture if no photo" defaultValue={a?.art ?? 'leaf'} options={ART_KEYS.map((k) => ({ value: k, label: ART_LABELS[k] ?? k }))} />
        <Field name="slug" label="Web address" defaultValue={a?.slug} hint="Optional" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><Field name="image" type="select" label="Photo" defaultValue={a?.imageId ?? ''} options={[{ value: '', label: 'None' }, ...media.map((m) => ({ value: m.id, label: m.title ?? 'Photo' }))]} /><Field name="photo" type="file" label="…or upload a new photo" accept="image/*" /></div>
      <Field name="photoAlt" label="Describe the new photo (for screen readers)" />
      <fieldset className="rounded-xl border border-line p-4"><legend className="px-2 font-display font-semibold">Clinical review</legend>
        <p className="mb-3 text-sm text-muted">The live site shows an article only when it is published and a named pharmacist or health professional has reviewed it.</p>
        <div className="grid gap-3 sm:grid-cols-2"><Field name="reviewed" type="checkbox" label="Reviewed and approved" defaultValue={a ? !a.needsReview : false} /><Field name="reviewedBy" label="Reviewed by (name and title)" defaultValue={a?.reviewedBy} /></div></fieldset>
      <Field name="status" type="select" label="Status" defaultValue={a?.status ?? 'DRAFT'} options={[{ value: 'DRAFT', label: 'Draft — not shown' }, { value: 'PUBLISHED', label: 'Published' }]} />
      <SubmitButton className="btn btn-primary btn-sm">{a ? 'Save' : 'Add article'}</SubmitButton>
    </ActionForm>
  );
}

export default async function Articles() {
  await requireStaff('content.manage');
  const [rows, media] = await Promise.all([db.article.findMany({ orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }] }), listMedia()]);
  const mo = media.map((m) => ({ id: m.id, title: m.title }));
  return (
    <div className="max-w-4xl">
      <PageHeader title="Health articles" eyebrow="Website">Plain-language guidance for customers. These are starting drafts: a pharmacist must read, correct and approve each one before it goes live.</PageHeader>
      <div className="mb-5"><Alert tone="warn">Articles are general information, never a diagnosis or a replacement for seeing a professional. Check the sources and local guidance before approving.</Alert></div>
      <details className="panel panel-pad mb-5"><summary className="cursor-pointer font-display font-semibold">Write an article</summary><div className="mt-4"><AForm media={mo} /></div></details>
      <ul className="space-y-3">{rows.map((a) => (
        <li key={a.id} className="panel"><details><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4"><span className="font-medium">{a.title}</span><span className="flex flex-wrap gap-2"><Badge>{a.category}</Badge>{a.needsReview ? <Badge tone="warn">Needs review</Badge> : <Badge tone="good">Reviewed</Badge>}{a.status === 'PUBLISHED' ? <Badge tone="info">Published</Badge> : <Badge>Draft</Badge>}</span></summary>
          <div className="space-y-4 border-t border-line p-4"><AForm a={a} media={mo} /><ActionForm action={deleteArticleAction}><input type="hidden" name="id" value={a.id} /><SubmitButton className="btn btn-danger btn-sm">Delete article</SubmitButton></ActionForm></div></details></li>
      ))}</ul>
    </div>
  );
}
