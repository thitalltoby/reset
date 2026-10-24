import { requireStaff } from '@/server/rbac';
import { adminCategories } from '@/server/products';
import { PageHeader, Badge } from '@/components/ui';
import { ActionForm, ActionButton, Field, SubmitButton } from '@/components/ActionForm';
import { ART_KEYS, ART_LABELS } from '@/components/ProductArt';
import { can } from '@/lib/permissions';
import { deleteCategoryAction, saveCategoryAction } from '../products/actions';

export const metadata = { title: 'Categories' };
type C = Awaited<ReturnType<typeof adminCategories>>[number];

function CatForm({ c, tops, edit }: { c?: C; tops: C[]; edit: boolean }) {
  return (
    <ActionForm action={saveCategoryAction} className="space-y-4" resetOnSuccess={!c}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <fieldset disabled={!edit} className="grid gap-4 md:grid-cols-2">
        <Field name="name" label="Name" required defaultValue={c?.name} />
        <Field name="parentId" type="select" label="Inside" defaultValue={c?.parentId ?? ''} options={[{ value: '', label: 'Top level' }, ...tops.filter((t) => t.id !== c?.id).map((t) => ({ value: t.id, label: t.name }))]} />
        <Field name="blurb" label="Short description" defaultValue={c?.blurb} className="md:col-span-2" />
        <Field name="art" type="select" label="Illustration" defaultValue={c?.art ?? 'pill'} options={ART_KEYS.map((k) => ({ value: k, label: ART_LABELS[k] ?? k }))} />
        <Field name="sortOrder" type="number" label="Order" defaultValue={c?.sortOrder ?? 0} min={0} />
        <Field name="slug" label="Web address (optional)" defaultValue={c?.slug} />
        <Field name="visible" type="checkbox" label="Show in the shop" defaultValue={c?.visible ?? true} className="md:pt-8" />
      </fieldset>
      {edit && <SubmitButton className="btn btn-primary btn-sm">{c ? 'Save' : 'Add category'}</SubmitButton>}
    </ActionForm>
  );
}

export default async function CategoriesPage() {
  const user = await requireStaff('product.view');
  const cats = await adminCategories();
  const edit = can(user.role, 'product.manage');
  const tops = cats.filter((c) => !c.parentId);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Categories" eyebrow="Catalogue">Categories go two levels deep: a top level and one level inside it.</PageHeader>
      <div className="space-y-3">
        {cats.map((c) => (
          <details key={c.id} className="panel panel-pad">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 font-display font-semibold"><span>{c.parent ? `${c.parent.name} › ` : ''}{c.name}</span><span className="flex items-center gap-2 text-sm font-normal text-muted">{c._count.products} product{c._count.products === 1 ? '' : 's'}{!c.visible && <Badge>Hidden</Badge>}</span></summary>
            <div className="mt-4"><CatForm c={c} tops={tops} edit={edit} />{edit && <div className="mt-3"><ActionButton action={deleteCategoryAction} hidden={{ id: c.id }} className="btn btn-danger btn-sm">Delete</ActionButton></div>}</div>
          </details>
        ))}
      </div>
      {edit && <section className="panel panel-pad mt-6" aria-labelledby="nc"><h2 id="nc" className="!text-lg">Add a category</h2><div className="mt-4"><CatForm tops={tops} edit /></div></section>}
    </div>
  );
}
