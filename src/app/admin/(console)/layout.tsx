import { requireStaff } from '@/server/rbac';
import { AdminShell } from '@/components/AdminShell';
import { db } from '@/server/db';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const metadata = { title: { default: 'Console', template: '%s · Reset console' }, robots: { index: false, follow: false } };

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff(); // every page repeats its own permission check; this only gates the shell
  const [orders, rx, enquiries, lowStock] = await Promise.all([
    can(user.role, 'order.view') ? db.order.count({ where: { status: { in: ['PLACED', 'PROCESSING'] } } }) : 0,
    can(user.role, 'prescription.review') ? db.prescription.count({ where: { status: { in: ['RECEIVED', 'IN_REVIEW'] } } }) : 0,
    can(user.role, 'enquiry.manage') ? db.enquiry.count({ where: { status: 'NEW' } }) : 0,
    can(user.role, 'inventory.manage') ? db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM "Product" WHERE "classification" <> 'PRESCRIPTION' AND "status" = 'PUBLISHED' AND "stock" <= "reorderLevel"`.then((r) => r[0]?.n ?? 0) : 0,
  ]);
  return <AdminShell user={user} counts={{ orders, rx, enquiries, lowStock }}>{children}</AdminShell>;
}
