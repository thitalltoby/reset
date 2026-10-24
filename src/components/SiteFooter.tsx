import Link from 'next/link';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { CookieSettingsButton } from './ConsentAnalytics';
import { getSite, telHref, whatsappHref } from '@/server/site';

export async function SiteFooter({ cookieSettings = false }: { cookieSettings?: boolean }) {
  const { company: c, shop, demo } = await getSite();
  const tel = telHref(c.phone);
  const wa = whatsappHref(c.whatsapp);
  const socials = [['Instagram', c.instagram], ['Facebook', c.facebook], ['X', c.x], ['TikTok', c.tiktok]].filter(([, u]) => u && /^https:\/\//.test(u as string)) as [string, string][];
  return (
    <footer className="on-forest bg-pattern no-print mt-8">
      <div className="container-x pt-14 pb-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo variant="white" height={44} />
            <p className="mt-4 text-[1.05rem] max-w-xs">{c.tagline}</p>
            <ul className="mt-5 space-y-2 text-[.96rem]">
              {c.address && <li className="flex gap-2.5"><Icon name="pin" size={18} className="mt-1 flex-none" /><span className="whitespace-pre-line">{c.address}</span></li>}
              {c.phone && <li className="flex gap-2.5"><Icon name="phone" size={18} className="mt-1 flex-none" />{tel ? <a href={tel}>{c.phone}</a> : c.phone}</li>}
              {c.email && <li className="flex gap-2.5"><Icon name="mail" size={18} className="mt-1 flex-none" /><a href={`mailto:${c.email}`}>{c.email}</a></li>}
              {wa && <li className="flex gap-2.5"><Icon name="chat" size={18} className="mt-1 flex-none" /><a href={wa} rel="noopener noreferrer">Chat on WhatsApp</a></li>}
              {c.hours && <li className="flex gap-2.5"><Icon name="clock" size={18} className="mt-1 flex-none" /><span className="whitespace-pre-line">{c.hours}</span></li>}
              {!c.address && !c.phone && !c.email && <li className="text-white/75">Contact details will appear here once the pharmacy confirms them. <Link href="/contact" className="underline">Send us a message</Link>.</li>}
            </ul>
          </div>
          <nav aria-label="Shop" className="md:col-span-2">
            <h2 className="!text-base !font-semibold mb-3 !tracking-normal">Shop</h2>
            <ul className="space-y-2 text-[.96rem]">
              <li><Link href="/shop">All products</Link></li>
              <li><Link href="/shop?sale=1">Offers</Link></li>
              <li><Link href="/cart">Your basket</Link></li>
              <li><Link href="/track">Track an order</Link></li>
              <li><Link href="/account">Your account</Link></li>
            </ul>
          </nav>
          <nav aria-label="Pharmacy care" className="md:col-span-3">
            <h2 className="!text-base !font-semibold mb-3 !tracking-normal">Pharmacy care</h2>
            <ul className="space-y-2 text-[.96rem]">
              {shop.prescriptions && <li><Link href="/prescriptions">Send a prescription</Link></li>}
              <li><Link href="/services">Pharmacy services</Link></li>
              <li><Link href="/health">Health &amp; Wellness Centre</Link></li>
              <li><Link href="/faq">Questions &amp; answers</Link></li>
              <li><Link href="/contact">Ask a pharmacist</Link></li>
            </ul>
          </nav>
          <nav aria-label="Company" className="md:col-span-3">
            <h2 className="!text-base !font-semibold mb-3 !tracking-normal">Reset Pharmacy</h2>
            <ul className="space-y-2 text-[.96rem]">
              <li><Link href="/about">About us</Link></li>
              <li><Link href="/delivery-returns">Delivery &amp; returns</Link></li>
              <li><Link href="/privacy">Privacy notice</Link></li>
              <li><Link href="/terms">Terms of sale</Link></li>
              {cookieSettings && <li><CookieSettingsButton /></li>}
            </ul>
            {socials.length > 0 && <ul className="mt-5 flex flex-wrap gap-2">{socials.map(([n, u]) => <li key={n}><a href={u} rel="noopener noreferrer" className="chip !bg-white/15 !text-white no-underline">{n}</a></li>)}</ul>}
          </nav>
        </div>
        <div className="mt-12 border-t border-white/20 pt-6 text-[.85rem] text-white/80 space-y-2">
          {(c.registrationNumber || c.premisesLicence || c.superintendentPharmacist) && (
            <p>{[c.legalName, c.registrationNumber, c.premisesLicence && `Premises licence: ${c.premisesLicence}`, c.superintendentPharmacist && `Superintendent pharmacist: ${c.superintendentPharmacist}`].filter(Boolean).join(' · ')}</p>
          )}
          <p>The information on this site is general and does not replace advice from a pharmacist, doctor or other health professional. If you think you need urgent care, contact your nearest emergency service or health facility.{demo ? ' This is a demonstration site with sample products.' : ''}</p>
          <p>© {new Date().getFullYear()} {c.legalName || c.tradingName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
