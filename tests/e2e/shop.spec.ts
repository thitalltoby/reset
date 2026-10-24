import { test, expect } from '@playwright/test';
import { addFirstProduct, fillCheckout, SHOPPER } from './helpers';

test.describe('shopper journey', () => {
  test('browse, search, add to basket and pay on collection', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/fresh start/i);
    await expect(page.getByText(/Demonstration site/)).toBeVisible();   // sample data is always labelled

    await page.getByRole('banner').getByRole('combobox', { name: 'Search the shop' }).fill('parace');
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/search|shop/);

    const name = await addFirstProduct(page);
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /Your basket/ })).toBeVisible();
    await expect(page.getByText(name).first()).toBeVisible();

    await fillCheckout(page, 'onpickup');
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page).toHaveURL(/\/order\//);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Thank you/);
    await expect(page.getByText(/RP-\d+/).first()).toBeVisible();
  });

  test('prescription medicines cannot be added to the basket', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByText(/Ask the pharmacist/).first()).toBeVisible();
    const link = page.locator('a.pcard-name', { hasText: /Antihistamine/ }).first();
    await link.click();
    await expect(page.getByRole('button', { name: /Add to basket/ })).toHaveCount(0);
  });

  test('a prescription can be sent for review and followed', async ({ page }) => {
    await page.goto('/prescriptions');
    await page.getByLabel('Full name').fill(SHOPPER.name);
    await page.getByLabel('Email address').fill(SHOPPER.email);
    await page.getByLabel('Phone number').fill(SHOPPER.phone);
    await page.locator('input[type=file]').setInputFiles({ name: 'rx.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') });
    await page.getByRole('checkbox', { name: /review/i }).check();
    await page.getByRole('button', { name: /Send|Submit/ }).click();
    await expect(page).toHaveURL(/\/prescriptions\/.+/);
    await expect(page.getByText(/RX-\d+/).first()).toBeVisible();
  });

  test('the contact form sends an enquiry', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel('Your name').fill(SHOPPER.name);
    await page.getByLabel('Email address').fill(SHOPPER.email);
    await page.getByLabel('Your message').fill('Do you stock a children’s thermometer, please?');
    await page.getByRole('button', { name: /Send/ }).click();
    await expect(page.getByText(/received|thank/i).first()).toBeVisible();
  });
});

test('card payment through the Paystack stand-in confirms the order only after verification', async ({ page }) => {
  await addFirstProduct(page);
  await fillCheckout(page, 'card');
  await page.getByRole('button', { name: /^Pay / }).click();
  await expect(page).toHaveURL(/localhost:4016\/pay\//);            // the stand-in gateway page (test only)
  await page.goto(page.url() + '?outcome=success');                 // "customer pays"; the stand-in redirects back and calls the webhook
  await expect(page).toHaveURL(/\/order\//);
  await expect(page.getByText(/Paid|Payment confirmed|Payment received/i).first()).toBeVisible();
});

test('an abandoned card payment leaves the order unpaid', async ({ page }) => {
  await addFirstProduct(page);
  await fillCheckout(page, 'card');
  await page.getByRole('button', { name: /^Pay / }).click();
  await expect(page).toHaveURL(/localhost:4016\/pay\//);
  await page.goto(page.url() + '?outcome=abandon');
  await expect(page).toHaveURL(/\/order\//);
  await expect(page.getByText(/Paid|Payment confirmed/i)).toHaveCount(0);
});
