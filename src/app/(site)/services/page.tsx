import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui';
import { getServices } from '@/server/content';
import { getSite } from '@/server/site';

export const metadata: Metadata = { title: 'Pharmacy services', description: 'Pharmacist guidance, prescription support, availability enquiries and refill requests at Reset Pharmacy.' };

export default async function ServicesPage() {
  const [services, site] = await Promise.all([getServices(), getSite()]);
  return (
    <>
      <PageHero eyebrow="Pharmacy services" title="Care that goes beyond the shelf" intro="Reset Pharmacy lists only the services it has confirmed it provides. Where a service needs a pharmacist, you will always be told who does what, and what happens next." />
      <div className="container-x py-10 md:py-14">
        {services.length === 0 ? (
          <Alert tone="info">The pharmacy is confirming its list of services. In the meantime you can <Link href="/contact">ask us a question</Link>{site.shop.prescriptions ? <> or <Link href="/prescriptions">send a prescription</Link></> : null}.</Alert>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {services.map((s) => (
              <li key={s.id}>
                <article className="card card-pad flex h-full flex-col">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-mint text-forest"><Icon name={s.icon} size={28} /></span>
                  <h2 className="mt-4 !text-2xl">{s.title}</h2>
                  <p className="mt-2 text-muted">{s.summary}</p>
                  <ul className="mt-4 space-y-1.5">{s.benefits.slice(0, 3).map((b) => <li key={b} className="flex gap-2 text-[.96rem]"><Icon name="check" size={18} className="mt-0.5 flex-none text-brand" />{b}</li>)}</ul>
                  <Link href={`/services/${s.slug}`} className="btn btn-outline mt-6 self-start">Learn more<Icon name="arrow" size={16} /></Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
