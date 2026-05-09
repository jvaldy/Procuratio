import { useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { StripeCardElementChangeEvent } from '@stripe/stripe-js';
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
  const [cardComplete, setCardComplete] = useState(false);

  async function onPay() {
    if (!stripe || !elements) {
      setPaymentError('The payment module is still loading. Please refresh the page.');
      return;
    }

    if (!cardComplete) {
      setPaymentError('Enter valid card details before placing the order.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
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

  function onCardChange(event: StripeCardElementChangeEvent) {
    setCardComplete(event.complete && !event.error);
    setPaymentError(event.error ? toFriendlyStripeError(event.error.message) : null);
  }

  return (
    <div className="panel checkout-payment-panel stack">
      <div>
        <h3>Card payment</h3>
        <p className="muted">{helperText}</p>
      </div>
      <div className="card-field-shell">
        <CardElement
          onChange={onCardChange}
          options={{
            hidePostalCode: true,
            style: {
              base: {
                fontSize: '15px',
                color: '#1e2b4d',
                '::placeholder': { color: '#8fa0bf' },
              },
              invalid: { color: '#c6314b' },
            },
          }}
        />
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
