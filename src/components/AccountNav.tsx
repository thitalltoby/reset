'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';
import { logoutAction } from '@/app/(site)/auth-actions';

const LINKS = [
  { href: '/account', label: 'Overview', icon: 'home' },
  { href: '/account/orders', label: 'Orders', icon: 'receipt' },
  { href: '/account/prescriptions', label: 'Prescriptions', icon: 'rx' },
  { href: '/account/favourites', label: 'Favourites', icon: 'heart' },
  { href: '/account/addresses', label: 'Addresses', icon: 'pin' },
  { href: '/account/profile', label: 'Profile & privacy', icon: 'user' },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="lg:sticky lg:top-32 self-start">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {LINKS.map((l) => {
          const on = l.href === '/account' ? path === l.href : path.startsWith(l.href);
          return <li key={l.href} className="flex-none"><Link href={l.href} aria-current={on ? 'page' : undefined} className="nav-link w-full !justify-start gap-2.5 whitespace-nowrap"><Icon name={l.icon} size={18} />{l.label}</Link></li>;
        })}
        <li className="flex-none lg:mt-2"><form action={logoutAction}><button className="nav-link w-full !justify-start gap-2.5 text-muted" type="submit"><Icon name="logout" size={18} />Sign out</button></form></li>
      </ul>
    </nav>
  );
}
