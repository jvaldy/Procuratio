import { useState } from 'react';
import { CardCvcElement, CardExpiryElement, CardNumberElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Order } from '../types/ecommerce';
import { InlineNotification } from '../ui/InlineNotification';
import { downloadOrderPdf } from '../utils/orderPdf';

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

type OrderPaymentPanelProps = {
  order: Order;
  clientSecret: string;
  buttonLabel: string;
  helperText: string;
  onPaymentSucceeded?: () => void | Promise<void>;
};

export function OrderPaymentPanel({ order, clientSecret, buttonLabel, helperText, onPaymentSucceeded }: OrderPaymentPanelProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentOk, setPaymentOk] = useState(false);
  const [cardComplete, setCardComplete] = useState({ number: false, expiry: false, cvc: false });
  const isDarkTheme = typeof document !== 'undefined' && document.body.dataset.theme === 'dark';
  const isSecurePaymentAutofillUnavailable =
    typeof window !== 'undefined'
    && window.location.protocol !== 'https:'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  const stripeElementStyle = {
    base: {
      fontSize: '15px',
      color: isDarkTheme ? '#f2f6ff' : '#1e2b4d',
      iconColor: isDarkTheme ? '#a7b5d2' : '#7281a0',
      '::placeholder': { color: '#8fa0bf' },
    },
    invalid: { color: '#c6314b' },
  };

  async function onPay() {
    if (!stripe || !elements) {
      setPaymentError('The payment module is still loading. Please refresh the page.');
      return;
    }

    if (!cardComplete.number || !cardComplete.expiry || !cardComplete.cvc) {
      setPaymentError('Enter valid card details before placing the order.');
      return;
    }

    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      setPaymentError('The card field is unavailable. Please refresh the page.');
      return;
    }

    setSubmitting(true);
    setPaymentError(null);

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (result.error) {
      setSubmitting(false);
      setPaymentError(toFriendlyStripeError(result.error.message));
      return;
    }

    setSubmitting(false);
    setPaymentOk(true);
    await onPaymentSucceeded?.();
  }

  function onCardFieldChange(field: 'number' | 'expiry' | 'cvc', event: { complete: boolean; error?: { message?: string } | undefined }) {
    setCardComplete((current) => ({ ...current, [field]: event.complete && !event.error }));
    setPaymentError(event.error ? toFriendlyStripeError(event.error.message) : null);
  }

  return (
    <div className="panel checkout-payment-panel stack">
      <div>
        <h3>Card payment</h3>
        <p className="muted">{helperText}</p>
      </div>
      {isSecurePaymentAutofillUnavailable && (
        <InlineNotification
          tone="info"
          title="Card autofill unavailable on localhost"
          message="Your browser may show a native warning because saved payment methods are disabled on non-secure localhost pages. Manual card entry still works normally."
        />
      )}
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
      {paymentError && <InlineNotification tone="error" title="Action unavailable" message={paymentError} />}
      {paymentOk && <InlineNotification tone="success" title="Payment confirmed" message="Your payment has been confirmed. You can now download the receipt or track the order details." />}
      <div className="row">
        <button type="button" onClick={onPay} disabled={submitting || paymentOk} className="planning-action-btn planning-action-btn-primary">
          {submitting ? 'Processing payment...' : buttonLabel}
        </button>
        <button type="button" className="planning-action-btn btn-ghost" onClick={() => downloadOrderPdf(order)}>
          Download receipt PDF
        </button>
      </div>
    </div>
  );
}
