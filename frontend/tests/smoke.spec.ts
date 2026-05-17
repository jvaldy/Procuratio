import { expect, test } from '@playwright/test';

test('loads the login screen', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByPlaceholder('Email address')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
});
