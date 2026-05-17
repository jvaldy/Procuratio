import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('client booking flow opens slots modal and selected booking panel', async ({ page }) => {
  await signIn(page, 'customer@procuratio.local', 'Customer123!');
  await page.goto('/client/booking');

  await expect(page.getByRole('heading', { name: 'Appointments' })).toBeVisible();

  const serviceSelect = page.locator('#booking-service');
  const options = await serviceSelect.locator('option').evaluateAll((items) =>
    items.map((item) => ({ value: (item as HTMLOptionElement).value, disabled: (item as HTMLOptionElement).disabled })),
  );
  const selectableService = options.find((option) => option.value && option.value !== '0' && !option.disabled);
  expect(selectableService, 'At least one active service should be available for booking.').toBeTruthy();

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
    await expect(page.getByText('No slot is available for this date. Try another employee or another day.')).toBeVisible();
  }
});
