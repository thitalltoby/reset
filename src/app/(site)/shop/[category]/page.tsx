import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShopView, type ShopParams } from '@/components/ShopView';
import { db } from '@/server/db';

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const c = await db.category.findFirst({ where: { slug: (await params).category, visible: true } });
  return c ? { title: c.name, description: c.blurb || `Shop ${c.name} at Reset Pharmacy.` } : {};
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ category: string }>; searchParams: Promise<ShopParams> }) {
  const { category } = await params;
  if (!(await db.category.findFirst({ where: { slug: category, visible: true }, select: { id: true } }))) notFound();
  return <ShopView params={await searchParams} categorySlug={category} />;
}
