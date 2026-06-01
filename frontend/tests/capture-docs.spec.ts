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

type BrowserApiOptions = {
  method?: string;
  body?: string;
};

async function apiRequestFromBrowser(page: Page, pathName: string, options: BrowserApiOptions = {}): Promise<any> {
  return page.evaluate(
    async ({ pathName: browserPathName, options: browserOptions }) => {
      const response = await fetch(`http://localhost:48280${browserPathName}`, {
        ...browserOptions,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message ?? payload?.error?.message ?? `API request failed: ${response.status}`);
      }

      return payload;
    },
    { pathName, options },
  );
}

async function seedCustomerBasketState(page: Page): Promise<() => Promise<void>> {
  const initialCart = await apiRequestFromBrowser(page, '/api/v1/cart');
  const initialReservations = await apiRequestFromBrowser(page, '/api/v1/reservations/me');
  const catalog = await apiRequestFromBrowser(page, '/api/v1/catalog/products?page=1&perPage=6');
  const products = (catalog.data ?? []).slice(0, 3);
  const initialQuantities = new Map<number, number>(
    (initialCart.items ?? []).map((item: { productId: number; quantity: number }) => [item.productId, item.quantity]),
  );
  const initialReservationIds = new Set<number>(
    (initialReservations.data ?? []).map((reservation: { id: number }) => reservation.id),
  );

  for (const [index, product] of products.entries()) {
    await apiRequestFromBrowser(page, '/api/v1/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId: product.id, quantity: index === 0 ? 2 : 1 }),
    });
  }

  if (products[0]) {
    await apiRequestFromBrowser(page, `/api/v1/catalog/products/${products[0].id}/reservations`, {
      method: 'POST',
      body: JSON.stringify({ quantity: 1, durationMinutes: 120 }),
    }).catch(() => undefined);
  }

  return async () => {
    const currentCart = await apiRequestFromBrowser(page, '/api/v1/cart').catch(() => null);
    for (const product of products) {
      const originalQuantity = initialQuantities.get(product.id);
      if (originalQuantity) {
        await apiRequestFromBrowser(page, `/api/v1/cart/items/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify({ quantity: originalQuantity }),
        }).catch(() => undefined);
      } else if (currentCart?.items?.some((item: { productId: number }) => item.productId === product.id)) {
        await apiRequestFromBrowser(page, `/api/v1/cart/items/${product.id}`, { method: 'DELETE' }).catch(() => undefined);
      }
    }

    const currentReservations = await apiRequestFromBrowser(page, '/api/v1/reservations/me').catch(() => ({ data: [] }));
    for (const reservation of currentReservations.data ?? []) {
      if (!initialReservationIds.has(reservation.id)) {
        await apiRequestFromBrowser(page, `/api/v1/reservations/${reservation.id}/cancel`, { method: 'POST' }).catch(() => undefined);
      }
    }
  };
}

async function captureIfClicked(
  page: Page,
  candidates: Locator[],
  role: string,
  pageName: string,
  feature: string,
  closeAfter = true,
): Promise<boolean> {
  const clicked = await clickFirstVisible(candidates);
  if (!clicked) {
    return false;
  }

  await capturePage(page, role, pageName, feature);

  if (closeAfter) {
    await closeVisibleModal(page);
  }

  return true;
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
      await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
      await candidate.click();
      return true;
    }
  }

  return false;
}

async function addPosCatalogItems(page: Page, itemCount: number): Promise<void> {
  for (let index = 0; index < itemCount; index += 1) {
    await openFirstAvailable(page.locator(`button[data-testid^="pos-add-"]:not([disabled])`).nth(index));
  }
}

async function fillPosDiscountPreview(page: Page): Promise<void> {
  const firstLineDiscount = page.locator('.pos-line-discount-input').first();
  if (await firstLineDiscount.isVisible().catch(() => false)) {
    await firstLineDiscount.fill('10');
  }

  const globalDiscount = page.locator('#pos-global-discount');
  if (await globalDiscount.isVisible().catch(() => false)) {
    await globalDiscount.fill('5');
  }
}

async function clickFirstVisible(candidates: Locator[]): Promise<boolean> {
  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
      await candidate.click();
      return true;
    }
  }

  return false;
}

async function resetSearchFilters(page: Page): Promise<void> {
  const resetButton = page.getByRole('button', { name: 'Reset filters' });
  if (await resetButton.isVisible().catch(() => false)) {
    await resetButton.click();
    await waitForStablePage(page);
  }
}

async function captureFirstTableAction(
  page: Page,
  actionButtonIndex: number,
  role: string,
  pageName: string,
  feature: string,
): Promise<boolean> {
  const actionButton = page.locator('table tbody tr').first().locator('button').nth(actionButtonIndex);
  await actionButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
  if (!(await actionButton.isVisible().catch(() => false))) {
    return false;
  }

  await actionButton.scrollIntoViewIfNeeded().catch(() => undefined);
  await actionButton.click();
  await capturePage(page, role, pageName, feature);
  await closeVisibleModal(page);
  return true;
}

async function selectFirstDirectoryCard(page: Page): Promise<boolean> {
  return clickFirstVisible([
    page.locator('.entity-list-card').first(),
    page.locator('.store-list-card').first(),
    page.locator('.customer-card').first(),
    page.locator('button').filter({ hasText: /@|active|Bookable|Main Store/i }).first(),
  ]);
}

async function capturePublicPages(page: Page): Promise<void> {
  await preparePage(page);
  await gotoAndCapture(page, 'Public', '/login', 'Login', 'Connexion');
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
  await captureIfClicked(
    page,
    [page.getByRole('button', { name: 'Manage brands' })],
    'Admin',
    'Products',
    'Gestion_marques',
  );
  await closeVisibleModal(page);
  await page.goto('/backoffice/products', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add product' }).click();
  await captureIfClicked(
    page,
    [page.getByRole('button', { name: 'Manage types' })],
    'Admin',
    'Products',
    'Gestion_types',
  );
  await closeVisibleModal(page);
  await page.goto('/backoffice/products', { waitUntil: 'domcontentloaded' });
  await resetSearchFilters(page);
  await captureFirstTableAction(page, 1, 'Admin', 'Products', 'Edition_produit');

  await page.goto('/backoffice/services', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Services', 'Catalogue_prestations');
  await page.getByRole('button', { name: 'Add service' }).click();
  await capturePage(page, 'Admin', 'Services', 'Creation_prestation');
  await captureIfClicked(
    page,
    [page.getByRole('button', { name: 'Manage types' })],
    'Admin',
    'Services',
    'Gestion_types_prestations',
  );
  await closeVisibleModal(page);
  await page.goto('/backoffice/services', { waitUntil: 'domcontentloaded' });
  await resetSearchFilters(page);
  await captureFirstTableAction(page, 0, 'Admin', 'Services', 'Edition_prestation');
}

async function captureAdminOperationalPages(page: Page): Promise<void> {
  await captureAdminPages(page);
  await page.goto('/backoffice/pos', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Cash', 'Caisse_accueil');
  await openFirstAvailable(page.locator('button[data-testid^="pos-add-product-"]:not([disabled])'));
  await capturePage(page, 'Admin', 'Cash', 'Panier_actif');
  await addPosCatalogItems(page, 2);
  await capturePage(page, 'Admin', 'Cash', 'Panier_plusieurs_lignes');
  await fillPosDiscountPreview(page);
  await capturePage(page, 'Admin', 'Cash', 'Remises_avant_encaissement');
  await captureIfClicked(
    page,
    [page.locator('[data-testid="pos-create-ticket"]')],
    'Admin',
    'Cash',
    'Ticket_cree',
    false,
  );
  await capturePage(page, 'Admin', 'Cash', 'Ticket_annulable');
  await captureIfClicked(
    page,
    [page.locator('[data-testid="pos-suspend"]')],
    'Admin',
    'Cash',
    'Ticket_suspendu',
    false,
  );
  await captureIfClicked(
    page,
    [page.locator('[data-testid="pos-resume"]')],
    'Admin',
    'Cash',
    'Ticket_repris',
    false,
  );
  await captureIfClicked(
    page,
    [page.locator('[data-testid="pos-pay"]')],
    'Admin',
    'Cash',
    'Vente_encaissee',
    false,
  );
  await capturePage(page, 'Admin', 'Cash', 'Recu_disponible');

  await page.goto('/backoffice/planning', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Planning', 'Vue_generale');
  await captureIfClicked(
    page,
    [page.locator('[data-testid^="planning-row-"]').first(), page.locator('[data-testid^="planning-group-"]').first()],
    'Admin',
    'Planning',
    'Resume_rendez_vous',
  );
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
  await captureIfClicked(
    page,
    [page.getByRole('button', { name: 'Edit customer' })],
    'Admin',
    'Customers',
    'Edition_client',
  );
}

async function captureAdminDirectoryPages(page: Page): Promise<void> {
  await captureAdminPages(page);
  await page.goto('/backoffice/employees', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Employees', 'Annuaire_employes');
  await selectFirstDirectoryCard(page);
  await capturePage(page, 'Admin', 'Employees', 'Detail_employe');
  await captureIfClicked(
    page,
    [page.getByRole('button', { name: 'Edit employee' }), page.getByRole('button', { name: 'Edit account details' })],
    'Admin',
    'Employees',
    'Edition_employe',
  );
  await capturePage(page, 'Admin', 'Employees', 'Maintenance_compte_employe');
  await page.getByRole('button', { name: 'New employee' }).click();
  await capturePage(page, 'Admin', 'Employees', 'Creation_employe');
  await closeVisibleModal(page);

  await page.goto('/backoffice/managers', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Managers', 'Annuaire_managers');
  await selectFirstDirectoryCard(page);
  await capturePage(page, 'Admin', 'Managers', 'Detail_manager');
  await captureIfClicked(
    page,
    [page.getByRole('button', { name: 'Edit manager' }), page.getByRole('button', { name: 'Edit account details' })],
    'Admin',
    'Managers',
    'Edition_manager',
  );
  await capturePage(page, 'Admin', 'Managers', 'Maintenance_compte_manager');
  await page.getByRole('button', { name: 'New manager' }).click();
  await capturePage(page, 'Admin', 'Managers', 'Creation_manager');
  await closeVisibleModal(page);

  await page.goto('/backoffice/stores', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Admin', 'Stores', 'Annuaire_boutiques');
  await selectFirstDirectoryCard(page);
  await capturePage(page, 'Admin', 'Stores', 'Detail_boutique');
  await captureIfClicked(
    page,
    [page.getByRole('button', { name: 'Edit store' })],
    'Admin',
    'Stores',
    'Edition_boutique',
  );
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
  await captureIfClicked(
    page,
    [page.getByRole('button', { name: /Select all filtered/i })],
    'Admin',
    'CRM',
    'Selection_clients_fidelite',
    false,
  );
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
  await gotoAndCapture(page, 'Employee', '/backoffice/employees', 'Employees', 'Acces_refuse_ou_limite');
  await gotoAndCapture(page, 'Employee', '/backoffice/managers', 'Managers', 'Acces_refuse_ou_limite');
  await gotoAndCapture(page, 'Employee', '/backoffice/crm', 'CRM', 'Acces_refuse_ou_limite');

  await page.goto('/backoffice/pos', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Employee', 'Cash', 'Caisse_accueil');
  await openFirstAvailable(page.locator('button[data-testid^="pos-add-product-"]:not([disabled])'));
  await capturePage(page, 'Employee', 'Cash', 'Panier_actif');
  await addPosCatalogItems(page, 1);
  await capturePage(page, 'Employee', 'Cash', 'Panier_plusieurs_lignes');
  await fillPosDiscountPreview(page);
  await capturePage(page, 'Employee', 'Cash', 'Remises_avant_ticket');

  await page.goto('/backoffice/planning', { waitUntil: 'domcontentloaded' });
  await capturePage(page, 'Employee', 'Planning', 'Vue_generale');
  await page.locator('[data-testid="planning-open-appointment"]').click();
  await capturePage(page, 'Employee', 'Planning', 'Creation_rendez_vous');
  await closeVisibleModal(page);
  await captureIfClicked(
    page,
    [page.locator('[data-testid="planning-open-slot-search"]')],
    'Employee',
    'Planning',
    'Recherche_disponibilites',
  );
  await captureIfClicked(
    page,
    [page.locator('[data-testid="planning-open-business-hours"]')],
    'Employee',
    'Planning',
    'Horaires_salon_lecture',
  );
  await captureIfClicked(
    page,
    [page.locator('[data-testid^="planning-row-"]').first(), page.locator('[data-testid^="planning-group-"]').first()],
    'Employee',
    'Planning',
    'Resume_rendez_vous',
  );

  await gotoAndCapture(page, 'Employee', '/backoffice/customers', 'Customers', 'Fiche_client');
  await gotoAndCapture(page, 'Employee', '/backoffice/warehouse', 'Warehouse', 'Preparation_commandes');
  await gotoAndCapture(page, 'Employee', '/backoffice/profile', 'Profile', 'Preferences_compte');
}

async function captureCustomerPages(page: Page): Promise<void> {
  await signIn(page, 'customer@procuratio.local', 'Customer123!');
  await preparePage(page);
  const restoreCustomerBasketState = await seedCustomerBasketState(page);

  try {
    await gotoAndCapture(page, 'Customer', '/client', 'Home', 'Accueil_client');

    await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
    await capturePage(page, 'Customer', 'Catalog', 'Catalogue_produits');
    await captureIfClicked(
      page,
      [page.getByRole('button', { name: /Buy gift voucher|Gift voucher/i }).last()],
      'Customer',
      'Catalog',
      'Achat_bon_cadeau',
    );
    const productLink = page.locator('a[href*="/client/catalog/"]').first();
    if (await productLink.isVisible().catch(() => false)) {
      await productLink.click();
      await capturePage(page, 'Customer', 'Catalog', 'Detail_produit');
      await captureIfClicked(
        page,
        [page.getByRole('button', { name: 'Add to cart' })],
        'Customer',
        'Catalog',
        'Ajout_panier',
        false,
      );
      await captureIfClicked(
        page,
        [page.getByRole('button', { name: 'Reserve for pickup' })],
        'Customer',
        'Catalog',
        'Reservation_produit',
        false,
      );
    }

    await gotoAndCapture(page, 'Customer', '/client/cart', 'Cart', 'Panier_client');
    await capturePage(page, 'Customer', 'Cart', 'Panier_plein');
    await captureIfClicked(
      page,
      [page.getByRole('button', { name: /Gift vouchers/i }).first()],
      'Customer',
      'Cart',
      'Application_bon_cadeau',
    );
    await captureIfClicked(
      page,
      [page.getByRole('button', { name: /Reservations/i }).first()],
      'Customer',
      'Cart',
      'Reservations_produit',
    );
    await gotoAndCapture(page, 'Customer', '/client/checkout', 'Checkout', 'Finalisation_commande');
    await capturePage(page, 'Customer', 'Checkout', 'Panier_plein');
    await captureIfClicked(
      page,
      [page.getByRole('button', { name: 'Delivery' })],
      'Customer',
      'Checkout',
      'Livraison',
      false,
    );
    await captureIfClicked(
      page,
      [page.getByRole('button', { name: 'Store pickup' })],
      'Customer',
      'Checkout',
      'Retrait_boutique',
      false,
    );
    await gotoAndCapture(page, 'Customer', '/client/orders', 'Orders', 'Historique_commandes');

    const orderLink = page.locator('a[href*="/client/orders/"]').first();
    if (await orderLink.isVisible().catch(() => false)) {
      await orderLink.click();
      await capturePage(page, 'Customer', 'Orders', 'Detail_commande');
    }

    await gotoAndCapture(page, 'Customer', '/client/booking', 'Booking', 'Reservation_en_ligne');
    await captureIfClicked(
      page,
      [page.locator('[data-testid="booking-search-submit"]')],
      'Customer',
      'Booking',
      'Recherche_creneaux',
      false,
    );
    const firstBookingSlot = page.locator('[data-testid^="booking-slot-"]').first();
    if (await firstBookingSlot.isVisible().catch(() => false)) {
      await firstBookingSlot.click();
      await capturePage(page, 'Customer', 'Booking', 'Selection_creneau');
      await closeVisibleModal(page);
    } else {
      await closeVisibleModal(page);
    }
    await captureIfClicked(
      page,
      [page.locator('.booking-appointment-card').first()],
      'Customer',
      'Booking',
      'Resume_rendez_vous',
      false,
    );

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
  } finally {
    await restoreCustomerBasketState();
  }
}

test.beforeAll(async () => {
  await ensureOutputDir();
});

test('Generate public documentation captures', async ({ page }) => {
  await capturePublicPages(page);
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
