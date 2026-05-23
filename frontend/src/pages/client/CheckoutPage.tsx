import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CardCvcElement, CardExpiryElement, CardNumberElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { checkout, getCart, getMyLoyalty, listPickupHours } from '../../api/ecommerce';
import { listPublicStores } from '../../api/stores';
import { updateCurrentUserPreferences } from '../../auth/auth';
import { useCurrentUser } from '../../auth/useCurrentUser';
import { OrderPaymentPanel } from '../../components/OrderPaymentPanel';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import type { CartState, Order, PickupHour } from '../../types/ecommerce';
import { InlineNotification } from '../../ui/InlineNotification';
import { downloadOrderPdf } from '../../utils/orderPdf';
import { formatDateOnly, formatEuro } from '../../utils/pricing';

type CheckoutResult = {
  order: Order;
  clientSecret: string;
  paymentConfirmed: boolean;
};

type DeliveryAddressForm = {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  country: string;
  instructions: string;
};

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOfWeekFromIso(dateIso: string): number {
  const date = new Date(`${dateIso}T12:00:00`);
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function slotDateTime(dateIso: string, timeValue: string): string {
  return `${dateIso}T${timeValue}:00`;
}

function buildPickupSlots(hours: PickupHour[], dateIso: string): string[] {
  const dayConfig = hours.find((entry) => entry.dayOfWeek === dayOfWeekFromIso(dateIso));
  if (!dayConfig || !dayConfig.isOpen) {
    return [];
  }

  const [startHour, startMinute] = dayConfig.startTime.split(':').map(Number);
  const [endHour, endMinute] = dayConfig.endTime.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const now = new Date();
  const selectedDate = new Date(`${dateIso}T00:00:00`);
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const minimumMinute = isToday ? now.getHours() * 60 + now.getMinutes() + 30 : start;
  const slots: string[] = [];

  for (let cursor = start; cursor + 30 <= end; cursor += 30) {
    if (cursor < minimumMinute) {
      continue;
    }

    const hour = String(Math.floor(cursor / 60)).padStart(2, '0');
    const minute = String(cursor % 60).padStart(2, '0');
    slots.push(`${hour}:${minute}`);
  }

  return slots;
}

function toFriendlyStripeError(raw?: string): string {
  if (!raw) return 'The payment was declined. Please check your card details and try again.';

  const value = raw.toLowerCase();
  if (value.includes('invalid api key')) return 'The payment configuration is invalid. Please contact support.';
  if (value.includes('insufficient funds')) return 'Payment declined because the card has insufficient funds.';
  if (value.includes('expired')) return 'The card has expired. Please use another card.';
  if (value.includes('incorrect cvc')) return 'The security code is incorrect.';
  if (value.includes('card number is incorrect')) return 'The card number is invalid.';
  if (value.includes('requires_action')) return 'Additional bank validation is required to complete the payment.';
  if (value.includes('network')) return 'A temporary network issue occurred. Please try again.';

  return 'The payment could not be confirmed. Please review your card details and try again.';
}

function validateDeliveryAddress(address: DeliveryAddressForm): string | null {
  if (!address.firstName.trim() || !address.lastName.trim()) {
    return 'Enter the first name and last name for the delivery.';
  }
  if (!address.line1.trim() || !address.postalCode.trim() || !address.city.trim() || !address.country.trim()) {
    return 'Complete the delivery address before placing the order.';
  }

  return null;
}

function CheckoutPageContent() {
  useDocumentMeta({
    title: 'Procuratio · Checkout',
    description: 'Choose a store or delivery option, then complete your secure payment.',
  });

  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [cart, setCart] = useState<CartState | null>(null);
  const [pickupInStore, setPickupInStore] = useState(false);
  const [stores, setStores] = useState<Array<{ id: number; name: string; city: string | null }>>([]);
  const [storeId, setStoreId] = useState<number>(0);
  const [pickupHours, setPickupHours] = useState<PickupHour[]>([]);
  const [pickupDate, setPickupDate] = useState(todayIso());
  const [pickupTime, setPickupTime] = useState('');
  const [pickupNote, setPickupNote] = useState('');
  const [redeemPoints, setRedeemPoints] = useState('0');
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [redeemSummary, setRedeemSummary] = useState<{ redeemedPoints: number; discountAmount: number } | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddressForm>({
    firstName: '',
    lastName: '',
    line1: '',
    line2: '',
    postalCode: '',
    city: '',
    country: 'France',
    instructions: '',
  });
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cardComplete, setCardComplete] = useState({ number: false, expiry: false, cvc: false });
  const availablePickupSlots = useMemo(() => buildPickupSlots(pickupHours, pickupDate), [pickupHours, pickupDate]);
  const isFulfilmentLocked = result !== null;
  const isDarkTheme = user?.preferences.theme === 'dark';

  useEffect(() => {
    Promise.allSettled([getCart(), getMyLoyalty(), listPickupHours()])
      .then((results) => {
        const [cartResult, loyaltyResult, pickupHoursResult] = results;
        if (cartResult.status === 'fulfilled') {
          setCart(cartResult.value);
        } else {
          setError((cartResult.reason as Error).message);
        }
        if (loyaltyResult.status === 'fulfilled') {
          setPointsBalance(loyaltyResult.value.account.pointsBalance);
        }
        if (pickupHoursResult.status === 'fulfilled') {
          setPickupHours(pickupHoursResult.value.data);
        }
      });
  }, []);

  useEffect(() => {
    listPublicStores()
      .then((response) => {
        setStores(response.data);
        setStoreId(user?.preferredStore?.id ?? response.data[0]?.id ?? 0);
      })
      .catch(() => undefined);
  }, [user?.preferredStore?.id]);

  useEffect(() => {
    if (!storeId) {
      return;
    }

    listPickupHours(storeId)
      .then((response) => setPickupHours(response.data))
      .catch(() => undefined);
  }, [storeId]);

  useEffect(() => {
    if (cart && cart.items.length === 0 && result === null) {
      navigate('/client/cart', {
        replace: true,
        state: { infoMessage: 'Your cart is empty. Add products before opening checkout.' },
      });
    }
  }, [cart, navigate, result]);

  useEffect(() => {
    if (pickupInStore && availablePickupSlots.length > 0 && !availablePickupSlots.includes(pickupTime)) {
      setPickupTime(availablePickupSlots[0]);
    }
    if (pickupInStore && availablePickupSlots.length === 0) {
      setPickupTime('');
    }
  }, [availablePickupSlots, pickupInStore, pickupTime]);

  function updateAddress<K extends keyof DeliveryAddressForm>(field: K, value: DeliveryAddressForm[K]) {
    setDeliveryAddress((current) => ({ ...current, [field]: value }));
  }

  const stripeElementStyle = {
    base: {
      fontSize: '15px',
      color: isDarkTheme ? '#f2f6ff' : '#1e2b4d',
      iconColor: isDarkTheme ? '#a7b5d2' : '#7281a0',
      '::placeholder': { color: '#8fa0bf' },
    },
    invalid: { color: '#c6314b' },
  };

  function onCardFieldChange(field: 'number' | 'expiry' | 'cvc', event: { complete: boolean; error?: { message?: string } | undefined }) {
    setCardComplete((current) => ({ ...current, [field]: event.complete && !event.error }));
    setError(event.error ? toFriendlyStripeError(event.error.message) : null);
  }

  async function createOrderAndPay() {
    setError(null);
    setMessage(null);

    if (!cart || cart.items.length === 0) {
      setError('Your cart is empty. Add at least one product before checkout.');
      return;
    }

    const hasAmountToCharge = (cart.totals.payableTotal - Number(redeemPoints || '0') / 100) > 0;

    if (hasAmountToCharge && (!stripe || !elements)) {
      setError('The payment module is still loading. Please refresh the page.');
      return;
    }

    const cardElement = elements?.getElement(CardNumberElement) ?? null;
    if (hasAmountToCharge && (!cardElement || !cardComplete.number || !cardComplete.expiry || !cardComplete.cvc)) {
      setError('Enter valid card details before creating the order.');
      return;
    }

    if (pickupInStore && (!pickupDate || !pickupTime)) {
      setError('Please choose a pickup date and time.');
      return;
    }
    if (pickupInStore && !storeId) {
      setError('Choose a store before placing the order.');
      return;
    }

    if (!pickupInStore) {
      const addressError = validateDeliveryAddress(deliveryAddress);
      if (addressError) {
        setError(addressError);
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await checkout({
        pickupInStore,
        storeId: pickupInStore ? storeId : undefined,
        pickupSlot: pickupInStore ? slotDateTime(pickupDate, pickupTime) : undefined,
        pickupNote: pickupInStore ? pickupNote || undefined : undefined,
        redeemPoints: Number(redeemPoints || '0'),
        deliveryAddress: pickupInStore
          ? undefined
          : {
              fullName: `${deliveryAddress.firstName} ${deliveryAddress.lastName}`.trim(),
              line1: deliveryAddress.line1,
              line2: deliveryAddress.line2 || undefined,
              postalCode: deliveryAddress.postalCode,
              city: deliveryAddress.city,
              country: deliveryAddress.country,
              instructions: deliveryAddress.instructions || undefined,
            },
      });

      setRedeemSummary(response.loyalty ?? null);

      if (!response.paymentIntent || !response.paymentIntent.clientSecret) {
        setResult({
          order: response.order,
          clientSecret: '',
          paymentConfirmed: true,
        });
        setMessage('Your order has been validated. Your receipt is ready.');
        setCart(await getCart());
        return;
      }

      const paymentResult = await stripe!.confirmCardPayment(response.paymentIntent.clientSecret, {
        payment_method: { card: cardElement! },
      });

      if (paymentResult.error) {
        setResult({
          order: response.order,
          clientSecret: response.paymentIntent.clientSecret,
          paymentConfirmed: false,
        });
        setMessage('The order has been created, but the payment was not confirmed. You can retry now or later from the order page.');
        setError(toFriendlyStripeError(paymentResult.error.message));
        return;
      }

      setResult({
        order: response.order,
        clientSecret: response.paymentIntent.clientSecret,
        paymentConfirmed: true,
      });
      setMessage('Your payment has been confirmed. Your receipt is ready.');
      setCart(await getCart());
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <section className="panel ecommerce-hero-card">
        <div className="ecommerce-hero-head">
          <div>
            <span className="eyebrow">Checkout</span>
            <h2 className="ecommerce-title">Pay and finalize your order</h2>
            <p className="muted">Choose delivery or pickup, review the receipt details and confirm the payment with a valid card.</p>
          </div>
          <Link to="/client/cart" className="cta-link cta-link-secondary">Back to cart</Link>
        </div>
      </section>

      {message && <InlineNotification tone="success" title="Saved" message={message} />}
      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
      {!cart && !error && <div className="panel">Loading checkout...</div>}

      {cart && (
        <div className="checkout-grid">
          <section className="panel checkout-form-panel stack">
            <div>
              <h3>Fulfilment</h3>
              <p className="muted">Choose one option, complete the required details, then enter your card.</p>
            </div>

            <div className="checkout-mode-switch">
              <button
                type="button"
                className={`checkout-mode-btn ${!pickupInStore ? 'is-active' : ''}`}
                onClick={() => setPickupInStore(false)} disabled={isFulfilmentLocked}
              >
                Delivery
              </button>
              <button
                type="button"
                className={`checkout-mode-btn ${pickupInStore ? 'is-active' : ''}`}
                onClick={() => setPickupInStore(true)} disabled={isFulfilmentLocked}
              >
                Store pickup
              </button>
            </div>

            {pickupInStore ? (
              <div className="checkout-fulfilment-grid">
                <div className="form-field">
                  <label htmlFor="pickup-date">Pickup date</label>
                  <input id="pickup-date" type="date" value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} disabled={isFulfilmentLocked} />
                </div>
                <div className="form-field form-field-full">
                  <label>Pickup time</label>
                  <div className="pickup-slot-grid">
                    {availablePickupSlots.length === 0 && <div className="empty-state-card">The store is closed or fully unavailable on the selected date.</div>}
                    {availablePickupSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={`pickup-slot-chip ${pickupTime === slot ? 'is-active' : ''}`}
                        onClick={() => setPickupTime(slot)}
                        disabled={isFulfilmentLocked}
                        aria-pressed={pickupTime === slot}
                      >
                        {pickupTime === slot ? `* ${slot}` : slot}
                      </button>
                    ))}
                  </div>
                  {pickupDate && availablePickupSlots.length > 0 && <span className="muted">Pickup day: {formatDateOnly(`${pickupDate}T12:00:00`)}</span>}
                </div>
                <div className="form-field form-field-full">
                  <label htmlFor="checkout-store">Store</label>
                  <select
                    id="checkout-store"
                    value={storeId}
                    onChange={async (event) => {
                      const nextStoreId = Number(event.target.value);
                      setStoreId(nextStoreId);
                      if (nextStoreId > 0) {
                        await updateCurrentUserPreferences({ preferredStoreId: nextStoreId }).catch(() => undefined);
                      }
                    }}
                    disabled={isFulfilmentLocked}
                  >
                    <option value={0}>Choose a store</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>{store.name}{store.city ? ` · ${store.city}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field form-field-full">
                  <label htmlFor="pickup-note">Pickup note</label>
                  <textarea id="pickup-note" placeholder="I will collect it after 6 pm." value={pickupNote} onChange={(event) => setPickupNote(event.target.value)} disabled={isFulfilmentLocked} />
                </div>
              </div>
            ) : (
              <div className="checkout-fulfilment-grid">
                <div className="form-field">
                  <label htmlFor="delivery-first-name">First name</label>
                  <input id="delivery-first-name" placeholder="Sarah" value={deliveryAddress.firstName} onChange={(event) => updateAddress('firstName', event.target.value)} disabled={isFulfilmentLocked} />
                </div>
                <div className="form-field">
                  <label htmlFor="delivery-last-name">Last name</label>
                  <input id="delivery-last-name" placeholder="Benali" value={deliveryAddress.lastName} onChange={(event) => updateAddress('lastName', event.target.value)} disabled={isFulfilmentLocked} />
                </div>
                <div className="form-field form-field-full">
                  <label htmlFor="delivery-line-1">Address line 1</label>
                  <input id="delivery-line-1" placeholder="15 Rue des Jasmins" value={deliveryAddress.line1} onChange={(event) => updateAddress('line1', event.target.value)} disabled={isFulfilmentLocked} />
                </div>
                <div className="form-field form-field-full">
                  <label htmlFor="delivery-line-2">Address line 2</label>
                  <input id="delivery-line-2" placeholder="Apartment, floor, building..." value={deliveryAddress.line2} onChange={(event) => updateAddress('line2', event.target.value)} disabled={isFulfilmentLocked} />
                </div>
                <div className="form-field">
                  <label htmlFor="delivery-postal-code">Postal code</label>
                  <input id="delivery-postal-code" placeholder="75011" value={deliveryAddress.postalCode} onChange={(event) => updateAddress('postalCode', event.target.value)} disabled={isFulfilmentLocked} />
                </div>
                <div className="form-field">
                  <label htmlFor="delivery-city">City</label>
                  <input id="delivery-city" placeholder="Paris" value={deliveryAddress.city} onChange={(event) => updateAddress('city', event.target.value)} disabled={isFulfilmentLocked} />
                </div>
                <div className="form-field">
                  <label htmlFor="delivery-country">Country</label>
                  <input id="delivery-country" placeholder="France" value={deliveryAddress.country} onChange={(event) => updateAddress('country', event.target.value)} disabled={isFulfilmentLocked} />
                </div>
                <div className="form-field form-field-full">
                  <label htmlFor="delivery-instructions">Delivery instructions</label>
                  <textarea id="delivery-instructions" placeholder="Leave it with the concierge if I am out." value={deliveryAddress.instructions} onChange={(event) => updateAddress('instructions', event.target.value)} disabled={isFulfilmentLocked} />
                </div>
              </div>
            )}

            <div className="checkout-loyalty-box">
              <div>
                <span>Loyalty points available</span>
                <strong>{pointsBalance}</strong>
              </div>
              <div className="form-field grow">
                <label htmlFor="redeem-points">Points to redeem</label>
                <input id="redeem-points" placeholder="0" value={redeemPoints} onChange={(event) => setRedeemPoints(event.target.value)} disabled={isFulfilmentLocked} />
              </div>
            </div>

            <div className="stack">
              <div>
                <h3>Card details</h3>
                <p className="muted">The order will only be created when the card details are complete and valid.</p>
              </div>
              {isFulfilmentLocked ? (
                <div className="card-field-shell card-field-shell-locked">
                  <strong>Card details locked</strong>
                  <span>The order has already been created. Use the receipt or the payment retry panel below.</span>
                </div>
              ) : (
                <div className={`card-field-shell stripe-card-shell${isDarkTheme ? ' is-dark' : ''}`}>
                  <div className="stripe-card-grid">
                    <div className="stripe-card-grid-main">
                      <CardNumberElement
                        onChange={(event) => onCardFieldChange('number', event)}
                        options={{ style: stripeElementStyle }}
                      />
                    </div>
                    <div className="stripe-card-grid-side">
                      <CardExpiryElement
                        onChange={(event) => onCardFieldChange('expiry', event)}
                        options={{ style: stripeElementStyle }}
                      />
                    </div>
                    <div className="stripe-card-grid-side">
                      <CardCvcElement
                        onChange={(event) => onCardFieldChange('cvc', event)}
                        options={{ style: stripeElementStyle }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!pickupInStore && (
            <div className="form-field">
              <label htmlFor="checkout-store">Store</label>
              <select
                id="checkout-store"
                value={storeId}
                onChange={async (event) => {
                  const nextStoreId = Number(event.target.value);
                  setStoreId(nextStoreId);
                  if (nextStoreId > 0) {
                    await updateCurrentUserPreferences({ preferredStoreId: nextStoreId }).catch(() => undefined);
                  }
                }}
                disabled={isFulfilmentLocked}
              >
                <option value={0}>Choose a store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}{store.city ? ` · ${store.city}` : ''}</option>
                ))}
              </select>
            </div>
            )}
          </section>

          <aside className="panel checkout-summary-panel">
            <div className="checkout-summary-head">
              <div>
                <h3>Receipt preview</h3>
                <p className="muted">A professional summary of what will appear on your final receipt.</p>
              </div>
              <span className="catalog-count-pill">{cart.items.length} lines</span>
            </div>
            <div className="checkout-summary-items">
              {cart.items.map((item) => (
                <div key={item.productId} className="checkout-summary-item">
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.quantity} x {formatEuro(item.unitPrice)} excl. VAT</span>
                  </div>
                  <strong>{formatEuro(item.lineTotal)}</strong>
                </div>
              ))}
            </div>

            <div className="cart-summary-list cart-summary-list-premium">
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
              <div className="summary-total-row">
                <span>Amount due before loyalty</span>
                <strong>{formatEuro(cart.totals.payableTotal)}</strong>
              </div>
              {redeemSummary && redeemSummary.redeemedPoints > 0 && (
                <div>
                  <span>Loyalty discount</span>
                  <strong>-{formatEuro(redeemSummary.discountAmount)}</strong>
                </div>
              )}
            </div>

            {!result && (
              <button
                type="button"
                className="planning-action-btn planning-action-btn-primary"
                onClick={createOrderAndPay}
                disabled={submitting || ((cart.totals.payableTotal - Number(redeemPoints || '0') / 100) > 0 && (!cardComplete.number || !cardComplete.expiry || !cardComplete.cvc))}
              >
                {submitting ? 'Creating order...' : 'Pay and place order'}
              </button>
            )}

            {result && (
              <div className="checkout-created-order panel stack">
                <div>
                  <span className="eyebrow">{result.paymentConfirmed ? 'Paid order' : 'Pending payment'}</span>
                  <h3>{result.order.orderNumber}</h3>
                  <p className="muted">
                    {result.paymentConfirmed
                      ? 'The payment is confirmed and the receipt is ready to download.'
                      : 'The order is saved. You can retry below or later from the order page if stock is still available.'}
                  </p>
                </div>
                <div className="row">
                  <button type="button" className="planning-action-btn btn-ghost" onClick={() => downloadOrderPdf(result.order)}>
                    Download receipt PDF
                  </button>
                  <Link to={`/client/orders/${result.order.orderNumber}`} className="cta-link cta-link-secondary">Open order page</Link>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {result && !result.paymentConfirmed && stripePromise && result.order.paymentClientSecret && (
        <OrderPaymentPanel
          clientSecret={result.clientSecret}
          buttonLabel="Retry payment"
          helperText="The order is pending. You can retry the card payment now or later from the order page."
        />
      )}
    </div>
  );
}

export function CheckoutPage() {
  if (!stripePromise) {
    return (
      <div className="stack">
        <InlineNotification tone="error" title="Action unavailable" message="The payment configuration is incomplete. Please contact support." />
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutPageContent />
    </Elements>
  );
}
