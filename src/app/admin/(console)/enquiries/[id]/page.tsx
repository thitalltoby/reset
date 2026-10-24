import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/server/rbac';
import { ENQUIRY_STATUS_LABELS, ENQUIRY_TYPE_LABELS, enquiryMailto, getEnquiry } from '@/server/enquiries';
import { db } from '@/server/db';
import { PageHeader, EnquiryBadge } from '@/components/ui';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { fmtDateTime } from '@/lib/format';
import { updateEnquiryAction } from '../actions';

export const metadata = { title: 'Enquiry' };

export default async function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff('enquiry.manage');
  const e = await getEnquiry(user, (await params).id);
  if (!e) notFound();
  const staff = await db.user.findMany({ where: { isActive: true, role: { not: 'CUSTOMER' } }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  return (
    <div className="max-w-5xl">
      <PageHeader title={`Enquiry ${e.number}`} eyebrow={<Link href="/admin/enquiries" className="!no-underline">← Enquiries</Link>} actions={<a className="btn btn-primary btn-sm" href={enquiryMailto(e)}>Reply by email</a>}><span className="flex flex-wrap items-center gap-2"><EnquiryBadge status={e.status} /><span>{ENQUIRY_TYPE_LABELS[e.type]} · {fmtDateTime(e.createdAt)}</span></span></PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel panel-pad" aria-labelledby="ms"><h2 id="ms" className="!text-lg">Message</h2><p className="mt-3 whitespace-pre-line">{e.message}</p>
          {e.product && <p className="mt-4 text-sm">About product: <Link href={`/admin/products/${e.product.id}`}>{e.product.name}</Link></p>}</section>
        <div className="space-y-6">
          <section className="panel panel-pad" aria-labelledby="fr"><h2 id="fr" className="!text-lg">From</h2><p className="mt-2 font-medium">{e.name}</p><p className="text-[.95rem]"><a href={`mailto:${e.email}`}>{e.email}</a>{e.phone && <><br /><a href={`tel:${e.phone}`}>{e.phone}</a></>}</p></section>
          <section className="panel panel-pad" aria-labelledby="wk"><h2 id="wk" className="!text-lg">Handling</h2>
            <ActionForm action={updateEnquiryAction} className="mt-3 space-y-3"><input type="hidden" name="id" value={e.id} />
              <Field name="status" type="select" label="Status" defaultValue={e.status} options={Object.entries(ENQUIRY_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
              <Field name="assigneeId" type="select" label="Assigned to" defaultValue={e.assigneeId ?? ''} options={[{ value: '', label: 'Nobody' }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} />
              <Field name="staffNote" type="textarea" rows={4} label="Internal note" defaultValue={e.staffNote ?? ''} hint="Staff only." />
              <SubmitButton className="btn btn-primary btn-sm">Save</SubmitButton></ActionForm></section>
        </div>
      </div>
    </div>
  );
}
