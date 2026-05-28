import type { DraftLine, CurrentLine } from './posDraft';
import { formatPosCurrency, paymentMethodLabel, priceInclTax, summarizeSaleDiscounts } from './posDraft';
import type { Sale } from '../../../types/pos';

type PosCheckoutPanelProps = {
  activeSale: Sale | null;
  currentLines: CurrentLine[];
  discountPct: string;
  displayDiscountTotal: number;
  displaySubTotal: number;
  displayTaxTotal: number;
  displayTotal: string;
  latestPayment: Sale['payments'][number] | null;
  draftLines: DraftLine[];
  paymentMethod: 'cash' | 'card';
  paymentReference: string;
  onDiscountPctChange: (value: string) => void;
  onDraftDiscountChange: (index: number, discountValue: number) => void;
  onDraftQuantityChange: (index: number, quantity: number) => void;
  onPay: () => void;
  onPaymentMethodChange: (value: 'cash' | 'card') => void;
  onPaymentReferenceChange: (value: string) => void;
  onPrintReceipt: () => void;
  onRemoveDraftLine: (index: number) => void;
  quantityChoicesForLine: (line: DraftLine) => number[];
  sellerLabel: (sale: Sale | null) => string;
  activeCreatedAt: string | null;
};

export function PosCheckoutPanel({
  activeSale,
  currentLines,
  discountPct,
  displayDiscountTotal,
  displaySubTotal,
  displayTaxTotal,
  displayTotal,
  latestPayment,
  draftLines,
  paymentMethod,
  paymentReference,
  onDiscountPctChange,
  onDraftDiscountChange,
  onDraftQuantityChange,
  onPay,
  onPaymentMethodChange,
  onPaymentReferenceChange,
  onPrintReceipt,
  onRemoveDraftLine,
  quantityChoicesForLine,
  sellerLabel,
  activeCreatedAt,
}: PosCheckoutPanelProps) {
  const completedSaleDiscountTotal = summarizeSaleDiscounts(activeSale).totalDiscountInclVat;
  const isFinalizedSale = activeSale?.status === 'completed' || activeSale?.status === 'cancelled';

  function formatReceiptItemType(itemType: 'product' | 'service'): string {
    return itemType === 'product' ? 'Product' : 'Service';
  }

  function formatReceiptStatus(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return (
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
                  <span className="pos-service-price">{formatPosCurrency(line.lineTotal)} TTC</span>
                </div>
                <div className="pos-service-compact-meta">
                  <span>Qty {line.quantity}</span>
                  <span>{formatPosCurrency(line.unitPrice)} HT</span>
                  <span>{line.taxRate}% VAT</span>
                  {line.discountAmount > 0 && <span>-{formatPosCurrency(line.discountAmount)}</span>}
                </div>
              </div>
            ))
          ) : (
            draftLines.map((line, index) => (
              <div key={`${line.name}-${index}`} className="pos-service-card pos-service-card-compact">
                <div className="pos-service-card-header">
                  <span className="pos-service-card-title">{line.name}</span>
                  <button className="pos-trash-btn" onClick={() => onRemoveDraftLine(index)}>x</button>
                </div>
                <div className="pos-service-control-strip">
                  <label className="pos-inline-field pos-inline-field-qty">
                    <span className="pos-inline-field-label">Qty</span>
                    <select value={line.quantity} onChange={(event) => onDraftQuantityChange(index, Number(event.target.value))}>
                      {quantityChoicesForLine(line).map((qty) => <option key={qty} value={qty}>{qty}</option>)}
                    </select>
                  </label>
                  <label className="pos-inline-field pos-inline-field-discount">
                    <span className="pos-inline-field-label">Discount</span>
                    <input
                      className="pos-line-discount-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.discountAmount ?? 0}
                      onChange={(event) => onDraftDiscountChange(index, Number(event.target.value))}
                      placeholder="0.00"
                    />
                  </label>
                </div>
                <div className="pos-service-compact-meta">
                  <span>Unit {formatPosCurrency(line.unitPrice)} HT</span>
                  <span>Discount {formatPosCurrency(line.discountAmount ?? 0)}</span>
                  <span>Tax {line.taxRate ?? 0}%</span>
                  <strong className="pos-service-compact-total">
                    {formatPosCurrency(Math.max(0, priceInclTax(line.unitPrice * line.quantity, line.taxRate ?? 0) - (line.discountAmount ?? 0)))} TTC
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
            <label className="sr-only" htmlFor="pos-global-discount">Global discount percentage</label>
            <input id="pos-global-discount" value={discountPct} onChange={(event) => onDiscountPctChange(event.target.value)} placeholder="0" disabled={Boolean(activeSale)} />
          </div>
          <span className="muted pos-field-help">Applied to the total incl. VAT before payment.</span>
        </div>

        <div className="pos-field-group">
          <div className="pos-field-label">Payment method</div>
          <select data-testid="pos-payment-method" value={paymentMethod} onChange={(event) => onPaymentMethodChange(event.target.value as 'cash' | 'card')} disabled={!activeSale || isFinalizedSale}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
        </div>

        <div className="pos-field-group">
          <div className="pos-field-label">Payment reference</div>
          <input
            value={paymentReference}
            onChange={(event) => onPaymentReferenceChange(event.target.value)}
            placeholder="TPE-4821-784512"
            disabled={!activeSale || isFinalizedSale}
          />
        </div>

        <div className="pos-summary-list">
          <div className="pos-subs-row"><div className="pos-subs-label">Discount</div><div className="pos-link-btn">{formatPosCurrency(displayDiscountTotal)}</div></div>
          <div className="pos-subs-row"><div className="pos-subs-label">Tax total</div><div className="pos-link-btn">{formatPosCurrency(displayTaxTotal)}</div></div>
          <div className="pos-subs-row"><div className="pos-subs-label">Subtotal HT</div><div className="pos-link-btn">{formatPosCurrency(displaySubTotal)}</div></div>
        </div>

        <div className="pos-net-pay">Total TTC<strong>{displayTotal}</strong></div>

        {latestPayment && (
          <div className="panel pos-payment-latest">
            <div className="pos-field-label">Latest payment</div>
            <div className="muted">{paymentMethodLabel(latestPayment.method)} - {formatPosCurrency(latestPayment.amount)}</div>
            <div className="muted">{new Date(latestPayment.paidAt).toLocaleString('en-GB')}</div>
            {latestPayment.externalRef && <div className="muted">Reference: {latestPayment.externalRef}</div>}
          </div>
        )}

        <button data-testid="pos-pay" onClick={onPay} disabled={!activeSale || isFinalizedSale}>Charge sale</button>
      </div>

      {isFinalizedSale && activeSale && (
        <div className="panel pos-receipt-card pos-receipt-print-only">
          <div className="pos-field-label">Sales receipt</div>
          <div className="pos-receipt-head">
            <div>
              <strong>{activeSale.receiptNumber ?? `Ticket #${activeSale.id}`}</strong>
              <div className="muted">{activeCreatedAt}</div>
            </div>
            <button className="btn-xs pos-receipt-print-btn" type="button" onClick={onPrintReceipt}>Print</button>
          </div>
          <div className="pos-receipt-meta">
            <span>Customer: {activeSale.customer?.fullName ?? 'Walk-in customer'}</span>
            <span>Seller: {sellerLabel(activeSale)}</span>
            {activeSale.store && <span>Store: {activeSale.store.name}</span>}
            <span>Status: {formatReceiptStatus(activeSale.status)}</span>
            <span>Payment: {latestPayment ? paymentMethodLabel(latestPayment.method) : 'Pending'}</span>
          </div>
          <div className="pos-receipt-lines">
            {activeSale.items.map((item) => (
              <div key={item.id} className="pos-receipt-line">
                <div>
                  <strong>{item.label}</strong>
                  <span>{formatReceiptItemType(item.itemType)} - Qty {item.quantity} - Tax {item.taxRate}%</span>
                </div>
                <div className="pos-receipt-line-totals">
                  {item.discountAmount > 0 && <span>-{formatPosCurrency(item.discountAmount)}</span>}
                  <strong>{formatPosCurrency(item.lineTotal)}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="pos-receipt-summary">
            <span>Subtotal HT</span><strong>{formatPosCurrency(activeSale.subTotal)}</strong>
            <span>Discount</span><strong>{formatPosCurrency(completedSaleDiscountTotal)}</strong>
            <span>Tax total</span><strong>{formatPosCurrency(activeSale.taxTotal)}</strong>
            <span>Total TTC</span><strong>{formatPosCurrency(activeSale.total)}</strong>
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
  );
}
