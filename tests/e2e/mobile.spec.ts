import { test, expect } from '@playwright/test';
import { addFirstProduct, fillCheckout } from './helpers';

test('the shop works on a phone: no sideways scrolling, bottom navigation, basket and checkout', async ({ page }) => {
  for (const path of ['/', '/shop', '/services', '/health', '/contact']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(1);
  }
  await page.goto('/shop');
  await expect(page.getByRole('navigation', { name: /Main|Quick/ }).last()).toBeVisible();
  await addFirstProduct(page);
  await fillCheckout(page, 'onpickup');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page).toHaveURL(/\/order\//);
});

test('product photographs fit a phone: shop grid and product page do not overflow, images load', async ({ page }) => {
  for (const url of ['/shop', '/product/burnaid-burn-gel', '/product/m-and-b-paracetamol-500mg-tablets']) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), url).toBeLessThanOrEqual(0);
    const broken = await page.evaluate(() => Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
    expect(broken, url).toEqual([]);
  }
});
