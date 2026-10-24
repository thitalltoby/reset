import { test, expect, type Page } from '@playwright/test';
import { loginStaff, STAFF } from './helpers';

// 1×1 transparent PNG: valid file structure for the upload scanner
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function allImagesLoaded(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => { for (const i of Array.from(document.images)) { i.loading = 'eager'; } window.scrollTo(0, document.body.scrollHeight); });
  await page.waitForTimeout(600);
  return page.evaluate(() => Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src));
}

test.describe('catalogue and product photography', () => {
  test('the shop lists all 24 products, with 13 real photographs and 11 honest placeholders, and no broken images', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByText('24 products')).toBeVisible();
    await expect(page.locator('a.pcard-name')).toHaveCount(24);
    await expect(page.locator('article.pcard img[src*="products"]')).toHaveCount(13);
    await expect(page.getByText('Photo coming soon')).toHaveCount(11);
    expect(await allImagesLoaded(page)).toEqual([]);
    // every card photograph has descriptive alt text
    for (const alt of await page.locator('article.pcard .pcard-photo').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).alt))) expect(alt.length).toBeGreaterThan(12);
  });

  test('search finds products by name, brand and active ingredient; category filter narrows the grid', async ({ page }) => {
    await page.goto('/shop?q=burn');
    await expect(page.locator('a.pcard-name')).toHaveText(['Burn gel']);
    await page.goto('/shop?q=cetirizine');
    await expect(page.locator('a.pcard-name')).toHaveText(['Antihistamine allergy tablets']);
    await page.goto('/shop?q=rolaids');
    await expect(page.locator('a.pcard-name')).toHaveText(['Antacid chewable tablets, mint']);
    await page.goto('/shop/first-aid');
    await expect(page.getByText('5 products')).toBeVisible();
    await page.goto('/shop?q=zzzzqq');
    await expect(page.getByText(/could not find/i)).toBeVisible();
  });

  test('a verified product shows its label directions; an unverified one points to the pack', async ({ page }) => {
    await page.goto('/product/burnaid-burn-gel');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Burn gel');
    await page.getByText('How to use', { exact: true }).click();
    await expect(page.getByText(/cold running water for 20 minutes/i)).toBeVisible();
    await expect(page.getByText(/pack made for Australia/)).toBeVisible();
    await expect(page.locator('img[alt*="Burnaid"]').first()).toBeVisible();

    await page.goto('/product/m-and-b-paracetamol-500mg-tablets');
    await expect(page.getByText('How to use', { exact: true })).toHaveCount(0);   // directions are provisional, so not published
    await page.getByText('Warnings and safety', { exact: true }).click();
    await expect(page.getByText(/printed on its pack and leaflet/)).toBeVisible();
    await expect(page.getByText(/Provisional price/)).toBeVisible();
    expect(await allImagesLoaded(page)).toEqual([]);
  });

  test('a product with no photograph shows the placeholder, not a stand-in picture', async ({ page }) => {
    await page.goto('/product/sunscreen-spf-50');
    await expect(page.getByText('Photo coming soon').first()).toBeVisible();
    await expect(page.locator('.lg\\:sticky img[src*="products"]')).toHaveCount(0);   // the picture column only (related items below have photos)
  });

  test('related products always fill a row of four', async ({ page }) => {
    await page.goto('/product/sunscreen-spf-50');
    await expect(page.getByRole('heading', { name: 'You might also need' })).toBeVisible();
    await expect(page.locator('section[aria-labelledby="rel"] article.pcard')).toHaveCount(4);
  });

  test('basket: add, change quantity, survive a reload, then remove', async ({ page }) => {
    await page.goto('/product/dettol-antiseptic-liquid');
    await page.getByRole('button', { name: /Add to basket/ }).click();
    await expect(page.getByRole('status').filter({ hasText: /added/i })).toBeVisible();
    await page.goto('/cart');
    await expect(page.getByText('Antiseptic liquid').first()).toBeVisible();
    await page.getByRole('button', { name: /increase|more|\+/i }).first().click();
    await expect(page.getByText(/₦3,400/).first()).toBeVisible();   // 2 × ₦1,700
    await page.reload();
    await expect(page.getByText(/₦3,400/).first()).toBeVisible();   // persisted
    expect(await allImagesLoaded(page)).toEqual([]);
    await page.getByRole('button', { name: /remove/i }).first().click();
    await expect(page.getByText(/basket is empty/i)).toBeVisible();
  });

  test('pharmacist-only products cannot be put in the basket', async ({ page }) => {
    for (const slug of ['benylin-cough-syrup-for-dry-cough', 'zyrtec-antihistamine-allergy-tablets', 'coldcap-cold-and-flu-relief-capsules']) {
      await page.goto(`/product/${slug}`);
      await expect(page.getByRole('button', { name: /Add to basket/ })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Supplied by the pharmacist' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ask the pharmacist' })).toBeVisible();
    }
  });
});

test.describe('admin catalogue management', () => {
  test('a manager can replace a photo, update and confirm a price, and see it in the shop', async ({ page }) => {
    await loginStaff(page, STAFF.manager);
    await page.goto('/admin/products?q=Burnaid');
    await expect(page.getByText('Photo permission').first()).toBeVisible();     // catalogue-check chips
    await page.getByRole('link', { name: 'Burn gel' }).click();
    await expect(page.getByLabel('Photo permission')).toHaveValue('CLIENT_SUPPLIED');
    await page.getByLabel('Price (₦)').fill('2450');
    await page.getByLabel('Price confirmed by a manager').check();
    await page.getByLabel('Or upload a new photo').setInputFiles({ name: 'burnaid-new.png', mimeType: 'image/png', buffer: PNG });
    await page.getByLabel('Describe the new photo').fill('Burnaid burn gel tube photographed in store');
    await page.getByLabel('Photo permission').selectOption('OWN_PHOTO');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: /Saved/ })).toBeVisible();
    await page.goto('/product/burnaid-burn-gel');
    await expect(page.getByText('₦2,450').first()).toBeVisible();
    await expect(page.getByText(/Provisional price/)).toHaveCount(0);
    await expect(page.locator('img[src*="media"]').first()).toBeAttached();   // the uploaded replacement is now the main picture
  });

  test('publishing a live product needs a confirmed price (new products start unconfirmed)', async ({ page }) => {
    await loginStaff(page, STAFF.manager);
    await page.goto('/admin/products/new');
    await page.getByLabel('Product name').fill('Test lozenges');
    await page.getByLabel('Stock code (SKU)').fill('E2E-LOZ-1');
    await page.getByLabel('Category').selectOption({ label: 'First aid' });
    await page.getByLabel('One-line summary').fill('Lozenges created by the end-to-end test.');
    await page.getByLabel('Price (₦)').fill('900');
    await page.getByLabel('Status').selectOption('PUBLISHED');
    await page.getByRole('button', { name: 'Create product' }).click();
    await expect(page.getByText(/Confirm the price before publishing/)).toBeVisible();
  });
});
