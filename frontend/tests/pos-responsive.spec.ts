import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

const viewports = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1280', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`POS cash stays readable on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signIn(page, 'employee@procuratio.local', 'Employee123!');
    await page.goto('/backoffice/pos');

    await expect(page.getByRole('heading', { name: /walk-in customer/i })).toBeVisible();
    await expect(page.getByTestId('pos-cart-count')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible();
    await expect(page.getByText('Checkout')).toBeVisible();
    await expect(page.getByText('Subtotal HT')).toBeVisible();
    await expect(page.getByText('Total TTC')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create ticket' })).toBeVisible();

    const layoutMetrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));

    expect(layoutMetrics.scrollWidth).toBeLessThanOrEqual(layoutMetrics.innerWidth + 4);
  });
}
