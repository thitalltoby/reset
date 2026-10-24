import { requireStaff } from '@/server/rbac';
import { db } from '@/server/db';
import { PageHeader, Badge, Alert, Pagination, qs, type Tone } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';
import type { NotificationStatus } from '@/generated/prisma/enums';

export const metadata = { title: 'Message log' };
const TONE: Record<string, Tone> = { SENT: 'good', QUEUED: 'info', FAILED: 'bad', SKIPPED: 'warn' };

export default async function Outbox({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireStaff('settings.manage');
  const sp = await searchParams;
  const page = Math.max(Number(sp.page) || 1, 1);
  const where = sp.status ? { status: sp.status as NotificationStatus } : {};
  const [total, rows, counts, jobs] = await Promise.all([
    db.notificationEvent.count({ where }),
    db.notificationEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 30, take: 30 }),
    db.notificationEvent.groupBy({ by: ['status'], _count: { _all: true } }),
    db.job.count({ where: { status: { in: ['PENDING', 'FAILED'] } } }),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  return (
    <div>
      <PageHeader title="Message log" eyebrow="System">Every email the platform has tried to send. “Skipped” means no email provider is set up, so nothing left the building.</PageHeader>
      {n('SKIPPED') > 0 && <div className="mb-4"><Alert tone="warn">{n('SKIPPED')} message(s) were skipped because no email provider is connected. Set one up under Integrations before launch.</Alert></div>}
      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        <a href="?" className={`btn btn-sm ${!sp.status ? 'btn-primary' : 'btn-outline'}`}>All</a>
        {['QUEUED', 'SENT', 'FAILED', 'SKIPPED'].map((s) => <a key={s} href={`?status=${s}`} className={`btn btn-sm ${sp.status === s ? 'btn-primary' : 'btn-outline'}`}>{s.charAt(0) + s.slice(1).toLowerCase()} ({n(s)})</a>)}
      </nav>
      <div className="table-wrap"><table className="table"><caption className="sr-only">Messages</caption>
        <thead><tr><th scope="col">When</th><th scope="col">To</th><th scope="col">Subject</th><th scope="col">Status</th></tr></thead>
        <tbody>{rows.map((m) => <tr key={m.id}><td className="whitespace-nowrap text-sm">{fmtDateTime(m.createdAt)}</td><td className="text-sm">{m.toAddress}</td>
          <td><details><summary className="cursor-pointer">{m.subject}</summary><pre className="mt-2 max-w-xl whitespace-pre-wrap font-mono text-xs text-muted">{m.body.slice(0, 1500)}</pre></details></td>
          <td><Badge tone={TONE[m.status] ?? 'neutral'}>{m.status.charAt(0) + m.status.slice(1).toLowerCase()}</Badge>{m.error && <span className="block max-w-48 text-xs text-muted">{m.error.slice(0, 120)}</span>}</td></tr>)}</tbody></table></div>
      {rows.length === 0 && <p className="mt-4 text-muted">No messages.</p>}
      <Pagination page={page} pages={Math.max(Math.ceil(total / 30), 1)} hrefFor={(p) => `/admin/outbox${qs({ status: sp.status, page: p })}`} />
      <p className="mt-4 text-sm text-muted">Background jobs waiting or failed: {jobs}.</p>
    </div>
  );
}
