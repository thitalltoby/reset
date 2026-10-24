import Link from 'next/link';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { SearchBox } from './SearchBox';
import { NavLinks, BottomNav } from './NavLinks';
import { cartCount } from '@/server/cart';
import { getSessionUser } from '@/server/session';
import { getSite } from '@/server/site';

export async function SiteHeader() {
  const [count, user, site] = await Promise.all([cartCount(), getSessionUser(), getSite()]);
  const links = [
    { href: '/shop', label: 'Shop' },
    ...(site.shop.prescriptions ? [{ href: '/prescriptions', label: 'Prescriptions' }] : []),
    { href: '/services', label: 'Services' },
    { href: '/health', label: 'Health hub' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];
  return (
    <>
      {site.demo && (
        <div className="bg-ink text-white text-center text-[.85rem] py-1.5 px-3 no-print" role="note">
          <strong className="font-semibold">Demonstration site.</strong> Products, prices and stock shown here are sample data, not a live pharmacy catalogue.
        </div>
      )}
      <header className="site-header no-print">
        <div className="container-x">
          <div className="flex items-center gap-3 md:gap-6 py-3">
            <Link href="/" aria-label="Reset Pharmacy home" className="flex-none"><Logo height={38} className="hidden xs:block" /><Logo height={32} className="xs:hidden" /></Link>
            <div className="hidden md:block flex-1 max-w-2xl mx-auto"><SearchBox /></div>
            <div className="ml-auto flex items-center gap-1">
              <Link href="/track" className="hidden xl:inline-flex nav-link text-[.92rem]"><Icon name="truck" size={18} className="mr-2" />Track order</Link>
              <Link href={user ? (user.role === 'CUSTOMER' ? '/account' : '/admin') : '/login'} className="icon-btn" aria-label={user ? 'Your account' : 'Sign in'}><Icon name="user" size={23} /></Link>
              <Link href="/cart" className="icon-btn" aria-label={count ? `Basket, ${count} item${count === 1 ? '' : 's'}` : 'Basket'}>
                <Icon name="bag" size={23} />{count > 0 && <span className="count-bubble" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
              </Link>
            </div>
          </div>
          <div className="md:hidden pb-3"><SearchBox /></div>
          <nav aria-label="Primary" className="hidden lg:flex items-center justify-between pb-2.5 -mt-1">
            <NavLinks links={links} />
            <p className="text-[.9rem] text-muted flex items-center gap-2"><Icon name="shield" size={16} className="text-forest" />Medicines advice from a qualified pharmacist</p>
          </nav>
        </div>
      </header>
      <BottomNav cartCount={count} prescriptions={site.shop.prescriptions} />
    </>
  );
}
