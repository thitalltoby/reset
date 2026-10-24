import Link from 'next/link';
import { requireStaff } from '@/server/rbac';
import { listPrescriptions } from '@/server/prescriptions';
import { PageHeader, RxBadge, Empty, Alert } from '@/components/ui';
import { RX_LABELS } from '@/lib/order-flow';
import { fmtDateTime } from '@/lib/format';

export const metadata = { title: 'Prescriptions' };

export default async function RxList({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await requireStaff('prescription.review');
  const sp = await searchParams;
  const rows = await listPrescriptions(user, sp);
  return (
    <div>
      <PageHeader title="Prescriptions" eyebrow="Sell">Customers send these for review. They are health information: open one only when you need to, and every opening is logged.</PageHeader>
      <form className="panel panel-pad mb-5 grid gap-3 sm:grid-cols-[2fr_1fr_auto]" role="search" aria-label="Filter prescriptions">
        <div><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={sp.q ?? ''} className="input" placeholder="Reference, name or email" /></div>
        <div><label className="label" htmlFor="status">Status</label><select id="status" name="status" className="select" defaultValue={sp.status ?? ''}><option value="">Any</option>{Object.entries(RX_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="flex items-end"><button className="btn btn-primary" type="submit">Filter</button></div>
      </form>
      {rows.length === 0 ? <Empty title="No prescriptions">Nothing matches.</Empty> : (
        <div className="table-wrap"><table className="table"><caption className="sr-only">Prescriptions</caption>
          <thead><tr><th scope="col">Reference</th><th scope="col">Received</th><th scope="col">Customer</th><th scope="col">Files</th><th scope="col">Assigned</th><th scope="col">Status</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td><Link href={`/admin/prescriptions/${r.id}`} className="font-display font-semibold">{r.number}</Link></td><td className="whitespace-nowrap text-sm">{fmtDateTime(r.createdAt)}</td><td>{r.name}</td><td>{r._count.documents}</td><td>{r.assignee?.name ?? '—'}</td><td><RxBadge status={r.status} /></td></tr>)}</tbody></table></div>
      )}
      <div className="mt-4"><Alert tone="info">Staff without the pharmacist permission never see this section or the files.</Alert></div>
    </div>
  );
}
