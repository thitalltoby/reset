import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { Alert } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { getSite } from '@/server/site';
import { getSessionUser } from '@/server/session';
import { db } from '@/server/db';
import { ACCEPT_ATTR, ALLOWED_LABEL } from '@/lib/upload-rules';
import { submitPrescriptionAction } from './actions';

export const metadata: Metadata = { title: 'Send a prescription', description: 'Send a photo or scan of your prescription to a Reset Pharmacy pharmacist for review. Nothing is supplied until the pharmacist has checked it.' };

export default async function PrescriptionsPage() {
  const [site, user] = await Promise.all([getSite(), getSessionUser()]);
  const me = user?.role === 'CUSTOMER' ? await db.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true } }) : null;
  const open = site.shop.prescriptions;
  return (
    <>
      <PageHero eyebrow="Prescriptions" title="Send your prescription for a pharmacist to review" intro="Take a clear photo or scan and send it here. A pharmacist checks it and tells you what happens next. This is a request for review, not an order, and nothing is dispensed automatically." />
      <div className="container-x py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div>
            {!open ? (
              <Alert tone="info">Online prescription requests are not open yet. Please <Link href="/contact?topic=prescription">contact the pharmacy</Link> and a team member will tell you how to get your medicine.</Alert>
            ) : (
              <div className="card card-pad">
                <ActionForm action={submitPrescriptionAction} encType="multipart/form-data" className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="name" label="Full name" required autoComplete="name" defaultValue={me?.name ?? ''} className="sm:col-span-2" />
                    <Field name="email" type="email" label="Email address" required autoComplete="email" defaultValue={me?.email ?? ''} />
                    <Field name="phone" type="tel" label="Phone number" required autoComplete="tel" defaultValue={me?.phone ?? ''} />
                  </div>
                  <Field name="files" type="file" label="Photo or scan of the prescription" required multiple accept={ACCEPT_ATTR} hint={ALLOWED_LABEL} />
                  <Field name="preference" type="select" label="How would you like to receive your medicine?" defaultValue="PICKUP" options={[
                    { value: 'PICKUP', label: 'I will collect it' }, { value: 'DELIVERY', label: 'Deliver it to me' }, { value: 'ASK', label: 'Ask me first' },
                  ]} />
                  <Field name="note" type="textarea" rows={3} label="Anything the pharmacist should know? (optional)" hint="For example, a medicine you also take, or a question. Please keep it short." />
                  <Field name="consent" type="checkbox" required label="I agree that Reset Pharmacy may keep and review this prescription and my details to help me. I have read the privacy notice." hint={<>See our <Link href="/privacy">privacy notice</Link>. Prescriptions are health information; they are visible only to authorised pharmacy staff.</>} />
                  <SubmitButton className="btn btn-primary btn-lg" pending="Sending securely…">Send for review</SubmitButton>
                </ActionForm>
              </div>
            )}
          </div>
          <aside className="space-y-4" aria-label="What happens next">
            <div className="card-soft p-6">
              <h2 className="!text-xl">What happens next</h2>
              <ol className="mt-4 space-y-4">
                {[['You send it', 'We email you a reference and a private link to follow progress.'], ['A pharmacist reviews it', 'They may ask you a question or for another photo.'], ['They tell you the next step', 'Only then is anything prepared, and you will know the price before you pay.']].map(([t, d], i) => (
                  <li key={t} className="flex gap-3"><span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brand font-display font-bold text-ink">{i + 1}</span><span><strong className="font-display">{t}</strong><span className="block text-[.95rem] text-muted">{d}</span></span></li>
                ))}
              </ol>
            </div>
            <div className="card card-pad">
              <p className="flex items-start gap-2 text-[.95rem]"><Icon name="alert" size={18} className="mt-0.5 flex-none text-red-ink" /><span><strong>Urgent?</strong> If you need medicine today or think you need emergency care, call the pharmacy or go to your nearest health facility rather than waiting for a reply.</span></p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
