import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyOrders } from '../../api/ecommerce';
import type { Order } from '../../types/ecommerce';
import { InlineNotification } from '../../ui/InlineNotification';
import { downloadOrderPdf } from '../../utils/orderPdf';
import { formatDateOnly, formatDateTime, formatEuro, formatOrderStatus } from '../../utils/pricing';

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Order | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await listMyOrders(new URLSearchParams({ page: '1', perPage: '20' }));
        setOrders(result.data);
        setActive(result.data[0] ?? null);
      } catch (reason) {
        setError((reason as Error).message);
      }
    })();
  }, []);

  const counts = useMemo(() => ({
    total: orders.length,
    pickup: orders.filter((order) => order.pickupInStore).length,
    delivery: orders.filter((order) => !order.pickupInStore).length,
  }), [orders]);

  return (
    <div className="stack">
      <section className="panel ecommerce-hero-card">
        <div className="ecommerce-hero-head">
          <div>
            <span className="eyebrow">Orders</span>
            <h2 className="ecommerce-title">Track every order in one place</h2>
            <p className="muted">Open any order to view the recap, pickup or delivery details, and download the PDF summary again.</p>
          </div>
          <div className="orders-kpis">
            <Link to="/client/profile" className="cta-link cta-link-secondary">Back to profile</Link>
            <span>{counts.total} total</span>
            <span>{counts.delivery} delivery</span>
            <span>{counts.pickup} pickup</span>
          </div>
        </div>
      </section>

      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}

      {!error && orders.length === 0 && <div className="empty-state-card">You do not have any orders yet.</div>}

      {!error && orders.length > 0 && (
        <div className="orders-page-grid">
          <aside className="panel orders-list-panel">
            <div className="orders-list">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className={`orders-list-item ${active?.id === order.id ? 'is-active' : ''}`}
                  onClick={() => setActive(order)}
                >
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <span>
                      {formatDateOnly(order.createdAt)}
                      {order.appointmentBooking ? ' - Appointment order' : order.purchasedGiftVoucher ? ' - Gift voucher' : ''}
                    </span>
                  </div>
                  <div>
                    <strong>{formatEuro(order.total)}</strong>
                    <span>{formatOrderStatus(order.status)}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="panel orders-detail-panel">
            {!active && <div className="empty-state-card">Select an order to view its full recap.</div>}
            {active && (
              <div className="stack">
                <div className="orders-detail-head">
                  <div>
                    <span className="eyebrow">{formatOrderStatus(active.status)}</span>
                    <h3>{active.orderNumber}</h3>
                    <p className="muted">Placed on {formatDateTime(active.createdAt)}</p>
                  </div>
                  <div className="row">
                    <button type="button" className="planning-action-btn btn-ghost" onClick={() => downloadOrderPdf(active)}>
                      Download PDF
                    </button>
                    <Link to={`/client/orders/${active.orderNumber}`} className="cta-link cta-link-secondary">Open details</Link>
                  </div>
                </div>

                <div className="orders-summary-grid">
                  <div className="summary-tile">
                    <span>Subtotal (excl. VAT)</span>
                    <strong>{formatEuro(active.subTotal)}</strong>
                  </div>
                  <div className="summary-tile">
                    <span>VAT</span>
                    <strong>{formatEuro(active.taxTotal)}</strong>
                  </div>
                  <div className="summary-tile">
                    <span>Total (incl. VAT)</span>
                    <strong>{formatEuro(active.total)}</strong>
                  </div>
                  <div className="summary-tile">
                    <span>Fulfilment</span>
                    <strong>{active.appointmentBooking ? 'In-salon appointment' : active.pickupInStore ? 'Store pickup' : 'Delivery'}</strong>
                  </div>
                </div>

                {active.appointmentBooking && (
                  <div className="order-fulfilment-card panel">
                    <h4>Appointment booking</h4>
                    <p><strong>Schedule:</strong> {formatDateTime(active.appointmentBooking.startAt)}</p>
                    <p><strong>Employee:</strong> {active.appointmentBooking.employee.fullName}</p>
                    <p><strong>Services:</strong> {active.appointmentBooking.services.map((service) => `${service.serviceName} (${formatEuro(service.lineTotal)})`).join(', ')}</p>
                  </div>
                )}

                {active.purchasedGiftVoucher && (
                  <div className="order-fulfilment-card panel">
                    <h4>Gift voucher purchase</h4>
                    <p><strong>Code:</strong> {active.purchasedGiftVoucher.code}</p>
                    <p><strong>Recipient:</strong> {active.purchasedGiftVoucher.recipientName || 'Not specified'}</p>
                    <p><strong>Delivery email:</strong> {active.giftVoucherDeliveryEmail || 'Not specified'}</p>
                  </div>
                )}

                {!active.appointmentBooking && (
                <div className="order-fulfilment-card panel">
                  {active.pickupInStore ? (
                    <div className="stack">
                      <h4>Pickup details</h4>
                      <p><strong>Pickup slot:</strong> {formatDateTime(active.pickupSlot)}</p>
                      {active.pickupNote && <p><strong>Pickup note:</strong> {active.pickupNote}</p>}
                    </div>
                  ) : (
                    <div className="stack">
                      <h4>Delivery address</h4>
                      {active.deliveryAddress.line1 ? (
                        <>
                          <p>{active.deliveryAddress.fullName}</p>
                          <p>{active.deliveryAddress.line1}</p>
                          {active.deliveryAddress.line2 && <p>{active.deliveryAddress.line2}</p>}
                          <p>{[active.deliveryAddress.postalCode, active.deliveryAddress.city].filter(Boolean).join(' ')}</p>
                          <p>{active.deliveryAddress.country}</p>
                          {active.deliveryAddress.instructions && <p><strong>Delivery instructions:</strong> {active.deliveryAddress.instructions}</p>}
                        </>
                      ) : (
                        <p className="muted">No delivery address was stored on this order.</p>
                      )}
                    </div>
                  )}
                </div>
                )}

                <div className="orders-items-table panel">
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
                      {active.items.length === 0 && active.appointmentBooking && active.appointmentBooking.services.map((service) => (
                        <tr key={`appointment-service-${service.serviceId}`}>
                          <td>{service.serviceName}</td>
                          <td>{service.quantity}</td>
                          <td>{formatEuro(service.unitPrice)}</td>
                          <td>{formatEuro(service.lineTotal)}</td>
                        </tr>
                      ))}
                      {active.items.length === 0 && active.purchasedGiftVoucher && (
                        <tr>
                          <td>Gift voucher purchase</td>
                          <td>1</td>
                          <td>{formatEuro(active.subTotal)}</td>
                          <td>{formatEuro(active.total)}</td>
                        </tr>
                      )}
                      {active.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.productName}</td>
                          <td>{item.quantity}</td>
                          <td>{formatEuro(item.unitPrice)}</td>
                          <td>{formatEuro(item.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
