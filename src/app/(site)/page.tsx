import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getSite } from '@/server/site';
import { categoryTree, listProducts } from '@/server/catalog';
import { getArticles, getFaqs, getPromotions, getServices, getTestimonials } from '@/server/content';
import { SearchBox } from '@/components/SearchBox';
import { Icon } from '@/components/Icon';
import { ProductArt } from '@/components/ProductArt';
import { ProductGrid } from '@/components/ProductCard';
import { SectionHead } from '@/components/ui';
import { getSessionUser } from '@/server/session';
import { favouriteIds } from '@/server/account';

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSite();
  const o = seo.pages['/'];
  return { title: { absolute: o?.title || `${seo.siteName} — a fresh start to feeling better` }, description: o?.description || seo.description, alternates: { canonical: '/' } };
}

const STEPS = [
  { icon: 'search', title: 'Find what you need', text: 'Search by product name or brand, or browse by category.' },
  { icon: 'bag', title: 'Check out in a minute', text: 'Guest checkout is fine. Prices and stock are confirmed again before you pay.' },
  { icon: 'truck', title: 'Follow your order', text: 'A tracking link in your confirmation email shows each step until it reaches you.' },
];

const VALUES = [
  { icon: 'shield', title: 'Trust', text: 'Honest communication, dependable service, and responsible handling of healthcare needs.' },
  { icon: 'users', title: 'People-first care', text: 'Every customer treated with dignity, patience and consideration.' },
  { icon: 'book', title: 'Clarity', text: 'Product information, processes and health guidance that are easy to understand.' },
  { icon: 'rx', title: 'Responsibility', text: 'Safe medicine use, and the right professional advice at the right time.' },
];

export default async function HomePage() {
  const [site, tree, featured, promos, services, articles, testimonials, faqs, user] = await Promise.all([
    getSite(), categoryTree(), listProducts({ featured: true, inStock: true, pageSize: 8 }), getPromotions(), getServices(), getArticles(3), getTestimonials(), getFaqs(), getSessionUser(),
  ]);
  const { shop, company } = site;
  const customer = user?.role === 'CUSTOMER' ? user : null;
  const favs = customer ? await favouriteIds(customer.id) : undefined;
  const chips = [
    shop.delivery && { icon: 'truck', text: 'Home delivery' },
    shop.pickup && { icon: 'store', text: 'Collect in store' },
    shop.paystack && { icon: 'card', text: 'Pay by card, transfer or USSD' },
    shop.payOnDelivery && { icon: 'cash', text: 'Pay on delivery or collection' },
  ].filter(Boolean) as { icon: string; text: string }[];
  const top = tree.filter((c) => c.count > 0).slice(0, 8);
  const sampleFeatured = featured.items.length > 0 ? featured.items : (await listProducts({ pageSize: 8, inStock: true })).items;

  return (
    <>
      {/* ── Hero ── */}
      <section aria-labelledby="hero-h" className="relative overflow-hidden">
        <div className="container-x grid items-center gap-8 pt-8 pb-10 md:pt-14 md:pb-16 lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative z-10">
            <p className="eyebrow">Reset Pharmacy</p>
            <h1 id="hero-h" className="mt-3 !text-[clamp(2.4rem,6vw,4.4rem)] !leading-[1.04] tracking-tight">
              A fresh start to <span className="hl-green">feeling better</span>.
            </h1>
            <p className="lead mt-5">Everyday health essentials, clear guidance and a pharmacist who treats your questions with care. {shop.onlineShop ? 'Order online in a minute.' : 'Browse the range and ask us anything.'}</p>
            <div className="mt-7 max-w-xl"><SearchBox /></div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-primary btn-lg">Shop now<Icon name="arrow" size={18} /></Link>
              {shop.prescriptions
                ? <Link href="/prescriptions" className="btn btn-outline btn-lg"><Icon name="rx" size={18} />Send a prescription</Link>
                : <Link href="/contact" className="btn btn-outline btn-lg"><Icon name="chat" size={18} />Ask a pharmacist</Link>}
            </div>
            {chips.length > 0 && <ul className="mt-6 flex flex-wrap gap-2" aria-label="Ways to order">{chips.map((c) => <li key={c.text} className="chip chip-line"><Icon name={c.icon} size={15} className="text-forest" />{c.text}</li>)}</ul>}
          </div>
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute inset-x-[6%] top-[6%] bottom-0 rounded-[3rem] bg-mint" aria-hidden="true" />
            <div className="absolute -right-8 -top-10 h-56 w-56 opacity-60 spin-slow" aria-hidden="true" style={{ background: "url('/brand/pattern.svg') center / contain no-repeat" }} />
            <Image src="/photos/nurse.webp" alt="A smiling pharmacist in a white coat" width={1200} height={1090} loading="eager" fetchPriority="high" sizes="(min-width:1024px) 45vw, 92vw" className="relative z-10 mx-auto h-auto w-[92%]" />
            <div className="card-float float-slow absolute left-0 bottom-[14%] z-20 flex max-w-[15rem] items-center gap-3 p-3.5 pr-4">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-mint text-forest"><Icon name="shield" size={22} /></span>
              <p className="text-[.88rem] leading-snug font-medium">Prescription medicines are checked by a pharmacist first.</p>
            </div>
            <div className="card-float float-slow-2 absolute right-0 top-[22%] z-20 hidden items-center gap-3 p-3.5 pr-4 sm:flex">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-brand text-ink"><Icon name="chat" size={22} /></span>
              <p className="text-[.88rem] leading-snug font-medium">Questions?<br /><Link href="/contact" className="font-display font-semibold">Ask a pharmacist</Link></p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      {top.length > 0 && (
        <section aria-labelledby="cats-h" className="section-tight">
          <div className="container-x">
            <SectionHead eyebrow="Shop by need" title={<span id="cats-h">Everything for everyday health</span>} action={<Link href="/shop" className="link-arrow">All products<Icon name="arrow" size={16} /></Link>} />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {top.map((c) => (
                <li key={c.id}>
                  <Link href={`/shop/${c.slug}`} className="group flex h-full flex-col items-center gap-2 rounded-[1.6rem] border border-line bg-white p-4 text-center no-underline transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg">
                    <span className="grid h-20 w-20 place-items-center rounded-full bg-mint transition group-hover:bg-mint-2"><ProductArt kind={c.art} size={52} /></span>
                    <span className="font-display text-[.98rem] font-semibold leading-tight text-ink">{c.name}</span>
                    <span className="text-[.8rem] text-muted">{c.count} item{c.count === 1 ? '' : 's'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Promotions ── */}
      {promos.length > 0 && (
        <section aria-label="Offers" className="section-tight !pt-0">
          <div className={`container-x grid gap-4 ${promos.length > 1 ? "md:grid-cols-2" : ""}`}>
            {promos.slice(0, 2).map((p) => {
              const tone = p.tone === 'GREEN' ? 'bg-brand text-ink' : p.tone === 'RED' ? 'bg-red-soft text-ink' : 'bg-mint text-ink';
              return (
                <article key={p.id} className={`relative overflow-hidden rounded-[2rem] p-7 md:p-9 ${tone}`}>
                  <h2 className="!text-2xl md:!text-3xl max-w-md">{p.title}</h2>
                  {p.body && <p className="mt-2 max-w-md text-[1.02rem]">{p.body}</p>}
                  {p.couponCode && <p className="mt-3">Use code <strong className="rounded-full bg-white px-3 py-1 font-display tracking-wide">{p.couponCode}</strong></p>}
                  <Link href={p.ctaHref} className="btn btn-primary mt-5">{p.ctaLabel}<Icon name="arrow" size={16} /></Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Featured ── */}
      {sampleFeatured.length > 0 && (
        <section aria-labelledby="feat-h" className="section-tight">
          <div className="container-x">
            <SectionHead eyebrow="Popular right now" title={<span id="feat-h">Picked for you</span>} action={<Link href="/shop" className="link-arrow">See the whole shop<Icon name="arrow" size={16} /></Link>} />
            <ProductGrid cards={sampleFeatured} favourites={favs} canFavourite={!!customer} next="/" />
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section aria-labelledby="how-h" className="section-tight">
        <div className="container-x">
          <div className="rounded-[2.4rem] bg-mist border border-line p-6 md:p-12">
            <SectionHead eyebrow="Simple by design" title={<span id="how-h">Shopping with Reset takes three steps</span>} />
            <ol className="grid gap-5 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-[1.6rem] bg-white p-6 shadow-sm">
                  <span className="absolute right-5 top-4 font-display text-5xl font-bold text-mint-2" aria-hidden="true">{i + 1}</span>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-ink"><Icon name={s.icon} size={24} /></span>
                  <h3 className="mt-4 !text-xl">{s.title}</h3>
                  <p className="mt-1.5 text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Prescription band ── */}
      <section aria-labelledby="rx-h" className="section-tight">
        <div className="container-x">
          <div className="on-forest bg-pattern grid items-center gap-8 overflow-hidden rounded-[2.4rem] p-7 md:grid-cols-[1.2fr_.8fr] md:p-14">
            <div>
              <p className="eyebrow eyebrow-light">Prescriptions</p>
              <h2 id="rx-h" className="mt-2 !text-white !text-3xl md:!text-[2.6rem]">Prescriptions, handled with care</h2>
              <p className="mt-4 max-w-xl text-[1.08rem] text-white/90">Prescription-only medicines are never sold through the basket. They go to a pharmacist, who checks the prescription and tells you what happens next. Nothing is supplied automatically.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {shop.prescriptions
                  ? <Link href="/prescriptions" className="btn btn-green btn-lg">Send a prescription<Icon name="arrow" size={18} /></Link>
                  : <Link href="/contact?topic=prescription" className="btn btn-green btn-lg">Ask the pharmacy<Icon name="arrow" size={18} /></Link>}
                <Link href="/services" className="btn btn-light btn-lg">How it works</Link>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-sm">
              <Image src="/photos/pharmacist.jpg" alt="" width={580} height={523} sizes="(min-width:768px) 28vw, 80vw" className="aspect-[4/3.6] w-full rounded-[2rem] object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Reset ── */}
      <section aria-labelledby="why-h" className="section">
        <div className="container-x grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Why Reset</p>
            <h2 id="why-h" className="mt-2">A more reassuring pharmacy experience</h2>
            <p className="lead mt-4">People feel listened to, information is communicated clearly, and health needs are treated with care and responsibility. That is the promise we build every part of this shop around.</p>
            <Link href="/about" className="link-arrow mt-6">About Reset Pharmacy<Icon name="arrow" size={16} /></Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <li key={v.title} className="card card-pad">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-mint text-forest"><Icon name={v.icon} size={22} /></span>
                <h3 className="mt-3 !text-xl">{v.title}</h3>
                <p className="mt-1 text-muted">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Services ── */}
      {services.length > 0 && (
        <section aria-labelledby="svc-h" className="section-tight">
          <div className="container-x">
            <SectionHead eyebrow="Pharmacy services" title={<span id="svc-h">More than a shop</span>} action={<Link href="/services" className="link-arrow">All services<Icon name="arrow" size={16} /></Link>} />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.slice(0, 4).map((s) => (
                <li key={s.id}>
                  <Link href={`/services/${s.slug}`} className="card card-pad flex h-full flex-col gap-2 no-underline transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-mint text-forest"><Icon name={s.icon} size={24} /></span>
                    <h3 className="!text-lg text-ink">{s.title}</h3>
                    <p className="text-[.95rem] text-muted">{s.summary}</p>
                    <span className="link-arrow mt-auto pt-2 text-[.95rem]">Learn more<Icon name="arrow" size={15} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Health hub ── */}
      {articles.length > 0 && (
        <section aria-labelledby="hub-h" className="section-tight">
          <div className="container-x">
            <SectionHead eyebrow="Health & Wellness Centre" title={<span id="hub-h">Clear guidance you can use</span>} action={<Link href="/health" className="link-arrow">Visit the Centre<Icon name="arrow" size={16} /></Link>} />
            <ul className="grid gap-4 md:grid-cols-3">
              {articles.map((a) => (
                <li key={a.id}>
                  <Link href={`/health/${a.slug}`} className="card flex h-full flex-col overflow-hidden no-underline transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg">
                    <span className="grid place-items-center bg-mint py-8"><ProductArt kind={a.art} size={84} /></span>
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
          </div>
        </section>
      )}

      {/* ── Testimonials: only ever real, approved quotes ── */}
      {testimonials.length > 0 && (
        <section aria-labelledby="tm-h" className="section-tight">
          <div className="container-x">
            <SectionHead eyebrow="Kind words" title={<span id="tm-h">What customers say</span>} />
            <ul className="grid gap-4 md:grid-cols-3">
              {testimonials.slice(0, 3).map((t) => (
                <li key={t.id} className="card card-pad">
                  <blockquote className="text-[1.05rem]">“{t.quote}”</blockquote>
                  <p className="mt-4 font-display font-semibold">{t.name}</p>
                  {t.detail && <p className="text-sm text-muted">{t.detail}</p>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      {faqs.length > 0 && (
        <section aria-labelledby="faq-h" className="section">
          <div className="container-x grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <p className="eyebrow">Questions</p>
              <h2 id="faq-h" className="mt-2">Good to know</h2>
              <p className="lead mt-3">Quick answers about ordering, payment and prescriptions.</p>
              <Link href="/faq" className="link-arrow mt-5">All questions<Icon name="arrow" size={16} /></Link>
            </div>
            <div>
              {faqs.slice(0, 6).map((f) => (
                <details key={f.id} className="acc">
                  <summary>{f.question}<span className="plus" aria-hidden="true"><Icon name="plus" size={16} /></span></summary>
                  <div>{f.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Closing ── */}
      <section aria-labelledby="end-h" className="section-tight">
        <div className="container-x">
          <div className="rounded-[2.4rem] bg-mint px-6 py-12 text-center md:py-16">
            <h2 id="end-h" className="mx-auto max-w-2xl">Ready for a fresh start?</h2>
            <p className="lead mx-auto mt-3">Browse the shop, or tell us what you are looking for.{company.phone ? '' : ' We are happy to help.'}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/shop" className="btn btn-primary btn-lg">Start shopping</Link>
              <Link href="/contact" className="btn btn-outline btn-lg">Contact us</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
