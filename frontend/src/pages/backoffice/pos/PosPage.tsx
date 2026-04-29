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
    <div className="stack">
      <h1 className="page-title">Caisse POS</h1>

      <div className="panel row">
        <label>Client ID</label>
        <input className="grow" data-testid="pos-customer-id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
        <button className="btn-soft" data-testid="pos-refresh-history" onClick={refreshHistory}>Historique</button>
      </div>

      <div className="pos-grid">
        <section className="panel pos-column">
          <h3>Articles</h3>
          <div className="stack">
            <strong>Produits</strong>
            <div className="pill-list">
              {products.map((p) => (
                <button data-testid={`pos-add-product-${p.id}`} key={`p-${p.id}`} onClick={() => addToCart('product', p.id)}>{p.name}</button>
              ))}
            </div>
          </div>
          <div className="stack">
            <strong>Services</strong>
            <div className="pill-list">
              {services.map((s) => (
                <button data-testid={`pos-add-service-${s.id}`} key={`s-${s.id}`} onClick={() => addToCart('service', s.id)}>{s.name}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel pos-column">
          <div className="row">
            <h3 data-testid="pos-cart-count">Panier ({cart.length})</h3>
            <button data-testid="pos-create-ticket" onClick={createTicket} disabled={cart.length === 0}>Créer ticket</button>
          </div>

          {activeSale ? (
            <div className="pos-ticket">
              <p data-testid="pos-active-ticket">Ticket #{activeSale.id} - statut: {activeSale.status} - paiement: {activeSale.paymentStatus}</p>
              <div className="pos-total">Total: {activeSale.total} EUR</div>
              <div className="row">
                <button className="btn-soft" data-testid="pos-suspend" onClick={handleSuspend}>Suspendre</button>
                <button className="btn-soft" data-testid="pos-resume" onClick={handleResume}>Reprendre</button>
              </div>
            </div>
          ) : (
            <div className="pos-empty">Aucun ticket actif</div>
          )}

          {error && <p className="error">{error}</p>}

          <div className="panel stack">
            <h3>Historique client</h3>
            <ul data-testid="pos-history" className="pos-history">
              {history.map((sale) => (
                <li key={sale.id}>#{sale.id} - {sale.status} - {sale.total} EUR</li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="panel pos-column">
          <h3>Total</h3>
          <div className="pos-paybox">
            <label>Méthode</label>
            <select data-testid="pos-payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card')}>
              <option value="cash">Espèces</option>
              <option value="card">Carte</option>
            </select>
            <label>Montant</label>
            <input data-testid="pos-payment-amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            <button data-testid="pos-pay" onClick={handlePay} disabled={!activeSale}>Encaisser</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
