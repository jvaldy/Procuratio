import { useState } from 'react';
import { checkout, getMyLoyalty } from '../../api/ecommerce';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export function CheckoutPage() {
  const [pickupInStore, setPickupInStore] = useState(false);
  const [pickupSlot, setPickupSlot] = useState('');
  const [pickupNote, setPickupNote] = useState('');
  const [redeemPoints, setRedeemPoints] = useState('0');
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [redeemSummary, setRedeemSummary] = useState<{ redeemedPoints: number; discountAmount: number } | null>(null);
  const [result, setResult] = useState<{ orderNumber: string; clientSecret: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyLoyalty()
      .then((res) => setPointsBalance(res.account.pointsBalance))
      .catch(() => undefined);
  }, []);

  async function onCheckout() {
    setError(null);
    try {
      const response = await checkout({
        pickupInStore,
        pickupSlot: pickupSlot || undefined,
        pickupNote: pickupNote || undefined,
        redeemPoints: Number(redeemPoints || '0'),
      });
      setRedeemSummary(response.loyalty ?? null);
      setResult({
        orderNumber: response.order.orderNumber,
        clientSecret: response.paymentIntent.clientSecret,
        status: response.paymentIntent.status,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="stack">
      <h2>Checkout</h2>
      <div className="panel stack">
        <label className="row">
          <input type="checkbox" checked={pickupInStore} onChange={(e) => setPickupInStore(e.target.checked)} />
          Retrait en magasin
        </label>
        {pickupInStore && (
          <div className="stack">
            <input placeholder="Creneau retrait (ex: 2026-05-04 14:00)" value={pickupSlot} onChange={(e) => setPickupSlot(e.target.value)} />
            <input placeholder="Information de retrait" value={pickupNote} onChange={(e) => setPickupNote(e.target.value)} />
          </div>
        )}
        <div className="row">
          <label>Points fidélité disponibles: <strong>{pointsBalance}</strong></label>
          <input
            placeholder="Points à utiliser"
            value={redeemPoints}
            onChange={(e) => setRedeemPoints(e.target.value)}
          />
        </div>
        <button onClick={onCheckout}>Creer la commande et initier le paiement</button>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="panel stack">
          <p>Commande creee: <strong>{result.orderNumber}</strong></p>
          <p>Statut PaymentIntent: <strong>{result.status}</strong></p>
          <p>Client secret Stripe: <code>{result.clientSecret}</code></p>
          {redeemSummary && redeemSummary.redeemedPoints > 0 && (
            <p>
              Fidélité appliquée: {redeemSummary.redeemedPoints} points (-{redeemSummary.discountAmount.toFixed(2)} EUR)
            </p>
          )}
          <p>
            En production, le front Stripe finalise le paiement et le webhook met a jour la commande.
          </p>
          <Link to={`/client/orders/${result.orderNumber}`}>Voir le statut de la commande</Link>
        </div>
      )}
    </div>
  );
}
