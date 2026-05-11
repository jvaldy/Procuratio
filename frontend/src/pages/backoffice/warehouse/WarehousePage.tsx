import { useEffect, useMemo, useState } from 'react';
import { listAdminStores } from '../../../api/stores';
import { getWarehouseShippingNote, listWarehouseOrders, updateWarehouseOrderStatus } from '../../../api/warehouse';
import type { Order } from '../../../types/ecommerce';
import { InlineNotification } from '../../../ui/InlineNotification';
import { formatEuro } from '../../../utils/pricing';

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'validated', label: 'Validated' },
  { value: 'processing', label: 'In progress' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'paid', label: 'Paid' },
  { value: 'ready_for_pickup', label: 'Ready for pickup' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

function statusTone(status: string): 'active' | 'inactive' | 'pending' {
  if (status === 'cancelled' || status === 'failed') return 'inactive';
  if (status === 'paid' || status === 'ready_for_pickup' || status === 'shipped') return 'active';
  return 'pending';
}

function downloadHtmlDocument(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function WarehousePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stores, setStores] = useState<Array<{ id: number; name: string; city: string | null }>>([]);
  const [storeId, setStoreId] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh(targetPage = page) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(targetPage), perPage: '12' });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (storeId) params.set('storeId', String(storeId));
      const result = await listWarehouseOrders(params);
      setOrders(result.data);
      setTotalPages((result.meta as { totalPages?: number }).totalPages ?? 1);
      setSelectedOrderId((current) => current ?? result.data[0]?.id ?? null);
      setPage(targetPage);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh(1).catch((reason) => setError((reason as Error).message));
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [search, statusFilter, storeId]);

  useEffect(() => {
    refresh(1).catch((reason) => setError((reason as Error).message));
  }, []);

  useEffect(() => {
    listAdminStores(new URLSearchParams({ page: '1', perPage: '50', status: 'active' }))
      .then((response) => setStores(response.data))
      .catch(() => undefined);
  }, []);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId],
  );

  async function onChangeStatus(nextStatus: string) {
    if (!selectedOrder) return;
    setError(null);
    setMessage(null);
    try {
      const updated = await updateWarehouseOrderStatus(selectedOrder.id, nextStatus);
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      setMessage(`Order ${updated.orderNumber} is now ${nextStatus.replace(/_/g, ' ')}.`);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function onDownloadShippingNote() {
    if (!selectedOrder) return;
    setError(null);
    try {
      const html = await getWarehouseShippingNote(selectedOrder.id);
      downloadHtmlDocument(`${selectedOrder.orderNumber}-shipping-note.html`, html);
      setMessage('The shipping note has been generated.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const totalUnits = selectedOrder?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="reference-screen warehouse-reference">
      <header className="ref-topbar">
        <div className="ref-topbar-left">WAREHOUSE &gt; ORDERS</div>
        <div className="ref-time">{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="ref-topbar-right" />
      </header>

      {message && <InlineNotification tone="success" title="Saved" message={message} />}
      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}

      <div className="warehouse-layout">
        <aside className="warehouse-list">
          <div className="warehouse-search-row warehouse-search-row-stacked">
            <input
              className="catalog-search-input"
              placeholder="Search by order number or customer"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <select value={storeId} onChange={(event) => setStoreId(Number(event.target.value))}>
              <option value={0}>All stores</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </div>

          <div className="warehouse-order-list-scroll">
            {loading && <div className="empty-state-card">Loading orders...</div>}
            {!loading && orders.length === 0 && <div className="empty-state-card">No order matches this filter.</div>}
            {orders.map((order) => (
              <button
                key={order.id}
                type="button"
                className={`warehouse-order-item ${order.id === selectedOrderId ? 'is-active' : ''}`}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div className="woi-info">
                  <div className="woi-id">{order.orderNumber}</div>
                  <div className="woi-date">{new Date(order.createdAt).toLocaleDateString('en-GB')}</div>
                </div>
                <span className={`status-badge ${statusTone(order.status)}`}>{order.status.replace(/_/g, ' ')}</span>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="crm-pager row">
              <button className="btn-soft" disabled={page <= 1} onClick={() => refresh(page - 1).catch((reason) => setError((reason as Error).message))}>Previous</button>
              <span>Page {page}/{totalPages}</span>
              <button className="btn-soft" disabled={page >= totalPages} onClick={() => refresh(page + 1).catch((reason) => setError((reason as Error).message))}>Next</button>
            </div>
          )}
        </aside>

        <section className="warehouse-detail">
          {selectedOrder ? (
            <>
              <div className="warehouse-head warehouse-head-actions">
                <div>
                  <div className="warehouse-order-title">{selectedOrder.orderNumber}</div>
                  <p className="muted">Created on {new Date(selectedOrder.createdAt).toLocaleString('en-GB')}</p>
                </div>
                <div className="warehouse-toolbar">
                  <select value={selectedOrder.status} onChange={(event) => onChangeStatus(event.target.value)}>
                    {ORDER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                  <button type="button" className="planning-action-btn btn-ghost" onClick={onDownloadShippingNote}>Shipping note</button>
                </div>
              </div>

              <div className="warehouse-meta">
                <div className="wm-item">
                  <div className="wm-label">Customer</div>
                  <div className="wm-val">{selectedOrder.deliveryAddress.fullName || 'Store customer'}</div>
                </div>
                <div className="wm-item">
                  <div className="wm-label">Store</div>
                  <div className="wm-val">{selectedOrder.store?.name || 'Main store'}</div>
                </div>
                <div className="wm-item">
                  <div className="wm-label">Fulfilment</div>
                  <div className="wm-val">{selectedOrder.pickupInStore ? 'Store pickup' : 'Delivery'}</div>
                </div>
                <div className="wm-item">
                  <div className="wm-label">Pickup slot</div>
                  <div className="wm-val">{selectedOrder.pickupSlot ? new Date(selectedOrder.pickupSlot).toLocaleString('en-GB') : 'Not set'}</div>
                </div>
                <div className="wm-item">
                  <div className="wm-label">Shipping address</div>
                  <div className="wm-val">{selectedOrder.pickupInStore ? 'Handled in store' : [selectedOrder.deliveryAddress.line1, selectedOrder.deliveryAddress.postalCode, selectedOrder.deliveryAddress.city, selectedOrder.deliveryAddress.country].filter(Boolean).join(', ') || 'No address recorded'}</div>
                </div>
              </div>

              <div className="warehouse-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Reference</th>
                      <th>Quantity</th>
                      <th>Unit price excl. VAT</th>
                      <th>Line total incl. VAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.productName}</td>
                        <td>{item.productSku}</td>
                        <td>{item.quantity}</td>
                        <td>{formatEuro(item.unitPrice)}</td>
                        <td>{formatEuro(item.lineTotal)}</td>
                      </tr>
                    ))}
                    {selectedOrder.purchasedGiftVoucher && (
                      <tr>
                        <td>Gift voucher purchase</td>
                        <td>{selectedOrder.purchasedGiftVoucher.code}</td>
                        <td>1</td>
                        <td>{formatEuro(selectedOrder.subTotal)}</td>
                        <td>{formatEuro(selectedOrder.total)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="warehouse-footer">
                <div className="warehouse-totals">
                  <div className="wt-item">
                    <span className="wt-label">Total units</span>
                    <span className="wt-val">{totalUnits || (selectedOrder.purchasedGiftVoucher ? 1 : 0)}</span>
                  </div>
                  <div className="wt-item">
                    <span className="wt-label">Net amount</span>
                    <span className="wt-val">{formatEuro(selectedOrder.subTotal)}</span>
                  </div>
                  <div className="wt-item">
                    <span className="wt-label">VAT</span>
                    <span className="wt-val">{formatEuro(selectedOrder.taxTotal)}</span>
                  </div>
                  <div className="wt-item">
                    <span className="wt-label">Total</span>
                    <span className="wt-val" style={{ color: 'var(--accent)' }}>{formatEuro(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state-card">Select an order to review its fulfilment workflow.</div>
          )}
        </section>
      </div>
    </div>
  );
}
