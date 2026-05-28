import { useEffect, useMemo, useState } from 'react';
import { listProducts, listServices } from '../../../api/stock';
import {
  createSale,
  cancelSale,
  getIssuedSales,
  getSaleReceipt,
  getSuspendedSales,
  paySale,
  resumeSale,
  searchCustomers,
  suspendSale,
} from '../../../api/pos';
import type { Product, ServiceItem } from '../../../types/stock';
import type { PosCustomerSearchResult, PosItemPayload, Sale } from '../../../types/pos';
import { InlineNotification } from '../../../ui/InlineNotification';
import { PosActiveSaleWorkspace } from './PosActiveSaleWorkspace';
import { PosCatalogPanel } from './PosCatalogPanel';
import { PosCheckoutPanel } from './PosCheckoutPanel';
import { PosHistoryPanel } from './PosHistoryPanel';
import {
  type CatalogEntry,
  type CurrentLine,
  type DraftLine,
  computeDraftTotals,
  formatPosCurrency,
  mapSaleToDraftLines,
  paymentMethodLabel,
  priceExclTax,
  priceInclTax,
  roundCurrency,
  formatPercentageInput,
  sellerLabel,
  summarizeSaleDiscounts,
} from './posDraft';

export function PosPage() {
  const POS_HISTORY_PAGE_SIZE = 6;
  const POS_CATALOG_PAGE_SIZE = 9;
  const POS_NAME_MARQUEE_THRESHOLD = 34;
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [activeSale, setActiveSale] = useState<Sale | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomerSearchResult | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [issuedSales, setIssuedSales] = useState<Sale[]>([]);
  const [suspendedSales, setSuspendedSales] = useState<Sale[]>([]);
  const [customerResults, setCustomerResults] = useState<PosCustomerSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'progress' | 'issued'>('progress');
  const [discountPct, setDiscountPct] = useState('0');
  const [search, setSearch] = useState('');
  const [catalogView, setCatalogView] = useState<'all' | 'product' | 'service'>('all');
  const [catalogPage, setCatalogPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ page: '1', perPage: '50', active: 'true' });
    listProducts(params).then((response) => setProducts(response.data)).catch((err) => setError((err as Error).message));
    listServices(params).then((response) => setServices(response.data)).catch((err) => setError((err as Error).message));
  }, []);

  useEffect(() => {
    getSuspendedSales().then((result) => setSuspendedSales(result.data)).catch((err) => setError((err as Error).message));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      refreshIssuedSales(selectedCustomer?.id ?? null).catch((err) => setError((err as Error).message));
    }, 200);

    return () => clearTimeout(timeout);
  }, [selectedCustomer]);

  useEffect(() => {
    const term = customerQuery.trim();

    if (!term || (selectedCustomer && term === selectedCustomer.fullName)) {
      setCustomerResults([]);
      return;
    }

    if (/^\d+$/.test(term)) {
      const numericId = Number(term);
      if (!Number.isNaN(numericId) && selectedCustomer?.id === numericId) {
        return;
      }
    }

    if (term.length < 2) {
      setCustomerResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      searchCustomers(term)
        .then((result) => setCustomerResults(result.data))
        .catch((err) => setError((err as Error).message));
    }, 250);

    return () => clearTimeout(timeout);
  }, [customerQuery, selectedCustomer]);

  const numericCustomerId = selectedCustomer?.id ?? null;
  const draftTotals = computeDraftTotals(draftLines, Math.max(0, Number(discountPct) || 0));
  const activeSaleDiscounts = useMemo(() => summarizeSaleDiscounts(activeSale), [activeSale]);

  const searchableCatalog = useMemo<CatalogEntry[]>(() => {
    const entries = [
      ...products.map((product) => ({
        id: product.id,
        type: 'product' as const,
        name: product.name,
        price: product.price,
        stock: product.stock,
        isAvailable: product.stock > 0 && product.isActive,
        imageUrl: product.imageUrl,
        subtitle: product.brand.name,
        imageMode: product.imageUrl ? 'cover' as const : 'contain' as const,
      })),
      ...services.map((service) => ({
        id: service.id,
        type: 'service' as const,
        name: service.name,
        price: service.price,
        stock: null,
        isAvailable: service.isActive,
        imageUrl: null,
        subtitle: `${service.durationMinutes} min`,
        imageMode: 'contain' as const,
      })),
    ];

    return entries.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  }, [products, services, search]);

  const visibleCatalog = useMemo(() => {
    if (catalogView === 'all') {
      return searchableCatalog;
    }

    return searchableCatalog.filter((item) => item.type === catalogView);
  }, [catalogView, searchableCatalog]);
  const catalogTotalPages = Math.max(1, Math.ceil(visibleCatalog.length / POS_CATALOG_PAGE_SIZE));
  const paginatedCatalog = useMemo(() => {
    const startIndex = (catalogPage - 1) * POS_CATALOG_PAGE_SIZE;

    return visibleCatalog.slice(startIndex, startIndex + POS_CATALOG_PAGE_SIZE);
  }, [catalogPage, visibleCatalog]);

  const currentLines: CurrentLine[] = activeSale
    ? activeSale.items.map((item) => ({
        key: `sale-${item.id}`,
        name: item.label,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
      }))
    : draftLines.map((item, index) => ({
        key: `draft-${item.itemType}-${item.itemId}-${index}`,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount ?? 0,
        taxRate: item.taxRate ?? 0,
        lineTotal: roundCurrency(Math.max(0, priceInclTax(item.unitPrice * item.quantity, item.taxRate ?? 0) - (item.discountAmount ?? 0))),
      }));

  const displayClient = activeSale?.customer?.fullName
    ?? selectedCustomer?.fullName
    ?? 'Walk-in customer';
  const displayTotal = formatPosCurrency(activeSale ? Number(activeSale.total) : draftTotals.total);
  const displaySubTotal = activeSale ? Number(activeSale.subTotal) : draftTotals.subTotal;
  const displayTaxTotal = activeSale ? Number(activeSale.taxTotal) : draftTotals.taxTotal;
  const displayDiscountTotal = activeSale ? activeSaleDiscounts.totalDiscountInclVat : draftTotals.discountTotal;
  const displayedDiscountPct = activeSale ? formatPercentageInput(activeSaleDiscounts.globalDiscountPct) : discountPct;
  const latestPayment = activeSale ? activeSale.payments[activeSale.payments.length - 1] ?? null : null;
  const activeCreatedAt = activeSale ? new Date(activeSale.createdAt).toLocaleString('en-GB') : null;
  const leftColumnSales = useMemo(() => {
    const source = activeTab === 'progress' ? suspendedSales : issuedSales;

    return [...source].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [activeTab, suspendedSales, issuedSales]);
  const filteredLeftColumnSales = useMemo(() => {
    const term = customerQuery.trim().toLowerCase();

    if (!term) {
      return leftColumnSales;
    }

    return leftColumnSales.filter((sale) => {
      const haystack = [
        sale.receiptNumber ?? `Ticket #${sale.id}`,
        sale.customer?.fullName ?? 'Walk-in customer',
        formatPosCurrency(Number(sale.total)),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [customerQuery, leftColumnSales]);
  const historyTotalPages = Math.max(1, Math.ceil(filteredLeftColumnSales.length / POS_HISTORY_PAGE_SIZE));
  const paginatedLeftColumnSales = useMemo(() => {
    const startIndex = (historyPage - 1) * POS_HISTORY_PAGE_SIZE;

    return filteredLeftColumnSales.slice(startIndex, startIndex + POS_HISTORY_PAGE_SIZE);
  }, [filteredLeftColumnSales, historyPage, POS_HISTORY_PAGE_SIZE]);
  useEffect(() => {
    setHistoryPage(1);
  }, [customerQuery, activeTab, selectedCustomer, suspendedSales.length, issuedSales.length]);

  useEffect(() => {
    setCatalogPage(1);
  }, [search, catalogView]);

  useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  useEffect(() => {
    if (catalogPage > catalogTotalPages) {
      setCatalogPage(catalogTotalPages);
    }
  }, [catalogPage, catalogTotalPages]);

  async function refreshIssuedSales(customerId: number | null) {
    const response = await getIssuedSales(1, 50, customerId ?? undefined);
    setIssuedSales(response.data);
  }

  async function refreshSuspendedSales() {
    const result = await getSuspendedSales();
    setSuspendedSales(result.data);
  }

  async function refreshAfterTicketMutation(customerId: number | null) {
    const refreshResults = await Promise.allSettled([
      refreshSuspendedSales(),
      refreshIssuedSales(customerId),
    ]);

    const refreshFailure = refreshResults.find((result) => result.status === 'rejected');
    if (refreshFailure?.status === 'rejected') {
      setInfo('The ticket was updated, but one list could not refresh. Reload the page if needed.');
    }
  }

  function addToDraft(itemType: 'product' | 'service', itemId: number) {
    const productSource = itemType === 'product'
      ? products.find((product) => product.id === itemId)
      : null;
    const serviceSource = itemType === 'service'
      ? services.find((service) => service.id === itemId)
      : null;
    const source = productSource ?? serviceSource;

    if (!source) {
      return;
    }

    setDraftLines((prev) => {
      const existingIndex = prev.findIndex((line) => line.itemType === itemType && line.itemId === itemId);

      if (existingIndex >= 0) {
        return prev.map((line, currentIndex) => {
          if (currentIndex !== existingIndex) {
            return line;
          }

          const nextQuantity = line.quantity + 1;

          if (itemType === 'product' && typeof productSource?.stock === 'number') {
            return { ...line, quantity: Math.min(productSource.stock, nextQuantity) };
          }

          return { ...line, quantity: nextQuantity };
        });
      }

      return [
        ...prev,
        {
          itemType,
          itemId,
          quantity: 1,
          taxRate: 20,
          discountAmount: 0,
          name: source.name,
          unitPrice: Number(source.price),
        },
      ];
    });
  }

  function removeDraftLine(index: number) {
    setDraftLines((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  function updateDraftQuantity(index: number, quantity: number) {
    setDraftLines((prev) => prev.map((line, currentIndex) => (
      currentIndex === index ? { ...line, quantity: Math.max(1, quantity) } : line
    )));
  }

  function quantityChoicesForLine(line: DraftLine): number[] {
    if (line.itemType === 'product') {
      const product = products.find((entry) => entry.id === line.itemId);
      const max = Math.max(1, product?.stock ?? line.quantity);

      return Array.from({ length: max }, (_, index) => index + 1);
    }

    const max = Math.max(10, line.quantity);

    return Array.from({ length: max }, (_, index) => index + 1);
  }

  function updateDraftDiscount(index: number, discountValue: number) {
    setDraftLines((prev) => prev.map((line, currentIndex) => (
      currentIndex === index
        ? { ...line, discountAmount: Math.max(0, Number.isFinite(discountValue) ? discountValue : 0) }
        : line
    )));
  }

  async function createTicket() {
    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      const sale = await createSale({
        customerId: numericCustomerId ?? undefined,
        items: draftLines.map(({ name, unitPrice, discountAmount, ...line }) => ({
          ...line,
          discountAmount: priceExclTax(discountAmount ?? 0, line.taxRate ?? 0),
        })),
        globalDiscount: draftTotals.globalDiscountExclVat,
      });
      setActiveSale(sale);
      setPaymentReference('');
      setMessage('The ticket has been created successfully.');
      await refreshSuspendedSales();
      await refreshIssuedSales(numericCustomerId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSuspend() {
    if (!activeSale) {
      return;
    }

    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      const sale = await suspendSale(activeSale.id, 'Temporarily suspended from POS');
      setActiveSale(sale);
      setInfo('The ticket has been suspended. You can resume it later.');
      await refreshAfterTicketMutation(sale.customer?.id ?? numericCustomerId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleResume() {
    if (!activeSale) {
      return;
    }

    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      const sale = await resumeSale(activeSale.id);
      setActiveSale(sale);
      setMessage('The ticket has been resumed successfully.');
      await refreshAfterTicketMutation(sale.customer?.id ?? numericCustomerId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handlePay() {
    if (!activeSale) {
      return;
    }

    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      const paid = await paySale(activeSale.id, {
        method: paymentMethod,
        amount: Number(activeSale.total),
        externalRef: paymentReference.trim() || undefined,
      });
      const receipt = await getSaleReceipt(paid.id);
      setActiveSale(receipt.receipt);
      setDraftLines([]);
      setActiveTab('issued');
      setMessage('The sale has been charged and the receipt is now available.');
      await refreshAfterTicketMutation(receipt.receipt.customer?.id ?? numericCustomerId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCancelSale() {
    if (!activeSale) {
      return;
    }

    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      const cancelledSale = await cancelSale(activeSale.id);
      setActiveSale(cancelledSale);
      setMessage('The sale has been cancelled and the stock has been restored.');
      await refreshAfterTicketMutation(cancelledSale.customer?.id ?? numericCustomerId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function returnToDraft(preserveLines: boolean) {
    if (activeSale && preserveLines) {
      setDraftLines(mapSaleToDraftLines(activeSale));
      setDiscountPct(formatPercentageInput(summarizeSaleDiscounts(activeSale).globalDiscountPct));
    } else {
      setDraftLines([]);
      setDiscountPct('0');
    }

    setActiveSale(null);
    setPaymentReference('');
    setError(null);
    setMessage(null);
    setShowBackConfirm(false);
    setInfo(preserveLines ? 'Draft view restored with the current ticket lines.' : 'Draft view restored without the previous ticket lines.');
  }

  function requestReturnToDraft() {
    setShowBackConfirm(true);
  }

  function startNewGuestDraft() {
    setActiveSale(null);
    setDraftLines([]);
    setDiscountPct('0');
    setPaymentReference('');
    setCustomerQuery('');
    setSelectedCustomer(null);
    setCustomerResults([]);
    setError(null);
    setMessage(null);
    setInfo('A new guest sale draft is ready.');
  }

  function selectCustomer(result: PosCustomerSearchResult) {
    setCustomerQuery(result.fullName);
    setSelectedCustomer(result);
    setCustomerResults([]);
  }

  function openSale(sale: Sale) {
    setActiveSale(sale);
    setPaymentReference('');
  }

  function printReceipt() {
    if (!activeSale || (activeSale.status !== 'completed' && activeSale.status !== 'cancelled')) {
      return;
    }

    window.print();
  }

  return (
    <div className="reference-screen pos-reference">
      <div className={`pos-layout${activeSale ? ' has-active-sale' : ''}`}>
        <PosHistoryPanel
          activeSaleId={activeSale?.id ?? null}
          activeTab={activeTab}
          customerQuery={customerQuery}
          customerResults={customerResults}
          historyPage={historyPage}
          historyTotalPages={historyTotalPages}
          leftColumnSales={leftColumnSales}
          paginatedLeftColumnSales={paginatedLeftColumnSales}
          pageSize={POS_HISTORY_PAGE_SIZE}
          onActiveTabChange={setActiveTab}
          onCustomerQueryChange={(value) => {
            setCustomerQuery(value);
            setSelectedCustomer(null);
          }}
          onHistoryPageChange={setHistoryPage}
          onOpenSale={openSale}
          onRefreshHistory={() => {
            refreshIssuedSales(selectedCustomer?.id ?? null).catch((err) => setError((err as Error).message));
          }}
          onSelectCustomer={selectCustomer}
          onStartNewGuestDraft={startNewGuestDraft}
        />

        <section className="pos-center pos-column-shell">
          <PosCatalogPanel
            catalogPage={catalogPage}
            catalogTotalPages={catalogTotalPages}
            catalogView={catalogView}
            displayClient={displayClient}
            paginatedCatalog={paginatedCatalog}
            search={search}
            totalItems={visibleCatalog.length}
            hasActiveSale={Boolean(activeSale)}
            nameMarqueeThreshold={POS_NAME_MARQUEE_THRESHOLD}
            pageSize={POS_CATALOG_PAGE_SIZE}
            onAddToDraft={addToDraft}
            onCatalogPageChange={setCatalogPage}
            onCatalogViewChange={setCatalogView}
            onCreateTicket={createTicket}
            onSearchChange={setSearch}
            canCreateTicket={draftLines.length > 0}
          />

          {activeSale && (
            <PosActiveSaleWorkspace
              activeCreatedAt={activeCreatedAt}
              activeSale={activeSale}
              displayClient={displayClient}
              latestPayment={latestPayment}
              onCancelSale={handleCancelSale}
              onPrintReceipt={printReceipt}
              onRequestReturnToDraft={requestReturnToDraft}
              onResume={handleResume}
              onSuspend={handleSuspend}
              paymentMethodLabel={paymentMethodLabel}
              sellerLabel={sellerLabel}
            />
          )}

          <div className="stack">
            {message && <InlineNotification tone="success" title="Done" message={message} />}
            {info && <InlineNotification tone="info" title="Information" message={info} />}
            {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
          </div>
        </section>

        <PosCheckoutPanel
          activeSale={activeSale}
          currentLines={currentLines}
          discountPct={displayedDiscountPct}
          displayDiscountTotal={displayDiscountTotal}
          displaySubTotal={displaySubTotal}
          displayTaxTotal={displayTaxTotal}
          displayTotal={displayTotal}
          latestPayment={latestPayment}
          draftLines={draftLines}
          paymentMethod={paymentMethod}
          paymentReference={paymentReference}
          onDiscountPctChange={setDiscountPct}
          onDraftDiscountChange={updateDraftDiscount}
          onDraftQuantityChange={updateDraftQuantity}
          onPay={handlePay}
          onPaymentMethodChange={setPaymentMethod}
          onPaymentReferenceChange={setPaymentReference}
          onPrintReceipt={printReceipt}
          onRemoveDraftLine={removeDraftLine}
          quantityChoicesForLine={quantityChoicesForLine}
          sellerLabel={sellerLabel}
          activeCreatedAt={activeCreatedAt}
        />
      </div>

      {showBackConfirm && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card catalog-value-modal" role="dialog" aria-modal="true" aria-labelledby="pos-back-confirm-title">
            <div className="crm-modal-head row">
              <div>
                <h3 id="pos-back-confirm-title">Go back to the draft view?</h3>
                <p className="catalog-value-modal-copy">
                  Choose whether we keep the current ticket lines in the draft or return to an empty draft.
                </p>
              </div>
            </div>
            <div className="catalog-value-modal-actions row">
              <button type="button" className="btn-soft" onClick={() => setShowBackConfirm(false)}>Cancel</button>
              <button type="button" className="btn-ghost" onClick={() => returnToDraft(false)}>Discard items</button>
              <button type="button" onClick={() => returnToDraft(true)}>Keep items</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

