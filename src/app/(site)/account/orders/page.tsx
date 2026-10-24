import Link from 'next/link';
import { requireCustomer } from '@/server/rbac';
import { myOrders } from '@/server/account';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { Empty, OrderBadge } from '@/components/ui';
import { formatNaira } from '@/lib/money';
import { fmtDate } from '@/lib/format';
import { reorderAction } from '../actions';

export const metadata = { title: 'Your orders' };

export default async function OrdersPage() {
  const u = await requireCustomer('/account/orders');
  const orders = await myOrders(u.id);
  if (!orders.length) return <Empty title="No orders yet" action={<Link href="/shop" className="btn btn-primary">Start shopping</Link>}>Your orders will appear here.</Empty>;
  return (
    <div>
      <h2 className="!text-xl">Your orders</h2>
      <ul className="mt-4 space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><Link href={`/order/${o.trackToken}`} className="font-display text-lg font-semibold">{o.number}</Link><p className="text-sm text-muted">{fmtDate(o.createdAt)} · {formatNaira(o.totalKobo)}</p></div>
              <OrderBadge status={o.status} />
            </div>
            <p className="mt-2 text-[.95rem] text-muted">{o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/order/${o.trackToken}`} className="btn btn-outline btn-sm">Track or view</Link>
              {o.status !== 'AWAITING_PAYMENT' && o.status !== 'EXPIRED' && (
                <ActionForm action={reorderAction} className="inline" hideBanner={false}><input type="hidden" name="orderId" value={o.id} /><SubmitButton className="btn btn-soft btn-sm" pending="Adding…">Order again</SubmitButton></ActionForm>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
