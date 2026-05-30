import { type Locator, type Page, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

import { signIn } from './helpers/auth';

const captureDate = new Date().toISOString().slice(0, 10);
const outputDir = path.join(process.cwd(), '..', 'docs', 'captures', 'playwright', captureDate);

test.describe.configure({ mode: 'serial' });
test.setTimeout(4 * 60 * 1000);

async function ensureOutputDir(): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
}

function sanitizeSegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

async function preparePage(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1720, height: 1200 });
}

async function waitForStablePage(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(250);
  await page.waitForLoadState('networkidle', { timeout: 1500 }).catch(() => undefined);
}

async function capturePage(page: Page, role: string, pageName: string, feature: string): Promise<void> {
  await waitForStablePage(page);
  const fileName = `${sanitizeSegment(role)}_${sanitizeSegment(pageName)}_${sanitizeSegment(feature)}.png`;
  await page.screenshot({
    path: path.join(outputDir, fileName),
    fullPage: true,
    animations: 'disabled',
  });
}

async function gotoAndCapture(page: Page, role: string, url: string, pageName: string, feature: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await capturePage(page, role, pageName, feature);
}

async function closeVisibleModal(page: Page): Promise<void> {
  const closeCandidates = [
    page.getByRole('button', { name: 'Close' }).last(),
    page.getByRole('button', { name: 'Cancel' }).last(),
  ];

  let closed = false;
  for (const candidate of closeCandidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      closed = true;
      break;
    }
  }

  if (!closed) {
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  await page.waitForTimeout(300);
  await page.locator('.modal-backdrop').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => undefined);
}

async function openFirstAvailable(locator: Locator): Promise<boolean> {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      return true;
    }
  }

  return false;
}

async function clickFirstVisible(candidates: Locator[]): Promise<boolean> {
  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      return true;
    }
  }

  return false;
}

async function captureAdminPages(page: Page): Promise<void> {
  await signIn(page, 'admin@procuratio.local', 'Admin123!');
  await preparePage(page);
}

async function captureAdminCatalogPages(page: Page): Promise<void> {
  await captureAdminPages(page);
  await gotoAndCapture(page, 'Admin', '/backoffice', 'Dashboard', 'Statistiques_metier');

  await page.goto('/backoffice/products', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Products', 'Catalogue_stock');
  await page.getByRole('button', { name: 'Add product' }).click();
  await capturePage(page, 'Admin', 'Products', 'Creation_produit');
  await closeVisibleModal(page);

  await page.goto('/backoffice/services', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Services', 'Catalogue_prestations');
  await page.getByRole('button', { name: 'Add service' }).click();
  await capturePage(page, 'Admin', 'Services', 'Creation_prestation');
  await closeVisibleModal(page);
}

async function captureAdminOperationalPages(page: Page): Promise<void> {
  await captureAdminPages(page);
  await page.goto('/backoffice/pos', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Cash', 'Caisse_accueil');
  await openFirstAvailable(page.locator('button[data-testid^="pos-add-product-"]:not([disabled])'));
  await capturePage(page, 'Admin', 'Cash', 'Panier_actif');

  await page.goto('/backoffice/planning', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Planning', 'Vue_generale');
  await page.locator('[data-testid="planning-open-appointment"]').click();
  await capturePage(page, 'Admin', 'Planning', 'Creation_rendez_vous');
  await closeVisibleModal(page);
  await page.locator('[data-testid="planning-open-slot-search"]').click();
  await capturePage(page, 'Admin', 'Planning', 'Recherche_disponibilites');
  await closeVisibleModal(page);
  await page.locator('[data-testid="planning-open-business-hours"]').click();
  await capturePage(page, 'Admin', 'Planning', 'Horaires_salon');
  await closeVisibleModal(page);

  await page.goto('/backoffice/customers', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Customers', 'Fiche_client');
  await page.getByRole('button', { name: 'New customer' }).click();
  await capturePage(page, 'Admin', 'Customers', 'Creation_client');
  await closeVisibleModal(page);
}

async function captureAdminDirectoryPages(page: Page): Promise<void> {
  await captureAdminPages(page);
  await page.goto('/backoffice/employees', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Employees', 'Annuaire_employes');
  await page.getByRole('button', { name: 'New employee' }).click();
  await capturePage(page, 'Admin', 'Employees', 'Creation_employe');
  await closeVisibleModal(page);

  await page.goto('/backoffice/managers', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Managers', 'Annuaire_managers');
  await page.getByRole('button', { name: 'New manager' }).click();
  await capturePage(page, 'Admin', 'Managers', 'Creation_manager');
  await closeVisibleModal(page);

  await page.goto('/backoffice/stores', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Stores', 'Annuaire_boutiques');
  await page.getByRole('button', { name: 'New store' }).click();
  await capturePage(page, 'Admin', 'Stores', 'Creation_boutique');
  await closeVisibleModal(page);
}

async function captureAdminCrmAndWarehousePages(page: Page): Promise<void> {
  await captureAdminPages(page);
  await page.goto('/backoffice/crm', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'CRM', 'Vue_generale');
  await page.getByRole('button', { name: 'Open list' }).nth(0).click();
  await capturePage(page, 'Admin', 'CRM', 'Comptes_fidelite');
  await closeVisibleModal(page);
  await page.getByRole('button', { name: 'Open list' }).nth(1).click();
  await capturePage(page, 'Admin', 'CRM', 'Campagnes');
  await closeVisibleModal(page);
  await page.getByRole('button', { name: 'Open list' }).nth(2).click();
  await capturePage(page, 'Admin', 'CRM', 'Bons_cadeaux');
  await closeVisibleModal(page);
  await page.getByRole('button', { name: 'Open rules' }).click();
  await capturePage(page, 'Admin', 'CRM', 'Regles_relance');
  await closeVisibleModal(page);
  await page.getByRole('button', { name: 'Open logs' }).click();
  await capturePage(page, 'Admin', 'CRM', 'Historique_notifications');
  await closeVisibleModal(page);

  await page.goto('/backoffice/warehouse', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Warehouse', 'Preparation_commandes');
  const warehouseCard = page.locator('.warehouse-cash-list-item').first();
  if (await warehouseCard.isVisible().catch(() => false)) {
    await warehouseCard.click();
    await capturePage(page, 'Admin', 'Warehouse', 'Detail_commande');
  }

  await page.goto('/backoffice/profile', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Profile', 'Preferences_compte');
}

async function captureEmployeePages(page: Page): Promise<void> {
  await signIn(page, 'employee@procuratio.local', 'Employee123!');
  await preparePage(page);

  await gotoAndCapture(page, 'Employee', '/backoffice/products', 'Products', 'Consultation_stock');
  await gotoAndCapture(page, 'Employee', '/backoffice/services', 'Services', 'Consultation_prestations');

  await page.goto('/backoffice/pos', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Employee', 'Cash', 'Caisse_accueil');
  await openFirstAvailable(page.locator('button[data-testid^="pos-add-product-"]:not([disabled])'));
  await capturePage(page, 'Employee', 'Cash', 'Panier_actif');

  await page.goto('/backoffice/planning', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Employee', 'Planning', 'Vue_generale');
  await page.locator('[data-testid="planning-open-appointment"]').click();
  await capturePage(page, 'Employee', 'Planning', 'Creation_rendez_vous');
  await closeVisibleModal(page);

  await gotoAndCapture(page, 'Employee', '/backoffice/customers', 'Customers', 'Fiche_client');
  await gotoAndCapture(page, 'Employee', '/backoffice/warehouse', 'Warehouse', 'Preparation_commandes');
  await gotoAndCapture(page, 'Employee', '/backoffice/profile', 'Profile', 'Preferences_compte');
}

async function captureCustomerPages(page: Page): Promise<void> {
  await signIn(page, 'customer@procuratio.local', 'Customer123!');
  await preparePage(page);

  await gotoAndCapture(page, 'Customer', '/client', 'Home', 'Accueil_client');

  await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Customer', 'Catalog', 'Catalogue_produits');
  const productLink = page.locator('a[href*="/client/catalog/"]').first();
  if (await productLink.isVisible().catch(() => false)) {
    await productLink.click();
    await capturePage(page, 'Customer', 'Catalog', 'Detail_produit');
  }

  await gotoAndCapture(page, 'Customer', '/client/cart', 'Cart', 'Panier_client');
  await gotoAndCapture(page, 'Customer', '/client/checkout', 'Checkout', 'Finalisation_commande');
  await gotoAndCapture(page, 'Customer', '/client/orders', 'Orders', 'Historique_commandes');

  const orderLink = page.locator('a[href*="/client/orders/"]').first();
  if (await orderLink.isVisible().catch(() => false)) {
    await orderLink.click();
    await capturePage(page, 'Customer', 'Orders', 'Detail_commande');
  }

  await gotoAndCapture(page, 'Customer', '/client/booking', 'Booking', 'Reservation_en_ligne');

  await page.goto('/client/profile', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Customer', 'Profile', 'Compte_client');

  if (
    await clickFirstVisible([
      page.getByRole('button', { name: /Loyalty/i }),
      page.getByRole('button', { name: /Open loyalty/i }),
    ])
  ) {
    await capturePage(page, 'Customer', 'Profile', 'Fidelite');
    await closeVisibleModal(page);
  }

  if (
    await clickFirstVisible([
      page.getByRole('button', { name: /Gift vouchers/i }),
      page.getByRole('button', { name: /Open vouchers/i }),
    ])
  ) {
    await capturePage(page, 'Customer', 'Profile', 'Bons_cadeaux_disponibles');
    await closeVisibleModal(page);
  }

  if (
    await clickFirstVisible([
      page.getByRole('button', { name: /Appointments/i }),
      page.getByRole('button', { name: /Open appointments/i }),
    ])
  ) {
    await capturePage(page, 'Customer', 'Profile', 'Rendez_vous');
    await closeVisibleModal(page);
  }
}

test.beforeAll(async () => {
  await ensureOutputDir();
});

test('Generate admin catalog documentation captures', async ({ page }) => {
  await captureAdminCatalogPages(page);
});

test('Generate admin operational documentation captures', async ({ page }) => {
  await captureAdminOperationalPages(page);
});

test('Generate admin directory documentation captures', async ({ page }) => {
  await captureAdminDirectoryPages(page);
});

test('Generate admin CRM and warehouse documentation captures', async ({ page }) => {
  await captureAdminCrmAndWarehousePages(page);
});

test('Generate employee documentation captures', async ({ page }) => {
  await captureEmployeePages(page);
});

test('Generate customer documentation captures', async ({ page }) => {
  await captureCustomerPages(page);
});
