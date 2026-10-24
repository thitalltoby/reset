import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/PageHero';
import { Icon } from '@/components/Icon';
import { getServiceBySlug } from '@/server/content';
import { renderMarkdown } from '@/server/markdown';
import { getSite } from '@/server/site';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = await getServiceBySlug((await params).slug);
  return s ? { title: s.title, description: s.summary } : {};
}

export default async function ServicePage({ params }: P) {
  const [s, site] = await Promise.all([getServiceBySlug((await params).slug), getSite()]);
  if (!s) notFound();
  const rx = s.action === 'PRESCRIPTION';
  const href = rx && site.shop.prescriptions ? '/prescriptions' : rx ? '/contact?topic=prescription' : `/contact?service=${s.slug}`;
  return (
    <>
      <PageHero eyebrow="Pharmacy service" title={s.title} intro={s.summary}><Link href={href} className="btn btn-primary btn-lg">{s.ctaLabel}<Icon name="arrow" size={18} /></Link></PageHero>
      <div className="container-x py-10 md:py-14 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="prose-reset" dangerouslySetInnerHTML={{ __html: renderMarkdown(s.description) }} />
        <aside className="space-y-4">
          <div className="card-soft p-6"><h2 className="!text-xl">What you can expect</h2><ul className="mt-3 space-y-2">{s.benefits.map((b) => <li key={b} className="flex gap-2"><Icon name="check" size={18} className="mt-1 flex-none text-brand" />{b}</li>)}</ul></div>
          {s.conditions && <div className="card card-pad"><h2 className="!text-lg">Good to know</h2><p className="mt-2 text-[.95rem] text-muted">{s.conditions}</p></div>}
          <p><Link href="/services" className="link-arrow">All services</Link></p>
        </aside>
      </div>
    </>
  );
}
