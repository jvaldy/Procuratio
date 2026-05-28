import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('manager can review a warehouse order and generate a shipping note PDF', async ({ page }) => {
  await signIn(page, 'admin@procuratio.local', 'Admin123!');
  await page.goto('/backoffice/warehouse');

  const orderCards = page.locator('.warehouse-cash-list-item');
  await expect(orderCards.first()).toBeVisible();
  await orderCards.first().click();

  await expect(page.locator('.warehouse-cash-title')).toBeVisible();
  await expect(page.getByText('Order lines')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Shipping note' }).click();
  const download = await downloadPromise;

  await expect(page.getByText('The shipping note PDF has been generated.')).toBeVisible();
  expect(download.suggestedFilename()).toMatch(/shipping-note\.pdf$/);
});
