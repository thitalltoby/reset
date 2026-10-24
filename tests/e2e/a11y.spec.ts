import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginStaff, STAFF } from './helpers';

const PUBLIC = ['/', '/shop', '/services', '/health', '/about', '/contact', '/faq', '/cart', '/prescriptions', '/login', '/privacy', '/delivery-returns', '/shop/first-aid', '/product/burnaid-burn-gel', '/product/sunscreen-spf-50', '/product/zyrtec-antihistamine-allergy-tablets'];

for (const path of PUBLIC) {
  test(`no serious accessibility problems on ${path}`, async ({ page }) => {
    await page.goto(path);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

test('no serious accessibility problems in the console', async ({ page }) => {
  await loginStaff(page, STAFF.admin);
  for (const path of ['/admin', '/admin/orders', '/admin/products', '/admin/settings']) {
    await page.goto(path);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${path} ${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  }
});
