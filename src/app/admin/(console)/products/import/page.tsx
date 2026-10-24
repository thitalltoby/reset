/* eslint-disable @next/next/no-html-link-for-pages -- the CSV template and export are file downloads, not pages */
import Link from 'next/link';
import { requireStaff } from '@/server/rbac';
import { PageHeader } from '@/components/ui';
import { ImportForm } from '@/components/ImportForm';
import { PRODUCT_CSV_COLUMNS } from '@/server/products';

export const metadata = { title: 'Import products' };

export default async function ImportPage() {
  await requireStaff('product.manage');
  return (
    <div className="max-w-4xl">
      <PageHeader title="Import products from a CSV file" eyebrow={<Link href="/admin/products" className="!no-underline">← Products</Link>}>Load or update your whole catalogue at once. Existing products are matched by stock code (SKU).</PageHeader>
      <section className="panel panel-pad mb-6" aria-labelledby="how"><h2 id="how" className="!text-lg">How it works</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[.98rem]"><li><a href="/admin/products/template">Download the template</a> and fill it in (Excel or Google Sheets, saved as CSV).</li><li>Upload it and choose <strong>Check the file</strong>. Nothing is saved yet; you see what would happen to each row.</li><li>Fix any problems, then choose <strong>Import now</strong>. New products are created as drafts unless you set the status.</li></ol>
        <p className="mt-3 text-sm text-muted">Columns: {PRODUCT_CSV_COLUMNS.join(', ')}. Prices are in naira. Category is the category’s web address (for example <code>first-aid</code>). Stock changes are recorded in the stock history.</p></section>
      <section className="panel panel-pad"><ImportForm /></section>
    </div>
  );
}
