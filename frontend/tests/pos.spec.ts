import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('employee can create, suspend, resume and charge a POS sale', async ({ page }) => {
  await signIn(page, 'employee@procuratio.local', 'Employee123!');
  await page.goto('/backoffice/pos');

  await expect(page.getByTestId('pos-cart-count')).toBeVisible();

  await page.locator('button[data-testid^="pos-add-product-"]:not([disabled])').first().click();
  await page.getByRole('button', { name: 'Services' }).click();
  await page.locator('button[data-testid^="pos-add-service-"]:not([disabled])').first().click();
  await expect(page.getByTestId('pos-cart-count')).toContainText('Catalog');

  await page.getByTestId('pos-create-ticket').click();
  await expect(page.getByTestId('pos-active-ticket')).toContainText('open / pending');

  await page.getByTestId('pos-suspend').click();
  await expect(page.getByTestId('pos-active-ticket')).toContainText('suspended / pending');

  await page.getByTestId('pos-resume').click();
  await expect(page.getByTestId('pos-active-ticket')).toContainText('open / pending');

  await page.getByTestId('pos-payment-method').selectOption('cash');
  await page.getByTestId('pos-pay').click();

  await expect(page.getByTestId('pos-active-ticket')).toContainText('completed / paid', { timeout: 15000 });
  await expect(page.getByText('Receipt available')).toBeVisible({ timeout: 15000 });
});
