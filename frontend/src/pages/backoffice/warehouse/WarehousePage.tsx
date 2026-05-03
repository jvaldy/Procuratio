import { useEffect, useMemo, useState } from 'react';
import { listWarehouseOrders } from '../../../api/warehouse';
import type { Order as ApiOrder } from '../../../types/ecommerce';

type OrderStatus = 'pending' | 'delivered' | 'draft';

interface OrderItem {
  name: string;
  ordered: number;
  delivered: number | null;
  unitPrice: number;
  amount: number;
}

interface Order {
  id: number | null;
  label: string;
  date: string;
  deliveredOn?: string;
  status: OrderStatus;
  supplier: string;
  items: OrderItem[];
  totalUnits: number;
  netAmount: number;
  vatRate: number;
  total: number;
}

const ORDERS: Order[] = [
  {
    id: 139,
    label: 'Order 139',
    date: '09/14/18',
    status: 'pending',
    supplier: 'Kerastase',
    items: [
      { name: 'Elixir Ultime Original Oil', ordered: 60, delivered: null, unitPrice: 18.5, amount: 1110 },
      { name: 'Discipline Fluidissime Spray', ordered: 40, delivered: null, unitPrice: 14.9, amount: 596 },
    ],
    totalUnits: 100,
    netAmount: 1706,
    vatRate: 21,
    total: 2064.26,
  },
  {
    id: 138,
    label: 'Order 138',
    date: '09/13/18',
    status: 'pending',
    supplier: 'Kerastase',
    items: [
      { name: 'Be Curly Shampoo 250ml', ordered: 80, delivered: 75, unitPrice: 12.1, amount: 907.5 },
      { name: 'Charge Up Thickening Shampoo', ordered: 80, delivered: 75, unitPrice: 12.1, amount: 907.5 },
    ],
    totalUnits: 150,
    netAmount: 1815,
    vatRate: 21,
    total: 2196.15,
  },
  {
    id: 137,
    label: 'Order 137',
    date: '09/13/18',
    deliveredOn: '15/09/2018',
    status: 'delivered',
    supplier: 'L\'Oréal Professional',
    items: [
      { name: 'Serie Expert Vitamino Color Shampoo', ordered: 50, delivered: 50, unitPrice: 9.8, amount: 490 },
      { name: 'Mythic Oil Nourishing Conditioner', ordered: 40, delivered: 40, unitPrice: 11.2, amount: 448 },
    ],
    totalUnits: 90,
    netAmount: 938,
    vatRate: 21,
    total: 1134.98,
  },
  {
    id: null,
    label: 'Draft',
    date: '11/09/2018',
    status: 'draft',
    supplier: '—',
    items: [],
    totalUnits: 0,
    netAmount: 0,
    vatRate: 21,
    total: 0,
  },
];

function mapApiOrder(order: ApiOrder): Order {
  return {
    id: order.id,
    label: order.orderNumber,
    date: new Date(order.createdAt).toLocaleDateString('en-GB'),
    status: order.status === 'ready_for_pickup' || order.status === 'paid' ? 'pending' : order.status === 'cancelled' ? 'draft' : 'pending',
    supplier: order.pickupInStore ? 'Store pickup' : 'Web checkout',
    items: order.items.map((item) => ({
      name: item.productName,
      ordered: item.quantity,
      delivered: null,
      unitPrice: item.unitPrice,
      amount: item.lineTotal,
    })),
    totalUnits: order.items.reduce((sum, item) => sum + item.quantity, 0),
    netAmount: order.subTotal,
    vatRate: order.subTotal > 0 ? Math.round((order.taxTotal / order.subTotal) * 100) : 0,
    total: order.total,
  };
}

function StatusIcon({ status }: { status: OrderStatus }) {
  if (status === 'delivered') return <span className="woi-icon" title="Livré">✓</span>;
  if (status === 'draft')     return <span className="woi-icon" title="Brouillon">✎</span>;
  return <span className="woi-icon" title="En attente de livraison">⬆</span>;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

export function WarehousePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(138);
  const [search, setSearch]         = useState('');
  const [received, setReceived]     = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await listWarehouseOrders(new URLSearchParams({ page: '1', perPage: '50' }));
        const mapped = result.data.map(mapApiOrder);
        setOrders(mapped);
        setSelectedId(mapped[0]?.id ?? null);
        setError(null);
      } catch {
        setOrders(ORDERS);
        setError('Mode démo: impossible de charger les commandes back-office.');
      }
    })();
  }, []);

  const filtered = useMemo(() => orders.filter(
    (o) =>
      search === '' ||
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier.toLowerCase().includes(search.toLowerCase())
  ), [orders, search]);

  const selected = orders.find((o) => o.id === selectedId) ?? orders[0] ?? ORDERS[1];

  function markReceived() {
    if (selected.id == null) return;
    setReceived((prev) => new Set([...prev, selected.id as number]));
  }

  const isReceived = selected.id != null && received.has(selected.id);

  return (
    <div className="reference-screen warehouse-reference">
      {/* ── Topbar ─────────────────────────────────────── */}
      <header className="ref-topbar">
        <div className="ref-topbar-left">
          <span style={{ fontSize: 18, marginRight: 4 }}>✂</span>
          WAREHOUSE &rsaquo; ORDERS
        </div>
        <div className="ref-time">09:15</div>
        <div className="ref-topbar-right">
          <button className="ref-icon-btn" title="Menu">≡</button>
        </div>
      </header>

      <div className="warehouse-layout">
        {/* ── Left: order list ────────────────────────── */}
        <aside className="warehouse-list">
          <div className="warehouse-search-row">
            <input
              placeholder="Search order"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="round-btn" onClick={() => setSearch('')} title="Nouveau">+</button>
          </div>

          {filtered.map((order) => (
            <div
              key={order.id ?? 'draft'}
              className={[
                'warehouse-order-item',
                order.status === 'delivered' ? 'delivered' : '',
                order.status === 'draft'     ? 'draft'     : '',
                order.id === selectedId      ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelectedId(order.id)}
            >
              <div className="woi-info">
                <div className="woi-id">{order.label} – {order.date}</div>
                {order.deliveredOn && (
                  <div className="woi-date">{order.deliveredOn}</div>
                )}
              </div>
              <StatusIcon status={order.status} />
            </div>
          ))}
        </aside>

        {/* ── Right: order detail ─────────────────────── */}
        <div className="warehouse-detail">
          {error && <p className="error">{error}</p>}
          <div className="warehouse-head">
            <button className="danger-link">⊟ DELETE</button>
            <div className="warehouse-order-title">
              ORDER {selected.id ?? '—'} – {selected.date}
            </div>
          </div>

          {/* Meta row */}
          <div className="warehouse-meta">
            <div className="wm-item">
              <div className="wm-label">Supplier</div>
              <div className="wm-val">{selected.supplier}</div>
            </div>
            <div className="wm-item">
              <div className="wm-label">Ordered On</div>
              <div className="wm-val">{selected.date}</div>
            </div>
            {selected.status !== 'draft' && (
              <div className="wm-status">
                {isReceived || selected.status === 'delivered'
                  ? '✓ delivered'
                  : 'awaiting delivery'}
              </div>
            )}
          </div>

          {/* Products table */}
          {selected.items.length > 0 ? (
            <div className="warehouse-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Ordered</th>
                    <th>Order Delivered</th>
                    <th style={{ textAlign: 'right' }}>Amount (sin VAT)</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{item.ordered}</span>
                        <span className="muted" style={{ fontSize: 12, marginLeft: 3 }}>pc</span>
                      </td>
                      <td>
                        {item.delivered != null ? (
                          <>
                            <span style={{ fontWeight: 700 }}>{item.delivered}</span>
                            <span className="muted" style={{ fontSize: 12, marginLeft: 3 }}>pc</span>
                            <span className="muted" style={{ margin: '0 6px' }}>×</span>
                            <span>{fmt(item.unitPrice).replace('£', '£ ')}</span>
                            <span className="muted" style={{ margin: '0 6px' }}>=</span>
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel muted" style={{ textAlign: 'center', padding: '32px 16px' }}>
              Aucun produit dans ce brouillon.
            </div>
          )}

          {/* Footer */}
          {selected.items.length > 0 && (
            <div className="warehouse-footer">
              <div className="warehouse-totals">
                <div className="wt-item">
                  <span className="wt-label">Total Units</span>
                  <span className="wt-val">{selected.totalUnits}</span>
                </div>
                <div className="wt-item">
                  <span className="wt-label">Net Amount</span>
                  <span className="wt-val">{fmt(selected.netAmount)}</span>
                </div>
                <div className="wt-item">
                  <span className="wt-label">VAT</span>
                  <span className="wt-val">{selected.vatRate}%</span>
                </div>
                <div className="wt-item">
                  <span className="wt-label">Total</span>
                  <span className="wt-val" style={{ color: 'var(--accent)' }}>{fmt(selected.total)}</span>
                </div>
              </div>

              {selected.status !== 'delivered' && !isReceived && (
                <button className="warehouse-cta" onClick={markReceived}>
                  I have received the order ✓
                </button>
              )}

              {(isReceived || selected.status === 'delivered') && (
                <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ✓ Commande reçue
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
