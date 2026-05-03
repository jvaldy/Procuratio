import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyOrders } from '../../api/ecommerce';
import type { Order } from '../../types/ecommerce';

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
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  return (
    <div className="reference-screen warehouse-reference">
      <header className="ref-topbar">
        <div className="ref-topbar-left">WAREHOUSE &gt; ORDERS</div>
        <div className="ref-time">09:15</div>
        <div className="ref-topbar-right">|||</div>
      </header>
      {error && <p className="error">{error}</p>}
      <div className="warehouse-layout">
        <aside className="warehouse-list">
          <div className="pos-search-row">
            <input placeholder="Search order" />
            <button className="round-btn">+</button>
          </div>
          <ul>
            {orders.map((order) => (
              <li key={order.id} className={active?.id === order.id ? 'active' : ''} onClick={() => setActive(order)}>
                <span>{order.orderNumber}</span>
                <small>{new Date(order.createdAt).toLocaleDateString('fr-FR')}</small>
              </li>
            ))}
          </ul>
        </aside>

        <section className="warehouse-detail">
          {!active && <div className="panel">Aucune commande pour le moment.</div>}
          {active && (
            <div className="panel">
              <div className="warehouse-head">
                <span className="danger-link">DELETE</span>
                <strong>{active.orderNumber}</strong>
                <span>{active.status}</span>
              </div>
              <table>
                <thead><tr><th>Product</th><th>Ordered</th><th>Amount</th></tr></thead>
                <tbody>
                  {active.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{item.lineTotal.toFixed(2)} EUR</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="warehouse-footer">
                <strong>Total: {active.total.toFixed(2)} EUR</strong>
                <Link to={`/client/orders/${active.orderNumber}`} className="warehouse-cta">I HAVE RECEIVED THE ORDER</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

