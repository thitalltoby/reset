import type { Metadata } from 'next';
import { ShopView, type ShopParams } from '@/components/ShopView';

export const metadata: Metadata = { title: 'Shop', description: 'Everyday health essentials, vitamins, first aid, baby and personal care. Add to your basket and pay by card or on delivery.' };

export default async function ShopPage({ searchParams }: { searchParams: Promise<ShopParams> }) {
  return <ShopView params={await searchParams} />;
}
