import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { activateMyGiftVoucher, applyCartGiftVoucher, cancelReservation, getCart, listMyGiftVouchers, listMyReservations, removeCartGiftVoucher, removeCartItem, updateCartItem } from '../../api/ecommerce';
import type { CartState, GiftVoucherSummary, ProductReservation } from '../../types/ecommerce';
import { InlineNotification } from '../../ui/InlineNotification';
import { formatEuro } from '../../utils/pricing';

export function CartPage() {
  const location = useLocation();
  const [cart, setCart] = useState<CartState | null>(null);
  const [reservations, setReservations] = useState<ProductReservation[]>([]);
  const [giftVouchers, setGiftVouchers] = useState<GiftVoucherSummary[]>([]);
  const [giftVoucherCode, setGiftVoucherCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>((location.state as { infoMessage?: string } | null)?.infoMessage ?? null);

  async function refresh() {
    setError(null);
    try {
      const [cartState, reservationState, voucherState] = await Promise.all([getCart(), listMyReservations(), listMyGiftVouchers()]);
      setCart(cartState);
      setReservations(reservationState.data.filter((item) => item.status === 'active'));
      setGiftVouchers(voucherState.data);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function applyGiftVoucherToCart(code: string) {
    setError(null);
    setMessage(null);
    try {
      setCart(await applyCartGiftVoucher({ code }));
      setMessage('The gift voucher has been applied to your cart.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function removeAppliedGiftVoucherFromCart() {
    setError(null);
    setMessage(null);
    try {
      setCart(await removeCartGiftVoucher());
      setMessage('The applied gift voucher has been removed from your cart.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  useEffect(() => {
    refresh().catch((reason) => setError((reason as Error).message));
  }, []);

  async function changeQuantity(productId: number, quantity: number) {
    setError(null);
    setMessage(null);
    try {
      setCart(await updateCartItem(productId, quantity));
      setMessage('Your cart has been updated.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function remove(productId: number) {
    setError(null);
    setMessage(null);
    try {
      setCart(await removeCartItem(productId));
      setMessage('The product has been removed from your cart.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function cancelActiveReservation(reservationId: number) {
    setError(null);
    setMessage(null);
    try {
      await cancelReservation(reservationId);
      await refresh();
      setMessage('The reservation has been cancelled.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function activateGiftVoucher() {
    setError(null);
    setMessage(null);
    try {
      await activateMyGiftVoucher({ code: giftVoucherCode.trim() });
      await refresh();
      setGiftVoucherCode('');
      setMessage('The gift voucher has been activated on your account.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const lineCount = useMemo(() => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0, [cart]);

  return (
    <div className="stack">
      <section className="panel ecommerce-hero-card">
        <div className="ecommerce-hero-head">
          <div>
            <span className="eyebrow">Cart</span>
            <h2 className="ecommerce-title">Review your basket</h2>
            <p className="muted">Keep only the products you want to pay for, apply one gift voucher if needed and monitor your active pickup reservations.</p>
          </div>
          <span className="catalog-count-pill">{lineCount} item{lineCount > 1 ? 's' : ''}</span>
        </div>
      </section>

      {message && <InlineNotification tone="success" title="Saved" message={message} />}
      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
      {!cart && !error && <div className="panel">Loading your cart...</div>}

      {cart && (
        <div className="cart-page-grid">
          <section className="panel cart-lines-panel">
            <div className="cart-section-head">
              <div>
                <h3>Cart lines</h3>
                <p className="muted">Adjust quantities or remove a product before moving on to payment.</p>
              </div>
            </div>

            {cart.items.length === 0 ? (
              <div className="empty-state-card">Your cart is empty for now.</div>
            ) : (
              <div className="cart-line-list">
                {cart.items.map((item) => (
                  <article key={item.productId} className="cart-line-card">
                    <div className="cart-line-copy">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.sku}</p>
                      </div>
                      <button type="button" className="btn-ghost btn-xs" onClick={() => remove(item.productId)}>
                        Remove
                      </button>
                    </div>

                    <div className="cart-line-controls">
                      <div className="form-field">
                        <label htmlFor={`quantity-${item.productId}`}>Quantity</label>
                        <input
                          id={`quantity-${item.productId}`}
                          value={item.quantity}
                          onChange={(event) => changeQuantity(item.productId, Number(event.target.value))}
                          type="number"
                          min={0}
                        />
                      </div>

                      <div className="cart-line-price">
                        <span>Excl. VAT</span>
                        <strong>{formatEuro(item.unitPrice)}</strong>
                      </div>

                      <div className="cart-line-price">
                        <span>Line total incl. VAT</span>
                        <strong>{formatEuro(item.lineTotal)}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="cart-reservations-block">
              <div className="cart-section-head">
                <div>
                  <h3>Gift vouchers</h3>
                  <p className="muted">Enter the code of a gift card created by the salon team to activate it on your account.</p>
                </div>
              </div>

              <div className="checkout-fulfilment-grid">
                <div className="form-field grow">
                  <label htmlFor="gift-voucher-code">Gift voucher code</label>
                  <input id="gift-voucher-code" placeholder="Example: GV-12AB34CD" value={giftVoucherCode} onChange={(event) => setGiftVoucherCode(event.target.value.toUpperCase())} />
                </div>
                <div className="form-field form-field-full">
                  <button type="button" className="planning-action-btn planning-action-btn-primary" onClick={activateGiftVoucher}>
                    Activate gift voucher
                  </button>
                </div>
              </div>

              {giftVouchers.length === 0 ? (
                <div className="empty-state-card">No gift vouchers are linked to your account yet.</div>
              ) : (
                <div className="cart-reservation-list">
                  {giftVouchers.map((voucher) => (
                    <article key={voucher.id} className="cart-reservation-card">
                      <div>
                        <strong>{voucher.code}</strong>
                        <span>
                          {voucher.recipientName ? `${voucher.recipientName} · ` : ''}
                          {voucher.serviceLabel ? `${voucher.serviceLabel} · ` : ''}
                          {formatEuro(voucher.balanceAmount)} available
                          {voucher.effectiveAt ? ` · Starts ${new Date(voucher.effectiveAt).toLocaleDateString('en-GB')}` : ''}
                          {voucher.expiresAt ? ` · Expires ${new Date(voucher.expiresAt).toLocaleDateString('en-GB')}` : ''}
                        </span>
                      </div>
                      <div className="cart-voucher-actions">
                        {cart?.appliedGiftVoucher?.id === voucher.id ? (
                          <>
                            <span className="status-badge active">Applied to cart</span>
                            <button type="button" className="btn-ghost btn-xs" onClick={removeAppliedGiftVoucherFromCart}>
                              Remove from cart
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost btn-xs"
                            onClick={() => applyGiftVoucherToCart(voucher.code)}
                            disabled={voucher.status !== 'active' || voucher.balanceAmount <= 0 || (cart?.appliedGiftVoucher !== null && cart?.appliedGiftVoucher.id !== voucher.id)}
                          >
                            Apply to cart
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="cart-reservations-block">
              <div className="cart-section-head">
                <div>
                  <h3>Active reservations</h3>
                  <p className="muted">Reserved products stay visible here until pickup or cancellation.</p>
                </div>
              </div>

              {reservations.length === 0 ? (
                <div className="empty-state-card">You do not have any active reservations.</div>
              ) : (
                <div className="cart-reservation-list">
                  {reservations.map((reservation) => (
                    <article key={reservation.id} className="cart-reservation-card">
                      <div>
                        <strong>{reservation.productName}</strong>
                        <span>Reserved until {new Date(reservation.expiresAt).toLocaleString('en-GB')}</span>
                      </div>
                      <button type="button" className="btn-ghost btn-xs" onClick={() => cancelActiveReservation(reservation.id)}>
                        Cancel reservation
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="panel cart-summary-panel">
            <h3>Order summary</h3>
            <div className="cart-summary-list">
              <div>
                <span>Subtotal (excl. VAT)</span>
                <strong>{formatEuro(cart.totals.subTotal)}</strong>
              </div>
              <div>
                <span>VAT</span>
                <strong>{formatEuro(cart.totals.taxTotal)}</strong>
              </div>
              {cart.appliedGiftVoucher && cart.totals.giftVoucherDiscount > 0 && (
                <div>
                  <span>Gift voucher</span>
                  <strong>-{formatEuro(cart.totals.giftVoucherDiscount)}</strong>
                </div>
              )}
              <div>
                <span>Total (incl. VAT)</span>
                <strong>{formatEuro(cart.totals.total)}</strong>
              </div>
              <div>
                <span>Amount due</span>
                <strong>{formatEuro(cart.totals.payableTotal)}</strong>
              </div>
            </div>

            <div className="cart-summary-actions">
              <Link to="/client/catalog" className="cta-link cta-link-secondary">Continue shopping</Link>
              <Link to="/client/checkout" className="cta-link cta-link-primary">Proceed to payment</Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
