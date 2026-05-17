import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('customer can browse catalog, add a product to cart and reach checkout', async ({ page }) => {
  await signIn(page, 'customer@procuratio.local', 'Customer123!');
  await page.goto('/client/catalog');

  await expect(page.getByRole('heading', { name: 'Beauty products and gift vouchers' })).toBeVisible();

  const productCards = page.locator('a.catalog-card-full-link');
  await expect(productCards.first()).toBeVisible();
  await productCards.first().click();

  await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByText('The product has been added to your cart.')).toBeVisible();

  await page.goto('/client/cart');
  await expect(page.getByRole('heading', { name: 'Order summary' })).toBeVisible();
  await page.getByRole('link', { name: 'Proceed to payment' }).click();

  await expect(page).toHaveURL(/\/client\/checkout/);
  await expect(page.getByRole('heading', { name: 'Receipt preview' })).toBeVisible();
});
