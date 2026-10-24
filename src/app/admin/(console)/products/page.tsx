/* eslint-disable @next/next/no-html-link-for-pages -- the CSV template and export are file downloads, not pages */
import Link from 'next/link';
import { requireStaff } from '@/server/rbac';
import { adminCategories, adminListProducts } from '@/server/products';
import { PageHeader, Alert, Pagination, Empty, qs } from '@/components/ui';
import { BulkTable } from '@/components/BulkTable';
import { can } from '@/lib/permissions';
import { catalogueTodo } from '@/server/catalogue-check';

export const metadata = { title: 'Products' };
type SP = { q?: string; category?: string; status?: string; classification?: string; stock?: 'low' | 'out'; page?: string; notice?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireStaff('product.view');
  const sp = await searchParams;
  const [{ rows, total, page, pages }, cats] = await Promise.all([adminListProducts(user, { ...sp, page: Number(sp.page) || 1 }), adminCategories()]);
  const edit = can(user.role, 'product.manage');
  return (
    <div>
      <PageHeader title="Products" eyebrow="Catalogue" actions={edit ? <><Link href="/admin/products/import" className="btn btn-outline btn-sm">Import CSV</Link><a href="/admin/products/export" className="btn btn-outline btn-sm">Export CSV</a><Link href="/admin/products/new" className="btn btn-primary btn-sm">Add product</Link></> : undefined}>{total} product{total === 1 ? '' : 's'}.</PageHeader>
      {sp.notice && <div className="mb-4"><Alert tone="ok">{sp.notice}</Alert></div>}
      <form className="panel panel-pad mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto]" role="search" aria-label="Filter products">
        <div><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={sp.q ?? ''} className="input" placeholder="Name, SKU, brand or barcode" /></div>
        <div><label className="label" htmlFor="category">Category</label><select id="category" name="category" className="select" defaultValue={sp.category ?? ''}><option value="">All</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} › ` : ''}{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="status">Status</label><select id="status" name="status" className="select" defaultValue={sp.status ?? ''}><option value="">Any</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option></select></div>
        <div><label className="label" htmlFor="classification">Sold as</label><select id="classification" name="classification" className="select" defaultValue={sp.classification ?? ''}><option value="">Any</option><option value="OTC">Over the counter</option><option value="PHARMACY_ONLY">Pharmacist only</option><option value="PRESCRIPTION">Prescription</option></select></div>
        <div><label className="label" htmlFor="stock">Stock</label><select id="stock" name="stock" className="select" defaultValue={sp.stock ?? ''}><option value="">Any</option><option value="low">Low</option><option value="out">Out</option></select></div>
        <div className="flex items-end"><button className="btn btn-primary" type="submit">Filter</button></div>
      </form>
      {rows.length === 0 ? <Empty title="No products found" action={edit ? <Link href="/admin/products/new" className="btn btn-primary">Add the first product</Link> : undefined}>Try clearing the filters, or import your catalogue from a CSV file.</Empty> : (
        <BulkTable canEdit={edit} rows={rows.map((p) => ({ id: p.id, name: p.name, sku: p.sku, category: p.category.name, price: p.priceKobo, stock: p.stock, reorder: p.reorderLevel, status: p.status, classification: p.classification, demo: p.isDemo, todo: catalogueTodo(p) }))} />
      )}
      <Pagination page={page} pages={pages} hrefFor={(n) => `/admin/products${qs({ ...sp, page: n, notice: undefined })}`} />
    </div>
  );
}
