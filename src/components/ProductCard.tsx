import Link from 'next/link';
import Image from 'next/image';
import { Mark } from './Logo';
import { AddToCartIcon } from './AddToCart';
import { FavouriteButton } from './FavouriteButton';
import { Badge } from './ui';
import { formatNaira } from '@/lib/money';
import type { ProductCard as Card } from '@/server/catalog';

export function ProductImage({ card, sizes = '(min-width:1024px) 22vw, 46vw', priority = false }: { card: Pick<Card, 'image' | 'imageAlt' | 'name'>; sizes?: string; priority?: boolean }) {
  return card.image
    ? <Image src={card.image} alt={card.imageAlt} fill sizes={sizes} quality={85} loading={priority ? 'eager' : undefined} fetchPriority={priority ? 'high' : undefined} className="pcard-photo" />
    : (
      <span className="pcard-pending" role="img" aria-label={`${card.name}: photo to be added`}>
        <Mark variant="color" size={44} className="opacity-30" />
        <span>Photo coming soon</span>
      </span>
    );
}

export function stockNote(available: number, cls: Card['classification']): { text: string; tone: 'good' | 'warn' | 'bad' | 'info' } | null {
  if (cls === 'PHARMACY_ONLY') return { text: 'Ask the pharmacist', tone: 'info' };
  if (available <= 0) return { text: 'Out of stock', tone: 'bad' };
  if (available <= 5) return { text: `Only ${available} left`, tone: 'warn' };
  return null;
}

export function ProductCard({ card, favourite, canFavourite = false, next = '/shop', priority = false }: { card: Card; favourite?: boolean; canFavourite?: boolean; next?: string; priority?: boolean }) {
  const note = stockNote(card.available, card.classification);
  const sale = card.compareAtKobo !== null;
  return (
    <article className="pcard">
      <div className="pcard-art">
        <ProductImage card={card} priority={priority} />
        {sale && <span className="absolute left-3 top-3 badge badge-sale">Offer</span>}
        {card.isDemo && <span className="demo-tag"><span className="chip chip-line !text-[.7rem] !py-0.5">Sample</span></span>}
      </div>
      {canFavourite && <FavouriteButton productId={card.id} name={card.name} saved={!!favourite} next={next} />}
      <div className="pcard-body">
        {card.brand && <p className="text-[.78rem] uppercase tracking-wider text-muted font-semibold">{card.brand}</p>}
        <Link href={`/product/${card.slug}`} className="pcard-name">{card.name}</Link>
        {card.packSize && <p className="text-[.88rem] text-muted">{card.packSize}</p>}
        {note && <p className="mt-1"><Badge tone={note.tone}>{note.text}</Badge></p>}
        <div className="pcard-foot">
          <p className="price">{formatNaira(card.priceKobo)}{sale && <span className="price-was"><span className="sr-only">was </span>{formatNaira(card.compareAtKobo)}</span>}</p>
          {card.classification === 'OTC' && card.available > 0 ? <AddToCartIcon productId={card.id} name={card.name} /> : null}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ cards, favourites, canFavourite, next }: { cards: Card[]; favourites?: Set<string>; canFavourite?: boolean; next?: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {cards.map((c, i) => <li key={c.id}><ProductCard card={c} favourite={favourites?.has(c.id)} canFavourite={canFavourite} next={next} priority={i < 4} /></li>)}
    </ul>
  );
}
