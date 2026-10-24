import { test, expect } from '@playwright/test';
import { loginStaff, STAFF } from './helpers';

test('staff sign-in is required, and a wrong password is refused', async ({ page }) => {
  await page.goto('/admin/orders');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel('Work email').fill(STAFF.admin);
  await page.getByLabel('Password').fill('wrong-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
});

test('the admin can open every console section', async ({ page }) => {
  await loginStaff(page, STAFF.admin);
  for (const path of ['orders', 'prescriptions', 'enquiries', 'customers', 'products', 'categories', 'inventory', 'promotions', 'delivery', 'services', 'articles', 'faqs', 'testimonials', 'reports', 'users', 'settings', 'integrations', 'outbox', 'audit']) {
    const r = await page.goto(`/admin/${path}`);
    expect(r?.status(), path).toBe(200);
    await expect(page.getByRole('heading', { level: 1 }), path).toBeVisible();
  }
});

test('store staff cannot reach prescriptions, settings or users', async ({ page }) => {
  await loginStaff(page, STAFF.staff);
  for (const path of ['prescriptions', 'settings', 'users', 'audit', 'reports']) {
    await page.goto(`/admin/${path}`);
    await expect(page, path).toHaveURL(/forbidden|login/);
  }
  await page.goto('/admin');
  await expect(page.getByRole('link', { name: 'Prescriptions' })).toHaveCount(0);
});

test('a pharmacist can open prescriptions but not the catalogue editor', async ({ page }) => {
  await loginStaff(page, STAFF.pharmacist);
  expect((await page.goto('/admin/prescriptions'))?.status()).toBe(200);
  await page.goto('/admin/products/new');
  await expect(page).toHaveURL(/forbidden|login/);
});

test('staff can move an order along and the customer sees it', async ({ page, browser }) => {
  // a shopper places a pay-on-collection order
  const shopper = await (await browser.newContext()).newPage();
  await shopper.goto('/shop');
  await shopper.getByRole('button', { name: /^Add .* to basket$/ }).first().click();
  await expect(shopper.getByRole('status').filter({ hasText: /added/i })).toBeVisible();
  await shopper.goto('/checkout');
  await shopper.getByLabel('Full name').fill('Chidi Eze');
  await shopper.getByLabel('Email address').fill('chidi.e2e@example.test');
  await shopper.getByLabel('Phone number').fill('08012345679');
  await shopper.getByRole('radio', { name: /Collect in store/ }).check();
  await shopper.getByRole('radio', { name: /Pay when you collect/ }).check();
  await shopper.getByRole('button', { name: 'Place order' }).click();
  await expect(shopper).toHaveURL(/\/order\//);
  const orderUrl = shopper.url();

  await loginStaff(page, STAFF.manager);
  await page.goto('/admin/orders');
  await page.getByRole('link', { name: /RP-\d+/ }).first().click();
  await page.getByLabel('New status').selectOption({ label: 'Being prepared' });
  await page.getByRole('button', { name: 'Update order' }).click();
  await expect(page.getByRole('status').first()).toBeVisible();
  await shopper.goto(orderUrl);
  await expect(shopper.getByText(/being prepared/i).first()).toBeVisible();
});
