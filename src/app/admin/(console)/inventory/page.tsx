import Link from 'next/link';
import { requireStaff } from '@/server/rbac';
import { lowStock } from '@/server/catalog';
import { inventoryValue } from '@/server/reports';
import { PageHeader, Stat, Empty, Badge } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { can } from '@/lib/permissions';
import { formatNaira } from '@/lib/money';
import { adjustStockAction } from '../products/actions';

export const metadata = { title: 'Stock' };

export default async function InventoryPage() {
  const user = await requireStaff('inventory.manage');
  const [low, value] = await Promise.all([lowStock(200), can(user.role, 'report.view') ? inventoryValue(user) : null]);
  return (
    <div>
      <PageHeader title="Stock" eyebrow="Catalogue">Products at or below their low-stock level. Receive stock here; use a product’s page for counts and corrections.</PageHeader>
      {value && <div className="mb-6 grid gap-4 sm:grid-cols-3"><Stat label="Products in stock" value={value.skus} /><Stat label="Units on the shelf" value={value.units} /><Stat label="Shelf value at selling price" value={formatNaira(Math.round(value.cost_at_price))} /></div>}
      {low.length === 0 ? <Empty title="Everything is above its low-stock level">Nothing needs re-ordering right now.</Empty> : (
        <div className="table-wrap"><table className="table"><caption className="sr-only">Low stock</caption>
          <thead><tr><th scope="col">Product</th><th scope="col" className="num">In stock</th><th scope="col" className="num">Alert at</th><th scope="col">Receive stock</th></tr></thead>
          <tbody>{low.map((p) => (
            <tr key={p.id}><td><Link href={`/admin/products/${p.id}`} className="font-medium">{p.name}</Link><span className="block text-xs text-muted">{p.sku}</span></td><td className="num"><Badge tone={p.stock <= 0 ? 'bad' : 'warn'}>{p.stock <= 0 ? 'Out' : p.stock}</Badge></td><td className="num">{p.reorderLevel}</td>
              <td><ActionForm action={adjustStockAction} className="flex items-start gap-2" resetOnSuccess><input type="hidden" name="productId" value={p.id} /><input type="hidden" name="mode" value="add" /><input type="hidden" name="reason" value="RESTOCK" /><label className="sr-only" htmlFor={`q-${p.id}`}>Units received for {p.name}</label><input id={`q-${p.id}`} name="quantity" type="number" min={1} required className="input !min-h-[2.4rem] !w-24" placeholder="Units" /><SubmitButton className="btn btn-soft btn-sm" pending="…">Add</SubmitButton></ActionForm></td></tr>
          ))}</tbody></table></div>
      )}
    </div>
  );
}
