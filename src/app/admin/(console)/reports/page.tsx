import { requireStaff } from '@/server/rbac';
import { inventoryValue, salesReport } from '@/server/reports';
import { PageHeader, Stat } from '@/components/ui';
import { formatNaira } from '@/lib/money';
import { ORDER_STATUS_LABELS } from '@/lib/order-flow';

export const metadata = { title: 'Reports' };

export default async function Reports({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await requireStaff('report.view');
  const days = [7, 30, 90, 365].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const [r, inv] = await Promise.all([salesReport(user, days), inventoryValue(user)]);
  const paid = r.byMethod.reduce((a, m) => ({ n: a.n + m._count._all, k: a.k + (m._sum.totalKobo ?? 0) }), { n: 0, k: 0 });
  return (
    <div>
      <PageHeader title="Reports" eyebrow="Insight" actions={<a className="btn btn-outline btn-sm" href={`/admin/reports/csv?days=${days}`}>Download orders (CSV)</a>}>Paid sales exclude cancelled orders. Figures come straight from the order records.</PageHeader>
      <nav aria-label="Period" className="mb-5 flex flex-wrap gap-2">{[7, 30, 90, 365].map((d) => <a key={d} href={`?days=${d}`} aria-current={d === days ? 'true' : undefined} className={`btn btn-sm ${d === days ? 'btn-primary' : 'btn-outline'}`}>Last {d === 365 ? 'year' : `${d} days`}</a>)}</nav>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Paid sales" value={formatNaira(paid.k)} note={`${paid.n} orders`} />
        <Stat label="Average order" value={paid.n ? formatNaira(Math.round(paid.k / paid.n)) : '—'} />
        <Stat label="Units in stock" value={inv.units.toLocaleString('en-NG')} note={`${inv.skus} products`} />
        <Stat label="Stock at selling price" value={formatNaira(Math.round(inv.cost_at_price))} note="Not cost value" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel panel-pad" aria-labelledby="bs"><h2 id="bs" className="!text-lg">Orders by status</h2>
          <table className="table mt-3"><caption className="sr-only">Orders by status</caption><thead><tr><th scope="col">Status</th><th scope="col" className="num">Orders</th><th scope="col" className="num">Value</th></tr></thead><tbody>{r.byStatus.map((s) => <tr key={s.status}><td>{ORDER_STATUS_LABELS[s.status]}</td><td className="num">{s._count._all}</td><td className="num">{formatNaira(s._sum.totalKobo ?? 0)}</td></tr>)}</tbody></table>
          {r.byStatus.length === 0 && <p className="mt-2 text-muted">No orders in this period.</p>}</section>
        <section className="panel panel-pad" aria-labelledby="bm"><h2 id="bm" className="!text-lg">Paid, by payment and fulfilment</h2>
          <table className="table mt-3"><caption className="sr-only">Paid orders by method</caption><thead><tr><th scope="col">Group</th><th scope="col" className="num">Orders</th><th scope="col" className="num">Value</th></tr></thead><tbody>
            {r.byMethod.map((m) => <tr key={m.paymentMethod}><td>{m.paymentMethod === 'PAYSTACK' ? 'Card or transfer (Paystack)' : 'Pay on delivery or pickup'}</td><td className="num">{m._count._all}</td><td className="num">{formatNaira(m._sum.totalKobo ?? 0)}</td></tr>)}
            {r.byFulfilment.map((m) => <tr key={m.fulfilment}><td>{m.fulfilment === 'DELIVERY' ? 'Delivery' : 'Pickup'}</td><td className="num">{m._count._all}</td><td className="num">{formatNaira(m._sum.totalKobo ?? 0)}</td></tr>)}
          </tbody></table></section>
        <section className="panel panel-pad lg:col-span-2" aria-labelledby="tp"><h2 id="tp" className="!text-lg">Best sellers</h2>
          <table className="table mt-3"><caption className="sr-only">Best selling products</caption><thead><tr><th scope="col">Product</th><th scope="col">SKU</th><th scope="col" className="num">Units</th><th scope="col" className="num">Revenue</th></tr></thead><tbody>{r.top.map((t) => <tr key={t.sku}><td>{t.name}</td><td className="text-sm text-muted">{t.sku}</td><td className="num">{t.units}</td><td className="num">{formatNaira(t.revenue)}</td></tr>)}</tbody></table>
          {r.top.length === 0 && <p className="mt-2 text-muted">No paid sales in this period.</p>}</section>
        {r.coupons.length > 0 && <section className="panel panel-pad lg:col-span-2" aria-labelledby="cu"><h2 id="cu" className="!text-lg">Discount codes used</h2>
          <table className="table mt-3"><caption className="sr-only">Coupons</caption><thead><tr><th scope="col">Code</th><th scope="col" className="num">Orders</th><th scope="col" className="num">Discount given</th></tr></thead><tbody>{r.coupons.map((c) => <tr key={c.couponCode}><td>{c.couponCode}</td><td className="num">{c._count._all}</td><td className="num">{formatNaira(c._sum.discountKobo ?? 0)}</td></tr>)}</tbody></table></section>}
      </div>
    </div>
  );
}
