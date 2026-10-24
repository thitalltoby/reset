import type { Role } from '@/generated/prisma/enums';

/**
 * Permission matrix. Enforced on the server for every protected operation
 * (see src/server/rbac.ts). Hiding a button is never the security mechanism.
 */
export const PERMISSIONS = [
  'order.view', // see orders and customer delivery details
  'order.manage', // move an order through packing, collection and delivery; add notes
  'order.cancel', // cancel an order and return its stock
  'product.view',
  'product.manage', // create and edit products, categories, prices and photographs
  'inventory.manage', // receive stock, adjust counts, write off
  'prescription.review', // open uploaded prescriptions and decide what happens next (health information)
  'enquiry.manage',
  'customer.view',
  'content.manage', // articles, FAQs, testimonials, promotions, services, photographs
  'promo.manage', // coupons and delivery charges
  'report.view',
  'user.manage',
  'settings.manage',
  'integration.manage',
  'audit.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS] as Permission[];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,
  MANAGER: [
    'order.view', 'order.manage', 'order.cancel', 'product.view', 'product.manage', 'inventory.manage',
    'prescription.review', 'enquiry.manage', 'customer.view', 'content.manage', 'promo.manage', 'report.view',
  ],
  PHARMACIST: [
    'order.view', 'order.manage', 'product.view', 'inventory.manage', 'prescription.review', 'enquiry.manage', 'customer.view',
  ],
  STAFF: ['order.view', 'order.manage', 'product.view', 'inventory.manage', 'enquiry.manage'],
  EDITOR: ['product.view', 'product.manage', 'content.manage'],
  CUSTOMER: [],
};

export const STAFF_ROLES: Role[] = ['SUPER_ADMIN', 'MANAGER', 'PHARMACIST', 'STAFF', 'EDITOR'];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Pharmacy Manager',
  PHARMACIST: 'Pharmacist',
  STAFF: 'Store Staff',
  EDITOR: 'Content Editor',
  CUSTOMER: 'Customer',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: 'Everything: users, settings, integrations, the audit log and all store functions.',
  MANAGER: 'Runs the store day to day: orders, catalogue, stock, prescriptions, promotions, content and reports. Cannot manage users or settings.',
  PHARMACIST: 'Reviews prescriptions and answers medicine questions; handles orders, stock and customer enquiries. Cannot edit the catalogue or website content.',
  STAFF: 'Packs and hands over orders, receives stock and answers enquiries. Cannot see prescriptions or customer health information.',
  EDITOR: 'Edits product descriptions, health articles, FAQs and promotions. Cannot see orders or customers.',
  CUSTOMER: 'Shopper account: own orders, addresses, favourites and prescription requests.',
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}
