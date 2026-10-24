import Link from 'next/link';
import { requireStaff } from '@/server/rbac';
import { adminListOrders } from '@/server/orders';
import { PageHeader, OrderBadge, PaymentBadge, Pagination, Empty, qs } from '@/components/ui';
import { ORDER_STATUS_LABELS, PAYMENT_LABELS } from '@/lib/order-flow';
import { formatNaira } from '@/lib/money';
import { fmtDateTime } from '@/lib/format';

export const metadata = { title: 'Orders' };
type SP = { q?: string; status?: string; payment?: string; fulfilment?: string; page?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireStaff('order.view');
  const sp = await searchParams;
  const { rows, total, page, pages } = await adminListOrders(user, { ...sp, page: Number(sp.page) || 1 });
  return (
    <div>
      <PageHeader title="Orders" eyebrow="Sell">{total} order{total === 1 ? '' : 's'} match.</PageHeader>
      <form className="panel panel-pad mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]" role="search" aria-label="Filter orders">
        <div><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={sp.q ?? ''} className="input" placeholder="Number, name, email or phone" /></div>
        <div><label className="label" htmlFor="status">Status</label><select id="status" name="status" className="select" defaultValue={sp.status ?? ''}><option value="">Active orders</option>{Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label" htmlFor="payment">Payment</label><select id="payment" name="payment" className="select" defaultValue={sp.payment ?? ''}><option value="">Any</option>{Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label" htmlFor="fulfilment">Type</label><select id="fulfilment" name="fulfilment" className="select" defaultValue={sp.fulfilment ?? ''}><option value="">Any</option><option value="DELIVERY">Delivery</option><option value="PICKUP">Collection</option></select></div>
        <div className="flex items-end"><button className="btn btn-primary" type="submit">Filter</button></div>
      </form>
      {rows.length === 0 ? <Empty title="No orders found">Try clearing the filters.</Empty> : (
        <div className="table-wrap"><table className="table"><caption className="sr-only">Orders</caption>
          <thead><tr><th scope="col">Order</th><th scope="col">Placed</th><th scope="col">Customer</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Payment</th><th scope="col" className="num">Total</th></tr></thead>
          <tbody>{rows.map((o) => (
            <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="font-display font-semibold">{o.number}</Link><span className="block text-xs text-muted">{o._count.items} line{o._count.items === 1 ? '' : 's'}</span></td><td className="whitespace-nowrap text-sm">{fmtDateTime(o.createdAt)}</td><td>{o.customerName}<span className="block text-xs text-muted">{o.email}</span></td><td>{o.fulfilment === 'PICKUP' ? 'Collect' : 'Deliver'}</td><td><OrderBadge status={o.status} /></td><td><PaymentBadge status={o.paymentStatus} /></td><td className="num">{formatNaira(o.totalKobo)}</td></tr>
          ))}</tbody></table></div>
      )}
      <Pagination page={page} pages={pages} hrefFor={(p) => `/admin/orders${qs({ ...sp, page: p })}`} />
    </div>
  );
}
