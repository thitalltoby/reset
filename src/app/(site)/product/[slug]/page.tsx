import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug, relatedProducts } from '@/server/catalog';
import { getSessionUser } from '@/server/session';
import { favouriteIds } from '@/server/account';
import { getSite } from '@/server/site';
import { renderMarkdown } from '@/server/markdown';
import { ProductGrid, stockNote } from '@/components/ProductCard';
import { ProductGallery } from '@/components/ProductGallery';
import { AddToCartFull } from '@/components/AddToCart';
import { FavouriteButton } from '@/components/FavouriteButton';
import { Badge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { formatNaira } from '@/lib/money';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await getProductBySlug((await params).slug);
  if (!r) return {};
  const t = r.product.packSize ? `${r.product.name}, ${r.product.packSize}` : r.product.name;
  return { title: t, description: r.product.summary, openGraph: { title: t, description: r.product.summary } };
}

function Acc({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="acc" open={open}>
      <summary>{title}<span className="plus" aria-hidden="true"><Icon name="plus" size={16} /></span></summary>
      <div>{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getProductBySlug(slug);
  if (!r) notFound();
  const { product: p, card, gallery, siblings } = r;
  const verified = p.infoStatus === 'VERIFIED';
  const foreignPack = p.packMarket && !/^(Nigeria|Not stated)/i.test(p.packMarket) ? p.packMarket.replace(/\s*\(.*$/, '') : null;
  const [site, user, related] = await Promise.all([getSite(), getSessionUser(), relatedProducts(p)]);
  const canFav = user?.role === 'CUSTOMER';
  const favs = canFav ? await favouriteIds(user!.id) : new Set<string>();
  const note = stockNote(card.available, card.classification);
  const sale = card.compareAtKobo !== null;
  const buyable = p.classification === 'OTC' && card.available > 0 && site.shop.onlineShop;
  const cat = p.category;
  const ld = p.classification === 'OTC' ? {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, description: p.summary, brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined, image: gallery.length ? gallery.map((g) => `${site.appUrl}${g.src}`) : undefined,
    offers: { '@type': 'Offer', priceCurrency: 'NGN', price: (p.priceKobo / 100).toFixed(2), availability: card.available > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${site.appUrl}/product/${p.slug}` },
  } : null;
  const perks = [
    site.shop.delivery && { icon: 'truck', text: 'Delivery available' },
    site.shop.pickup && { icon: 'store', text: 'Collect from the pharmacy' },
    site.shop.paystack && { icon: 'card', text: 'Pay securely by card or transfer' },
    site.shop.payOnDelivery && { icon: 'cash', text: 'Pay on delivery or collection' },
  ].filter(Boolean) as { icon: string; text: string }[];

  return (
    <div className="container-x py-6 md:py-10">
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />}
      <nav aria-label="Breadcrumb" className="text-sm text-muted mb-4">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/shop">Shop</Link></li>
          {cat.parent && <><li aria-hidden="true">/</li><li><Link href={`/shop/${cat.parent.slug}`}>{cat.parent.name}</Link></li></>}
          <li aria-hidden="true">/</li><li><Link href={`/shop/${cat.slug}`}>{cat.name}</Link></li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative lg:sticky lg:top-32 lg:self-start">
          <ProductGallery images={gallery} name={p.name}>
            {card.isDemo && <span className="demo-tag"><span className="chip chip-line">Sample product</span></span>}
          </ProductGallery>
          {foreignPack && <p className="mt-3 text-[.85rem] text-muted">Picture shows a pack made for {foreignPack}. The pack we supply may look different, so check the label when you collect it.</p>}
          {canFav && <FavouriteButton productId={p.id} name={p.name} saved={favs.has(p.id)} next={`/product/${p.slug}`} />}
        </div>

        <div>
          {p.brand && <p className="eyebrow">{p.brand}</p>}
          <h1 className="!text-[2rem] md:!text-[2.6rem] mt-1">{p.name}</h1>
          {p.packSize && <p className="text-muted mt-1 text-lg">{p.packSize}</p>}
          <p className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="price !text-[2rem]">{formatNaira(p.priceKobo)}</span>
            {sale && <><span className="price-was !text-lg"><span className="sr-only">Was </span>{formatNaira(card.compareAtKobo)}</span><span className="badge badge-sale">Offer</span></>}
          </p>
          {!p.priceConfirmed && <p className="mt-1 text-[.85rem] text-muted">Provisional price: the pharmacy has not confirmed it yet.</p>}
          <p className="mt-2 text-[1.05rem]">{p.summary}</p>
          {note && <p className="mt-3"><Badge tone={note.tone}>{note.text}</Badge></p>}

          {siblings.length > 0 && (
            <div className="mt-5"><p className="label">Other sizes</p>
              <ul className="flex flex-wrap gap-2">{siblings.map((s) => <li key={s.id}><Link href={`/product/${s.slug}`} className="chip chip-line no-underline !py-2 !px-4">{s.packSize ?? s.name} · {formatNaira(s.priceKobo)}</Link></li>)}</ul>
            </div>
          )}

          <div className="mt-6">
            {buyable ? <AddToCartFull productId={p.id} max={Math.min(card.available, p.maxPerOrder)} />
              : p.classification === 'PHARMACY_ONLY' ? (
                <div className="card-soft card-pad">
                  <h2 className="!text-lg flex items-center gap-2"><Icon name="shield" size={20} className="text-forest" />Supplied by the pharmacist</h2>
                  <p className="mt-1 text-muted">This product is given after a pharmacist has checked it is suitable for you, so it cannot be added to the basket. Ask us and we will tell you whether we have it and how to get it.</p>
                  <div className="mt-4 flex flex-wrap gap-3"><Link className="btn btn-primary" href={`/contact?topic=product&product=${p.slug}`}>Ask the pharmacist</Link>{site.shop.prescriptions && <Link className="btn btn-outline" href="/prescriptions">Send a prescription</Link>}</div>
                </div>
              ) : <div className="alert alert-warn">{!site.shop.onlineShop ? 'Online ordering is not open yet.' : 'This item is out of stock right now.'} <Link href={`/contact?topic=product&product=${p.slug}`}>Ask when it will be back</Link>.</div>}
          </div>

          {perks.length > 0 && <ul className="mt-6 grid gap-2 sm:grid-cols-2">{perks.map((x) => <li key={x.text} className="flex items-center gap-2.5 text-[.95rem]"><span className="grid place-items-center w-9 h-9 rounded-full bg-mint text-forest flex-none"><Icon name={x.icon} size={18} /></span>{x.text}</li>)}</ul>}

          <div className="mt-8">
            {p.description && <Acc title="About this product" open><div className="prose-reset !text-base" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.description) }} /></Acc>}
            {verified && p.howToUse && <Acc title="How to use"><div className="prose-reset !text-base" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.howToUse) }} /></Acc>}
            <Acc title="Warnings and safety" open={verified && !!p.warnings}>
              {verified && p.warnings && <div className="prose-reset !text-base" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.warnings) }} />}
              {!verified && <p className="mb-2">Directions and warnings for this exact product are printed on its pack and leaflet. We have not published them here yet, so please read the pack and ask a pharmacist if you are unsure.</p>}
              <p className="mt-2">Read the label and leaflet before use. Ask a pharmacist before taking this product if you are pregnant or breastfeeding, take other medicines, have a long-term condition, or are buying for a child. Keep out of the reach of children. If symptoms get worse or do not improve, see a doctor.</p>
            </Acc>
            {(verified && (p.activeIngredients || p.ingredients)) && <Acc title="Ingredients">{p.activeIngredients && <p><span className="font-semibold text-ink">Active: </span>{p.activeIngredients}</p>}{p.ingredients && <p className="whitespace-pre-line mt-1">{p.ingredients}</p>}</Acc>}
            {verified && p.storage && <Acc title="Storage"><p>{p.storage}</p></Acc>}
            <Acc title="Product details"><dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
              {p.brand && <><dt className="font-semibold text-ink">Brand</dt><dd>{p.brand}</dd></>}
              {p.manufacturer && <><dt className="font-semibold text-ink">Made by</dt><dd>{p.manufacturer}</dd></>}
              {p.strength && verified && <><dt className="font-semibold text-ink">Strength</dt><dd>{p.strength}</dd></>}
              {p.packSize && <><dt className="font-semibold text-ink">Pack size</dt><dd>{p.packSize}</dd></>}
              <dt className="font-semibold text-ink">How it is sold</dt><dd>{p.classification === 'OTC' ? 'Over the counter' : 'Supplied by the pharmacist'}</dd>
              <dt className="font-semibold text-ink">Code</dt><dd>{p.sku}</dd>{p.barcode && <><dt className="font-semibold text-ink">Barcode</dt><dd>{p.barcode}</dd></>}{p.nafdacNumber && <><dt className="font-semibold text-ink">NAFDAC no.</dt><dd>{p.nafdacNumber}</dd></>}<dt className="font-semibold text-ink">Category</dt><dd>{cat.name}</dd></dl></Acc>
          </div>

          <div className="mt-6 card-soft card-pad flex items-start gap-3">
            <Icon name="chat" size={22} className="text-forest mt-0.5 flex-none" />
            <div><p className="font-display font-semibold">Not sure this is right for you?</p><p className="text-muted text-[.95rem]">A pharmacist can answer questions about this product. <Link href={`/contact?topic=product&product=${p.slug}`}>Ask a question</Link>.</p></div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="rel"><h2 id="rel" className="!text-2xl mb-5">You might also need</h2><ProductGrid cards={related} /></section>
      )}
    </div>
  );
}
