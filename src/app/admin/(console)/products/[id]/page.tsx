import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/server/rbac';
import { adminCategories, adminGetProduct, STOCK_REASONS, stockHistory } from '@/server/products';
import { listMedia } from '@/server/media';
import { PageHeader, Alert, Badge } from '@/components/ui';
import { ProductForm } from '@/components/ProductForm';
import { ActionForm, Field, SubmitButton, ActionButton } from '@/components/ActionForm';
import { can } from '@/lib/permissions';
import { fmtDateTime } from '@/lib/format';
import { adjustStockAction, deleteProductAction } from '../actions';

export const metadata = { title: 'Product' };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireStaff('product.view');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const p = await adminGetProduct(user, id);
  if (!p) notFound();
  const [cats, media] = await Promise.all([adminCategories(), listMedia()]);
  const stockOk = can(user.role, 'inventory.manage');
  const history = stockOk ? await stockHistory(user, id, 20) : [];
  return (
    <div>
      <PageHeader title={p.name} eyebrow={<Link href="/admin/products" className="!no-underline">← Products</Link>} actions={p.status === 'PUBLISHED' && p.classification !== 'PRESCRIPTION' ? <Link href={`/product/${p.slug}`} className="btn btn-outline btn-sm" target="_blank">View on site</Link> : undefined}>
        <span className="flex flex-wrap items-center gap-2"><Badge tone={p.status === 'PUBLISHED' ? 'good' : 'neutral'}>{p.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Badge><span>{p.sku}</span>{p.isDemo && <Badge tone="warn">Sample product</Badge>}</span>
      </PageHeader>
      {sp.created && <div className="mb-5"><Alert tone="ok">Product created as a draft. Check the details, then set it to Published.</Alert></div>}
      {p.classification === 'PRESCRIPTION' && <div className="mb-5"><Alert tone="info">Prescription-only products are never shown on the public website.</Alert></div>}
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <ProductForm p={p} categories={cats.map((c) => ({ id: c.id, name: c.name, parent: c.parent?.name }))} media={media.map((m) => ({ id: m.id, title: m.title ?? 'Photo' }))} canEdit={can(user.role, 'product.manage')} />
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          {stockOk && (
            <section className="panel panel-pad" aria-labelledby="st"><h2 id="st" className="!text-lg">Stock: {p.stock}</h2>
              <ActionForm action={adjustStockAction} className="mt-3 space-y-3" resetOnSuccess>
                <input type="hidden" name="productId" value={p.id} />
                <Field name="mode" type="select" label="What happened" defaultValue="add" options={[{ value: 'add', label: 'Add or remove units' }, { value: 'set', label: 'Set to a counted number' }]} />
                <Field name="quantity" type="number" label="Quantity" required min={0} />
                <Field name="reason" type="select" label="Reason" defaultValue="RESTOCK" options={STOCK_REASONS.map((r) => ({ value: r.value, label: r.label }))} hint="“Damaged” removes units; “Stock received” and “Return” add them." />
                <Field name="note" label="Note" hint="Needed for damage and corrections." />
                <SubmitButton className="btn btn-primary btn-sm">Update stock</SubmitButton>
              </ActionForm>
              {history.length > 0 && <><h3 className="mt-5 !text-base">Recent changes</h3><ul className="mt-2 space-y-1.5 text-sm">{history.map((h) => <li key={h.id} className="flex justify-between gap-2"><span>{fmtDateTime(h.createdAt)} · {h.reason.toLowerCase()}{h.note ? ` (${h.note})` : ''}</span><span className="tabular-nums font-medium">{h.delta > 0 ? '+' : ''}{h.delta} → {h.balance}</span></li>)}</ul></>}
            </section>
          )}
          {can(user.role, 'product.manage') && (
            <section className="panel panel-pad" aria-labelledby="dl"><h2 id="dl" className="!text-lg">Remove</h2><p className="mt-1 text-sm text-muted">Products on past orders are taken off the shop instead of deleted.</p>
              <div className="mt-3"><ActionButton action={deleteProductAction} hidden={{ id: p.id }} className="btn btn-danger btn-sm">Delete this product</ActionButton></div></section>
          )}
        </div>
      </div>
    </div>
  );
}
