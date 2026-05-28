import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test.describe.configure({ timeout: 90000 });

test('manager can create an employee from the backoffice directory', async ({ page }) => {
  const timestamp = Date.now();
  const employeeName = `E2E Employee ${timestamp}`;
  const employeeEmail = `e2e.employee.${timestamp}@procuratio.local`;

  await signIn(page, 'admin@procuratio.local', 'Admin123!');
  await page.goto('/backoffice/employees');

  await page.getByRole('button', { name: 'New employee' }).click();

  const modal = page.locator('.modal-card').filter({ has: page.getByRole('heading', { name: 'Create employee' }) });
  await expect(modal).toBeVisible();
  await modal.getByPlaceholder('Emma Carter').fill(employeeName);
  await modal.getByPlaceholder('emma@procuratio.local').fill(employeeEmail);
  await modal.getByPlaceholder('Employee2026!').fill('Employee2026!');
  await modal.getByPlaceholder('Hair stylist').fill('Junior Stylist');
  await modal.locator('input').nth(4).fill('+33610001000');

  const storeSelect = modal.locator('select').nth(0);
  const storeOptions = await storeSelect.locator('option').evaluateAll((items) =>
    items.map((item) => ({ value: (item as HTMLOptionElement).value, disabled: (item as HTMLOptionElement).disabled })),
  );
  const selectableStore = storeOptions.find((option) => option.value && !option.disabled);
  if (selectableStore) {
    await storeSelect.selectOption(selectableStore.value);
  }

  await modal.getByRole('button', { name: 'Create employee' }).click();
  await expect(page.getByText('Employee created.')).toBeVisible({ timeout: 20000 });
  await expect(modal).toBeHidden({ timeout: 20000 });
  await page.locator('#employees-search').fill(employeeName);
  await expect(page.locator('.customers-list-item').filter({ hasText: employeeName })).toBeVisible({ timeout: 20000 });
});

test('manager can create a manager account from the directory', async ({ page }) => {
  const timestamp = Date.now();
  const managerName = `E2E Manager ${timestamp}`;
  const managerEmail = `e2e.manager.${timestamp}@procuratio.local`;

  await signIn(page, 'admin@procuratio.local', 'Admin123!');
  await page.goto('/backoffice/managers');

  await page.getByRole('button', { name: 'New manager' }).click();

  const modal = page.locator('.modal-card').filter({ has: page.getByRole('heading', { name: 'Create manager' }) });
  await expect(modal).toBeVisible();
  await modal.getByPlaceholder('Emma Carter').fill(managerName);
  await modal.getByPlaceholder('manager@procuratio.local').fill(managerEmail);
  await modal.getByPlaceholder('Manager2026!').fill('Manager2026!');
  await modal.getByPlaceholder('Regional Manager').fill('Area Manager');
  await modal.locator('input').nth(4).fill('+33610002000');
  await modal.getByRole('button', { name: 'Create manager' }).click();
  await expect(page.getByText('Manager created.')).toBeVisible({ timeout: 20000 });
  await expect(modal).toBeHidden({ timeout: 20000 });
  await page.locator('#managers-search').fill(managerName);
  await expect(page.locator('.customers-list-item').filter({ hasText: managerName })).toBeVisible({ timeout: 20000 });
});

test('manager can create a store and review a store from the directory', async ({ page }) => {
  const timestamp = Date.now();
  const storeName = `E2E Store ${timestamp}`;
  const storeCode = `E2E-${timestamp}`;

  await signIn(page, 'admin@procuratio.local', 'Admin123!');
  await page.goto('/backoffice/stores');

  await page.getByRole('button', { name: 'New store' }).click();

  const modal = page.locator('.modal-card').filter({ has: page.getByRole('heading', { name: 'Create store' }) });
  await expect(modal).toBeVisible();
  await modal.getByPlaceholder('Seanergy Paris Centre').fill(storeName);
  await modal.getByPlaceholder('PARIS-CENTRE').fill(storeCode);
  await modal.getByPlaceholder('paris@procuratio.local').fill(`store.${timestamp}@procuratio.local`);
  await modal.locator('input').nth(3).fill('+33610003000');
  await modal.getByPlaceholder('12 Main Avenue').fill('10 Avenue du Test');
  await modal.getByPlaceholder('75001').fill('75001');
  await modal.locator('input').nth(7).fill('Paris');
  await modal.getByRole('button', { name: 'Create store' }).click();
  await expect(page.getByText('Store created.')).toBeVisible({ timeout: 20000 });
  await expect(modal).toBeHidden({ timeout: 20000 });

  const listedStore = page.locator('.customers-list-item').first();
  await expect(listedStore).toBeVisible({ timeout: 20000 });
  const listedStoreName = (await listedStore.locator('strong').innerText()).trim();
  const listedStoreCode = (await listedStore.locator('.customers-list-item-email').innerText()).trim();
  await listedStore.click();

  const detailPanel = page.locator('.store-detail-hero').filter({ hasText: listedStoreName });
  await expect(detailPanel).toBeVisible();
  await expect(detailPanel.getByText(listedStoreCode, { exact: true })).toBeVisible();
});
