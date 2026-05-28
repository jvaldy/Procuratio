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
  const name = 'VIP Script ' + Date.now();
  await page.locator('#crm-campaign-name').fill(name);
  await page.locator('#crm-campaign-message').fill('Exclusive weekend offer for loyal guests.');
  const campaignForm = page.locator('form').filter({ has: page.locator('#crm-campaign-name') });
  await campaignForm.getByRole('button', { name: 'Create' }).click();
  await page.waitForTimeout(2000);
  console.log('BODY=' + (await page.locator('body').innerText()).slice(0, 1800));
  await browser.close();
})();
