import Link from 'next/link';
import { requireCustomer } from '@/server/rbac';
import { myPrescriptions } from '@/server/account';
import { Empty, RxBadge } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';

export const metadata = { title: 'Your prescriptions' };

export default async function MyPrescriptions() {
  const u = await requireCustomer('/account/prescriptions');
  const list = await myPrescriptions(u.id);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="!text-xl">Your prescriptions</h2><Link href="/prescriptions" className="btn btn-primary btn-sm">Send a prescription</Link></div>
      {list.length === 0 ? <div className="mt-4"><Empty title="Nothing sent yet">A pharmacist reviews every prescription you send. Nothing is supplied automatically.</Empty></div> : (
        <ul className="mt-4 space-y-3">{list.map((r) => (
          <li key={r.id} className="card card-pad flex flex-wrap items-center justify-between gap-3"><div><Link href={`/prescriptions/${r.trackToken}`} className="font-display font-semibold">{r.number}</Link><p className="text-sm text-muted">Sent {fmtDateTime(r.createdAt)}</p></div><RxBadge status={r.status} /></li>
        ))}</ul>
      )}
    </div>
  );
}
