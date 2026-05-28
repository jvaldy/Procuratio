import type { CustomerListItem } from '../../../types/customers';

type CustomerListPanelProps = {
  customers: CustomerListItem[];
  currentPage: number;
  loading: boolean;
  query: string;
  selectedCustomerId: number | null;
  totalPages: number;
  onPageChange: (page: number) => void;
  onQueryChange: (value: string) => void;
  onSelectCustomer: (customerId: number) => void;
};

export function CustomerListPanel({
  customers,
  currentPage,
  loading,
  query,
  selectedCustomerId,
  totalPages,
  onPageChange,
  onQueryChange,
  onSelectCustomer,
}: CustomerListPanelProps) {
  return (
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
          placeholder="Sarah Miller, sarah@mail.com, +33612345678"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      {loading && <div className="empty-state-card">Loading customers...</div>}
      {!loading && customers.length === 0 && <div className="empty-state-card">No customer matches this search.</div>}
      {!loading && customers.length > 0 && (
        <div className="customers-list">
          {customers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className={`customers-list-item ${selectedCustomerId === customer.id ? 'is-active' : ''}`}
              onClick={() => onSelectCustomer(customer.id)}
            >
              <strong className="customers-list-item-name">{customer.fullName}</strong>
              <span className="customers-list-item-email">{customer.email}</span>
              <small className="customers-list-item-phone">{customer.phoneNumber || 'No phone number'}</small>
            </button>
          ))}
        </div>
      )}

      <div className="crm-pager row">
        <button className="btn-soft" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          Previous
        </button>
        <span>Page {currentPage}/{totalPages}</span>
        <button className="btn-soft" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          Next
        </button>
      </div>
    </aside>
  );
}
