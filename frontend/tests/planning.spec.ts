import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('planning slot search pre-fills the booking form', async ({ page }) => {
  await signIn(page, 'employee@procuratio.local', 'Employee123!');
  await page.goto('/backoffice/planning');

  await expect(page.getByTestId('planning-open-slot-search')).toBeVisible();
  await page.getByTestId('planning-open-slot-search').click();
  await expect(page.getByTestId('planning-slot-search-modal')).toBeVisible();

  const serviceSelect = page.locator('#slot-service-modal');
  await expect(serviceSelect).toBeVisible();
  const options = await serviceSelect.locator('option').evaluateAll((items) =>
    items.map((item) => ({ value: (item as HTMLOptionElement).value, disabled: (item as HTMLOptionElement).disabled })),
  );
  const selectableService = options.find((option) => option.value && option.value !== '0' && !option.disabled);
  if (!selectableService) {
    await expect(page.getByTestId('planning-slot-search-submit')).toBeVisible();
    await expect(serviceSelect).toBeVisible();
    return;
  }

  await serviceSelect.selectOption(selectableService!.value);
  await page.getByTestId('planning-slot-search-submit').click();

  const slots = page.locator('[data-testid^="planning-slot-"]');
  if (await slots.count()) {
    await slots.first().click();
    await expect(page.getByRole('heading', { name: 'Selected booking' })).toBeVisible();
    await expect(page.getByTestId('planning-start-at')).not.toHaveValue('');
  } else {
    await expect(page.getByText('No available slots were found for this search.')).toBeVisible();
  }
});
