import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { getOrder } from '../../api/ecommerce';
import { OrderPaymentPanel } from '../../components/OrderPaymentPanel';
import type { Order } from '../../types/ecommerce';
import { InlineNotification } from '../../ui/InlineNotification';
import { downloadOrderPdf } from '../../utils/orderPdf';
import { formatDateTime, formatEuro, formatOrderStatus } from '../../utils/pricing';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadOrder() {
    if (!orderNumber) return;
    try {
      setOrder(await getOrder(orderNumber));
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  useEffect(() => {
    loadOrder().catch(() => undefined);
  }, [orderNumber]);

  return (
    <div className="stack">
      <section className="panel ecommerce-hero-card">
        <div className="ecommerce-hero-head">
          <div>
            <span className="eyebrow">Receipt</span>
            <h2 className="ecommerce-title">Order receipt and payment follow-up</h2>
            <p className="muted">Open the full receipt, verify fulfilment details and finish the payment if the order is still pending.</p>
          </div>
          <Link to="/client/profile" className="cta-link cta-link-secondary">Back to profile</Link>
        </div>
      </section>

      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
      {!order && !error && <div className="panel">Loading order details...</div>}

      {order && (
        <div className="stack">
          <section className="panel orders-detail-panel">
            <div className="orders-detail-head">
              <div>
                <span className="eyebrow">{formatOrderStatus(order.status)}</span>
                <h3>{order.orderNumber}</h3>
                <p className="muted">Created on {formatDateTime(order.createdAt)}</p>
              </div>
              <button type="button" className="planning-action-btn btn-ghost" onClick={() => downloadOrderPdf(order)}>
                Download receipt PDF
              </button>
            </div>

            <div className="orders-summary-grid">
              <div className="summary-tile">
                <span>Subtotal (excl. VAT)</span>
                <strong>{formatEuro(order.subTotal)}</strong>
              </div>
              <div className="summary-tile">
                <span>VAT</span>
                <strong>{formatEuro(order.taxTotal)}</strong>
              </div>
              {order.giftVoucher && order.giftVoucherAmount > 0 && (
                <div className="summary-tile">
                  <span>Gift voucher</span>
                  <strong>-{formatEuro(order.giftVoucherAmount)}</strong>
                </div>
              )}
              <div className="summary-tile">
                <span>Total (incl. VAT)</span>
                <strong>{formatEuro(order.total)}</strong>
              </div>
              <div className="summary-tile">
                <span>Fulfilment</span>
                <strong>{order.pickupInStore ? 'Store pickup' : 'Delivery'}</strong>
              </div>
            </div>
          </section>

          <section className="panel order-fulfilment-card">
            {order.pickupInStore ? (
              <div className="stack">
                <h4>Pickup details</h4>
                <p><strong>Pickup slot:</strong> {formatDateTime(order.pickupSlot)}</p>
                {order.pickupNote && <p><strong>Pickup note:</strong> {order.pickupNote}</p>}
              </div>
            ) : (
              <div className="stack">
                <h4>Delivery address</h4>
                {order.deliveryAddress.line1 ? (
                  <>
                    <p>{order.deliveryAddress.fullName}</p>
                    <p>{order.deliveryAddress.line1}</p>
                    {order.deliveryAddress.line2 && <p>{order.deliveryAddress.line2}</p>}
                    <p>{[order.deliveryAddress.postalCode, order.deliveryAddress.city].filter(Boolean).join(' ')}</p>
                    <p>{order.deliveryAddress.country}</p>
                    {order.deliveryAddress.instructions && <p><strong>Delivery instructions:</strong> {order.deliveryAddress.instructions}</p>}
                  </>
                ) : (
                  <p className="muted">No delivery address was stored on this order.</p>
                )}
              </div>
            )}
          </section>

          {order.giftVoucher && (
            <section className="panel order-fulfilment-card">
              <div className="stack">
                <h4>Gift voucher used</h4>
                <p><strong>Code:</strong> {order.giftVoucher.code}</p>
                <p><strong>Applied amount:</strong> {formatEuro(order.giftVoucherAmount)}</p>
                <p><strong>Remaining balance:</strong> {formatEuro(order.giftVoucher.balanceAmount)}</p>
              </div>
            </section>
          )}

          <section className="panel orders-items-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit price (excl. VAT)</th>
                  <th>Line total (incl. VAT)</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>{formatEuro(item.unitPrice)}</td>
                    <td>{formatEuro(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {(order.status === 'pending' || order.status === 'failed') && (
            order.stockStillAvailable ? (
              stripePromise && order.paymentClientSecret ? (
                <Elements stripe={stripePromise}>
                  <OrderPaymentPanel
                    order={order}
                    clientSecret={order.paymentClientSecret}
                    buttonLabel="Pay pending order"
                    helperText="Your products are still available. You can safely complete the payment now."
                    onPaymentSucceeded={loadOrder}
                  />
                </Elements>
              ) : (
                <InlineNotification tone="error" title="Action unavailable" message="The payment configuration is incomplete for this pending order." />
              )
            ) : (
              <InlineNotification tone="error" title="Action unavailable" message="Some products are no longer available in the requested quantity. Please contact the salon before trying again." />
            )
          )}
        </div>
      )}
    </div>
  );
}
