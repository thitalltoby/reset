import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, PERMISSIONS, STAFF_ROLES, can, isStaff, type Permission } from '@/lib/permissions';
import { assertCan } from '@/server/rbac';
import { AppError } from '@/server/errors';

const user = (role: Parameters<typeof assertCan>[0]['role']) => ({ id: 'u1', name: 'T', email: 't@example.test', role });
const has = (role: keyof typeof ROLE_PERMISSIONS, p: Permission) => ROLE_PERMISSIONS[role].includes(p);

describe('role permissions', () => {
  it('gives the super admin everything and customers no staff permission', () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toHaveLength(PERMISSIONS.length);
    expect(ROLE_PERMISSIONS.CUSTOMER).toEqual([]);
    expect(STAFF_ROLES).not.toContain('CUSTOMER');
    expect(isStaff('CUSTOMER')).toBe(false);
  });

  it('keeps users, settings, integrations and the audit log with the super admin only', () => {
    for (const p of ['user.manage', 'settings.manage', 'integration.manage', 'audit.view'] as const) {
      for (const r of STAFF_ROLES.filter((r) => r !== 'SUPER_ADMIN')) expect(has(r, p), `${r} ${p}`).toBe(false);
    }
  });

  it('lets only pharmacists, managers and the super admin open prescriptions', () => {
    expect(STAFF_ROLES.filter((r) => has(r, 'prescription.review')).sort()).toEqual(['MANAGER', 'PHARMACIST', 'SUPER_ADMIN']);
    expect(has('STAFF', 'prescription.review')).toBe(false);
    expect(has('EDITOR', 'prescription.review')).toBe(false);
  });

  it('keeps editors away from orders and customers, and store staff away from the catalogue and content', () => {
    for (const p of ['order.view', 'customer.view', 'prescription.review'] as const) expect(has('EDITOR', p)).toBe(false);
    expect(has('EDITOR', 'content.manage')).toBe(true);
    for (const p of ['product.manage', 'content.manage', 'promo.manage', 'report.view'] as const) expect(has('STAFF', p)).toBe(false);
    expect(has('STAFF', 'order.manage')).toBe(true);
  });

  it('only managers and the super admin can cancel orders, run promotions and see reports', () => {
    for (const p of ['order.cancel', 'promo.manage', 'report.view'] as const) expect(STAFF_ROLES.filter((r) => has(r, p)).sort()).toEqual(['MANAGER', 'SUPER_ADMIN']);
  });

  it('can() agrees with the table, and assertCan throws FORBIDDEN', () => {
    expect(can('MANAGER', 'product.manage')).toBe(true);
    expect(can('CUSTOMER', 'order.view')).toBe(false);
    expect(() => assertCan(user('PHARMACIST'), 'product.manage')).toThrow(AppError);
    try { assertCan(user('STAFF'), 'prescription.review'); } catch (e) { expect((e as AppError).code).toBe('FORBIDDEN'); }
    expect(() => assertCan(user('SUPER_ADMIN'), 'audit.view')).not.toThrow();
  });
});
