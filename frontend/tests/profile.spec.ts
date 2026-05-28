import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('customer can open the profile panels and review loyalty details', async ({ page }) => {
  await signIn(page, 'customer@procuratio.local', 'Customer123!');
  await page.goto('/client/profile');

  await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
  await page.getByRole('button', { name: 'Loyalty' }).click();
  await page.getByRole('button', { name: 'Open loyalty' }).click();

  const loyaltyModal = page.locator('.modal-card').filter({ has: page.getByRole('heading', { name: 'Loyalty details' }) });
  await expect(loyaltyModal).toBeVisible();
  await expect(loyaltyModal.getByText('Points balance', { exact: true })).toBeVisible();
  await loyaltyModal.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Appointments' }).click();
  await page.getByRole('button', { name: 'Open appointments' }).click();
  const appointmentsModal = page.locator('.modal-card').filter({ hasText: 'Upcoming appointments' });
  await expect(appointmentsModal).toBeVisible();
});

test('manager can open backoffice profile quick links and review security fields', async ({ page }) => {
  await signIn(page, 'admin@procuratio.local', 'Admin123!');
  await page.goto('/backoffice/profile');

  await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
  await expect(page.locator('#bo-profile-theme')).toBeVisible();
  await expect(page.locator('#bo-profile-font-size')).toBeVisible();
  await expect(page.locator('#bo-profile-current-password')).toBeVisible();
  await expect(page.getByText('If you are still using the password provided when your account was created, you must change it immediately.')).toBeVisible();

  await page.getByRole('link', { name: 'Open warehouse' }).click();
  await expect(page).toHaveURL(/\/backoffice\/warehouse/);
});
