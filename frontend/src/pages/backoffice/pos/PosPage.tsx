import { useEffect, useMemo, useState } from 'react';
import { listProducts, listServices } from '../../../api/stock';
import {
  createSale,
  getCustomerSales,
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
};

function gbp(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
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

function computeDraftTotals(lines: DraftLine[], globalDiscount: number) {
  const subTotal = lines.reduce((sum, line) => sum + (line.unitPrice * line.quantity), 0);
  const lineDiscounts = lines.reduce((sum, line) => sum + (line.discountAmount ?? 0), 0);
  const effectiveDiscount = Math.max(0, lineDiscounts + globalDiscount);
  const discountedBase = Math.max(0, subTotal - effectiveDiscount);
  const taxTotal = lines.reduce((sum, line) => {
    const base = Math.max(0, (line.unitPrice * line.quantity) - (line.discountAmount ?? 0));
    return sum + (base * ((line.taxRate ?? 0) / 100));
  }, 0);

  return {
    subTotal,
    discountTotal: effectiveDiscount,
    taxTotal,
    total: discountedBase + taxTotal,
  };
}

export function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [activeSale, setActiveSale] = useState<Sale | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomerSearchResult | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentReference, setPaymentReference] = useState('');
  const [history, setHistory] = useState<Sale[]>([]);
  const [suspendedSales, setSuspendedSales] = useState<Sale[]>([]);
  const [customerResults, setCustomerResults] = useState<PosCustomerSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'progress' | 'issued'>('progress');
  const [showAudit, setShowAudit] = useState(true);
  const [discountPct, setDiscountPct] = useState('0');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ page: '1', perPage: '50', active: 'true' });
    listProducts(params).then((response) => setProducts(response.data)).catch((err) => setError((err as Error).message));
    listServices(params).then((response) => setServices(response.data)).catch((err) => setError((err as Error).message));
  }, []);

  useEffect(() => {
    getSuspendedSales().then((result) => setSuspendedSales(result.data)).catch((err) => setError((err as Error).message));
  }, []);

  useEffect(() => {
    if (!selectedCustomer) {
      setHistory([]);
      return;
    }

    const timeout = setTimeout(() => {
      refreshHistory(selectedCustomer.id).catch((err) => setError((err as Error).message));
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
  const discountAmount = draftLines.length === 0
    ? 0
    : computeDraftTotals(draftLines, 0).subTotal * (Math.max(0, Number(discountPct) || 0) / 100);
  const draftTotals = computeDraftTotals(draftLines, discountAmount);

  const searchableCatalog = useMemo<CatalogEntry[]>(() => {
    const entries = [
      ...products.map((product) => ({
        id: product.id,
        type: 'product' as const,
        name: product.name,
        price: product.price,
        stock: product.stock,
        isAvailable: product.stock > 0 && product.isActive,
      })),
      ...services.map((service) => ({
        id: service.id,
        type: 'service' as const,
        name: service.name,
        price: service.price,
        stock: null,
        isAvailable: service.isActive,
      })),
    ];

    return entries.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  }, [products, services, search]);

  const currentLines = activeSale
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
        lineTotal: Math.max(0, (item.unitPrice * item.quantity) - (item.discountAmount ?? 0)),
      }));

  const displayClient = activeSale?.customer?.fullName
    ?? selectedCustomer?.fullName
    ?? 'Walk-in customer';
  const displayTotal = gbp(activeSale ? Number(activeSale.total) : draftTotals.total);
  const displaySubTotal = activeSale ? Number(activeSale.subTotal) : draftTotals.subTotal;
  const displayTaxTotal = activeSale ? Number(activeSale.taxTotal) : draftTotals.taxTotal;
  const displayDiscountTotal = activeSale ? Number(activeSale.discountTotal) : draftTotals.discountTotal;
  const activeStatus = activeSale ? `${activeSale.status} / ${activeSale.paymentStatus}` : 'draft / pending';
  const latestPayment = activeSale?.payments?.[activeSale.payments.length - 1] ?? null;
  const activeCreatedAt = activeSale ? new Date(activeSale.createdAt).toLocaleString('en-GB') : null;
  const issuedSales = history.filter((sale) => sale.status === 'completed' || sale.paymentStatus === 'paid');
  const leftColumnSales = activeTab === 'progress' ? suspendedSales : issuedSales;
  const auditEvents = currentLines.slice(-3).map((line, index) => `${index + 1}. ${line.name} added to the ticket`);

  async function refreshHistory(customerId: number) {
    const response = await getCustomerSales(customerId, 1, 20);
    setHistory(response.data);
  }

  async function refreshSuspendedSales() {
    const result = await getSuspendedSales();
    setSuspendedSales(result.data);
  }

  function addToDraft(itemType: 'product' | 'service', itemId: number) {
    const source = itemType === 'product'
      ? products.find((product) => product.id === itemId)
      : services.find((service) => service.id === itemId);

    if (!source) {
      return;
    }

    setDraftLines((prev) => [
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
    ]);
  }

  function removeDraftLine(index: number) {
    setDraftLines((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  function updateDraftQuantity(index: number, quantity: number) {
    setDraftLines((prev) => prev.map((line, currentIndex) => (
      currentIndex === index ? { ...line, quantity: Math.max(1, quantity) } : line
    )));
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
        items: draftLines.map(({ name, unitPrice, ...line }) => line),
        globalDiscount: discountAmount,
      });
      setActiveSale(sale);
      setPaymentAmount(String(sale.total));
      setPaymentReference('');
      setShowAudit(true);
      setMessage('The ticket has been created successfully.');
      await refreshSuspendedSales();
      if (numericCustomerId) {
        await refreshHistory(numericCustomerId);
      }
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
      if (sale.customer?.id) {
        await refreshHistory(sale.customer.id);
      }
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
      if (sale.customer?.id) {
        await refreshHistory(sale.customer.id);
      }
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
        amount: Number(paymentAmount),
        externalRef: paymentReference.trim() || undefined,
      });
      const receipt = await getSaleReceipt(paid.id);
      setActiveSale(receipt.receipt);
      setDraftLines([]);
      setActiveTab('issued');
      setMessage('The sale has been charged and the receipt is now available.');
      await refreshSuspendedSales();
      if (receipt.receipt.customer?.id) {
        await refreshHistory(receipt.receipt.customer.id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function startNewDraft() {
    setActiveSale(null);
    setDraftLines([]);
    setDiscountPct('0');
    setPaymentAmount('0');
    setPaymentReference('');
    setShowAudit(true);
    setError(null);
    setMessage(null);
    setInfo('A new draft ticket is ready.');
  }

  function clearCustomerSelection() {
    setCustomerQuery('');
    setSelectedCustomer(null);
    setCustomerResults([]);
    setHistory([]);
    setInfo('The ticket is now set as walk-in customer.');
  }

  function selectCustomer(result: PosCustomerSearchResult) {
    setCustomerQuery(result.fullName);
    setSelectedCustomer(result);
    setCustomerResults([]);
  }

  function openSale(sale: Sale) {
    setActiveSale(sale);
    setPaymentAmount(String(sale.total));
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
      <div className="pos-layout">
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
              placeholder="Customer ID, name or email"
            />
            <button
              className="round-btn"
              data-testid="pos-refresh-history"
              onClick={() => {
                if (selectedCustomer) {
                  refreshHistory(selectedCustomer.id).catch((err) => setError((err as Error).message));
                }
              }}
            >
              +
            </button>
          </div>

          <div className="row">
            <button className="btn-ghost btn-xs" type="button" onClick={clearCustomerSelection}>Walk-in</button>
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

          <ul data-testid="pos-history" className="pos-history-list">
            {leftColumnSales.length === 0 && (
              <li className="muted">
                {activeTab === 'progress' ? 'No suspended sales.' : 'No issued receipts for this customer.'}
              </li>
            )}
            {leftColumnSales.map((sale) => (
              <li key={sale.id}>
                <div className={`pos-history-item${activeSale?.id === sale.id ? ' is-active' : ''}`} onClick={() => openSale(sale)}>
                  <div className="phi-name">{sale.receiptNumber ?? `Ticket #${sale.id}`}</div>
                  <div className="phi-meta">
                    {(sale.customer?.fullName ?? 'Walk-in customer')}
                    {' - '}
                    {gbp(Number(sale.total))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="pos-center">
          <div className="pos-client-header">
            <button className="danger-link" onClick={startNewDraft}>NEW</button>
            <h2 className="pos-client-name">{displayClient}</h2>
            <button className="icon-circle-btn" title="Sale details">i</button>
            <button className="outline-btn">Real sale data</button>
          </div>

          <div className="pos-badges">
            <span className="pos-badge">{currentLines.length} line(s)</span>
            <span className="pos-badge">{activeStatus}</span>
            {activeSale?.receiptNumber && <span className="pos-badge">{activeSale.receiptNumber}</span>}
          </div>

          <div className="pos-section-title">Ticket lines</div>

          {showAudit && (
            <div className="pos-audit-card">
              <button className="pos-audit-dismiss" onClick={() => setShowAudit(false)}>x</button>
              {auditEvents.length === 0 && <div className="muted">No recent ticket events.</div>}
              {auditEvents.map((event) => <div className="pos-audit-event" key={event}><div className="pos-audit-dot" />{event}</div>)}
            </div>
          )}

          {activeSale ? (
            currentLines.map((line) => (
              <div key={line.key} className="pos-service-card">
                <div className="pos-service-card-header">
                  <span className="pos-service-card-title">{line.name}</span>
                  <span className="muted">Qty {line.quantity}</span>
                </div>
                <div className="pos-service-employee-row">
                  <span className="pos-service-employee-label">TAX</span>
                  <div className="pos-service-price">{line.taxRate}%</div>
                  <div className="pos-service-price">{gbp(line.lineTotal)}</div>
                </div>
                <div className="pos-service-promo">
                  Unit price <strong>{gbp(line.unitPrice)}</strong> · Discount <strong>{gbp(line.discountAmount)}</strong>
                </div>
              </div>
            ))
          ) : (
            draftLines.map((line, index) => (
              <div key={`${line.name}-${index}`} className="pos-service-card">
                <div className="pos-service-card-header">
                  <span className="pos-service-card-title">{line.name}</span>
                  <button className="pos-trash-btn" onClick={() => removeDraftLine(index)}>x</button>
                </div>
                <div className="pos-service-employee-row">
                  <span className="pos-service-employee-label">QTY</span>
                  <select value={line.quantity} onChange={(event) => updateDraftQuantity(index, Number(event.target.value))}>
                    {[1, 2, 3, 4, 5].map((qty) => <option key={qty} value={qty}>{qty}</option>)}
                  </select>
                  <span className="pos-service-employee-label">DISC.</span>
                  <input
                    className="pos-line-discount-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.discountAmount ?? 0}
                    onChange={(event) => updateDraftDiscount(index, Number(event.target.value))}
                    placeholder="0.00"
                  />
                  <div className="pos-service-price">{gbp(Math.max(0, (line.unitPrice * line.quantity) - (line.discountAmount ?? 0)))}</div>
                </div>
                <div className="pos-service-promo">
                  Unit price <strong>{gbp(line.unitPrice)}</strong> · Tax <strong>{line.taxRate ?? 0}%</strong>
                </div>
              </div>
            ))
          )}

          <div className="pos-service-panel">
            <h3 data-testid="pos-cart-count">Catalog</h3>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products or services" />
            <div className="pill-list">
              {searchableCatalog.slice(0, 12).map((item) => (
                <button
                  data-testid={`pos-add-${item.type}-${item.id}`}
                  key={`${item.type}-${item.id}`}
                  onClick={() => addToDraft(item.type, item.id)}
                  disabled={Boolean(activeSale) || !item.isAvailable}
                  title={!item.isAvailable ? 'Out of stock' : undefined}
                >
                  {item.name}
                  {item.type === 'product' && item.stock !== null ? ` (${item.stock})` : ''}
                </button>
              ))}
            </div>
          </div>

          <button
            className="pos-add-service-btn"
            data-testid="pos-create-ticket"
            onClick={createTicket}
            disabled={draftLines.length === 0 || Boolean(activeSale)}
          >
            Create ticket
          </button>

          {activeSale && (
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
                <button className="btn-soft" data-testid="pos-suspend" onClick={handleSuspend} disabled={activeSale.status === 'suspended' || activeSale.status === 'completed'}>Suspend</button>
                <button className="btn-soft" data-testid="pos-resume" onClick={handleResume} disabled={activeSale.status !== 'suspended'}>Resume</button>
                {activeSale.status === 'completed' && (
                  <button className="btn-soft" type="button" onClick={printReceipt}>Print receipt</button>
                )}
              </div>
            </div>
          )}

          <div className="stack">
            {message && <InlineNotification tone="success" title="Done" message={message} />}
            {info && <InlineNotification tone="info" title="Information" message={info} />}
            {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
          </div>
        </section>

        <aside className="pos-right">
          <div className="pos-right-header">Totals</div>
          <div className="pos-total-block"><div className="pos-total-label">Subtotal</div><div className="pos-total-amount">{gbp(displaySubTotal)}</div></div>

          <div>
            <div className="pos-subs-row"><div className="pos-subs-label">Discount</div><div className="pos-link-btn">{gbp(displayDiscountTotal)}</div></div>
          </div>

          <div>
            <div className="pos-field-label">Global Discount (%)</div>
            <div className="pos-discount-row">
              <div className="pos-unit-badge">%</div>
              <input value={discountPct} onChange={(event) => setDiscountPct(event.target.value)} placeholder="0" disabled={Boolean(activeSale)} />
            </div>
          </div>

          <div>
            <div className="pos-field-label">Tax</div>
            <input value={displayTaxTotal.toFixed(2)} readOnly />
          </div>

          <div>
            <div className="pos-field-label">Amount to charge</div>
            <input
              data-testid="pos-payment-amount"
              value={paymentAmount || String(activeSale?.total ?? draftTotals.total.toFixed(2))}
              onChange={(event) => setPaymentAmount(event.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <div className="pos-field-label">Payment method</div>
            <select data-testid="pos-payment-method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'cash' | 'card')}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
            </select>
          </div>

          <div>
            <div className="pos-field-label">Payment reference</div>
            <input
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              placeholder="Optional terminal or transaction reference"
              disabled={!activeSale || activeSale.status === 'completed'}
            />
          </div>

          <div className="pos-net-pay">Net to pay<strong>{displayTotal}</strong></div>

          {latestPayment && (
            <div className="panel">
              <div className="pos-field-label">Latest payment</div>
              <div className="muted">{paymentMethodLabel(latestPayment.method)} - {gbp(latestPayment.amount)}</div>
              <div className="muted">{new Date(latestPayment.paidAt).toLocaleString('en-GB')}</div>
              {latestPayment.externalRef && <div className="muted">Reference: {latestPayment.externalRef}</div>}
            </div>
          )}

          <button data-testid="pos-pay" onClick={handlePay} disabled={!activeSale || activeSale.status === 'completed'}>Charge sale</button>

          {activeSale?.status === 'completed' && (
            <div className="panel pos-receipt-card">
              <div className="pos-field-label">Sales receipt</div>
              <div className="pos-receipt-head">
                <div>
                  <strong>{activeSale.receiptNumber ?? `Ticket #${activeSale.id}`}</strong>
                  <div className="muted">{activeCreatedAt}</div>
                </div>
                <button className="btn-soft btn-xs" type="button" onClick={printReceipt}>Print</button>
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
                <span>Subtotal</span><strong>{gbp(activeSale.subTotal)}</strong>
                <span>Discount</span><strong>{gbp(activeSale.discountTotal)}</strong>
                <span>Tax</span><strong>{gbp(activeSale.taxTotal)}</strong>
                <span>Total</span><strong>{gbp(activeSale.total)}</strong>
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
    </div>
  );
}
