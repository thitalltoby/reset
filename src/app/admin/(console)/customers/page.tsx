import { requireStaff } from '@/server/rbac';
import { db } from '@/server/db';
import { PageHeader, Empty, Badge } from '@/components/ui';
import { formatNaira } from '@/lib/money';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'Customers' };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff('customer.view');
  const { q } = await searchParams;
  const users = await db.user.findMany({
    where: { role: 'CUSTOMER', ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}) },
    orderBy: { createdAt: 'desc' }, take: 200,
    select: { id: true, name: true, email: true, phone: true, createdAt: true, marketingOptInAt: true, emailVerifiedAt: true, orders: { where: { paymentStatus: 'PAID' }, select: { totalKobo: true } } },
  });
  return (
    <div>
      <PageHeader title="Customers" eyebrow="Sell">People with an account. Guests who only ordered once are found through their orders.</PageHeader>
      <form className="panel panel-pad mb-5 grid gap-3 sm:grid-cols-[1fr_auto]" role="search"><div><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={q ?? ''} className="input" placeholder="Name or email" /></div><div className="flex items-end"><button className="btn btn-primary" type="submit">Search</button></div></form>
      {users.length === 0 ? <Empty title="No customers yet">Accounts appear here as people register.</Empty> : (
        <div className="table-wrap"><table className="table"><caption className="sr-only">Customers</caption>
          <thead><tr><th scope="col">Name</th><th scope="col">Joined</th><th scope="col">Email</th><th scope="col">Marketing</th><th scope="col" className="num">Paid orders</th><th scope="col" className="num">Spent</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td className="font-medium">{u.name}<span className="block text-xs text-muted">{u.phone}</span></td><td className="text-sm">{fmtDate(u.createdAt)}</td><td className="text-sm">{u.email} {!u.emailVerifiedAt && <Badge tone="warn">Unconfirmed</Badge>}</td><td>{u.marketingOptInAt ? <Badge tone="good">Agreed</Badge> : <Badge>No</Badge>}</td><td className="num">{u.orders.length}</td><td className="num">{formatNaira(u.orders.reduce((a, o) => a + o.totalKobo, 0))}</td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}
