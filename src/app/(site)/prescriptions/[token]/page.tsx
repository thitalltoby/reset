import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPrescriptionByToken } from '@/server/prescriptions';
import { RxBadge, Alert } from '@/components/ui';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { fmtDateTime } from '@/lib/format';
import { ACCEPT_ATTR, ALLOWED_LABEL } from '@/lib/upload-rules';
import { replyPrescriptionAction } from '../actions';

export const metadata: Metadata = { title: 'Your prescription', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PrescriptionStatusPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const rx = await getPrescriptionByToken(token);
  if (!rx) notFound();
  return (
    <div className="container-x py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Prescription {rx.number}</p>
        <h1 className="mt-1 !text-[2rem] md:!text-[2.6rem]">{sp.new ? `Thank you, ${rx.name.split(' ')[0]}` : 'Your prescription'}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-2"><RxBadge status={rx.status} /><span className="text-sm text-muted">Sent {fmtDateTime(rx.createdAt)} · {rx.fileCount} file{rx.fileCount === 1 ? '' : 's'}</span></p>
        <div className="mt-5 space-y-3">
          {sp.new && <Alert tone="ok">We have it. A pharmacist will review it and email {rx.email}. Keep this page: it is your private link to follow progress.</Alert>}
          {rx.status === 'NEEDS_INFO' && <Alert tone="warn">The pharmacist needs something from you. Please reply below.</Alert>}
          {rx.status === 'DECLINED' && <Alert tone="info">The pharmacist was not able to process this request online. Please read their note, or contact the pharmacy.</Alert>}
        </div>
        {rx.pharmacistNote && (
          <section className="card card-pad mt-6" aria-labelledby="pn"><h2 id="pn" className="!text-xl">Note from the pharmacist</h2><p className="mt-2 whitespace-pre-line">{rx.pharmacistNote}</p></section>
        )}
        {rx.status === 'NEEDS_INFO' && (
          <section className="card card-pad mt-6" aria-labelledby="rp">
            <h2 id="rp" className="!text-xl">Reply</h2>
            <ActionForm action={replyPrescriptionAction} encType="multipart/form-data" className="mt-3 space-y-4" resetOnSuccess>
              <input type="hidden" name="token" value={token} />
              <Field name="note" type="textarea" rows={3} label="Your reply" />
              <Field name="files" type="file" label="Add a photo or scan (optional)" multiple accept={ACCEPT_ATTR} hint={ALLOWED_LABEL} />
              <SubmitButton className="btn btn-primary" pending="Sending…">Send reply</SubmitButton>
            </ActionForm>
          </section>
        )}
        <section className="mt-8" aria-labelledby="rh">
          <h2 id="rh" className="!text-xl">Progress</h2>
          <ol className="mt-3 space-y-3 border-l-2 border-line pl-5">
            {[...rx.events].reverse().map((e) => (
              <li key={e.id} className="relative"><span className="absolute -left-[1.7rem] top-2 h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" /><p className="font-medium">{e.label}</p>{e.note && <p className="text-[.95rem] text-muted">{e.note}</p>}<p className="text-sm text-muted">{fmtDateTime(e.createdAt)}</p></li>
            ))}
          </ol>
        </section>
        <p className="mt-8 text-sm text-muted">Questions? <Link href={`/contact?topic=prescription&order=${rx.number}`}>Contact the pharmacy</Link> and quote {rx.number}. Please do not email prescription details.</p>
      </div>
    </div>
  );
}
