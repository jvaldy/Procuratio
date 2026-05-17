import { useEffect, useMemo, useState } from 'react';
import { createBackofficeCustomer, getBackofficeCustomer, listBackofficeCustomers } from '../../../api/customers';
import { listPublicStores, type StoreSummary } from '../../../api/stores';
import type { CustomerFile, CustomerListItem } from '../../../types/customers';
import { InlineNotification } from '../../../ui/InlineNotification';
import { formatDateOnly, formatDateTime, formatEuro, formatOrderStatus } from '../../../utils/pricing';

export function CustomersPage() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerFile | null>(null);
  const [listMeta, setListMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    birthDate: '',
    preferredStoreId: '',
  });

  async function loadCustomers(page = 1, search = query) {
    setLoadingList(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '12',
      });
      if (search.trim()) {
        params.set('q', search.trim());
      }
      const response = await listBackofficeCustomers(params);
      setCustomers(response.data);
      setListMeta({
        page: response.meta.page,
        totalPages: response.meta.totalPages,
        total: response.meta.total,
      });
      if (!selectedCustomerId && response.data[0]) {
        setSelectedCustomerId(response.data[0].id);
      }
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoadingList(false);
    }
  }

  async function loadCustomerDetail(customerId: number) {
    setLoadingDetail(true);
    setError(null);
    try {
      setSelectedCustomer(await getBackofficeCustomer(customerId));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    listPublicStores().then((response) => setStores(response.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadCustomers(1, query).catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    loadCustomerDetail(selectedCustomerId).catch(() => undefined);
  }, [selectedCustomerId]);

  const selectedListItem = useMemo(
    () => customers.find((item) => item.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  return (
    <div className="stack">
      <section className="panel ecommerce-hero-card">
        <div className="ecommerce-hero-head">
          <div>
            <span className="eyebrow">Customers</span>
            <h2 className="ecommerce-title">Unified customer file</h2>
            <p className="muted">Keep identity, purchases, loyalty, gift vouchers and appointments in one back-office view.</p>
          </div>
          <div className="row">
            <span className="catalog-count-pill">{listMeta.total} customers</span>
            <button className="planning-action-btn planning-action-btn-primary" onClick={() => setShowCreate(true)}>New customer</button>
          </div>
        </div>
      </section>

      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}

      <div className="customers-layout">
        <aside className="panel customers-list-panel">
          <div className="customers-list-head">
            <div>
              <h3>Customer list</h3>
              <p className="muted">Search by name, email or phone number.</p>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="customers-search">Search</label>
            <input
              id="customers-search"
              value={query}
              placeholder="Example: Sarah, sarah@mail.com, 0612345678"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {loadingList && <div className="empty-state-card">Loading customers...</div>}
          {!loadingList && customers.length === 0 && <div className="empty-state-card">No customer matches this search.</div>}
          {!loadingList && customers.length > 0 && (
            <div className="customers-list">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className={`customers-list-item ${selectedCustomerId === customer.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <strong className="customers-list-item-name">{customer.fullName}</strong>
                  <span className="customers-list-item-email">{customer.email}</span>
                  <small className="customers-list-item-phone">{customer.phoneNumber || 'No phone number'}</small>
                </button>
              ))}
            </div>
          )}

          <div className="crm-pager row">
            <button className="btn-soft" disabled={listMeta.page <= 1} onClick={() => loadCustomers(listMeta.page - 1, query)}>
              Previous
            </button>
            <span>Page {listMeta.page}/{listMeta.totalPages}</span>
            <button className="btn-soft" disabled={listMeta.page >= listMeta.totalPages} onClick={() => loadCustomers(listMeta.page + 1, query)}>
              Next
            </button>
          </div>
        </aside>

        <section className="stack">
          {loadingDetail && <div className="panel">Loading customer file...</div>}
          {!loadingDetail && !selectedCustomer && selectedListItem && <div className="panel">Select a customer to load the file.</div>}

          {selectedCustomer && (
            <>
              <section className="panel customer-file-head">
                <div>
                  <span className="eyebrow">Customer file</span>
                  <h3>{selectedCustomer.customer.fullName}</h3>
                  <p className="muted">{selectedCustomer.customer.email}</p>
                </div>
                <div className="customer-file-identity">
                  <span>{selectedCustomer.customer.phoneNumber || 'No phone number'}</span>
                  <span>{selectedCustomer.customer.birthDate ? formatDateOnly(selectedCustomer.customer.birthDate) : 'No birth date'}</span>
                </div>
              </section>

              <section className="customer-summary-grid">
                <article className="panel summary-tile"><span>POS sales</span><strong>{selectedCustomer.summary.salesCount}</strong></article>
                <article className="panel summary-tile"><span>Web orders</span><strong>{selectedCustomer.summary.ordersCount}</strong></article>
                <article className="panel summary-tile"><span>Upcoming appointments</span><strong>{selectedCustomer.summary.upcomingAppointmentsCount}</strong></article>
                <article className="panel summary-tile"><span>Loyalty points</span><strong>{selectedCustomer.summary.loyaltyPoints}</strong></article>
              </section>

              <div className="customer-file-grid">
                <section className="panel stack">
                  <div className="profile-section-head">
                    <div>
                      <h3>Appointments</h3>
                      <p className="muted">Upcoming and recent visits for this customer.</p>
                    </div>
                  </div>
                  <div className="customer-file-columns">
                    <div>
                      <h4>Upcoming</h4>
                      {selectedCustomer.appointments.upcoming.length === 0 ? <div className="empty-state-card">No upcoming appointment.</div> : selectedCustomer.appointments.upcoming.map((appointment) => (
                        <article key={appointment.id} className="customer-file-item-card">
                          <strong>{formatDateTime(appointment.startAt)}</strong>
                          <span>{appointment.employee.fullName}</span>
                          <small>{appointment.services.map((item) => item.serviceName).join(', ')}</small>
                        </article>
                      ))}
                    </div>
                    <div>
                      <h4>Recent history</h4>
                      {selectedCustomer.appointments.history.length === 0 ? <div className="empty-state-card">No appointment history.</div> : selectedCustomer.appointments.history.slice(0, 6).map((entry) => (
                        <article key={entry.id} className="customer-file-item-card">
                          <strong>{entry.toStatus}</strong>
                          <span>{formatDateTime(entry.createdAt)}</span>
                          <small>{entry.reason || entry.changedBy}</small>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="panel stack">
                  <div className="profile-section-head">
                    <div>
                      <h3>Loyalty and gift vouchers</h3>
                      <p className="muted">Track points, gift cards and customer credit at a glance.</p>
                    </div>
                  </div>
                  <div className="customer-file-columns">
                    <div>
                      <h4>Loyalty</h4>
                      <div className="summary-tile customer-loyalty-tile">
                        <span>Points balance</span>
                        <strong>{selectedCustomer.loyalty.account?.pointsBalance ?? 0}</strong>
                      </div>
                      {selectedCustomer.loyalty.account?.subscriptionName && (
                        <article className="customer-file-item-card">
                          <strong>{selectedCustomer.loyalty.account.subscriptionName}</strong>
                          <span>Subscription {selectedCustomer.loyalty.account.subscriptionStatus}</span>
                          <small>
                            {selectedCustomer.loyalty.account.subscriptionEndsAt
                              ? `Ends ${formatDateOnly(selectedCustomer.loyalty.account.subscriptionEndsAt)}`
                              : 'No subscription end date'}
                          </small>
                        </article>
                      )}
                      {selectedCustomer.loyalty.account?.visitCardName && (
                        <article className="customer-file-item-card">
                          <strong>{selectedCustomer.loyalty.account.visitCardName}</strong>
                          <span>
                            {selectedCustomer.loyalty.account.visitCardUsed}/{selectedCustomer.loyalty.account.visitCardTarget ?? 0} visits used
                          </span>
                          <small>{selectedCustomer.loyalty.account.visitCardActive ? 'Visit card active' : 'Visit card inactive'}</small>
                        </article>
                      )}
                      {selectedCustomer.loyalty.events.slice(0, 6).map((event) => (
                        <article key={event.id} className="customer-file-item-card">
                          <strong>{event.eventType}</strong>
                          <span>{event.pointsDelta > 0 ? `+${event.pointsDelta}` : event.pointsDelta} pts</span>
                          <small>{event.reason || formatDateTime(event.createdAt)}</small>
                        </article>
                      ))}
                    </div>
                    <div>
                      <h4>Gift vouchers</h4>
                      {selectedCustomer.giftVouchers.length === 0 ? <div className="empty-state-card">No gift voucher linked.</div> : selectedCustomer.giftVouchers.slice(0, 6).map((voucher) => (
                        <article key={voucher.id} className="customer-file-item-card">
                          <strong>{voucher.code}</strong>
                          <span>{formatEuro(voucher.balanceAmount)} available</span>
                          <small>{voucher.recipientName || voucher.serviceLabel || voucher.status}</small>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="panel stack">
                  <div className="profile-section-head">
                    <div>
                      <h3>Purchases</h3>
                      <p className="muted">Recent POS receipts and web orders.</p>
                    </div>
                  </div>
                  <div className="customer-file-columns">
                    <div>
                      <h4>POS receipts</h4>
                      {selectedCustomer.sales.length === 0 ? <div className="empty-state-card">No POS sale yet.</div> : selectedCustomer.sales.slice(0, 6).map((sale) => (
                        <article key={sale.id} className="customer-file-item-card">
                          <strong>{sale.receiptNumber || `Sale #${sale.id}`}</strong>
                          <span>{formatEuro(sale.total)} - {formatOrderStatus(sale.paymentStatus)}</span>
                          <small>{formatDateTime(sale.createdAt)}</small>
                        </article>
                      ))}
                    </div>
                    <div>
                      <h4>Web orders</h4>
                      {selectedCustomer.orders.length === 0 ? <div className="empty-state-card">No web order yet.</div> : selectedCustomer.orders.slice(0, 6).map((order) => (
                        <article key={order.id} className="customer-file-item-card">
                          <strong>{order.orderNumber}</strong>
                          <span>{formatEuro(order.total)} - {formatOrderStatus(order.status)}</span>
                          <small>{formatDateTime(order.createdAt)}</small>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="panel stack">
                  <div className="profile-section-head">
                    <div>
                      <h3>Notification history</h3>
                      <p className="muted">Latest campaign, reminder or birthday communication logs.</p>
                    </div>
                  </div>
                  {selectedCustomer.notifications.length === 0 ? <div className="empty-state-card">No notification log for this customer.</div> : (
                    <div className="customer-file-columns">
                      {selectedCustomer.notifications.slice(0, 8).map((log) => (
                        <article key={log.id} className="customer-file-item-card">
                          <strong>{log.kind}</strong>
                          <span>{log.channel} - {log.status}</span>
                          <small>{formatDateTime(log.createdAt)}</small>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </section>
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-card crm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row crm-modal-head">
              <h3>Create customer</h3>
              <button type="button" className="btn-soft" onClick={() => setShowCreate(false)}>Close</button>
            </div>
            <div className="form-grid">
              <div className="form-field"><label>Full name</label><input value={createForm.fullName} onChange={(event) => setCreateForm({ ...createForm, fullName: event.target.value })} placeholder="Example: Sarah Miller" /></div>
              <div className="form-field"><label>Email</label><input value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} placeholder="sarah@customer.com" /></div>
              <div className="form-field"><label>Password</label><input type="password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} placeholder="Temporary password" /></div>
              <div className="form-field"><label>Phone number</label><input value={createForm.phoneNumber} onChange={(event) => setCreateForm({ ...createForm, phoneNumber: event.target.value })} placeholder="+33..." /></div>
              <div className="form-field"><label>Birth date</label><input type="date" value={createForm.birthDate} onChange={(event) => setCreateForm({ ...createForm, birthDate: event.target.value })} /></div>
              <div className="form-field"><label>Preferred store</label><select value={createForm.preferredStoreId} onChange={(event) => setCreateForm({ ...createForm, preferredStoreId: event.target.value })}><option value="">No preferred store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></div>
            </div>
            <div className="row">
              <button
                className="planning-action-btn planning-action-btn-primary"
                onClick={async () => {
                  try {
                    setError(null);
                    await createBackofficeCustomer({
                      fullName: createForm.fullName,
                      email: createForm.email,
                      password: createForm.password,
                      phoneNumber: createForm.phoneNumber || undefined,
                      birthDate: createForm.birthDate || undefined,
                      preferredStoreId: createForm.preferredStoreId ? Number(createForm.preferredStoreId) : undefined,
                    });
                    setShowCreate(false);
                    setCreateForm({ fullName: '', email: '', password: '', phoneNumber: '', birthDate: '', preferredStoreId: '' });
                    await loadCustomers(1, query);
                  } catch (reason) {
                    setError((reason as Error).message);
                  }
                }}
              >
                Create customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
