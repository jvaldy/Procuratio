import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('employee can create, suspend, resume and charge a POS sale', async ({ page }) => {
  await signIn(page, 'employee@procuratio.local', 'Employee123!');
  await page.goto('/backoffice/pos');

  await expect(page.getByText('Catalog')).toBeVisible();

  await page.locator('[data-testid^="pos-add-product-"]').first().click();
  await page.locator('[data-testid^="pos-add-service-"]').first().click();
  await expect(page.getByTestId('pos-cart-count')).toContainText('Catalog');

  await page.getByTestId('pos-create-ticket').click();
  await expect(page.getByTestId('pos-active-ticket')).toContainText('open / pending');

  await page.getByTestId('pos-suspend').click();
  await expect(page.getByTestId('pos-active-ticket')).toContainText('suspended / pending');

  await page.getByTestId('pos-resume').click();
  await expect(page.getByTestId('pos-active-ticket')).toContainText('open / pending');

  await page.getByTestId('pos-payment-method').selectOption('cash');
  await page.getByTestId('pos-pay').click();

  await expect(page.getByText('The sale has been charged and the receipt is now available.')).toBeVisible();
  await expect(page.getByTestId('pos-active-ticket')).toContainText('completed / paid');
});
