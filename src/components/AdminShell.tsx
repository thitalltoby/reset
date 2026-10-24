import Link from 'next/link';
import { Icon } from './Icon';
import { Logo } from './Logo';
import type { SessionUser } from '@/server/session';
import { can, ROLE_LABELS, type Permission } from '@/lib/permissions';
import { logoutAction } from '@/app/(site)/auth-actions';
import { AdminNavLink } from './NavLinks';

type Item = { href: string; label: string; icon: string; perm: Permission[]; count?: keyof Counts };
export interface Counts { orders: number; rx: number; enquiries: number; lowStock: number }

const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Sell', items: [
    { href: '/admin', label: 'Dashboard', icon: 'gauge', perm: ['order.view', 'report.view', 'prescription.review', 'enquiry.manage', 'product.view'] },
    { href: '/admin/orders', label: 'Orders', icon: 'receipt', perm: ['order.view'], count: 'orders' },
    { href: '/admin/prescriptions', label: 'Prescriptions', icon: 'rx', perm: ['prescription.review'], count: 'rx' },
    { href: '/admin/enquiries', label: 'Enquiries', icon: 'chat', perm: ['enquiry.manage'], count: 'enquiries' },
    { href: '/admin/customers', label: 'Customers', icon: 'users', perm: ['customer.view'] },
  ] },
  { title: 'Catalogue', items: [
    { href: '/admin/products', label: 'Products', icon: 'box', perm: ['product.view'] },
    { href: '/admin/categories', label: 'Categories', icon: 'grid', perm: ['product.view'] },
    { href: '/admin/inventory', label: 'Stock', icon: 'list', perm: ['inventory.manage'], count: 'lowStock' },
  ] },
  { title: 'Website', items: [
    { href: '/admin/promotions', label: 'Offers & codes', icon: 'tag', perm: ['promo.manage', 'content.manage'] },
    { href: '/admin/delivery', label: 'Delivery areas', icon: 'truck', perm: ['promo.manage'] },
    { href: '/admin/services', label: 'Services', icon: 'sparkle', perm: ['content.manage'] },
    { href: '/admin/articles', label: 'Health articles', icon: 'book', perm: ['content.manage'] },
    { href: '/admin/faqs', label: 'Questions', icon: 'info', perm: ['content.manage'] },
    { href: '/admin/testimonials', label: 'Testimonials', icon: 'star', perm: ['content.manage'] },
  ] },
  { title: 'Insight & system', items: [
    { href: '/admin/reports', label: 'Reports', icon: 'chart', perm: ['report.view'] },
    { href: '/admin/users', label: 'Team', icon: 'user', perm: ['user.manage'] },
    { href: '/admin/settings', label: 'Settings', icon: 'settings', perm: ['settings.manage'] },
    { href: '/admin/integrations', label: 'Integrations', icon: 'plug', perm: ['integration.manage'] },
    { href: '/admin/outbox', label: 'Message log', icon: 'mail', perm: ['settings.manage'] },
    { href: '/admin/audit', label: 'Audit log', icon: 'log', perm: ['audit.view'] },
  ] },
];

export function AdminShell({ user, counts, children }: { user: SessionUser; counts: Counts; children: React.ReactNode }) {
  const nav = (
    <div className="admin-nav">
      {GROUPS.map((g) => {
        const items = g.items.filter((n) => n.perm.some((p) => can(user.role, p)));
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="grp">{g.title}</p>
            <ul>{items.map((n) => (
              <li key={n.href}><AdminNavLink href={n.href} exact={n.href === '/admin'}><Icon name={n.icon} size={18} /><span className="flex-1">{n.label}</span>{n.count && counts[n.count] > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-[.72rem] font-bold text-ink" aria-label={`${counts[n.count]} waiting`}>{counts[n.count]}</span>}</AdminNavLink></li>
            ))}</ul>
          </div>
        );
      })}
    </div>
  );
  return (
    <div className="min-h-screen bg-mist lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#admin-main" className="skip-link">Skip to content</a>
      <aside className="no-print sticky top-0 hidden h-screen flex-col bg-forest text-white lg:flex">
        <div className="border-b border-white/15 p-5"><Link href="/admin"><Logo variant="white" height={34} /></Link><p className="eyebrow eyebrow-light mt-3">Pharmacy console</p></div>
        <nav aria-label="Console" className="flex-1 overflow-y-auto p-3">{nav}</nav>
        <UserBlock user={user} />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="no-print flex items-center justify-between bg-forest px-4 py-3 text-white lg:hidden">
          <Link href="/admin"><Logo variant="white" height={28} /></Link>
          <details className="relative">
            <summary className="grid cursor-pointer list-none place-items-center rounded-full border border-white/40 p-2" aria-label="Menu"><Icon name="menu" /></summary>
            <div className="absolute right-0 top-full z-50 mt-2 max-h-[80vh] w-72 overflow-y-auto rounded-2xl border border-white/15 bg-forest p-2 shadow-xl">{nav}<div className="mt-2 border-t border-white/15"><UserBlock user={user} /></div></div>
          </details>
        </header>
        <main id="admin-main" className="w-full max-w-[92rem] flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function UserBlock({ user }: { user: SessionUser }) {
  return (
    <div className="border-t border-white/15 p-4 text-sm">
      <p className="truncate font-semibold">{user.name}</p>
      <p className="truncate text-xs text-white/90">{ROLE_LABELS[user.role]}</p>
      <div className="mt-3 flex items-center gap-3">
        <Link href="/admin/account" className="text-xs !text-white/85 underline">Account</Link>
        <Link href="/" className="text-xs !text-white/85 underline">Public site</Link>
        <form action={logoutAction} className="ml-auto"><button className="flex items-center gap-1 text-xs text-white/85 underline hover:text-white" type="submit"><Icon name="logout" size={14} />Sign out</button></form>
      </div>
    </div>
  );
}
