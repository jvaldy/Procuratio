import { expect, type Page } from '@playwright/test';

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
