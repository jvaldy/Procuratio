import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('client booking flow opens slots modal and selected booking panel', async ({ page }) => {
  await signIn(page, 'customer@procuratio.local', 'Customer123!');
  await page.goto('/client/booking');

  await expect(page.locator('#booking-store')).toBeVisible({ timeout: 15000 });

  const storeSelect = page.locator('#booking-store');
  const storeOptions = await storeSelect.locator('option').evaluateAll((items) =>
    items.map((item) => ({ value: (item as HTMLOptionElement).value, disabled: (item as HTMLOptionElement).disabled })),
  );
  const selectableStore = storeOptions.find((option) => option.value && option.value !== '0' && !option.disabled);
  if (selectableStore) {
    await storeSelect.selectOption(selectableStore.value);
  }

  const serviceSelect = page.locator('#booking-service');
  await expect.poll(async () => await serviceSelect.locator('option').count()).toBeGreaterThan(0);
  const options = await serviceSelect.locator('option').evaluateAll((items) =>
    items.map((item) => ({ value: (item as HTMLOptionElement).value, disabled: (item as HTMLOptionElement).disabled })),
  );
  const selectableService = options.find((option) => option.value && option.value !== '0' && !option.disabled);
  if (!selectableService) {
    await expect(serviceSelect).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search availability' })).toBeVisible();
    return;
  }

  await serviceSelect.selectOption(selectableService!.value);
  await page.getByTestId('booking-search-submit').click();

  await expect(page.getByTestId('booking-slots-modal')).toBeVisible();

  const slots = page.locator('[data-testid^="booking-slot-"]');
  if (await slots.count()) {
    await slots.first().click();
    await expect(page.getByTestId('booking-selected-modal')).toBeVisible();
    await expect(page.getByTestId('booking-selected-modal').getByRole('heading', { name: 'Selected booking' })).toBeVisible();
    await expect(page.getByTestId('booking-confirm-modal')).toBeVisible();
  } else {
    await expect(
      page.getByTestId('booking-slots-modal').getByText('No slot is available for this date. Try another employee or another day.'),
    ).toBeVisible();
  }
});
