import { useEffect, useMemo, useState } from 'react';
import { createBackofficeCustomer, getBackofficeCustomer, listBackofficeCustomers } from '../../../api/customers';
import { listPublicStores, type StoreSummary } from '../../../api/stores';
import type { CustomerFile, CustomerListItem } from '../../../types/customers';
import { InlineNotification } from '../../../ui/InlineNotification';
import { formatDateOnly } from '../../../utils/pricing';
import { CustomerCreateModal } from './CustomerCreateModal';
import { CustomerListPanel } from './CustomerListPanel';
import {
  CustomerAppointmentsSection,
  CustomerLoyaltySection,
  CustomerNotificationsSection,
  CustomerOverviewSection,
  CustomerPurchasesSection,
  CustomerTabStrip,
  type CustomerFileSection,
} from './customerFileSections';

type CustomerCreateFormState = {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  preferredStoreId: string;
};

const EMPTY_CREATE_FORM: CustomerCreateFormState = {
  fullName: '',
  email: '',
  password: '',
  phoneNumber: '',
  birthDate: '',
  preferredStoreId: '',
};

export function CustomersPage() {
  const [activeSection, setActiveSection] = useState<CustomerFileSection>('overview');
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
  const [createForm, setCreateForm] = useState<CustomerCreateFormState>(EMPTY_CREATE_FORM);

  async function loadCustomers(page = 1, search = query) {
    setLoadingList(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '6',
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

  async function handleCreateCustomer() {
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
      setCreateForm(EMPTY_CREATE_FORM);
      await loadCustomers(1, query);
    } catch (reason) {
      setError((reason as Error).message);
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
    if (!selectedCustomerId) {
      return;
    }
    setActiveSection('overview');
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
        <CustomerListPanel
          currentPage={listMeta.page}
          customers={customers}
          loading={loadingList}
          query={query}
          selectedCustomerId={selectedCustomerId}
          totalPages={listMeta.totalPages}
          onPageChange={(page) => loadCustomers(page, query)}
          onQueryChange={setQuery}
          onSelectCustomer={setSelectedCustomerId}
        />

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

              <CustomerTabStrip activeSection={activeSection} onSectionChange={setActiveSection} />

              <div className={`customer-file-grid ${activeSection === 'overview' ? 'is-overview' : ''}`}>
                {activeSection === 'overview' && <CustomerOverviewSection customerFile={selectedCustomer} />}
                {activeSection === 'appointments' && <CustomerAppointmentsSection customerFile={selectedCustomer} />}
                {activeSection === 'loyalty' && <CustomerLoyaltySection customerFile={selectedCustomer} />}
                {activeSection === 'purchases' && <CustomerPurchasesSection customerFile={selectedCustomer} />}
                {activeSection === 'notifications' && <CustomerNotificationsSection customerFile={selectedCustomer} />}
              </div>
            </>
          )}
        </section>
      </div>

      <CustomerCreateModal
        createForm={createForm}
        isOpen={showCreate}
        stores={stores}
        onClose={() => setShowCreate(false)}
        onFormChange={setCreateForm}
        onCreate={handleCreateCustomer}
      />
    </div>
  );
}
