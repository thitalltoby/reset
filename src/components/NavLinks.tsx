'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';

const active = (path: string, href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));

export function NavLinks({ links, className = '' }: { links: { href: string; label: string }[]; className?: string }) {
  const path = usePathname();
  return (
    <ul className={`flex items-center gap-1 ${className}`}>
      {links.map((l) => (
        <li key={l.href}><Link href={l.href} className="nav-link" aria-current={active(path, l.href) ? 'page' : undefined}>{l.label}</Link></li>
      ))}
    </ul>
  );
}

/** Phone-sized tab bar: the five things people do most. */
export function BottomNav({ cartCount, prescriptions }: { cartCount: number; prescriptions: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/shop', label: 'Shop', icon: 'grid' },
    { href: prescriptions ? '/prescriptions' : '/services', label: prescriptions ? 'Prescription' : 'Services', icon: prescriptions ? 'rx' : 'sparkle' },
    { href: '/cart', label: 'Basket', icon: 'bag' },
    { href: '/account', label: 'Account', icon: 'user' },
  ];
  return (
    <nav className="bottom-nav lg:hidden no-print" aria-label="Main">
      <div className="grid grid-cols-5">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} aria-current={active(path, t.href) ? 'page' : undefined}>
            <span className="relative"><Icon name={t.icon} size={23} />{t.href === '/cart' && cartCount > 0 && <span className="count-bubble" style={{ right: '-.7rem', top: '-.45rem' }} aria-hidden="true">{cartCount > 99 ? '99+' : cartCount}</span>}</span>
            {t.label}{t.href === '/cart' && cartCount > 0 && <span className="sr-only"> ({cartCount} items)</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Sidebar link in the staff console: marks the current section. */
export function AdminNavLink({ href, exact = false, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const on = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return <Link href={href} aria-current={on ? 'page' : undefined}>{children}</Link>;
}
