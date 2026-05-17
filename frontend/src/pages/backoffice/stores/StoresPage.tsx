import { useEffect, useState } from 'react';
import { createStore, deleteStore, listAdminStores, updateStore, type StoreSummary } from '../../../api/stores';
import { InlineNotification } from '../../../ui/InlineNotification';

const EMPTY_STORE = {
  name: '',
  code: '',
  email: '',
  phoneNumber: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  city: '',
  country: 'France',
  status: 'active',
  themeColor: 'soft',
};

export function StoresPage() {
  const [rows, setRows] = useState<StoreSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<StoreSummary | null>(null);
  const [form, setForm] = useState(EMPTY_STORE);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(targetPage = page, search = query) {
    const params = new URLSearchParams({ page: String(targetPage), perPage: '12' });
    if (search.trim()) params.set('q', search.trim());
    const result = await listAdminStores(params);
    setRows(result.data);
    setPage(result.meta.page);
    setTotalPages(result.meta.totalPages);

    setSelected((current) => {
      if (!current) {
        return null;
      }

      return result.data.find((store) => store.id === current.id) ?? null;
    });
  }

  useEffect(() => {
    load(1).catch((reason) => setError((reason as Error).message));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      load(1, query).catch((reason) => setError((reason as Error).message));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  function startCreate() {
    setSelected(null);
    setForm(EMPTY_STORE);
    setShowForm(true);
  }

  function startEdit(store: StoreSummary) {
    setSelected(store);
    setForm({
      name: store.name,
      code: store.code,
      email: store.email || '',
      phoneNumber: store.phoneNumber || '',
      addressLine1: store.addressLine1 || '',
      addressLine2: store.addressLine2 || '',
      postalCode: store.postalCode || '',
      city: store.city || '',
      country: store.country || '',
      status: store.status,
      themeColor: store.themeColor,
    });
    setShowForm(true);
  }

  async function submit() {
    setError(null);
    setMessage(null);
    try {
      if (selected) {
        const updated = await updateStore(selected.id, form);
        setSelected(updated);
        setMessage('Store updated.');
      } else {
        await createStore(form);
        setMessage('Store created.');
      }
      await load(1, query);
      setShowForm(false);
      setSelected(null);
      setForm(EMPTY_STORE);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function handleDelete(store: StoreSummary) {
    setError(null);
    setMessage(null);

    try {
      await deleteStore(store.id);
      setMessage('Store deleted.');
      setSelected(null);
      setShowForm(false);
      setForm(EMPTY_STORE);
      await load(1, query);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <div className="stack">
      <section className="panel ecommerce-hero-card">
        <div className="ecommerce-hero-head">
          <div>
            <span className="eyebrow">Stores</span>
            <h2 className="ecommerce-title">Chain store management</h2>
            <p className="muted">Manage the locations customers can choose across booking, pickup and loyalty journeys.</p>
          </div>
          <button className="planning-action-btn planning-action-btn-primary" onClick={startCreate}>New store</button>
        </div>
      </section>
      {message && <InlineNotification tone="success" title="Saved" message={message} />}
      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}

      <section className="panel">
        <div className="catalog-toolbar">
          <div className="form-field">
            <label htmlFor="stores-search">Search</label>
            <input id="stores-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, code or city" />
          </div>
        </div>
      </section>

      <div className="customers-layout entity-directory-layout">
        <section className="panel customers-list-panel entity-list-panel">
          <div className="customers-list entity-list-scroll">
            {rows.map((store) => (
              <button
                key={store.id}
                type="button"
                className={`customers-list-item entity-list-item ${selected?.id === store.id ? 'is-active' : ''}`}
                onClick={() => setSelected(store)}
              >
                <strong className="customers-list-item-name">{store.name}</strong>
                <span className="customers-list-item-email">{store.code}</span>
                <small className="customers-list-item-phone">{store.city || 'No city'} · {store.country || 'No country'} · {store.status}</small>
              </button>
            ))}
          </div>
          <div className="crm-pager row">
            <button className="btn-soft" disabled={page <= 1} onClick={() => load(page - 1, query)}>Previous</button>
            <span>Page {page}/{totalPages}</span>
            <button className="btn-soft" disabled={page >= totalPages} onClick={() => load(page + 1, query)}>Next</button>
          </div>
        </section>

        <section className="panel stack entity-detail-panel store-detail-panel">
          <div className="profile-section-head">
            <div>
              <h3>{selected ? 'Selected store' : 'Store details'}</h3>
              <p className="muted">
                {selected
                  ? 'Review the location details, quick contact information and deletion status at a glance.'
                  : 'Click a store on the left to review the location in a tighter summary card.'}
              </p>
            </div>
            {selected && (
              <div className="store-detail-actions">
                {selected.canDelete && (
                  <button className="planning-action-btn planning-action-btn-danger" onClick={() => handleDelete(selected)}>
                    Delete store
                  </button>
                )}
                <button className="planning-action-btn" onClick={() => startEdit(selected)}>Edit store</button>
              </div>
            )}
          </div>

          {!selected ? (
            <div className="empty-state-card store-detail-empty">
              <strong>No store selected yet</strong>
              <span>Choose a store from the list or create a new one to manage the location.</span>
            </div>
          ) : (
            <div className="store-detail-stack">
              <article className="store-detail-hero">
                <div className="store-detail-title">
                  <strong>{selected.name}</strong>
                  <span>{selected.code}</span>
                </div>
                <div className="store-detail-meta">
                  <span className="store-detail-badge">{selected.status}</span>
                  <span className="store-detail-badge store-detail-badge-muted">{selected.themeColor} theme</span>
                </div>
              </article>

              <div className="customer-file-columns store-detail-grid">
                <article className="customer-file-item-card store-detail-card">
                  <small className="store-detail-label">Contact</small>
                  <strong>{selected.email || 'No email yet'}</strong>
                  <span>{selected.phoneNumber || 'No phone number yet'}</span>
                </article>
                <article className="customer-file-item-card store-detail-card">
                  <small className="store-detail-label">Location</small>
                  <strong>{selected.city || 'No city'}</strong>
                  <span>{selected.country || 'No country'}</span>
                  <small>{selected.postalCode || 'No postal code'}</small>
                </article>
                <article className="customer-file-item-card store-detail-card">
                  <small className="store-detail-label">Address</small>
                  <strong>{selected.addressLine1 || 'No address line 1'}</strong>
                  <span>{selected.addressLine2 || 'No address line 2'}</span>
                </article>
              </div>

              <article className="customer-file-item-card store-usage-card">
                <div className="store-usage-head">
                  <div>
                    <small className="store-detail-label">Deletion rule</small>
                    <strong>{selected.canDelete ? 'This store can be deleted' : 'This store is protected'}</strong>
                  </div>
                  <span className={`store-usage-pill ${selected.canDelete ? 'is-safe' : 'is-locked'}`}>
                    {selected.linkCount} linked record{selected.linkCount > 1 ? 's' : ''}
                  </span>
                </div>
                <span className="muted">
                  {selected.canDelete
                    ? 'No customer, employee, booking, order or review has ever been attached to this store.'
                    : 'A store with existing history stays protected so reporting, orders and customer data remain consistent.'}
                </span>
              </article>
            </div>
          )}
        </section>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-card crm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row crm-modal-head">
              <h3>{selected ? 'Edit store' : 'Create store'}</h3>
              <button type="button" className="btn-soft" onClick={() => setShowForm(false)}>Close</button>
            </div>
            <div className="form-grid">
              <div className="form-field"><label>Name</label><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Seanergy Paris Centre" /></div>
              <div className="form-field"><label>Code</label><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="PARIS-CENTRE" /></div>
              <div className="form-field"><label>Email</label><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="paris@procuratio.local" /></div>
              <div className="form-field"><label>Phone number</label><input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} placeholder="+33..." /></div>
              <div className="form-field"><label>Address line 1</label><input value={form.addressLine1} onChange={(event) => setForm({ ...form, addressLine1: event.target.value })} placeholder="12 Main Avenue" /></div>
              <div className="form-field"><label>Address line 2</label><input value={form.addressLine2} onChange={(event) => setForm({ ...form, addressLine2: event.target.value })} placeholder="Floor, district..." /></div>
              <div className="form-field"><label>Postal code</label><input value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} placeholder="75001" /></div>
              <div className="form-field"><label>City</label><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Paris" /></div>
              <div className="form-field"><label>Country</label><input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} placeholder="France" /></div>
              <div className="form-field"><label>Status</label><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Active</option><option value="archived">Archived</option></select></div>
              <div className="form-field"><label>Theme color</label><select value={form.themeColor} onChange={(event) => setForm({ ...form, themeColor: event.target.value })}><option value="soft">Soft</option><option value="ocean">Ocean</option><option value="sunset">Sunset</option><option value="dark">Dark</option></select></div>
            </div>
            <div className="row">
              <button className="planning-action-btn planning-action-btn-primary" onClick={submit}>{selected ? 'Save store' : 'Create store'}</button>
              <button className="planning-action-btn" onClick={startCreate}>Reset</button>
              {selected?.canDelete && (
                <button className="planning-action-btn planning-action-btn-danger" onClick={() => handleDelete(selected)}>
                  Delete store
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
