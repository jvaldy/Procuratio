import { useEffect, useState } from 'react';
import { listProducts, listServices } from '../../../api/stock';
import { createSale, getCustomerSales, paySale, resumeSale, suspendSale } from '../../../api/pos';
import type { Product, ServiceItem } from '../../../types/stock';
import type { PosItemPayload, Sale } from '../../../types/pos';

export function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [cart, setCart] = useState<PosItemPayload[]>([]);
  const [activeSale, setActiveSale] = useState<Sale | null>(null);
  const [customerId, setCustomerId] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [history, setHistory] = useState<Sale[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: '1', perPage: '50', active: 'true' });
    listProducts(params).then((res) => setProducts(res.data)).catch((e) => setError((e as Error).message));
    listServices(params).then((res) => setServices(res.data)).catch((e) => setError((e as Error).message));
  }, []);

  async function refreshHistory() {
    const res = await getCustomerSales(Number(customerId), 1, 10);
    setHistory(res.data);
  }

  async function createTicket() {
    setError(null);
    try {
      const sale = await createSale({ customerId: Number(customerId), items: cart });
      setActiveSale(sale);
      setPaymentAmount(String(sale.total));
      await refreshHistory();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function addToCart(itemType: 'product' | 'service', itemId: number) {
    setCart((prev) => [...prev, { itemType, itemId, quantity: 1, taxRate: 20, discountAmount: 0 }]);
  }

  async function handleSuspend() {
    if (!activeSale) return;
    setActiveSale(await suspendSale(activeSale.id, 'Pause caisse'));
  }

  async function handleResume() {
    if (!activeSale) return;
    setActiveSale(await resumeSale(activeSale.id));
  }

  async function handlePay() {
    if (!activeSale) return;
    const paid = await paySale(activeSale.id, { method: paymentMethod, amount: Number(paymentAmount) });
    setActiveSale(paid);
    setCart([]);
    await refreshHistory();
  }

  return (
    <div className="reference-screen pos-reference">
      <header className="ref-topbar">
        <div className="ref-topbar-left">CASH</div>
        <div className="ref-time">09:15</div>
        <div className="ref-topbar-right">|||</div>
      </header>

      <div className="pos-layout">
        <aside className="pos-left">
          <div className="pos-tabs">
            <button className="tab active">IN PROGRESS</button>
            <button className="tab">RECEIPT ISSUED</button>
          </div>
          <div className="pos-search-row">
            <input data-testid="pos-customer-id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Search" />
            <button className="round-btn" data-testid="pos-refresh-history" onClick={refreshHistory}>+</button>
          </div>
          <ul data-testid="pos-history" className="pos-history-list">
            {history.map((sale) => (
              <li key={sale.id}>
                <span>Ticket #{sale.id}</span>
                <strong>{sale.total} EUR</strong>
              </li>
            ))}
            {history.length === 0 && <li className="muted">Aucun ticket client</li>}
          </ul>
        </aside>

        <section className="pos-center">
          <div className="pos-center-title">
            <span className="danger-link">DELETE</span>
            <h2>Sarah Wolf</h2>
            <button className="outline-btn" data-testid="pos-create-ticket" onClick={createTicket} disabled={cart.length === 0}>Create ticket</button>
          </div>

          <div className="pos-badges">
            <span>1 GELDSUMME VON EUR 50,00</span>
            <span>2 VERFUGBARE PREISE</span>
          </div>

          <div className="panel pos-service-panel">
            <h3 data-testid="pos-cart-count">TREATMENTS ({cart.length})</h3>
            <div className="pill-list">
              {products.slice(0, 6).map((p) => (
                <button data-testid={`pos-add-product-${p.id}`} key={`p-${p.id}`} onClick={() => addToCart('product', p.id)}>{p.name}</button>
              ))}
              {services.slice(0, 6).map((s) => (
                <button data-testid={`pos-add-service-${s.id}`} key={`s-${s.id}`} onClick={() => addToCart('service', s.id)}>{s.name}</button>
              ))}
            </div>
          </div>

          {activeSale ? (
            <div className="panel pos-ticket-card">
              <div className="row">
                <strong data-testid="pos-active-ticket">Ticket #{activeSale.id}</strong>
                <span>{activeSale.status} / {activeSale.paymentStatus}</span>
              </div>
              <div className="row">
                <button className="btn-soft" data-testid="pos-suspend" onClick={handleSuspend}>Suspendre</button>
                <button className="btn-soft" data-testid="pos-resume" onClick={handleResume}>Reprendre</button>
              </div>
            </div>
          ) : (
            <div className="panel pos-empty">Aucun ticket actif</div>
          )}
          {error && <p className="error">{error}</p>}
        </section>

        <aside className="pos-right">
          <h3>TOTAL</h3>
          <div className="panel pos-total-panel">
            <p>Part of the total</p>
            <strong>{activeSale ? `${activeSale.total} EUR` : '0.00 EUR'}</strong>
          </div>
          <div className="panel pos-paybox">
            <label>Methode</label>
            <select data-testid="pos-payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card')}>
              <option value="cash">Especes</option>
              <option value="card">Carte</option>
            </select>
            <label>Montant</label>
            <input data-testid="pos-payment-amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            <button data-testid="pos-pay" onClick={handlePay} disabled={!activeSale}>Encaisser</button>
          </div>
          <div className="pos-net-pay">Net to pay <strong>{activeSale ? `${activeSale.total} EUR` : '0.00 EUR'}</strong></div>
        </aside>
      </div>
    </div>
  );
}
