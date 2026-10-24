import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { ProductArt } from '@/components/ProductArt';
import { Alert } from '@/components/ui';
import { getArticleCategories, getArticles } from '@/server/content';
import { getSite } from '@/server/site';

export const metadata: Metadata = { title: 'Health & Wellness Centre', description: 'Plain-language guidance on everyday health, medicines and wellness from Reset Pharmacy.' };

export default async function HealthHub({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const sp = await searchParams;
  const [articles, cats, site] = await Promise.all([getArticles(60, sp.category), getArticleCategories(), getSite()]);
  return (
    <>
      <PageHero eyebrow="Health & Wellness Centre" title="Clear guidance you can use" intro="Short, plain-language articles on everyday health and safe medicine use. They are general information, they cite public guidance, and they never replace advice from your pharmacist or doctor." />
      <div className="container-x py-10 md:py-14">
        {site.demo && <div className="mb-6"><Alert tone="warn"><strong>Sample articles.</strong> These starter articles are drafts based on public guidance (WHO, NHS, HSE, CDC, FDA). A pharmacist must review each one before it is shown on the live website.</Alert></div>}
        {cats.length > 1 && (
          <nav aria-label="Topics" className="mb-8 flex flex-wrap gap-2">
            <Link href="/health" className={`chip ${!sp.category ? '!bg-forest !text-white' : 'chip-line'} no-underline`} aria-current={!sp.category ? 'page' : undefined}>All</Link>
            {cats.map((c) => <Link key={c.name} href={`/health?category=${encodeURIComponent(c.name)}`} className={`chip ${sp.category === c.name ? '!bg-forest !text-white' : 'chip-line'} no-underline`} aria-current={sp.category === c.name ? 'page' : undefined}>{c.name} <span className="opacity-70">{c.count}</span></Link>)}
          </nav>
        )}
        {articles.length === 0 ? <Alert tone="info">Articles will appear here once a pharmacist has reviewed them. <Link href="/contact">Ask us a question</Link> in the meantime.</Alert> : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <li key={a.id}>
                <Link href={`/health/${a.slug}`} className="card flex h-full flex-col overflow-hidden no-underline transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg">
                  <span className="grid place-items-center bg-mint py-9"><ProductArt kind={a.art} size={88} /></span>
                  <span className="flex flex-1 flex-col gap-2 p-5">
                    <span className="chip self-start">{a.category}</span>
                    <span className="font-display text-xl font-semibold leading-snug text-ink">{a.title}</span>
                    <span className="text-[.95rem] text-muted">{a.excerpt}</span>
                    <span className="mt-auto pt-2 text-sm text-muted">{a.readMinutes} min read</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
