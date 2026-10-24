import Link from 'next/link';
import { requireCustomer } from '@/server/rbac';
import { db } from '@/server/db';
import { toCards, publicProductWhere } from '@/server/catalog';
import { ProductGrid } from '@/components/ProductCard';
import { Empty } from '@/components/ui';

export const metadata = { title: 'Your favourites' };

export default async function Favourites() {
  const u = await requireCustomer('/account/favourites');
  const favs = await db.favourite.findMany({ where: { userId: u.id }, select: { productId: true }, orderBy: { createdAt: 'desc' } });
  const rows = favs.length ? await db.product.findMany({ where: publicProductWhere({ id: { in: favs.map((f) => f.productId) } }), include: { category: true } }) : [];
  const cards = await toCards(rows);
  if (!cards.length) return <Empty title="No favourites yet" action={<Link href="/shop" className="btn btn-primary">Browse the shop</Link>}>Tap the heart on any product to keep it here for next time.</Empty>;
  return <div><h2 className="mb-4 !text-xl">Your favourites</h2><ProductGrid cards={cards} favourites={new Set(cards.map((c) => c.id))} canFavourite next="/account/favourites" /></div>;
}
