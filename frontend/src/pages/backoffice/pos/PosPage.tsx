import { useEffect, useMemo, useState } from 'react';
import { listProducts, listServices } from '../../../api/stock';
import {
  createSale,
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
import { formatEuro, toPriceInclVat } from '../../../utils/pricing';
import { defaultProductImageUrl } from '../../../utils/productVisual';

type DraftLine = PosItemPayload & {
  name: string;
  unitPrice: number;
};

type CatalogEntry = {
  id: number;
  type: 'product' | 'service';
  name: string;
  price: number;
  stock: number | null;
  isAvailable: boolean;
  imageUrl: string | null;
  subtitle: string;
  imageMode: 'cover' | 'contain';
};

type CurrentLine = {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  lineTotal: number;
};

function servicePreviewImage(name: string): string {
  const label = name.slice(0, 18).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#eef7ff"/>
          <stop offset="100%" stop-color="#dff5f6"/>
        </linearGradient>
      </defs>
      <rect width="240" height="160" rx="20" fill="url(#g)"/>
      <circle cx="72" cy="78" r="34" fill="#ffffff" opacity="0.95"/>
      <circle cx="72" cy="78" r="16" fill="#22bcce" opacity="0.35"/>
      <rect x="122" y="52" width="70" height="14" rx="7" fill="#ffffff" opacity="0.95"/>
      <rect x="122" y="74" width="54" height="10" rx="5" fill="#ffffff" opacity="0.8"/>
      <rect x="122" y="92" width="62" height="10" rx="5" fill="#ffffff" opacity="0.68"/>
      <text x="20" y="142" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="800" fill="#28708a">SERVICE</text>
      <text x="220" y="142" text-anchor="end" font-family="Manrope, Arial, sans-serif" font-size="11" font-weight="700" fill="#28708a" opacity="0.8">${label}</text>
    </svg>
  `)}`;
}

function gbp(value: number): string {
  return formatEuro(value);
}

function paymentMethodLabel(method: string): string {
  return method === 'card' ? 'Card' : 'Cash';
}

function sellerLabel(sale: Sale | null): string {
  if (!sale?.seller?.email) {
    return 'Unknown seller';
  }

  const localPart = sale.seller.email.split('@')[0] ?? sale.seller.email;

  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function computeDraftTotals(lines: DraftLine[], globalDiscountPctTtc: number) {
  const normalizedLines = lines.map((line) => {
    const rawLine = roundCurrency(line.unitPrice * line.quantity);
    const taxRate = Math.max(0, line.taxRate ?? 0);
    const rawLineInclVat = priceInclTax(rawLine, taxRate);
    const lineDiscountInclVat = roundCurrency(Math.min(rawLineInclVat, Math.max(0, line.discountAmount ?? 0)));
    const lineTotalInclVat = roundCurrency(Math.max(0, rawLineInclVat - lineDiscountInclVat));
    const lineNet = roundCurrency(lineTotalInclVat / (1 + (taxRate / 100)));
    const lineTax = roundCurrency(lineTotalInclVat - lineNet);

    return {
      rawLine,
      lineDiscountInclVat,
      lineNet,
      taxRate,
      lineTax,
      lineTotalInclVat,
    };
  });

  const subTotal = roundCurrency(normalizedLines.reduce((sum, line) => sum + line.rawLine, 0));
  const lineDiscountTotal = roundCurrency(normalizedLines.reduce((sum, line) => sum + line.lineDiscountInclVat, 0));
  const netTotalBeforeGlobalDiscount = roundCurrency(normalizedLines.reduce((sum, line) => sum + line.lineNet, 0));
  const totalInclVatBeforeGlobalDiscount = roundCurrency(normalizedLines.reduce((sum, line) => sum + line.lineTotalInclVat, 0));
  const appliedGlobalDiscountPct = Math.max(0, globalDiscountPctTtc);
  const globalDiscountInclVat = roundCurrency(totalInclVatBeforeGlobalDiscount * (appliedGlobalDiscountPct / 100));
  const effectiveTaxRate = netTotalBeforeGlobalDiscount > 0
    ? normalizedLines.reduce((sum, line) => sum + line.lineTax, 0) / netTotalBeforeGlobalDiscount
    : 0;
  const globalDiscountExclVat = roundCurrency(globalDiscountInclVat / (1 + effectiveTaxRate));
  const cappedGlobalDiscountExclVat = Math.min(netTotalBeforeGlobalDiscount, globalDiscountExclVat);

  let distributedDiscount = 0;
  let taxTotal = 0;
  let total = 0;

  normalizedLines.forEach((line, index) => {
    const remainingDiscount = roundCurrency(cappedGlobalDiscountExclVat - distributedDiscount);
    let lineGlobalDiscount = 0;

    if (remainingDiscount > 0 && netTotalBeforeGlobalDiscount > 0) {
      if (index === normalizedLines.length - 1) {
        lineGlobalDiscount = remainingDiscount;
      } else {
        lineGlobalDiscount = Math.min(
          line.lineNet,
          roundCurrency(cappedGlobalDiscountExclVat * (line.lineNet / netTotalBeforeGlobalDiscount)),
        );
      }
    }

    distributedDiscount = roundCurrency(distributedDiscount + lineGlobalDiscount);
    const lineNetAfterGlobalDiscount = roundCurrency(Math.max(0, line.lineNet - lineGlobalDiscount));
    const lineTaxAfterGlobalDiscount = roundCurrency(lineNetAfterGlobalDiscount * (line.taxRate / 100));
    const lineTotalAfterGlobalDiscount = roundCurrency(lineNetAfterGlobalDiscount + lineTaxAfterGlobalDiscount);

    taxTotal = roundCurrency(taxTotal + lineTaxAfterGlobalDiscount);
    total = roundCurrency(total + lineTotalAfterGlobalDiscount);
  });

  return {
    subTotal,
    discountTotal: roundCurrency(lineDiscountTotal + globalDiscountInclVat),
    taxTotal,
    total,
    globalDiscountExclVat: cappedGlobalDiscountExclVat,
    globalDiscountInclVat,
  };
}

function priceInclTax(amount: number, taxRate: number): number {
  const safeAmount = Math.max(0, amount);
  const safeRate = Math.max(0, taxRate);

  return Math.round((safeAmount * (1 + (safeRate / 100))) * 100) / 100;
}

function priceExclTax(amountInclVat: number, taxRate: number): number {
  const safeAmount = Math.max(0, amountInclVat);
  const safeRate = Math.max(0, taxRate);

  return roundCurrency(safeAmount / (1 + (safeRate / 100)));
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function mapSaleToDraftLines(sale: Sale | null): DraftLine[] {
  if (!sale) {
    return [];
  }

  return sale.items.map((item) => ({
    itemType: item.itemType,
    itemId: item.itemId,
    quantity: item.quantity,
    discountAmount: priceInclTax(item.discountAmount, item.taxRate),
    taxRate: item.taxRate,
    name: item.label,
    unitPrice: item.unitPrice,
  }));
}

export function PosPage() {
  const POS_HISTORY_PAGE_SIZE = 10;
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
  const displayTotal = gbp(activeSale ? Number(activeSale.total) : draftTotals.total);
  const displaySubTotal = activeSale ? Number(activeSale.subTotal) : draftTotals.subTotal;
  const displayTaxTotal = activeSale ? Number(activeSale.taxTotal) : draftTotals.taxTotal;
  const displayDiscountTotal = activeSale ? Number(activeSale.discountTotal) : draftTotals.discountTotal;
  const activeStatus = activeSale ? `${activeSale.status} / ${activeSale.paymentStatus}` : 'draft / pending';
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
        gbp(Number(sale.total)),
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
      await refreshSuspendedSales();
      await refreshIssuedSales(sale.customer?.id ?? numericCustomerId);
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
      await refreshSuspendedSales();
      await refreshIssuedSales(sale.customer?.id ?? numericCustomerId);
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
      await refreshSuspendedSales();
      await refreshIssuedSales(receipt.receipt.customer?.id ?? numericCustomerId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function returnToDraft(preserveLines: boolean) {
    if (activeSale && preserveLines) {
      setDraftLines(mapSaleToDraftLines(activeSale));
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
    if (!activeSale || activeSale.status !== 'completed') {
      return;
    }

    window.print();
  }

  return (
    <div className="reference-screen pos-reference">
      <div className={`pos-layout${activeSale ? ' has-active-sale' : ''}`}>
        <aside className="pos-left">
          <div className="pos-tabs">
            <button className={`tab${activeTab === 'progress' ? ' active' : ''}`} onClick={() => setActiveTab('progress')}>In Progress</button>
            <button className={`tab${activeTab === 'issued' ? ' active' : ''}`} onClick={() => setActiveTab('issued')}>Receipt Issued</button>
          </div>

          <div className="pos-search-row">
            <input
              data-testid="pos-customer-id"
              value={customerQuery}
              onChange={(event) => {
                setCustomerQuery(event.target.value);
                setSelectedCustomer(null);
              }}
              placeholder="Search customer, receipt, amount or email"
            />
            <button
              className="round-btn"
              data-testid="pos-refresh-history"
              type="button"
              aria-label="Refresh customer history"
              title="Refresh customer history"
              onClick={() => {
                if (selectedCustomer) {
                  refreshIssuedSales(selectedCustomer.id).catch((err) => setError((err as Error).message));
                } else {
                  refreshIssuedSales(null).catch((err) => setError((err as Error).message));
                }
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 12.65-5.65Z" fill="currentColor" />
              </svg>
            </button>
          </div>

          <div className="pos-new-row">
            <button className="pos-new-btn" type="button" onClick={startNewGuestDraft}>New</button>
          </div>

          {customerResults.length > 0 && (
            <div className="pos-customer-results">
              {customerResults.map((result) => (
                <button key={result.id} className="pos-customer-result" onClick={() => selectCustomer(result)}>
                  <strong>{result.fullName}</strong>
                  <span>{result.email}</span>
                </button>
              ))}
            </div>
          )}

          {customerResults.length === 0 && (
            <>
              <ul data-testid="pos-history" className="pos-history-list">
                {leftColumnSales.length === 0 && (
                  <li className="muted">
                    {activeTab === 'progress' ? 'No suspended sales.' : 'No issued receipts for this customer.'}
                  </li>
                )}
                {leftColumnSales.length > 0 && paginatedLeftColumnSales.length === 0 && (
                  <li className="muted">No ticket matches this search.</li>
                )}
                {paginatedLeftColumnSales.map((sale) => (
                  <li key={sale.id}>
                    <div className={`pos-history-item${activeSale?.id === sale.id ? ' is-active' : ''}`} onClick={() => openSale(sale)}>
                      <div className="phi-name">{sale.receiptNumber ?? `Ticket #${sale.id}`}</div>
                      <div className="phi-meta">
                        {sale.customer?.fullName ?? 'Walk-in customer'}
                      </div>
                      <div className="phi-date">{new Date(sale.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </li>
                ))}
              </ul>

              {filteredLeftColumnSales.length > POS_HISTORY_PAGE_SIZE && (
                <div className="list-pagination pos-history-pagination">
                  <button type="button" className="btn-ghost btn-xs" disabled={historyPage === 1} onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}>
                    Previous
                  </button>
                  <span>Page {historyPage}/{historyTotalPages}</span>
                  <button
                    type="button"
                    className="btn-ghost btn-xs"
                    disabled={historyPage >= historyTotalPages}
                    onClick={() => setHistoryPage((current) => Math.min(historyTotalPages, current + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </aside>

        <section className="pos-center pos-column-shell">
          <div className="pos-client-header">
            <h2 className="pos-client-name">{displayClient}</h2>
          </div>

          <div className="pos-badges">
            <span className="pos-badge">{currentLines.length} line(s)</span>
            <span className="pos-badge">{activeStatus}</span>
            {activeSale?.receiptNumber && <span className="pos-badge">{activeSale.receiptNumber}</span>}
          </div>

          {!activeSale && (
            <>
              <div className="pos-service-panel">
                <div className="pos-service-panel-head">
                  <div>
                    <h3 data-testid="pos-cart-count">Catalog</h3>
                    <p className="muted">Choose the right item quickly, then add it to the current draft.</p>
                  </div>
                  <span className="catalog-count-pill">{visibleCatalog.length} item(s)</span>
                </div>
                <div className="pos-catalog-controls">
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products or services" />
                  <div className="pos-catalog-tabs">
                    <button type="button" className={catalogView === 'all' ? '' : 'btn-soft'} onClick={() => setCatalogView('all')}>All</button>
                    <button type="button" className={catalogView === 'product' ? '' : 'btn-soft'} onClick={() => setCatalogView('product')}>Products</button>
                    <button type="button" className={catalogView === 'service' ? '' : 'btn-soft'} onClick={() => setCatalogView('service')}>Services</button>
                  </div>
                </div>
                <div className="pos-catalog-grid">
                  {paginatedCatalog.map((item) => (
                    <button
                      data-testid={`pos-add-${item.type}-${item.id}`}
                      key={`${item.type}-${item.id}`}
                      className="pos-catalog-card"
                      onClick={() => addToDraft(item.type, item.id)}
                      disabled={!item.isAvailable}
                      title={!item.isAvailable ? 'Out of stock' : undefined}
                    >
                      <div className="pos-catalog-card-head">
                        <div className={`pos-catalog-thumb pos-catalog-thumb-${item.imageMode}`}>
                          <img
                            src={item.type === 'product' ? (item.imageUrl || defaultProductImageUrl()) : servicePreviewImage(item.name)}
                            alt={item.name}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = defaultProductImageUrl();
                            }}
                          />
                        </div>
                        <div className="pos-catalog-card-copy">
                          <div className="pos-catalog-card-top">
                            <span className={`pos-catalog-kind pos-catalog-kind-${item.type}`}>{item.type === 'product' ? 'Product' : 'Service'}</span>
                          </div>
                          <div className="pos-catalog-card-pricing">
                            <strong>{formatEuro(toPriceInclVat(item.price))}</strong>
                            <span className="pos-catalog-inline-meta">
                              {item.type === 'product'
                                ? item.stock !== null
                                  ? `${item.stock} in stock`
                                  : 'Stock unavailable'
                                : 'Bookable'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pos-catalog-card-meta">
                        <strong className={`pos-catalog-card-name${item.name.length > POS_NAME_MARQUEE_THRESHOLD ? ' is-marquee' : ''}`}>
                          {item.name.length > POS_NAME_MARQUEE_THRESHOLD ? (
                            <span className="pos-catalog-card-name-track">
                              <span>{item.name}</span>
                              <span aria-hidden="true">{item.name}</span>
                            </span>
                          ) : (
                            <span>{item.name}</span>
                          )}
                        </strong>
                        <span className="pos-catalog-card-subtitle">{item.subtitle}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {visibleCatalog.length === 0 && (
                  <div className="panel pos-catalog-empty">
                    <strong>No catalog result</strong>
                    <span className="muted">Try another keyword or switch between products and services.</span>
                  </div>
                )}
                {visibleCatalog.length > POS_CATALOG_PAGE_SIZE && (
                  <div className="pos-catalog-pagination">
                    <button type="button" className="btn-soft btn-xs" disabled={catalogPage === 1} onClick={() => setCatalogPage((current) => Math.max(1, current - 1))}>
                      Previous
                    </button>
                    <span>Page {catalogPage}/{catalogTotalPages}</span>
                    <button
                      type="button"
                      className="btn-soft btn-xs"
                      disabled={catalogPage >= catalogTotalPages}
                      onClick={() => setCatalogPage((current) => Math.min(catalogTotalPages, current + 1))}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <button
                className="pos-add-service-btn"
                data-testid="pos-create-ticket"
                onClick={createTicket}
                disabled={draftLines.length === 0}
              >
                Create ticket
              </button>
            </>
          )}

          {activeSale && (
            <div className="pos-active-workspace">
              <div className="panel pos-ticket-card" data-testid="pos-active-ticket">
                <div className="row"><strong>Ticket #{activeSale.id}</strong><span className="muted">{activeStatus}</span></div>
                <div className="row" style={{ marginTop: 8 }}>
                  <span className="muted">Seller: {sellerLabel(activeSale)}</span>
                  {activeSale.receiptNumber && <span className="muted">Receipt: {activeSale.receiptNumber}</span>}
                </div>
                {activeCreatedAt && (
                  <div className="row" style={{ marginTop: 6 }}>
                    <span className="muted">Created at: {activeCreatedAt}</span>
                  </div>
                )}
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn-soft" type="button" onClick={requestReturnToDraft}>Back</button>
                  <button className="btn-soft" data-testid="pos-suspend" onClick={handleSuspend} disabled={activeSale.status === 'suspended' || activeSale.status === 'completed'}>Suspend</button>
                  <button className="btn-soft" data-testid="pos-resume" onClick={handleResume} disabled={activeSale.status !== 'suspended'}>Resume</button>
                  {activeSale.status === 'completed' && (
                    <button className="btn-soft" type="button" onClick={printReceipt}>Print receipt</button>
                  )}
                </div>
              </div>

              <div className="pos-active-overview-grid">
                <div className="panel pos-active-overview-card">
                  <small>Customer</small>
                  <strong>{displayClient}</strong>
                  <span>{activeSale.customer ? 'Linked customer profile' : 'Guest sale / walk-in'}</span>
                </div>
                <div className="panel pos-active-overview-card">
                  <small>Seller</small>
                  <strong>{sellerLabel(activeSale)}</strong>
                  <span>{activeSale.store?.name ?? 'No store attached'}</span>
                </div>
                <div className="panel pos-active-overview-card">
                  <small>Receipt</small>
                  <strong>{activeSale.receiptNumber ?? `Ticket #${activeSale.id}`}</strong>
                  <span>{activeSale.status === 'completed' ? 'Receipt available' : 'Receipt pending payment'}</span>
                </div>
                <div className="panel pos-active-overview-card">
                  <small>Payment</small>
                  <strong>{latestPayment ? paymentMethodLabel(latestPayment.method) : 'Not charged yet'}</strong>
                  <span>{latestPayment ? new Date(latestPayment.paidAt).toLocaleString('en-GB') : 'Waiting for checkout'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="stack">
            {message && <InlineNotification tone="success" title="Done" message={message} />}
            {info && <InlineNotification tone="info" title="Information" message={info} />}
            {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
          </div>
        </section>

        <aside className="pos-right pos-column-shell">
          <div className="panel pos-right-section pos-checkout-panel">
            <div className="pos-checkout-head">
              <div>
                <div className="pos-right-header">Checkout</div>
                <p className="muted pos-checkout-copy">
                  Review the current lines, adjust the payment and charge the sale.
                </p>
              </div>
              <span className="catalog-count-pill pos-checkout-count">{currentLines.length} line(s)</span>
            </div>

            <div className="pos-ticket-lines-stack">
              {currentLines.length === 0 && (
                <div className="panel pos-ticket-lines-empty">
                  <strong>No line yet</strong>
                  <span className="muted">Add products or services from the catalog to start this sale.</span>
                </div>
              )}

              {activeSale ? (
                currentLines.map((line) => (
                  <div key={line.key} className="pos-service-card pos-service-card-compact">
                    <div className="pos-service-card-header">
                      <span className="pos-service-card-title">{line.name}</span>
                      <span className="pos-service-price">{gbp(line.lineTotal)} TTC</span>
                    </div>
                    <div className="pos-service-compact-meta">
                      <span>Qty {line.quantity}</span>
                      <span>{gbp(line.unitPrice)} HT</span>
                      <span>{line.taxRate}% VAT</span>
                      {line.discountAmount > 0 && <span>-{gbp(line.discountAmount)}</span>}
                    </div>
                  </div>
                ))
              ) : (
                draftLines.map((line, index) => (
                  <div key={`${line.name}-${index}`} className="pos-service-card pos-service-card-compact">
                    <div className="pos-service-card-header">
                      <span className="pos-service-card-title">{line.name}</span>
                      <button className="pos-trash-btn" onClick={() => removeDraftLine(index)}>x</button>
                    </div>
                    <div className="pos-service-control-strip">
                      <label className="pos-inline-field pos-inline-field-qty">
                        <span className="pos-inline-field-label">Qty</span>
                        <select value={line.quantity} onChange={(event) => updateDraftQuantity(index, Number(event.target.value))}>
                          {quantityChoicesForLine(line).map((qty) => <option key={qty} value={qty}>{qty}</option>)}
                        </select>
                      </label>
                      <label className="pos-inline-field pos-inline-field-discount">
                        <span className="pos-inline-field-label">Discount €</span>
                        <input
                          className="pos-line-discount-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.discountAmount ?? 0}
                          onChange={(event) => updateDraftDiscount(index, Number(event.target.value))}
                          placeholder="0.00"
                        />
                      </label>
                    </div>
                    <div className="pos-service-compact-meta">
                      <span>Unit {gbp(line.unitPrice)} HT</span>
                      <span>Discount {gbp(line.discountAmount ?? 0)}</span>
                      <span>Tax {line.taxRate ?? 0}%</span>
                      <strong className="pos-service-compact-total">
                        {gbp(priceInclTax(Math.max(0, (line.unitPrice * line.quantity) - (line.discountAmount ?? 0)), line.taxRate ?? 0))} TTC
                      </strong>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pos-field-group">
              <div className="pos-field-label">Global Discount (%)</div>
              <div className="pos-discount-row">
                <div className="pos-unit-badge">%</div>
                <input value={discountPct} onChange={(event) => setDiscountPct(event.target.value)} placeholder="0" disabled={Boolean(activeSale)} />
              </div>
              <span className="muted pos-field-help">Applied to the total incl. VAT before payment.</span>
            </div>

            <div className="pos-field-group">
              <div className="pos-field-label">Payment method</div>
              <select data-testid="pos-payment-method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'cash' | 'card')} disabled={!activeSale || activeSale.status === 'completed'}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>

            <div className="pos-field-group">
              <div className="pos-field-label">Payment reference</div>
              <input
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="Optional terminal or transaction reference"
                disabled={!activeSale || activeSale.status === 'completed'}
              />
            </div>

            <div className="pos-summary-list">
              <div className="pos-subs-row"><div className="pos-subs-label">Discount</div><div className="pos-link-btn">{gbp(displayDiscountTotal)}</div></div>
              <div className="pos-subs-row"><div className="pos-subs-label">Tax total €</div><div className="pos-link-btn">{gbp(displayTaxTotal)}</div></div>
              <div className="pos-subs-row"><div className="pos-subs-label">Subtotal HT</div><div className="pos-link-btn">{gbp(displaySubTotal)}</div></div>
            </div>

            <div className="pos-net-pay">Total TTC<strong>{displayTotal}</strong></div>

            {latestPayment && (
              <div className="panel pos-payment-latest">
                <div className="pos-field-label">Latest payment</div>
                <div className="muted">{paymentMethodLabel(latestPayment.method)} - {gbp(latestPayment.amount)}</div>
                <div className="muted">{new Date(latestPayment.paidAt).toLocaleString('en-GB')}</div>
                {latestPayment.externalRef && <div className="muted">Reference: {latestPayment.externalRef}</div>}
              </div>
            )}

            <button data-testid="pos-pay" onClick={handlePay} disabled={!activeSale || activeSale.status === 'completed'}>Charge sale</button>
          </div>

          {activeSale?.status === 'completed' && (
            <div className="panel pos-receipt-card pos-receipt-print-only">
              <div className="pos-field-label">Sales receipt</div>
              <div className="pos-receipt-head">
                <div>
                  <strong>{activeSale.receiptNumber ?? `Ticket #${activeSale.id}`}</strong>
                  <div className="muted">{activeCreatedAt}</div>
                </div>
                <button className="btn-xs pos-receipt-print-btn" type="button" onClick={printReceipt}>Print</button>
              </div>
              <div className="pos-receipt-meta">
                <span>Customer: {activeSale.customer?.fullName ?? 'Walk-in customer'}</span>
                <span>Seller: {sellerLabel(activeSale)}</span>
                {activeSale.store && <span>Store: {activeSale.store.name}</span>}
                <span>Payment: {latestPayment ? paymentMethodLabel(latestPayment.method) : 'Pending'}</span>
              </div>
              <div className="pos-receipt-lines">
                {activeSale.items.map((item) => (
                  <div key={item.id} className="pos-receipt-line">
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.itemType} · Qty {item.quantity} · Tax {item.taxRate}%</span>
                    </div>
                    <div className="pos-receipt-line-totals">
                      {item.discountAmount > 0 && <span>-{gbp(item.discountAmount)}</span>}
                      <strong>{gbp(item.lineTotal)}</strong>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pos-receipt-summary">
                <span>Subtotal HT</span><strong>{gbp(activeSale.subTotal)}</strong>
                <span>Discount</span><strong>{gbp(activeSale.discountTotal)}</strong>
                <span>Tax total €</span><strong>{gbp(activeSale.taxTotal)}</strong>
                <span>Total TTC</span><strong>{gbp(activeSale.total)}</strong>
              </div>
              {activeSale.loyalty && (
                <div className="panel">
                  <div className="pos-field-label">Loyalty on receipt</div>
                  <div className="muted">Points earned: {activeSale.loyalty.pointsEarned}</div>
                  <div className="muted">Points balance: {activeSale.loyalty.pointsBalance}</div>
                  {activeSale.loyalty.subscriptionName && <div className="muted">Subscription: {activeSale.loyalty.subscriptionName}</div>}
                  {activeSale.loyalty.visitCardName && (
                    <div className="muted">
                      Visit card: {activeSale.loyalty.visitCardName} ({activeSale.loyalty.visitCardUsed}/{activeSale.loyalty.visitCardTarget ?? 0})
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
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

