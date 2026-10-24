import Link from 'next/link';
import { requireStaff } from '@/server/rbac';
import { dashboard } from '@/server/reports';
import { db } from '@/server/db';
import { can } from '@/lib/permissions';
import { PageHeader, Stat, Alert, OrderBadge, Badge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { formatNaira } from '@/lib/money';
import { fmtDateTime } from '@/lib/format';
import { getSite } from '@/server/site';
import { paystackConfig, keyMode } from '@/server/paystack';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard() {
  const user = await requireStaff();
  const [d, site, cfg] = await Promise.all([dashboard(user), getSite(), paystackConfig()]);
  const recent = can(user.role, 'order.view') ? await db.order.findMany({ where: { NOT: { status: 'EXPIRED' } }, orderBy: { createdAt: 'desc' }, take: 6 }) : [];
  const max = Math.max(1, ...d.series.map((s) => s.kobo));
  const todo: { label: string; href: string }[] = [];
  if (!site.company.phone) todo.push({ label: 'Add the pharmacy phone number, address and opening hours', href: '/admin/settings' });
  if (!cfg && can(user.role, 'integration.manage')) todo.push({ label: 'Connect Paystack so customers can pay by card', href: '/admin/integrations' });
  if (site.shop.paystack && !cfg) todo.push({ label: 'Card payment is switched on but no Paystack key is set', href: '/admin/integrations' });
  return (
    <div>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} eyebrow="Dashboard">Here is what needs attention today.</PageHeader>
      {site.demo && <div className="mb-6"><Alert tone="warn"><strong>Demonstration mode.</strong> The catalogue, prices and delivery areas are sample data. Remove them from Settings before launch, then add real products by CSV import.</Alert></div>}
      {cfg && keyMode(cfg.secret) === 'test' && <div className="mb-6"><Alert tone="info">Paystack is in <strong>test mode</strong>. Payments are not real until a live key is added.</Alert></div>}
      {todo.length > 0 && <div className="mb-6 card card-pad"><h2 className="!text-lg">To set up</h2><ul className="mt-2 space-y-1.5">{todo.map((t) => <li key={t.label}><Link href={t.href} className="link-arrow">{t.label}<Icon name="arrow" size={15} /></Link></li>)}</ul></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can(user.role, 'order.view') && <Stat label="Orders to process" value={d.toProcess} href="/admin/orders?status=PLACED" tone={d.toProcess ? 'warn' : undefined} note={d.awaitingPay ? `${d.awaitingPay} awaiting payment` : undefined} />}
        {can(user.role, 'order.view') && d.refundsDue > 0 && <Stat label="Refunds due" value={d.refundsDue} href="/admin/orders?status=CANCELLED&payment=PAID" tone="bad" note="Paid, then cancelled" />}
        {can(user.role, 'prescription.review') && <Stat label="Prescriptions waiting" value={d.rx} href="/admin/prescriptions" tone={d.rx ? 'warn' : undefined} />}
        {can(user.role, 'enquiry.manage') && <Stat label="Open enquiries" value={d.enq} href="/admin/enquiries" />}
        {d.sales7 && <Stat label="Sales, last 7 days" value={formatNaira(d.sales7.totalKobo)} note={`${d.sales7.orders} paid order${d.sales7.orders === 1 ? '' : 's'}`} />}
        {d.sales30 && <Stat label="Sales, last 30 days" value={formatNaira(d.sales30.totalKobo)} note={`${d.sales30.orders} paid order${d.sales30.orders === 1 ? '' : 's'}`} />}
      </div>
      {d.series.length > 0 && (
        <section className="panel panel-pad mt-6" aria-labelledby="s30"><h2 id="s30" className="!text-lg">Paid sales, last 30 days</h2>
          <div className="mt-4 flex h-40 items-end gap-1" role="img" aria-label={`Daily paid sales over 30 days, highest ${formatNaira(max)}`}>
            {d.series.map((s) => <div key={s.day} className="group relative flex-1 rounded-t bg-brand/80 hover:bg-brand" style={{ height: `${Math.max(2, (s.kobo / max) * 100)}%` }} title={`${s.day}: ${formatNaira(s.kobo)}`} />)}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted"><span>{d.series[0]?.day}</span><span>{d.series.at(-1)?.day}</span></div>
        </section>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {recent.length > 0 && (
          <section className="panel panel-pad" aria-labelledby="ro"><div className="flex items-center justify-between"><h2 id="ro" className="!text-lg">Latest orders</h2><Link href="/admin/orders" className="link-arrow text-sm">All orders</Link></div>
            <ul className="mt-3 divide-y divide-line">{recent.map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><div><Link href={`/admin/orders/${o.id}`} className="font-display font-semibold">{o.number}</Link><p className="text-sm text-muted">{o.customerName} · {fmtDateTime(o.createdAt)}</p></div><div className="flex items-center gap-2"><span className="tabular-nums text-sm">{formatNaira(o.totalKobo)}</span><OrderBadge status={o.status} /></div></li>)}</ul></section>
        )}
        {d.low.length > 0 && (
          <section className="panel panel-pad" aria-labelledby="lo"><div className="flex items-center justify-between"><h2 id="lo" className="!text-lg">Running low</h2><Link href="/admin/inventory" className="link-arrow text-sm">Stock</Link></div>
            <ul className="mt-3 divide-y divide-line">{d.low.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 py-2.5"><Link href={`/admin/products/${p.id}`} className="font-medium">{p.name}</Link><Badge tone={p.stock <= 0 ? 'bad' : 'warn'}>{p.stock <= 0 ? 'Out of stock' : `${p.stock} left`}</Badge></li>)}</ul></section>
        )}
      </div>
    </div>
  );
}
