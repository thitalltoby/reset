import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'DevPassword-123';
export const STAFF = { admin: 'admin@reset.local', manager: 'manager@reset.local', pharmacist: 'pharmacist@reset.local', staff: 'staff@reset.local', editor: 'editor@reset.local' };
export const SHOPPER = { name: 'Ada Okafor', email: 'ada.e2e@example.test', phone: '08012345678' };

export async function loginStaff(page: Page, email: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Add the first product with a "+" button on the shop page to the basket. Returns its name. */
export async function addFirstProduct(page: Page): Promise<string> {
  await page.goto('/shop');
  const btn = page.getByRole('button', { name: /^Add .* to basket$/ }).first();
  const label = (await btn.getAttribute('aria-label')) ?? '';
  await btn.click();
  await expect(page.getByRole('status').filter({ hasText: /added to your basket/i })).toBeVisible();
  return label.replace(/^Add /, '').replace(/ to basket$/, '');
}

export async function fillCheckout(page: Page, pay: 'card' | 'onpickup') {
  await page.goto('/checkout');
  await page.getByLabel('Full name').fill(SHOPPER.name);
  await page.getByLabel('Email address').fill(SHOPPER.email);
  await page.getByLabel('Phone number').fill(SHOPPER.phone);
  await page.getByRole('radio', { name: /Collect in store/ }).check();
  await page.getByRole('radio', { name: pay === 'card' ? /Card, bank transfer or USSD/ : /Pay when you collect/ }).check();
}
