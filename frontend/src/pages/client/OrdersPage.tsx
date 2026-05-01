import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyOrders } from '../../api/ecommerce';
import type { Order } from '../../types/ecommerce';

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await listMyOrders(new URLSearchParams({ page: '1', perPage: '20' }));
        setOrders(result.data);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  return (
    <div className="stack">
      <h2>Mes commandes</h2>
      {error && <p className="error">{error}</p>}
      <div className="panel">
        <table>
          <thead><tr><th>Commande</th><th>Statut</th><th>Total</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>{o.status}</td>
                <td>{o.total.toFixed(2)} EUR</td>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
                <td><Link to={`/client/orders/${o.orderNumber}`}>Details</Link></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={5}>Aucune commande pour le moment.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

