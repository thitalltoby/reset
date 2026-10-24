import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteNotice } from '@/components/SiteNotice';
import { SiteFooter } from '@/components/SiteFooter';
import { ConsentAnalytics } from '@/components/ConsentAnalytics';
import { getAnalytics } from '@/server/integrations/providers/analytics';
import { getSite } from '@/server/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSite();
  return { description: seo.description };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const analytics = await getAnalytics();
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <SiteNotice />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter cookieSettings={!!analytics} />
      {analytics && <ConsentAnalytics cfg={analytics} />}
    </>
  );
}
