import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('employee can sign in and reach backoffice', async ({ page }) => {
  await signIn(page, 'employee@procuratio.local', 'Employee123!');
  await expect(page).toHaveURL(/\/backoffice/);
  await expect(page.getByText(/BACK OFFICE >/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cash' })).toBeVisible();
});
