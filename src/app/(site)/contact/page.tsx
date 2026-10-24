import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { Icon } from '@/components/Icon';
import { getSite, telHref, whatsappHref } from '@/server/site';
import { getSessionUser } from '@/server/session';
import { db } from '@/server/db';
import { contactAction } from './actions';

export const metadata: Metadata = { title: 'Contact us', description: 'Ask the Reset Pharmacy team a question about a product, a service or an order.' };

const TOPICS: Record<string, { type: string; hint: string }> = {
  product: { type: 'PRODUCT', hint: 'Which product, and what would you like to know?' },
  service: { type: 'SERVICE', hint: 'Which service, and what would you like to know?' },
  prescription: { type: 'SERVICE', hint: 'Tell us what you need. Please do not send prescription details in this message.' },
  order: { type: 'GENERAL', hint: 'Tell us how we can help with your order.' },
  feedback: { type: 'FEEDBACK', hint: 'We read every message.' },
  complaint: { type: 'COMPLAINT', hint: 'Tell us what went wrong so we can put it right.' },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string; product?: string; service?: string; order?: string }> }) {
  const sp = await searchParams;
  const [site, user] = await Promise.all([getSite(), getSessionUser()]);
  const c = site.company;
  const me = user?.role === 'CUSTOMER' ? await db.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true } }) : null;
  const topic = TOPICS[sp.topic ?? ''] ?? (sp.product ? TOPICS.product : sp.service ? TOPICS.service : sp.order ? TOPICS.order : undefined);
  const product = sp.product ? await db.product.findUnique({ where: { slug: sp.product }, select: { name: true, slug: true } }) : null;
  const prefill = product ? `About: ${product.name}\n\n` : sp.order ? `About order ${sp.order}\n\n` : '';
  const tel = telHref(c.phone); const wa = whatsappHref(c.whatsapp);
  return (
    <>
      <PageHero eyebrow="Contact" title="We are happy to help" intro="Ask about a product, a service or an order. A member of the team will reply by email. For anything urgent, please call or visit the pharmacy." />
      <div className="container-x py-10 md:py-14 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="card card-pad">
          <ActionForm action={contactAction} className="space-y-4" resetOnSuccess>
            <input type="hidden" name="productSlug" value={product?.slug ?? ''} />
            <input type="hidden" name="serviceSlug" value={sp.service ?? ''} />
            <div className="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <Field name="type" type="select" label="What is it about?" defaultValue={topic?.type ?? 'GENERAL'} options={[
              { value: 'GENERAL', label: 'A general question' }, { value: 'PRODUCT', label: 'A product' }, { value: 'SERVICE', label: 'A pharmacy service' }, { value: 'FEEDBACK', label: 'Feedback' }, { value: 'COMPLAINT', label: 'A complaint' },
            ]} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Your name" required autoComplete="name" defaultValue={me?.name ?? ''} />
              <Field name="email" type="email" label="Email address" required autoComplete="email" defaultValue={me?.email ?? ''} />
              <Field name="phone" type="tel" label="Phone (optional)" autoComplete="tel" defaultValue={me?.phone ?? ''} className="sm:col-span-2" />
            </div>
            <Field name="message" type="textarea" rows={6} label="Your message" required defaultValue={prefill} hint={topic?.hint ?? 'Please do not include prescription or other health details. A pharmacist will tell you the safest way to share them.'} />
            <SubmitButton className="btn btn-primary btn-lg" pending="Sending…">Send message</SubmitButton>
          </ActionForm>
        </div>
        <aside className="space-y-4" aria-label="Other ways to reach us">
          <div className="card-soft p-6">
            <h2 className="!text-xl">Reach us directly</h2>
            <ul className="mt-4 space-y-3 text-[.98rem]">
              {c.phone && <li className="flex gap-3"><Icon name="phone" size={20} className="mt-0.5 flex-none text-forest" />{tel ? <a href={tel}>{c.phone}</a> : c.phone}</li>}
              {wa && <li className="flex gap-3"><Icon name="chat" size={20} className="mt-0.5 flex-none text-forest" /><a href={wa} rel="noopener noreferrer">Chat on WhatsApp</a></li>}
              {c.email && <li className="flex gap-3"><Icon name="mail" size={20} className="mt-0.5 flex-none text-forest" /><a href={`mailto:${c.email}`}>{c.email}</a></li>}
              {c.address && <li className="flex gap-3"><Icon name="pin" size={20} className="mt-0.5 flex-none text-forest" /><span className="whitespace-pre-line">{c.address}{c.mapUrl && <><br /><a href={c.mapUrl} rel="noopener noreferrer">Open in maps</a></>}</span></li>}
              {c.hours && <li className="flex gap-3"><Icon name="clock" size={20} className="mt-0.5 flex-none text-forest" /><span className="whitespace-pre-line">{c.hours}</span></li>}
              {!c.phone && !c.email && !c.address && !c.hours && <li className="text-muted">The pharmacy’s phone number, address and opening hours will appear here once confirmed. Until then, the form is the best way to reach us.</li>}
            </ul>
          </div>
          <div className="card card-pad"><p className="flex gap-2 text-[.95rem]"><Icon name="alert" size={18} className="mt-0.5 flex-none text-red-ink" /><span>If you think you need <strong>emergency care</strong>, contact your nearest emergency service or health facility. Do not wait for a reply here.</span></p></div>
        </aside>
      </div>
    </>
  );
}
