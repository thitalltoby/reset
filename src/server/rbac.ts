import 'server-only';
import { redirect } from 'next/navigation';
import { can, isStaff, type Permission } from '@/lib/permissions';
import { getSessionUser, type SessionUser } from './session';
import { AppError, forbidden } from './errors';
import { getSetting } from './settings';

export type Principal = Pick<SessionUser, 'id' | 'name' | 'email' | 'role'>;

export function assertCan(user: Principal, permission: Permission): void {
  if (!can(user.role, permission)) throw forbidden();
}

export function assertAnyCan(user: Principal, permissions: Permission[]): void {
  if (!permissions.some((p) => can(user.role, p))) throw forbidden();
}

export const actorOf = (u: Principal) => ({ id: u.id, label: u.name });

/** Page guard for the operations console. Sends visitors to the staff sign-in. */
export async function requireStaff(permission?: Permission, opts: { allowUnenrolled?: boolean } = {}): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u || !isStaff(u.role)) redirect('/admin/login');
  // When two-factor is required for staff, nothing but the set-up page works until it is on
  if (!opts.allowUnenrolled && !u.mfaEnabled && (await getSetting('security')).requireStaffMfa) redirect('/admin/account/security?required=1');
  if (permission && !can(u.role, permission)) redirect('/admin/forbidden');
  return u;
}

/** Page guard for the customer portal. */
export async function requireCustomer(next = '/account'): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (u.role !== 'CUSTOMER') redirect('/admin');
  return u;
}

/** Server-action guard: throws instead of redirecting so the form can show an error. */
export async function actionStaff(permission?: Permission, opts: { allowUnenrolled?: boolean } = {}): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u || !isStaff(u.role)) throw new AppError('UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  if (!opts.allowUnenrolled && !u.mfaEnabled && (await getSetting('security')).requireStaffMfa) throw forbidden('Set up two-factor sign-in first (My account → Security).');
  if (permission) assertCan(u, permission);
  return u;
}

export async function actionCustomer(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u || u.role !== 'CUSTOMER') throw new AppError('UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  return u;
}
