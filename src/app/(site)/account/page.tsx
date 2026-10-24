import Link from 'next/link';
import { requireCustomer } from '@/server/rbac';
import { myOrders, myPrescriptions } from '@/server/account';
import { db } from '@/server/db';
import { Alert, Empty, OrderBadge, RxBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { formatNaira } from '@/lib/money';
import { fmtDate } from '@/lib/format';

export default async function AccountHome() {
  const u = await requireCustomer();
  const [orders, rx, verified] = await Promise.all([myOrders(u.id), myPrescriptions(u.id), db.user.findUnique({ where: { id: u.id }, select: { emailVerifiedAt: true } })]);
  const recent = orders.slice(0, 3);
  return (
    <div className="space-y-8">
      {!verified?.emailVerifiedAt && <Alert tone="warn">Please confirm your email address using the link we sent you.</Alert>}
      <section aria-labelledby="ro">
        <div className="mb-3 flex items-center justify-between"><h2 id="ro" className="!text-xl">Recent orders</h2><Link href="/account/orders" className="link-arrow text-sm">All orders<Icon name="arrow" size={15} /></Link></div>
        {recent.length === 0 ? <Empty title="No orders yet" action={<Link href="/shop" className="btn btn-primary">Start shopping</Link>}>When you order, it will appear here.</Empty> : (
          <ul className="space-y-3">{recent.map((o) => (
            <li key={o.id} className="card card-pad flex flex-wrap items-center justify-between gap-3"><div><Link href={`/order/${o.trackToken}`} className="font-display font-semibold">{o.number}</Link><p className="text-sm text-muted">{fmtDate(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? '' : 's'} · {formatNaira(o.totalKobo)}</p></div><OrderBadge status={o.status} /></li>
          ))}</ul>
        )}
      </section>
      <section aria-labelledby="rp">
        <div className="mb-3 flex items-center justify-between"><h2 id="rp" className="!text-xl">Prescriptions</h2><Link href="/account/prescriptions" className="link-arrow text-sm">View all<Icon name="arrow" size={15} /></Link></div>
        {rx.length === 0 ? <p className="text-muted">None sent yet. <Link href="/prescriptions">Send a prescription</Link> for a pharmacist to review.</p> : (
          <ul className="space-y-3">{rx.slice(0, 2).map((r) => <li key={r.id} className="card card-pad flex flex-wrap items-center justify-between gap-3"><Link href={`/prescriptions/${r.trackToken}`} className="font-display font-semibold">{r.number}</Link><RxBadge status={r.status} /></li>)}</ul>
        )}
      </section>
    </div>
  );
}
