import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/PageHero';
import { ProductArt } from '@/components/ProductArt';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui';
import { articleSources, getArticleBySlug, getArticles } from '@/server/content';
import { renderMarkdown } from '@/server/markdown';
import { getSite } from '@/server/site';
import { fmtDate } from '@/lib/format';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = await getArticleBySlug((await params).slug);
  return a ? { title: a.title, description: a.excerpt, alternates: { canonical: `/health/${a.slug}` } } : {};
}

export default async function ArticlePage({ params }: P) {
  const { slug } = await params;
  const [a, site] = await Promise.all([getArticleBySlug(slug), getSite()]);
  if (!a) notFound();
  const sources = articleSources(a);
  const more = (await getArticles(4)).filter((x) => x.id !== a.id).slice(0, 3);
  const reviewed = !a.needsReview && a.reviewedBy;
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.excerpt, datePublished: a.publishedAt?.toISOString(), dateModified: a.updatedAt.toISOString(), publisher: { '@type': 'Organization', name: site.seo.siteName }, ...(reviewed ? { reviewedBy: { '@type': 'Person', name: a.reviewedBy } } : {}) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <PageHero eyebrow={a.category} title={a.title} intro={a.excerpt} />
      <div className="container-x py-10 md:py-14 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <article>
          <p className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted"><span>{a.readMinutes} min read</span>{a.publishedAt && <span>Published {fmtDate(a.publishedAt)}</span>}</p>
          {reviewed
            ? <div className="alert alert-ok mb-6"><Icon name="shield" size={16} className="mr-2 inline" /><strong>Reviewed by {a.reviewedBy}</strong>{a.reviewedAt ? ` on ${fmtDate(a.reviewedAt)}` : ''}.</div>
            : <div className="mb-6"><Alert tone="warn"><strong>Draft, not yet reviewed by a pharmacist.</strong> It is based on public guidance and shown here for demonstration.</Alert></div>}
          <div className="prose-reset" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body) }} />
          {sources.length > 0 && (
            <section className="mt-10 border-t border-line pt-6" aria-labelledby="src-h">
              <h2 id="src-h" className="!text-xl">Sources</h2>
              <ul className="mt-3 space-y-1.5">{sources.map((s) => <li key={s.url}><a href={s.url} rel="noopener noreferrer" target="_blank">{s.title}</a></li>)}</ul>
            </section>
          )}
          <p className="mt-8 rounded-2xl bg-mist p-4 text-sm text-muted">This article is general information and does not replace advice from a pharmacist, doctor or other health professional. If you think you need urgent care, contact your nearest emergency service or health facility.</p>
        </article>
        <aside className="space-y-5">
          <div className="card-soft p-6 text-center"><span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-mint"><ProductArt kind={a.art} size={64} /></span><h2 className="mt-4 !text-xl">Have a question?</h2><p className="mt-1 text-sm text-muted">A pharmacist can help with medicines and when to see a doctor.</p><Link href="/contact" className="btn btn-primary mt-4">Ask a pharmacist</Link></div>
          {more.length > 0 && <div><h2 className="!text-lg">More to read</h2><ul className="mt-3 space-y-3">{more.map((m) => <li key={m.id}><Link href={`/health/${m.slug}`} className="font-display font-semibold">{m.title}</Link><span className="block text-sm text-muted">{m.readMinutes} min read</span></li>)}</ul></div>}
        </aside>
      </div>
    </>
  );
}
