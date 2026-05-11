import { useEffect, useState } from 'react';
import { createEmployee, listEmployees, updateEmployee, type EmployeeAdmin } from '../../../api/employees';
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
  isBookable: true,
};

export function EmployeesPage() {
  const [rows, setRows] = useState<EmployeeAdmin[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [storeId, setStoreId] = useState('');
  const [selected, setSelected] = useState<EmployeeAdmin | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(targetPage = page) {
    const params = new URLSearchParams({ page: String(targetPage), perPage: '12' });
    if (query.trim()) params.set('q', query.trim());
    if (status) params.set('status', status);
    if (storeId) params.set('storeId', storeId);
    const [employeesResult, storesResult] = await Promise.all([
      listEmployees(params),
      listPublicStores(),
    ]);
    setRows(employeesResult.data);
    setPage(employeesResult.meta.page);
    setTotalPages(employeesResult.meta.totalPages);
    setStores(storesResult.data);
  }

  useEffect(() => {
    load(1).catch((reason) => setError((reason as Error).message));
  }, []);

  function startCreate() {
    setSelected(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(employee: EmployeeAdmin) {
    setSelected(employee);
    setForm({
      fullName: employee.fullName,
      email: employee.email,
      password: '',
      storeId: employee.store?.id ? String(employee.store.id) : '',
      jobTitle: employee.jobTitle || '',
      phoneNumber: employee.phoneNumber || '',
      status: employee.status,
      isBookable: employee.isBookable,
    });
  }

  async function submit() {
    setError(null);
    setMessage(null);
    try {
      if (selected) {
        await updateEmployee(selected.id, {
          fullName: form.fullName,
          email: form.email,
          password: form.password || undefined,
          storeId: form.storeId ? Number(form.storeId) : null,
          jobTitle: form.jobTitle || null,
          phoneNumber: form.phoneNumber || null,
          status: form.status,
          isBookable: form.isBookable,
        });
        setMessage('Employee updated.');
      } else {
        await createEmployee({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          storeId: Number(form.storeId),
          jobTitle: form.jobTitle || undefined,
          phoneNumber: form.phoneNumber || undefined,
          status: form.status,
          isBookable: form.isBookable,
        });
        setMessage('Employee created.');
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
            <span className="eyebrow">Employees</span>
            <h2 className="ecommerce-title">Employee management</h2>
            <p className="muted">Create, update, archive and organise employees by store.</p>
          </div>
          <button className="planning-action-btn planning-action-btn-primary" onClick={startCreate}>New employee</button>
        </div>
      </section>

      {message && <InlineNotification tone="success" title="Saved" message={message} />}
      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}

      <section className="panel">
        <div className="catalog-toolbar">
          <div className="form-field">
            <label htmlFor="employees-search">Search</label>
            <input id="employees-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email or title" />
          </div>
          <div className="form-field">
            <label htmlFor="employees-status">Status</label>
            <select id="employees-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On leave</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="employees-store">Store</label>
            <select id="employees-store" value={storeId} onChange={(event) => setStoreId(event.target.value)}>
              <option value="">All stores</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </div>
          <button className="btn-soft" onClick={() => load(1)}>Apply filters</button>
        </div>
      </section>

      <div className="customers-layout">
        <section className="panel customers-list-panel">
          <div className="customers-list">
            {rows.map((employee) => (
              <button key={employee.id} type="button" className={`customers-list-item ${selected?.id === employee.id ? 'is-active' : ''}`} onClick={() => startEdit(employee)}>
                <strong>{employee.fullName}</strong>
                <span>{employee.email}</span>
                <small>{employee.store?.name || 'No store'} · {employee.status}</small>
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
              <h3>{selected ? 'Edit employee' : 'Create employee'}</h3>
              <p className="muted">Archived employees remain in history but are removed from operational booking lists.</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-field"><label>Full name</label><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Example: Emma Carter" /></div>
            <div className="form-field"><label>Email</label><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="emma@procuratio.local" /></div>
            <div className="form-field"><label>Password</label><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={selected ? 'Leave empty to keep current password' : 'Temporary password'} /></div>
            <div className="form-field"><label>Store</label><select value={form.storeId} onChange={(event) => setForm({ ...form, storeId: event.target.value })}><option value="">Select a store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></div>
            <div className="form-field"><label>Job title</label><input value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} placeholder="Hair stylist" /></div>
            <div className="form-field"><label>Phone number</label><input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} placeholder="+33..." /></div>
            <div className="form-field"><label>Status</label><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Active</option><option value="on_leave">On leave</option><option value="archived">Archived</option></select></div>
            <div className="form-field"><label>Bookable</label><select value={form.isBookable ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, isBookable: event.target.value === 'yes' })}><option value="yes">Yes</option><option value="no">No</option></select></div>
          </div>
          <div className="row">
            <button className="planning-action-btn planning-action-btn-primary" onClick={submit}>{selected ? 'Save changes' : 'Create employee'}</button>
            <button className="planning-action-btn" onClick={startCreate}>Reset</button>
          </div>
        </section>
      </div>
    </div>
  );
}
