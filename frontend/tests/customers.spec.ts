import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('manager can create a customer and open the customer file', async ({ page }) => {
  const timestamp = Date.now();
  const customerName = `E2E Customer ${timestamp}`;
  const customerEmail = `e2e.customer.${timestamp}@procuratio.local`;
  const readCustomerTotal = async () => {
    const label = await page.locator('.catalog-count-pill').innerText();
    return Number(label.replace(/\D/g, '')) || 0;
  };

  await signIn(page, 'admin@procuratio.local', 'Admin123!');
  await page.goto('/backoffice/customers');

  await expect(page.getByRole('heading', { name: 'Customer list' })).toBeVisible();
  const firstCustomer = page.locator('.customers-list-item').first();
  await expect(firstCustomer).toBeVisible({ timeout: 20000 });
  await expect.poll(readCustomerTotal, { timeout: 20000 }).toBeGreaterThan(0);
  const initialTotal = await readCustomerTotal();

  await firstCustomer.click();
  await expect(page.locator('.customer-file-head')).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: 'New customer' }).click();

  const createModal = page.locator('.modal-card').filter({ has: page.getByRole('heading', { name: 'Create customer' }) });
  await expect(createModal).toBeVisible();
  await createModal.getByPlaceholder('Sarah Miller').fill(customerName);
  await createModal.getByPlaceholder('sarah@customer.com').fill(customerEmail);
  await createModal.getByPlaceholder('Customer2026!').fill('Customer2026!');
  await createModal.locator('input').nth(3).fill('+33612340000');
  await createModal.getByRole('button', { name: 'Create customer' }).click();

  await expect.poll(readCustomerTotal, { timeout: 20000 }).toBeGreaterThanOrEqual(initialTotal + 1);
});
