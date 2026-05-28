import { useEffect, useState } from 'react';
import { createEmployee, listEmployees, resetEmployeePassword, updateEmployee, type EmployeeAdmin } from '../../../api/employees';
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
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [storeId, setStoreId] = useState('');
  const [selected, setSelected] = useState<EmployeeAdmin | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(targetPage = page, search = query, targetStatus = status, targetStoreId = storeId) {
    const params = new URLSearchParams({ page: String(targetPage), perPage: '6' });
    if (search.trim()) params.set('q', search.trim());
    if (targetStatus) params.set('status', targetStatus);
    if (targetStoreId) params.set('storeId', targetStoreId);
    const [employeesResult, storesResult] = await Promise.all([
      listEmployees(params),
      listPublicStores(),
    ]);
    setRows(employeesResult.data);
    setPage(employeesResult.meta.page);
    setTotalPages(employeesResult.meta.totalPages);
    setTotalEmployees(employeesResult.meta.total);
    setStores(storesResult.data);

    setSelected((current) => {
      if (!current) {
        return null;
      }

      return employeesResult.data.find((employee) => employee.id === current.id) ?? null;
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
    setShowForm(true);
  }

  async function submit() {
    setError(null);
    setMessage(null);
    setTemporaryPassword(null);
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
      await load(1, query, status, storeId);
      setShowForm(false);
      setSelected(null);
      setForm(EMPTY_FORM);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function regeneratePassword(employee: EmployeeAdmin) {
    setError(null);
    try {
      const result = await resetEmployeePassword(employee.id);
      setMessage(`${result.message} Share it securely, then ask the employee to change it from the profile page.`);
      setTemporaryPassword(result.temporaryPassword);
      await load(page, query, status, storeId);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <div className="stack">
      <section className="panel ecommerce-hero-card">
        <div className="ecommerce-hero-head">
          <div>
            <p className="muted">Create, update, archive and organise employees by store.</p>
          </div>
          <div className="row">
            <span className="catalog-count-pill">{totalEmployees} employees</span>
            <button className="planning-action-btn planning-action-btn-primary" onClick={startCreate}>New employee</button>
          </div>
        </div>
      </section>

      {message && <InlineNotification tone="success" title="Saved" message={temporaryPassword ? `${message} Temporary password: ${temporaryPassword}` : message} />}
      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}

      <section className="panel">
        <div className="catalog-toolbar">
          <div className="form-field">
            <label htmlFor="employees-search">Search</label>
            <input id="employees-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Emma Carter, emma@procuratio.local, Color Specialist" />
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
        </div>
      </section>

      <div className="customers-layout entity-directory-layout">
        <section className="panel customers-list-panel entity-list-panel">
          <div className="customers-list entity-list-scroll">
            {rows.map((employee) => (
              <button
                key={employee.id}
                type="button"
                className={`customers-list-item entity-list-item ${selected?.id === employee.id ? 'is-active' : ''}`}
                onClick={() => setSelected(employee)}
              >
                <strong className="customers-list-item-name">{employee.fullName}</strong>
                <span className="customers-list-item-email">{employee.email}</span>
                <small className="customers-list-item-phone">
                  {(employee.jobTitle || 'Team member')} · {(employee.store?.name || 'No store')} · {employee.status}
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
              <h3>{selected ? 'Selected employee' : 'Employee details'}</h3>
              <p className="muted">
                {selected
                  ? 'Review the profile, assignment and booking visibility before opening the editing modal.'
                  : 'Click an employee on the left to review the profile in a tighter summary card.'}
              </p>
            </div>
            {selected && <button className="planning-action-btn" onClick={() => startEdit(selected)}>Edit employee</button>}
          </div>

          {!selected ? (
            <div className="empty-state-card store-detail-empty">
              <strong>No employee selected yet</strong>
              <span>Choose an employee from the list or create a new one to manage the profile.</span>
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
                  <span className="store-detail-badge store-detail-badge-muted">
                    {selected.isBookable ? 'Bookable' : 'Hidden from booking'}
                  </span>
                </div>
              </article>

              <div className="customer-file-columns store-detail-grid">
                <article className="customer-file-item-card store-detail-card">
                  <small className="store-detail-label">Contact</small>
                  <strong>{selected.phoneNumber || 'No phone number yet'}</strong>
                  <span>{selected.email}</span>
                </article>
                <article className="customer-file-item-card store-detail-card">
                  <small className="store-detail-label">Role</small>
                  <strong>{selected.jobTitle || 'Team member'}</strong>
                  <span>{selected.store?.name || 'No store assigned'}</span>
                </article>
                <article className="customer-file-item-card store-detail-card">
                  <small className="store-detail-label">Profile state</small>
                  <strong>{selected.archivedAt ? 'Archived profile' : 'Operational profile'}</strong>
                  <span>{selected.archivedAt || 'No archive date'}</span>
                </article>
                <article className="customer-file-item-card store-detail-card">
                  <small className="store-detail-label">User account</small>
                  <strong>{selected.email}</strong>
                  <span>Created on {new Date(selected.createdAt).toLocaleDateString()}</span>
                </article>
              </div>

              <article className="customer-file-item-card store-usage-card">
                <div className="store-usage-head">
                  <div>
                    <small className="store-detail-label">Booking visibility</small>
                    <strong>{selected.isBookable ? 'Visible in booking flows' : 'Hidden from booking flows'}</strong>
                  </div>
                  <span className={`store-usage-pill ${selected.isBookable ? 'is-safe' : 'is-locked'}`}>
                    {selected.isBookable ? 'Bookable' : 'Hidden'}
                  </span>
                </div>
                <span className="muted">
                  {selected.isBookable
                    ? 'Customers can see and choose this employee when the assigned store and schedule allow it.'
                    : 'This profile stays active in the back office but is excluded from customer booking journeys.'}
                </span>
              </article>

              <article className="customer-file-item-card store-usage-card">
                <div className="store-usage-head">
                  <div>
                    <small className="store-detail-label">Account maintenance</small>
                    <strong>Manage sign-in details from this directory</strong>
                  </div>
                  <div className="store-detail-actions">
                    <button className="planning-action-btn" onClick={() => startEdit(selected)}>Edit account details</button>
                    <button className="planning-action-btn planning-action-btn-primary" onClick={() => regeneratePassword(selected)}>Generate temporary password</button>
                  </div>
                </div>
                <span className="muted">
                  Update the email, store assignment or profile details from the editing modal. Generate a temporary password when the employee can no longer sign in.
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
              <h3>{selected ? 'Edit employee' : 'Create employee'}</h3>
              <button type="button" className="btn-soft" onClick={() => setShowForm(false)}>Close</button>
            </div>
            <div className="form-grid">
              <div className="form-field"><label>Full name</label><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Emma Carter" /></div>
              <div className="form-field"><label>Email</label><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="emma@procuratio.local" /></div>
              <div className="form-field"><label>Password</label><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={selected ? 'Leave empty to keep current password' : 'Employee2026!'} /></div>
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
          </div>
        </div>
      )}
    </div>
  );
}
