import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/server/rbac';
import { getPrescriptionForStaff } from '@/server/prescriptions';
import { signedFileUrl } from '@/server/storage';
import { SCAN_LABELS, isServable } from '@/server/scan';
import { db } from '@/server/db';
import { PageHeader, RxBadge, Alert, Badge } from '@/components/ui';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { RX_LABELS, RX_NEXT } from '@/lib/order-flow';
import { fmtDateTime } from '@/lib/format';
import { rxAssignAction, rxPurgeAction, rxStatusAction } from '../actions';

export const metadata = { title: 'Prescription' };

export default async function RxDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff('prescription.review');
  const rx = await getPrescriptionForStaff(user, (await params).id);
  if (!rx) notFound();
  const pharmacists = await db.user.findMany({ where: { isActive: true, role: { in: ['PHARMACIST', 'MANAGER', 'SUPER_ADMIN'] } }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  const next = RX_NEXT[rx.status];
  const closed = ['COMPLETED', 'DECLINED', 'CANCELLED'].includes(rx.status);
  const pref = rx.preference === 'DELIVERY' ? 'Wants delivery' : rx.preference === 'ASK' ? 'Ask before arranging' : 'Will collect';
  return (
    <div>
      <PageHeader title={`Prescription ${rx.number}`} eyebrow={<Link href="/admin/prescriptions" className="!no-underline">← Prescriptions</Link>}><span className="flex flex-wrap items-center gap-2"><RxBadge status={rx.status} /><span>Received {fmtDateTime(rx.createdAt)}</span></span></PageHeader>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="panel panel-pad" aria-labelledby="fl"><h2 id="fl" className="!text-lg">Uploaded files</h2>
            {rx.documents.length === 0 ? <p className="mt-2 text-muted">No files (removed or never attached).</p> : (
              <ul className="mt-3 divide-y divide-line">{rx.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span>{d.originalName}<span className="block text-xs text-muted">{d.visibility === 'CUSTOMER' ? 'Added by customer' : 'Original'} · {fmtDateTime(d.createdAt)}</span></span>
                  {isServable(d.scanStatus) ? <a className="btn btn-outline btn-sm" href={signedFileUrl(d.id, user.id)} target="_blank" rel="noopener noreferrer">Open</a> : <Badge tone="warn">{SCAN_LABELS[d.scanStatus] ?? d.scanStatus}</Badge>}</li>
              ))}</ul>)}
            <p className="mt-3 text-xs text-muted">Links work for five minutes and only for you. Opening a file is recorded.</p></section>
          <section className="panel panel-pad" aria-labelledby="hs"><h2 id="hs" className="!text-lg">Progress</h2>
            <ol className="mt-3 space-y-3 border-l-2 border-line pl-5">{[...rx.events].reverse().map((e) => <li key={e.id} className="relative"><span className="absolute -left-[1.7rem] top-2 h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" /><p className="font-medium">{e.label} <span className="text-sm font-normal text-muted">· {e.actorLabel}</span></p>{e.note && <p className="text-[.95rem] text-muted">{e.note}</p>}<p className="text-xs text-muted">{fmtDateTime(e.createdAt)}</p></li>)}</ol></section>
        </div>
        <div className="space-y-6">
          <section className="panel panel-pad" aria-labelledby="cs"><h2 id="cs" className="!text-lg">Customer</h2>
            <p className="mt-2 font-medium">{rx.name}</p><p className="text-[.95rem]"><a href={`mailto:${rx.email}`}>{rx.email}</a><br /><a href={`tel:${rx.phone}`}>{rx.phone}</a></p><p className="mt-2 text-sm text-muted">{pref}</p>
            {rx.customerNote && <><h3 className="mt-3 !text-base">Their note</h3><p className="whitespace-pre-line text-[.95rem]">{rx.customerNote}</p></>}</section>
          {next.length > 0 && (
            <section className="panel panel-pad" aria-labelledby="dc"><h2 id="dc" className="!text-lg">Decide the next step</h2>
              <ActionForm action={rxStatusAction} className="mt-3 space-y-3"><input type="hidden" name="id" value={rx.id} />
                <Field name="to" type="select" label="Move to" defaultValue={next[0]} options={next.map((s) => ({ value: s, label: RX_LABELS[s] }))} />
                <Field name="note" type="textarea" rows={4} label="Note to the customer" hint="They will see this and receive it by email. Required for questions, decisions and declines. Do not include more health detail than needed." />
                <SubmitButton className="btn btn-primary btn-sm">Update and notify</SubmitButton></ActionForm></section>
          )}
          <section className="panel panel-pad" aria-labelledby="as"><h2 id="as" className="!text-lg">Assigned to</h2>
            <ActionForm action={rxAssignAction} className="mt-3 space-y-3"><input type="hidden" name="id" value={rx.id} /><Field name="assigneeId" type="select" label="Pharmacist" defaultValue={rx.assigneeId ?? ''} options={[{ value: '', label: 'Unassigned' }, ...pharmacists.map((p) => ({ value: p.id, label: p.name }))]} /><SubmitButton className="btn btn-outline btn-sm">Save</SubmitButton></ActionForm></section>
          {closed && rx.documents.length > 0 && (
            <section className="panel panel-pad" aria-labelledby="pg"><h2 id="pg" className="!text-lg">Remove files</h2><p className="mt-1 text-sm text-muted">Deletes the uploaded files for good. The record and history stay.</p>
              <ActionForm action={rxPurgeAction} className="mt-3"><input type="hidden" name="id" value={rx.id} /><SubmitButton className="btn btn-danger btn-sm">Remove uploaded files</SubmitButton></ActionForm></section>
          )}
          {!closed && <Alert tone="info">Nothing is dispensed from this screen. After your review, arrange the supply with the customer in line with pharmacy practice.</Alert>}
        </div>
      </div>
    </div>
  );
}
