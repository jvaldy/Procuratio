import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOrder } from '../../api/ecommerce';
import type { Order } from '../../types/ecommerce';

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    (async () => {
      try {
        setOrder(await getOrder(orderNumber));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [orderNumber]);

  return (
    <div className="stack">
      <h2>Suivi commande</h2>
      {error && <p className="error">{error}</p>}
      {!order && !error && <div className="panel">Chargement...</div>}
      {order && (
        <div className="panel stack">
          <p><strong>Numero:</strong> {order.orderNumber}</p>
          <p><strong>Statut:</strong> {order.status}</p>
          <p><strong>Total:</strong> {order.total.toFixed(2)} EUR</p>
          {order.pickupInStore && <p><strong>Retrait:</strong> {order.pickupSlot ?? 'A definir'} {order.pickupNote ? `(${order.pickupNote})` : ''}</p>}
          <table>
            <thead><tr><th>Article</th><th>Qte</th><th>PU</th><th>Total</th></tr></thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPrice.toFixed(2)} EUR</td>
                  <td>{item.lineTotal.toFixed(2)} EUR</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link to="/client/orders">Retour aux commandes</Link>
        </div>
      )}
    </div>
  );
}

