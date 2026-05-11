import { useEffect, useState } from 'react';
import { createStore, listAdminStores, updateStore, type StoreSummary } from '../../../api/stores';
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(targetPage = page) {
    const params = new URLSearchParams({ page: String(targetPage), perPage: '12' });
    if (query.trim()) params.set('q', query.trim());
    const result = await listAdminStores(params);
    setRows(result.data);
    setPage(result.meta.page);
    setTotalPages(result.meta.totalPages);
  }

  useEffect(() => {
    load(1).catch((reason) => setError((reason as Error).message));
  }, []);

  function startCreate() {
    setSelected(null);
    setForm(EMPTY_STORE);
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
  }

  async function submit() {
    setError(null);
    setMessage(null);
    try {
      if (selected) {
        await updateStore(selected.id, form);
        setMessage('Store updated.');
      } else {
        await createStore(form);
        setMessage('Store created.');
      }
      await load(1);
      startCreate();
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
          <button className="btn-soft" onClick={() => load(1)}>Search</button>
        </div>
      </section>

      <div className="customers-layout">
        <section className="panel customers-list-panel">
          <div className="customers-list">
            {rows.map((store) => (
              <button key={store.id} type="button" className={`customers-list-item ${selected?.id === store.id ? 'is-active' : ''}`} onClick={() => startEdit(store)}>
                <strong>{store.name}</strong>
                <span>{store.code}</span>
                <small>{store.city || 'No city'} · {store.status}</small>
              </button>
            ))}
          </div>
          <div className="crm-pager row">
            <button className="btn-soft" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
            <span>Page {page}/{totalPages}</span>
            <button className="btn-soft" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next</button>
          </div>
        </section>

        <section className="panel stack">
          <div className="profile-section-head">
            <div>
              <h3>{selected ? 'Edit store' : 'Create store'}</h3>
              <p className="muted">Each store can be referenced by employees, customers, pickup orders and appointments.</p>
            </div>
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
          </div>
        </section>
      </div>
    </div>
  );
}
