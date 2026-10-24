import type { MetadataRoute } from 'next';
import { env } from '@/server/env';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  // A demonstration site with sample products must never be indexed
  if (env.SITE_MODE === 'demo') return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/api', '/files', '/checkout', '/cart', '/order', '/prescriptions/', '/media/'] }],
    sitemap: `${env.APP_URL.replace(/\/$/, '')}/sitemap.xml`,
  };
}
