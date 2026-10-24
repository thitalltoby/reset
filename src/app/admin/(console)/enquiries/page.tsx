import Link from 'next/link';
import { requireStaff } from '@/server/rbac';
import { ENQUIRY_STATUS_LABELS, ENQUIRY_TYPE_LABELS, listEnquiries } from '@/server/enquiries';
import { PageHeader, EnquiryBadge, Empty } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';

export const metadata = { title: 'Enquiries' };

export default async function EnquiryList({ searchParams }: { searchParams: Promise<{ status?: string; type?: string; q?: string }> }) {
  const user = await requireStaff('enquiry.manage');
  const sp = await searchParams;
  const rows = await listEnquiries(user, sp);
  return (
    <div>
      <PageHeader title="Enquiries" eyebrow="Sell">Messages from the contact page and product questions.</PageHeader>
      <form className="panel panel-pad mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]" role="search" aria-label="Filter enquiries">
        <div><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={sp.q ?? ''} className="input" /></div>
        <div><label className="label" htmlFor="status">Status</label><select id="status" name="status" className="select" defaultValue={sp.status ?? ''}><option value="">Any</option>{Object.entries(ENQUIRY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label" htmlFor="type">Type</label><select id="type" name="type" className="select" defaultValue={sp.type ?? ''}><option value="">Any</option>{Object.entries(ENQUIRY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="flex items-end"><button className="btn btn-primary" type="submit">Filter</button></div>
      </form>
      {rows.length === 0 ? <Empty title="No enquiries">Nothing matches.</Empty> : (
        <div className="table-wrap"><table className="table"><caption className="sr-only">Enquiries</caption>
          <thead><tr><th scope="col">Reference</th><th scope="col">Received</th><th scope="col">From</th><th scope="col">About</th><th scope="col">Assigned</th><th scope="col">Status</th></tr></thead>
          <tbody>{rows.map((e) => <tr key={e.id}><td><Link href={`/admin/enquiries/${e.id}`} className="font-display font-semibold">{e.number}</Link></td><td className="whitespace-nowrap text-sm">{fmtDateTime(e.createdAt)}</td><td>{e.name}<span className="block text-xs text-muted">{e.email}</span></td><td className="text-sm">{ENQUIRY_TYPE_LABELS[e.type]}{e.product ? `: ${e.product.name}` : ''}<span className="line-clamp-1 block text-xs text-muted">{e.message}</span></td><td>{e.assignee?.name ?? '—'}</td><td><EnquiryBadge status={e.status} /></td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}
