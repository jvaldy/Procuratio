import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('manager can create a campaign and a reminder rule from CRM', async ({ page }, testInfo) => {
  const uniqueId = `${Date.now()}-${testInfo.parallelIndex}`;
  const campaignName = `VIP Spring ${uniqueId}`;
  const ruleName = `Reminder H-${uniqueId}`;

  await signIn(page, 'admin@procuratio.local', 'Admin123!');
  await page.goto('/backoffice/crm');

  await expect(page.getByText('BACK OFFICE > CRM')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#crm-campaign-name')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#crm-reminder-name')).toBeVisible({ timeout: 15000 });

  const campaignForm = page.locator('form').filter({ has: page.locator('#crm-campaign-name') });
  await page.locator('#crm-campaign-name').fill(campaignName);
  await page.locator('#crm-campaign-message').fill('Exclusive weekend offer for loyal guests.');
  await campaignForm.getByRole('button', { name: 'Create' }).click();

  await page.getByRole('button', { name: 'Open list' }).nth(1).click();
  const campaignModal = page.locator('.modal-card.crm-modal').filter({ has: page.getByRole('heading', { name: 'Campaign list' }) });
  await expect(campaignModal).toBeVisible();
  await campaignModal.locator('#campaign-filter-name').fill(campaignName);
  await expect(campaignModal.getByRole('cell', { name: campaignName, exact: true })).toBeVisible({ timeout: 20000 });
  await campaignModal.getByRole('button', { name: 'Close' }).click();

  await page.locator('#crm-reminder-name').fill(ruleName);
  await page.locator('#crm-reminder-offset').fill('12');
  await page.getByRole('button', { name: 'Add rule' }).click();

  await page.getByRole('button', { name: 'Open rules' }).click();
  const rulesModal = page.locator('.modal-card.crm-modal').filter({ has: page.getByRole('heading', { name: 'Reminder rules' }) });
  await expect(rulesModal).toBeVisible();
  await rulesModal.locator('#rule-filter-name').fill(ruleName);
  await expect(rulesModal.getByRole('cell', { name: ruleName, exact: true })).toBeVisible({ timeout: 20000 });
});

test('manager can create a gift voucher and browse CRM reference panels', async ({ page }) => {
  await signIn(page, 'admin@procuratio.local', 'Admin123!');
  await page.goto('/backoffice/crm');

  await expect(page.getByText('BACK OFFICE > CRM')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#crm-voucher-amount')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#crm-loyalty-customer-id')).toBeVisible({ timeout: 15000 });

  const voucherForm = page.locator('form').filter({ has: page.locator('#crm-voucher-amount') });
  await page.locator('#crm-voucher-amount').fill('55');
  await voucherForm.getByRole('button', { name: 'Create' }).click();

  await page.getByRole('button', { name: 'Open list' }).first().click();
  const loyaltyModal = page.locator('.modal-card.crm-modal').filter({ has: page.getByRole('heading', { name: 'Loyalty accounts' }) });
  await expect(loyaltyModal).toBeVisible();
  await expect(loyaltyModal.getByText('Sort: click a column header')).toBeVisible();
  await loyaltyModal.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Open list' }).nth(2).click();
  const vouchersModal = page.locator('.modal-card.crm-modal').filter({ has: page.getByRole('heading', { name: 'Gift voucher list' }) });
  await expect(vouchersModal).toBeVisible();
  await expect(vouchersModal.getByRole('columnheader', { name: 'Code' })).toBeVisible();
  await vouchersModal.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Open logs' }).click();
  const logsModal = page.locator('.modal-card.crm-modal').filter({ has: page.getByRole('heading', { name: 'Notification logs' }) });
  await expect(logsModal).toBeVisible();
  await expect(logsModal.getByRole('columnheader', { name: 'Type' })).toBeVisible();
});
