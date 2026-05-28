import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('manager can use planning tools with store-aware controls', async ({ page }) => {
  await signIn(page, 'admin@procuratio.local', 'Admin123!');
  await page.goto('/backoffice/planning');

  await expect(page.getByTestId('planning-open-business-hours')).toBeVisible();
  await expect(page.getByTestId('planning-open-appointment')).toBeVisible();

  await page.getByTestId('planning-open-appointment').click();
  await expect(page.getByRole('heading', { name: 'Create appointment' })).toBeVisible();

  const storeSelect = page.locator('#planning-create-store-modal');
  const serviceSelect = page.getByTestId('planning-service');
  const employeeSelect = page.locator('#planning-create-employee-modal');
  const startDateSelect = page.getByTestId('planning-start-date');

  await expect(storeSelect).toBeEnabled();
  await expect(serviceSelect).toBeVisible();
  await expect(startDateSelect).toBeDisabled();

  const storeOptions = await storeSelect.locator('option').evaluateAll((items) =>
    items.map((item) => ({ value: (item as HTMLOptionElement).value, disabled: (item as HTMLOptionElement).disabled })),
  );
  const selectableStore = storeOptions.find((option) => option.value && !option.disabled);
  if (selectableStore) {
    await storeSelect.selectOption(selectableStore.value);
  }

  const serviceOptions = await serviceSelect.locator('option').evaluateAll((items) =>
    items.map((item) => ({ value: (item as HTMLOptionElement).value, disabled: (item as HTMLOptionElement).disabled })),
  );
  const selectableService = serviceOptions.find((option) => option.value && !option.disabled);
  if (selectableService) {
    await serviceSelect.selectOption(selectableService.value);
  }

  const employeeOptions = await employeeSelect.locator('option').evaluateAll((items) =>
    items.map((item) => ({ value: (item as HTMLOptionElement).value, disabled: (item as HTMLOptionElement).disabled })),
  );
  const selectableEmployee = employeeOptions.find((option) => option.value && !option.disabled);
  if (selectableEmployee) {
    await employeeSelect.selectOption(selectableEmployee.value);
    const helperText = page.locator('.planning-helper-text');
    const startDateDisabled = await startDateSelect.isDisabled();
    if (startDateDisabled) {
      await expect(helperText).toContainText('No valid slots are currently available for this employee in the selected store.');
    } else {
      await expect(startDateSelect).toBeEnabled();
    }
  }

  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByTestId('planning-open-slot-search').click();
  await expect(page.getByTestId('planning-slot-search-modal')).toBeVisible();
  await expect(page.locator('#slot-store-modal')).toBeEnabled();
});
