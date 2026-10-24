import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { Icon } from '@/components/Icon';
import { getFaqs } from '@/server/content';

export const metadata: Metadata = { title: 'Questions & answers', description: 'Answers about ordering, payment, delivery, prescriptions and your information at Reset Pharmacy.' };

export default async function FaqPage() {
  const faqs = await getFaqs();
  const groups = [...new Set(faqs.map((f) => f.category))];
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <PageHero eyebrow="Questions" title="Good to know" intro="Quick answers about ordering, payment, delivery, prescriptions and your information." />
      <div className="container-x py-10 md:py-14 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g} aria-labelledby={`g-${g.replace(/\W+/g, '-')}`}>
              <h2 id={`g-${g.replace(/\W+/g, '-')}`} className="!text-2xl">{g}</h2>
              <div className="mt-2">{faqs.filter((f) => f.category === g).map((f) => (
                <details key={f.id} className="acc"><summary>{f.question}<span className="plus" aria-hidden="true"><Icon name="plus" size={16} /></span></summary><div>{f.answer}</div></details>
              ))}</div>
            </section>
          ))}
        </div>
        <aside><div className="card-soft p-6"><h2 className="!text-xl">Still have a question?</h2><p className="mt-2 text-muted">Send it to the team and we will reply by email.</p><Link href="/contact" className="btn btn-primary mt-4">Contact us</Link></div></aside>
      </div>
    </>
  );
}
