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

function downloadPdfDocument(filename: string, blob: Blob) {
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
      const params = new URLSearchParams({ page: String(targetPage), perPage: '6' });
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
      const pdf = await getWarehouseShippingNote(selectedOrder.id);
      downloadPdfDocument(`${selectedOrder.orderNumber}-shipping-note.pdf`, pdf);
      setMessage('The shipping note PDF has been generated.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const totalUnits = selectedOrder?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="stack">
      {message && <InlineNotification tone="success" title="Saved" message={message} />}
      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}

      <div className="warehouse-cash-layout">
        <aside className="panel warehouse-cash-left">
          <div className="warehouse-cash-head">
            <span className="catalog-count-pill">{orders.length} order(s)</span>
          </div>

          <div className="warehouse-cash-copy muted">
            Review fulfilment, switch status and generate shipping notes from one workspace.
          </div>

          <div className="warehouse-cash-filters">
            <div className="form-field">
              <label htmlFor="warehouse-search">Search</label>
              <input
                id="warehouse-search"
                className="catalog-search-input"
                placeholder="Y26-DUBA-0293, Ethan Petit"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="warehouse-status">Status</label>
              <select id="warehouse-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="warehouse-store">Store</label>
              <select id="warehouse-store" value={storeId} onChange={(event) => setStoreId(Number(event.target.value))}>
                <option value={0}>All stores</option>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
              </select>
            </div>
          </div>

          <div className="warehouse-cash-list">
            {loading && <div className="empty-state-card">Loading orders...</div>}
            {!loading && orders.length === 0 && <div className="empty-state-card">No order matches this filter.</div>}
            {!loading && orders.map((order) => (
              <button
                key={order.id}
                type="button"
                className={`warehouse-cash-list-item ${order.id === selectedOrderId ? 'is-active' : ''}`}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div className="warehouse-cash-list-top">
                  <strong>{order.orderNumber}</strong>
                  <span className={`status-badge ${statusTone(order.status)}`}>{order.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="warehouse-cash-list-meta">{order.deliveryAddress.fullName || 'Store customer'}</div>
                <div className="warehouse-cash-list-submeta">
                  <span>{new Date(order.createdAt).toLocaleDateString('en-GB')}</span>
                  <span>{order.store?.name || 'Main store'}</span>
                  <span>{order.pickupInStore ? 'Store pickup' : 'Delivery'}</span>
                </div>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="crm-pager row warehouse-cash-pager">
              <button className="btn-soft" disabled={page <= 1} onClick={() => refresh(page - 1).catch((reason) => setError((reason as Error).message))}>Previous</button>
              <span>Page {page}/{totalPages}</span>
              <button className="btn-soft" disabled={page >= totalPages} onClick={() => refresh(page + 1).catch((reason) => setError((reason as Error).message))}>Next</button>
            </div>
          )}
        </aside>

        <section className="panel warehouse-cash-center">
          {selectedOrder ? (
            <>
              <div className="warehouse-cash-order-head">
                <div>
                  <h2 className="pos-client-name warehouse-cash-title">{selectedOrder.orderNumber}</h2>
                  <p className="muted">Created on {new Date(selectedOrder.createdAt).toLocaleString('en-GB')}</p>
                </div>
              </div>

              <div className="panel warehouse-cash-main-card">
                <div className="warehouse-cash-main-top">
                  <div>
                    <strong>{selectedOrder.deliveryAddress.fullName || 'Store customer'}</strong>
                    <p className="muted">{selectedOrder.store?.name || 'Main store'}</p>
                  </div>
                  <div className="warehouse-cash-main-side">
                    <span className="muted">Payment</span>
                    <strong>{formatEuro(selectedOrder.total)}</strong>
                  </div>
                </div>
                <div className="warehouse-cash-main-copy muted">
                  {selectedOrder.pickupInStore
                    ? `Pickup slot: ${selectedOrder.pickupSlot ? new Date(selectedOrder.pickupSlot).toLocaleString('en-GB') : 'Not set yet'}`
                    : [selectedOrder.deliveryAddress.line1, selectedOrder.deliveryAddress.postalCode, selectedOrder.deliveryAddress.city, selectedOrder.deliveryAddress.country].filter(Boolean).join(', ') || 'No delivery address recorded'}
                </div>
                <div className="warehouse-cash-main-tags">
                  <span>{selectedOrder.pickupInStore ? 'Customer will collect in store' : 'Shipping preparation required'}</span>
                  <span>{selectedOrder.items.length > 0 ? `${selectedOrder.items.length} line(s)` : 'Gift voucher only'}</span>
                </div>
              </div>

              <div className="warehouse-cash-overview-grid">
                <div className="panel warehouse-cash-overview-card">
                  <small>Customer</small>
                  <strong>{selectedOrder.deliveryAddress.fullName || 'Store customer'}</strong>
                  <span>{selectedOrder.orderNumber}</span>
                </div>
                <div className="panel warehouse-cash-overview-card">
                  <small>Store</small>
                  <strong>{selectedOrder.store?.name || 'Main store'}</strong>
                  <span>{selectedOrder.store?.city || 'No city recorded'}</span>
                </div>
                <div className="panel warehouse-cash-overview-card">
                  <small>Fulfilment</small>
                  <strong>{selectedOrder.pickupInStore ? 'Store pickup' : 'Delivery'}</strong>
                  <span>{selectedOrder.pickupSlot ? new Date(selectedOrder.pickupSlot).toLocaleString('en-GB') : 'No pickup slot set'}</span>
                </div>
              </div>

              <div className="warehouse-cash-items panel">
                <div className="warehouse-cash-section-head">
                  <div>
                    <div className="pos-right-header">Order lines</div>
                    <p className="muted">Check product references, quantities and line amounts before shipping.</p>
                  </div>
                </div>

                <div className="warehouse-cash-item-list">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="warehouse-cash-item-card">
                      <div className="warehouse-cash-item-head">
                        <strong>{item.productName}</strong>
                        <span>{formatEuro(item.lineTotal)}</span>
                      </div>
                      <div className="warehouse-cash-item-meta">
                        <span>SKU {item.productSku}</span>
                        <span>Qty {item.quantity}</span>
                        <span>Unit {formatEuro(item.unitPrice)} HT</span>
                      </div>
                    </div>
                  ))}
                  {selectedOrder.purchasedGiftVoucher && (
                    <div className="warehouse-cash-item-card">
                      <div className="warehouse-cash-item-head">
                        <strong>Gift voucher purchase</strong>
                        <span>{formatEuro(selectedOrder.total)}</span>
                      </div>
                      <div className="warehouse-cash-item-meta">
                        <span>Code {selectedOrder.purchasedGiftVoucher.code}</span>
                        <span>Qty 1</span>
                        <span>Unit {formatEuro(selectedOrder.subTotal)} HT</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state-card">Select an order to review its fulfilment workflow.</div>
          )}
        </section>

        <aside className="panel warehouse-cash-right">
          {selectedOrder ? (
            <>
              <div className="warehouse-cash-section-head">
                <div>
                  <div className="pos-right-header">Fulfilment</div>
                  <p className="muted">Update the workflow, confirm the store context and generate warehouse documents.</p>
                </div>
              </div>

              <div className="warehouse-cash-action-block panel">
                <div className="form-field">
                  <label htmlFor="warehouse-order-status">Order status</label>
                  <select id="warehouse-order-status" value={selectedOrder.status} onChange={(event) => onChangeStatus(event.target.value)}>
                    {ORDER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </div>
                <div className="warehouse-cash-action-note">
                  <small>Next steps</small>
                  <strong>Update the order status from the selector</strong>
                  <span className="muted">
                    {selectedOrder.pickupInStore
                      ? 'Keep the pickup flow steady without changing the page structure.'
                      : 'Move the order forward from the selector, then generate the shipping note when needed.'}
                  </span>
                </div>
                <button type="button" className="warehouse-cta" onClick={onDownloadShippingNote}>Shipping note</button>
              </div>

              <div className="warehouse-cash-summary panel">
                <div className="pos-right-header">Order summary</div>
                <div className="pos-summary-list">
                  <div className="pos-subs-row"><div className="pos-subs-label">Net amount</div><div className="pos-link-btn">{formatEuro(selectedOrder.subTotal)}</div></div>
                  <div className="pos-subs-row"><div className="pos-subs-label">VAT</div><div className="pos-link-btn">{formatEuro(selectedOrder.taxTotal)}</div></div>
                  <div className="pos-subs-row"><div className="pos-subs-label">Units</div><div className="pos-link-btn">{totalUnits || (selectedOrder.purchasedGiftVoucher ? 1 : 0)}</div></div>
                </div>
                <div className="pos-net-pay">Total<strong>{formatEuro(selectedOrder.total)}</strong></div>
              </div>

              <div className="warehouse-cash-summary panel">
                <div className="pos-right-header">{selectedOrder.pickupInStore ? 'Pickup details' : 'Delivery address'}</div>
                <div className="warehouse-cash-address muted">
                  {selectedOrder.pickupInStore
                    ? 'Handled in store.'
                    : [selectedOrder.deliveryAddress.line1, selectedOrder.deliveryAddress.line2, selectedOrder.deliveryAddress.postalCode, selectedOrder.deliveryAddress.city, selectedOrder.deliveryAddress.country].filter(Boolean).join(', ') || 'No delivery address recorded.'}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state-card">Select an order to update its fulfilment workflow.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
