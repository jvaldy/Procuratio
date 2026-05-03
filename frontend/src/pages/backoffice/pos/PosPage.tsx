import { useEffect, useMemo, useState } from 'react';
import { listProducts, listServices } from '../../../api/stock';
import { createSale, getCustomerSales, paySale, resumeSale, suspendSale } from '../../../api/pos';
import type { Product, ServiceItem } from '../../../types/stock';
import type { PosItemPayload, Sale } from '../../../types/pos';

type RemovedItem = PosItemPayload & { name: string };

function gbp(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

export function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [cart, setCart] = useState<PosItemPayload[]>([]);
  const [removedItems, setRemovedItems] = useState<RemovedItem[]>([]);
  const [activeSale, setActiveSale] = useState<Sale | null>(null);
  const [customerId, setCustomerId] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [history, setHistory] = useState<Sale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'progress' | 'issued'>('progress');
  const [showAudit, setShowAudit] = useState(true);
  const [discountPct, setDiscountPct] = useState('');
  const [outstanding, setOutstanding] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const params = new URLSearchParams({ page: '1', perPage: '50', active: 'true' });
    listProducts(params).then((r) => setProducts(r.data)).catch((e) => setError((e as Error).message));
    listServices(params).then((r) => setServices(r.data)).catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
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
      setShowAudit(true);
      await refreshHistory();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function getItemName(item: PosItemPayload): string {
    return item.itemType === 'product'
      ? (products.find((p) => p.id === item.itemId)?.name ?? '-')
      : (services.find((s) => s.id === item.itemId)?.name ?? '-');
  }

  function getItemPrice(item: PosItemPayload): number {
    const price = item.itemType === 'product'
      ? products.find((p) => p.id === item.itemId)?.price
      : services.find((s) => s.id === item.itemId)?.price;
    return Number(price ?? 0);
  }

  function addToCart(itemType: 'product' | 'service', itemId: number) {
    setCart((prev) => [...prev, { itemType, itemId, quantity: 1, taxRate: 20, discountAmount: 0 }]);
  }

  function removeFromCart(idx: number) {
    const item = cart[idx];
    setRemovedItems((prev) => [...prev, { ...item, name: getItemName(item) }]);
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  function restoreItem(idx: number) {
    const item = removedItems[idx];
    if (!item) return;
    setCart((prev) => [...prev, item]);
    setRemovedItems((prev) => prev.filter((_, i) => i !== idx));
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
    setRemovedItems([]);
    await refreshHistory();
  }

  const displayTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const displayClient = `Client #${customerId}`;
  const displayTotal = gbp(activeSale ? Number(activeSale.total) : 0);
  const catalogCount = products.length + services.length;
  const auditEvents = cart.slice(-3).map((item, i) => `${i + 1}. ${getItemName(item)} ajoute`);
  const favoriteBadges = services.slice(0, 4).map((service) =>
    service.name.split(' ').slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('')
  );
  const promoAmount = removedItems.length * 2;

  return (
    <div className="reference-screen pos-reference">
      <header className="ref-topbar">
        <div className="ref-topbar-left"><div className="ref-topbar-icon" aria-hidden="true" />CASH</div>
        <div className="ref-time">{displayTime}</div>
        <div className="ref-topbar-right"><button className="ref-icon-btn" title="Recap">i</button><button className="ref-icon-btn" title="Menu">=</button></div>
      </header>

      <div className="pos-layout">
        <aside className="pos-left">
          <div className="pos-tabs">
            <button className={`tab${activeTab === 'progress' ? ' active' : ''}`} onClick={() => setActiveTab('progress')}>In Progress</button>
            <button className={`tab${activeTab === 'issued' ? ' active' : ''}`} onClick={() => setActiveTab('issued')}>Receipt Issued</button>
          </div>
          <div className="pos-search-row">
            <input data-testid="pos-customer-id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Search" />
            <button className="round-btn" data-testid="pos-refresh-history" onClick={refreshHistory}>+</button>
          </div>
          <ul data-testid="pos-history" className="pos-history-list">
            {history.length === 0 && <li className="muted">Aucun ticket client.</li>}
            {history.map((sale) => (
              <li key={sale.id}>
                <div className={`pos-history-item${activeSale?.id === sale.id ? ' is-active' : ''}`} onClick={() => setActiveSale(sale)}>
                  <div className="phi-name">Ticket #{sale.id}</div>
                  <div className="phi-meta">{gbp(Number(sale.total))}</div>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="pos-center">
          <div className="pos-client-header">
            <button className="danger-link">DELETE</button>
            <h2 className="pos-client-name">{displayClient}</h2>
            <button className="icon-circle-btn" title="Infos">i</button>
            <button className="outline-btn">Subscriptions and Promo</button>
          </div>
          <div className="pos-badges">
            <span className="pos-badge">{cart.length} item(s) ticket</span>
            <span className="pos-badge">{catalogCount} references dispo</span>
          </div>
          <div className="pos-section-title">Treatments</div>

          {showAudit && (
            <div className="pos-audit-card">
              <button className="pos-audit-dismiss" onClick={() => setShowAudit(false)}>x</button>
              {auditEvents.length === 0 && <div className="muted">Aucun evenement de ticket.</div>}
              {auditEvents.map((event) => <div className="pos-audit-event" key={event}><div className="pos-audit-dot" />{event}</div>)}
            </div>
          )}

          {cart.map((item, idx) => (
            <div key={`${item.itemType}-${item.itemId}-${idx}`} className="pos-service-card">
              <div className="pos-service-card-header">
                <span className="pos-service-card-title">{getItemName(item)}</span>
                <button className="pos-trash-btn" onClick={() => removeFromCart(idx)}>x</button>
              </div>
              <div className="pos-service-employee-row">
                <span className="pos-service-employee-label">WITH</span>
                <select>
                  <option>Selectionner un employe</option>
                  {services.slice(0, 4).map((service) => <option key={service.id}>{service.name}</option>)}
                </select>
                <div className="pos-service-price">{gbp(getItemPrice(item))}</div>
              </div>
            </div>
          ))}

          {removedItems.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="pos-restore-card">
              {item.name}
              <button className="pos-restore-btn" onClick={() => restoreItem(idx)}>Restore</button>
            </div>
          ))}

          <div className="pos-service-panel">
            <h3 data-testid="pos-cart-count">Services disponibles ({cart.length})</h3>
            <div className="pill-list">
              {products.slice(0, 4).map((product) => (
                <button data-testid={`pos-add-product-${product.id}`} key={`p-${product.id}`} onClick={() => addToCart('product', product.id)}>{product.name}</button>
              ))}
              {services.slice(0, 4).map((service) => (
                <button data-testid={`pos-add-service-${service.id}`} key={`s-${service.id}`} onClick={() => addToCart('service', service.id)}>{service.name}</button>
              ))}
            </div>
          </div>

          <button className="pos-add-service-btn" data-testid="pos-create-ticket" onClick={createTicket} disabled={cart.length === 0}>+ Add Service</button>

          {activeSale && (
            <div className="panel pos-ticket-card" data-testid="pos-active-ticket">
              <div className="row"><strong>Ticket #{activeSale.id}</strong><span className="muted">{activeSale.status} / {activeSale.paymentStatus}</span></div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn-soft" data-testid="pos-suspend" onClick={handleSuspend}>Suspendre</button>
                <button className="btn-soft" data-testid="pos-resume" onClick={handleResume}>Reprendre</button>
              </div>
            </div>
          )}

          <div className="pos-favorites">
            <div className="pos-fav-label">Services frequents</div>
            <div className="pos-fav-row">
              {favoriteBadges.length === 0 && <div className="muted">Pas de service charge.</div>}
              {favoriteBadges.map((badge, idx) => <div key={`${badge}-${idx}`} className={['pos-avatar', 'pos-av-teal', 'pos-av-blue', 'pos-av-purple', 'pos-av-coral'][idx + 1]}>{badge}</div>)}
            </div>
          </div>
          {error && <p className="error">{error}</p>}
        </section>

        <aside className="pos-right">
          <div className="pos-right-header">Total</div>
          <div className="pos-total-block"><div className="pos-total-label">Part of the total</div><div className="pos-total-amount">{displayTotal}</div></div>
          <div>
            <div className="pos-subs-row"><div className="pos-subs-label">Subscriptions and Promo<span className="pos-subs-count">{removedItems.length}</span></div><button className="pos-link-btn">Modify</button></div>
            <div className="pos-promo-list">
              {removedItems.length === 0 && <div className="muted">Aucune promo.</div>}
              {removedItems.map((item, idx) => <div className="pos-promo-item" key={`promo-${idx}`}>{item.name}<button className="pos-promo-trash" onClick={() => restoreItem(idx)}>↺</button></div>)}
              <div className="pos-promo-total">Total Promo <span className="neg">{promoAmount > 0 ? `-${promoAmount.toFixed(2)}` : '0.00'}</span></div>
            </div>
          </div>
          <div><div className="pos-field-label">Total Discount</div><div className="pos-discount-row"><div className="pos-unit-badge">%</div><input value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} placeholder="0" /></div></div>
          <div className="pos-inline-row"><span className="pos-field-label" style={{ marginBottom: 0 }}>Prepaid Credit</span><button className="pos-add-link">add</button></div>
          <div>
            <div className="pos-field-label">Outstanding</div>
            <input
              data-testid="pos-payment-amount"
              value={outstanding || paymentAmount}
              onChange={(e) => {
                setOutstanding(e.target.value);
                setPaymentAmount(e.target.value);
              }}
              placeholder="0"
            />
          </div>
          <div className="pos-net-pay">Net to pay<strong>{displayTotal}</strong></div>
          <select data-testid="pos-payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card')}>
            <option value="cash">Especes</option>
            <option value="card">Carte</option>
          </select>
          <button data-testid="pos-pay" onClick={handlePay} disabled={!activeSale}>Encaisser</button>
        </aside>
      </div>
    </div>
  );
}

