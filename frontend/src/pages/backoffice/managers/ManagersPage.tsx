import { useEffect, useState } from 'react';
import { createManager, listManagers, updateManager, type ManagerAdmin } from '../../../api/managers';
import { listPublicStores, type StoreSummary } from '../../../api/stores';
import { InlineNotification } from '../../../ui/InlineNotification';

const EMPTY_FORM = {
  fullName: '',
  email: '',
  password: '',
  storeId: '',
  jobTitle: '',
  phoneNumber: '',
  status: 'active',
};

export function ManagersPage() {
  const [rows, setRows] = useState<ManagerAdmin[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalManagers, setTotalManagers] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [storeId, setStoreId] = useState('');
  const [selected, setSelected] = useState<ManagerAdmin | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(targetPage = page, search = query, targetStatus = status, targetStoreId = storeId) {
    const params = new URLSearchParams({ page: String(targetPage), perPage: '6' });
    if (search.trim()) params.set('q', search.trim());
    if (targetStatus) params.set('status', targetStatus);
    if (targetStoreId) params.set('storeId', targetStoreId);

    const [managersResult, storesResult] = await Promise.all([
      listManagers(params),
      listPublicStores(),
    ]);

    setRows(managersResult.data);
    setPage(managersResult.meta.page);
    setTotalPages(managersResult.meta.totalPages);
    setTotalManagers(managersResult.meta.total);
    setStores(storesResult.data);

    setSelected((current) => {
      if (!current) {
        return null;
      }

      return managersResult.data.find((manager) => manager.id === current.id) ?? null;
    });
  }

  useEffect(() => {
    load(1).catch((reason) => setError((reason as Error).message));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      load(1, query, status, storeId).catch((reason) => setError((reason as Error).message));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [query, status, storeId]);

  function startCreate() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(manager: ManagerAdmin) {
    setSelected(manager);
    setForm({
      fullName: manager.fullName,
      email: manager.email,
      password: '',
      storeId: manager.store?.id ? String(manager.store.id) : '',
      jobTitle: manager.jobTitle || '',
      phoneNumber: manager.phoneNumber || '',
      status: manager.status,
    });
    setShowForm(true);
  }

  async function submit() {
    setError(null);
    setMessage(null);
    try {
      if (selected) {
        await updateManager(selected.id, {
          fullName: form.fullName,
          email: form.email,
          password: form.password || undefined,
          storeId: form.storeId ? Number(form.storeId) : null,
          jobTitle: form.jobTitle || null,
          phoneNumber: form.phoneNumber || null,
          status: form.status,
        });
        setMessage('Manager updated.');
      } else {
        await createManager({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          storeId: form.storeId ? Number(form.storeId) : null,
          jobTitle: form.jobTitle || undefined,
          phoneNumber: form.phoneNumber || undefined,
          status: form.status,
        });
        setMessage('Manager created.');
      }
      await load(1, query, status, storeId);
      setShowForm(false);
      setSelected(null);
      setForm(EMPTY_FORM);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <div className="stack">
      <section className="panel ecommerce-hero-card">
        <div className="ecommerce-hero-head">
          <div>
            <p className="muted">Manage back-office managers separately from operational employees.</p>
          </div>
          <div className="row">
            <span className="catalog-count-pill">{totalManagers} managers</span>
            <button className="planning-action-btn planning-action-btn-primary" onClick={startCreate}>New manager</button>
          </div>
        </div>
      </section>

      {message && <InlineNotification tone="success" title="Saved" message={message} />}
      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}

      <section className="panel">
        <div className="catalog-toolbar">
          <div className="form-field">
            <label htmlFor="managers-search">Search</label>
            <input id="managers-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Admin John, admin@procuratio.local, Regional Manager" />
          </div>
          <div className="form-field">
            <label htmlFor="managers-status">Status</label>
            <select id="managers-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On leave</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="managers-store">Store</label>
            <select id="managers-store" value={storeId} onChange={(event) => setStoreId(event.target.value)}>
              <option value="">All stores</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div className="customers-layout entity-directory-layout">
        <section className="panel customers-list-panel entity-list-panel">
          <div className="customers-list entity-list-scroll">
            {rows.map((manager) => (
              <button
                key={manager.id}
                type="button"
                className={`customers-list-item entity-list-item ${selected?.id === manager.id ? 'is-active' : ''}`}
                onClick={() => setSelected(manager)}
              >
                <strong className="customers-list-item-name">{manager.fullName}</strong>
                <span className="customers-list-item-email">{manager.email}</span>
                <small className="customers-list-item-phone">
                  {(manager.jobTitle || 'Manager account')} · {(manager.store?.name || 'No store')} · {manager.status}
                </small>
              </button>
            ))}
          </div>
          <div className="crm-pager row">
            <button className="btn-soft" disabled={page <= 1} onClick={() => load(page - 1, query, status, storeId)}>Previous</button>
            <span>Page {page}/{totalPages}</span>
            <button className="btn-soft" disabled={page >= totalPages} onClick={() => load(page + 1, query, status, storeId)}>Next</button>
          </div>
        </section>

        <section className="panel stack entity-detail-panel store-detail-panel">
          <div className="profile-section-head entity-detail-head">
            <div>
              <h3>{selected ? 'Selected manager' : 'Manager details'}</h3>
              <p className="muted">
                {selected
                  ? 'Review the account, assignment and access context before opening the editing modal.'
                  : 'Click a manager on the left to review the profile in a tighter summary card.'}
              </p>
            </div>
            {selected && <button className="planning-action-btn" onClick={() => startEdit(selected)}>Edit manager</button>}
          </div>

          {!selected ? (
            <div className="empty-state-card store-detail-empty">
              <strong>No manager selected yet</strong>
              <span>Choose a manager from the list or create a new one to manage the account.</span>
            </div>
          ) : (
            <div className="store-detail-stack">
              <article className="store-detail-hero">
                <div className="store-detail-title">
                  <strong>{selected.fullName}</strong>
                  <span>{selected.email}</span>
                </div>
                <div className="store-detail-meta">
                  <span className="store-detail-badge">{selected.status}</span>
                  <span className="store-detail-badge store-detail-badge-muted">Manager access</span>
                </div>
              </article>

              <div className="customer-file-columns store-detail-grid">
                <article className="customer-file-item-card store-detail-card">
                  <small className="store-detail-label">Contact</small>
                  <strong>{selected.phoneNumber || 'No phone number yet'}</strong>
                  <span>{selected.email}</span>
                </article>
                <article className="customer-file-item-card store-detail-card">
                  <small className="store-detail-label">Responsibility</small>
                  <strong>{selected.jobTitle || 'Manager account'}</strong>
                  <span>{selected.store?.name || 'No store assigned'}</span>
                </article>
                <article className="customer-file-item-card store-detail-card">
                  <small className="store-detail-label">Profile state</small>
                  <strong>{selected.archivedAt ? 'Archived profile' : 'Operational profile'}</strong>
                  <span>{selected.archivedAt || 'No archive date'}</span>
                </article>
              </div>

              <article className="customer-file-item-card store-usage-card">
                <div className="store-usage-head">
                  <div>
                    <small className="store-detail-label">Access level</small>
                    <strong>Back-office manager access</strong>
                  </div>
                  <span className="store-usage-pill is-safe">Manager</span>
                </div>
                <span className="muted">
                  This account is reserved for management operations and is intentionally separated from the operational employee directory.
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
              <h3>{selected ? 'Edit manager' : 'Create manager'}</h3>
              <button type="button" className="btn-soft" onClick={() => setShowForm(false)}>Close</button>
            </div>
            <div className="form-grid">
              <div className="form-field"><label>Full name</label><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Emma Carter" /></div>
              <div className="form-field"><label>Email</label><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="manager@procuratio.local" /></div>
              <div className="form-field"><label>Password</label><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={selected ? 'Leave empty to keep current password' : 'Manager2026!'} /></div>
              <div className="form-field"><label>Store</label><select value={form.storeId} onChange={(event) => setForm({ ...form, storeId: event.target.value })}><option value="">No store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></div>
              <div className="form-field"><label>Title</label><input value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} placeholder="Regional Manager" /></div>
              <div className="form-field"><label>Phone number</label><input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} placeholder="+33..." /></div>
              <div className="form-field"><label>Status</label><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Active</option><option value="on_leave">On leave</option><option value="archived">Archived</option></select></div>
            </div>
            <div className="row">
              <button className="planning-action-btn planning-action-btn-primary" onClick={submit}>{selected ? 'Save changes' : 'Create manager'}</button>
              <button className="planning-action-btn" onClick={startCreate}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
