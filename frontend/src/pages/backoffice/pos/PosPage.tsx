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
    <div>
      <h2>Caisse POS</h2>
      <div>
        <label>Client ID</label>
        <input data-testid="pos-customer-id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
      </div>
      <h3>Articles</h3>
      <div>
        <strong>Produits</strong>
        {products.map((p) => (
          <button data-testid={`pos-add-product-${p.id}`} key={`p-${p.id}`} onClick={() => addToCart('product', p.id)}>{p.name}</button>
        ))}
      </div>
      <div>
        <strong>Services</strong>
        {services.map((s) => (
          <button data-testid={`pos-add-service-${s.id}`} key={`s-${s.id}`} onClick={() => addToCart('service', s.id)}>{s.name}</button>
        ))}
      </div>
      <h3 data-testid="pos-cart-count">Panier ({cart.length})</h3>
      <button data-testid="pos-create-ticket" onClick={createTicket} disabled={cart.length === 0}>Créer ticket</button>
      {activeSale && (
        <div>
          <p data-testid="pos-active-ticket">Ticket #{activeSale.id} - statut: {activeSale.status} - paiement: {activeSale.paymentStatus} - total: {activeSale.total}</p>
          <button data-testid="pos-suspend" onClick={handleSuspend}>Suspendre</button>
          <button data-testid="pos-resume" onClick={handleResume}>Reprendre</button>
          <select data-testid="pos-payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card')}>
            <option value="cash">Espèces</option>
            <option value="card">Carte</option>
          </select>
          <input data-testid="pos-payment-amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
          <button data-testid="pos-pay" onClick={handlePay}>Encaisser</button>
        </div>
      )}
      {error && <p>{error}</p>}

      <h3>Historique client</h3>
      <button data-testid="pos-refresh-history" onClick={refreshHistory}>Rafraîchir historique</button>
      <ul data-testid="pos-history">
        {history.map((sale) => (
          <li key={sale.id}>#{sale.id} - {sale.status} - {sale.total} EUR</li>
        ))}
      </ul>
    </div>
  );
}
