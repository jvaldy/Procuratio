const { chromium } = require('@playwright/test');
(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:48200/login');
  await page.locator('input[type="email"]').fill('admin@procuratio.local');
  await page.locator('input[type="password"]').fill('Admin123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
  await page.goto('http://localhost:48200/backoffice/crm');
  const voucherForm = page.locator('form').filter({ has: page.locator('#crm-voucher-amount') });
  await page.locator('#crm-voucher-amount').fill('55');
  await voucherForm.getByRole('button', { name: 'Create' }).click();
  await page.waitForTimeout(2000);
  console.log('BODY=' + (await page.locator('body').innerText()).slice(0, 1800));
  await browser.close();
})();
