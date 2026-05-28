import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('employee navigation hides admin-only modules and CRM stays blocked', async ({ page }) => {
  await signIn(page, 'employee@procuratio.local', 'Employee123!');
  await page.goto('/backoffice/planning');

  await expect(page.getByRole('link', { name: 'CRM' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Employees' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Managers' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Stores' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Warehouse' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
});
