import type { MetadataRoute } from 'next';
import { env } from '@/server/env';
import { db } from '@/server/db';
import { publicProductWhere } from '@/server/catalog';
import { getArticles, getServices } from '@/server/content';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_URL.replace(/\/$/, '');
  const fixed = ['', '/shop', '/about', '/services', '/health', '/faq', '/contact', '/prescriptions', '/delivery-returns', '/privacy', '/terms', '/track'];
  const [cats, products, services, articles] = await Promise.all([
    db.category.findMany({ where: { visible: true }, select: { slug: true } }),
    db.product.findMany({ where: publicProductWhere(), select: { slug: true, updatedAt: true } }),
    getServices(), getArticles(500),
  ]);
  return [
    ...fixed.map((p) => ({ url: `${base}${p}` })),
    ...cats.map((c) => ({ url: `${base}/shop/${c.slug}` })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt })),
    ...services.map((s) => ({ url: `${base}/services/${s.slug}` })),
    ...articles.map((a) => ({ url: `${base}/health/${a.slug}`, lastModified: a.updatedAt })),
  ];
}
