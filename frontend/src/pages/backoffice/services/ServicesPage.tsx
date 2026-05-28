import { useEffect, useState } from 'react';
import { createCategory, createService, deleteService, listCategories, listServices, retireCategory, updateService } from '../../../api/stock';
import { hasRole } from '../../../auth/auth';
import { useCurrentUser } from '../../../auth/useCurrentUser';
import type { CatalogItem, ServiceItem } from '../../../types/stock';
import { InlineNotification } from '../../../ui/InlineNotification';

type ServiceFormState = {
  name: string;
  description: string;
  composition: string;
  price: string;
  durationMinutes: string;
  categoryId: string;
  isActive: boolean;
};

const EMPTY_FORM: ServiceFormState = {
  name: '',
  description: '',
  composition: '',
  price: '',
  durationMinutes: '45',
  categoryId: '',
  isActive: true,
};

export function ServicesPage() {
  const { user } = useCurrentUser();
  const canManage = user ? hasRole(user.roles, 'ROLE_ADMIN') : false;

  const [items, setItems] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('DESC');
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeSaving, setNewTypeSaving] = useState(false);
  const [typeDeleting, setTypeDeleting] = useState(false);
  const [newTypeError, setNewTypeError] = useState<string | null>(null);
  const [pendingTypeDeleteId, setPendingTypeDeleteId] = useState<number | null>(null);
  const [replacementTypeId, setReplacementTypeId] = useState('');
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);

  async function refresh() {
    const params = new URLSearchParams({ page: String(page), perPage: '10', sort, order });
    if (nameFilter.trim()) params.set('name', nameFilter.trim());
    if (categoryFilter) params.set('category', categoryFilter);
    if (minPriceFilter) params.set('minPrice', minPriceFilter);
    if (maxPriceFilter) params.set('maxPrice', maxPriceFilter);
    if (activeFilter) params.set('active', activeFilter);
    const result = await listServices(params);
    setItems(result.data);
  }

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh().catch((e) => setError((e as Error).message));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [page, sort, order, nameFilter, categoryFilter, minPriceFilter, maxPriceFilter, activeFilter]);

  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEditModal(item: ServiceItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? '',
      composition: item.composition ?? '',
      price: String(item.price),
      durationMinutes: String(item.durationMinutes),
      categoryId: item.category ? String(item.category.id) : '',
      isActive: item.isActive,
    });
    setShowModal(true);
  }

  async function submit() {
    if (!canManage) return;
    setError(null);
    setMessage(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        composition: form.composition.trim() || null,
        price: Number(form.price),
        durationMinutes: Number(form.durationMinutes),
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        isActive: form.isActive,
      };
      if (editingId) {
        await updateService(editingId, payload);
        setMessage('Service updated successfully.');
      } else {
        await createService(payload);
        setMessage('Service created successfully.');
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeService(id: number) {
    if (!canManage) return;
    setError(null);
    setMessage(null);
    await deleteService(id);
    await refresh();
    setMessage('Service deleted successfully.');
  }

  function resetFilters() {
    setNameFilter('');
    setCategoryFilter('');
    setMinPriceFilter('');
    setMaxPriceFilter('');
    setActiveFilter('');
    setSort('createdAt');
    setOrder('DESC');
    setPage(1);
  }

  function openTypeModal() {
    setNewTypeName('');
    setNewTypeError(null);
    setPendingTypeDeleteId(null);
    setReplacementTypeId('');
    setShowTypeModal(true);
  }

  function closeTypeModal() {
    if (newTypeSaving || typeDeleting) return;
    setShowTypeModal(false);
    setNewTypeName('');
    setNewTypeError(null);
    setPendingTypeDeleteId(null);
    setReplacementTypeId('');
  }

  async function createType() {
    if (!canManage) return;
    const value = newTypeName.trim();
    if (!value) {
      setNewTypeError('Please enter a type name.');
      return;
    }

    try {
      setNewTypeSaving(true);
      setNewTypeError(null);
      const created = await createCategory({ name: value });
      const refreshed = await listCategories();
      setCategories(refreshed);
      setForm((prev) => ({ ...prev, categoryId: String(created.id) }));
      setMessage('Type created successfully.');
      closeTypeModal();
    } catch (reason) {
      setNewTypeError((reason as Error).message);
    } finally {
      setNewTypeSaving(false);
    }
  }

  function startTypeDelete(id: number) {
    const fallbackReplacement = categories.find((item) => item.id !== id);
    setPendingTypeDeleteId(id);
    setReplacementTypeId(fallbackReplacement ? String(fallbackReplacement.id) : '');
    setNewTypeError(null);
  }

  async function confirmTypeDelete() {
    if (!pendingTypeDeleteId) {
      return;
    }

    try {
      setTypeDeleting(true);
      setNewTypeError(null);
      const replacementId = replacementTypeId ? Number(replacementTypeId) : null;
      const result = await retireCategory(pendingTypeDeleteId, replacementId);
      const refreshed = await listCategories();
      setCategories(refreshed);
      if (form.categoryId === String(pendingTypeDeleteId)) {
        setForm((prev) => ({ ...prev, categoryId: replacementId ? String(replacementId) : '' }));
      }
      if (categoryFilter === String(pendingTypeDeleteId)) {
        setCategoryFilter('');
      }
      setMessage(result.message);
      setPendingTypeDeleteId(null);
      setReplacementTypeId('');
      await refresh();
    } catch (reason) {
      setNewTypeError((reason as Error).message);
    } finally {
      setTypeDeleting(false);
    }
  }

  return (
    <div className="stack">
      <div className="panel stack">
        <h3>Search and sorting</h3>
        <div className="grid-form grid-3">
          <div className="form-field">
            <label htmlFor="service-search-name">Name</label>
            <input id="service-search-name" placeholder="Premium haircut" value={nameFilter} onChange={(e) => { setNameFilter(e.target.value); setPage(1); }} />
          </div>
          <div className="form-field">
            <label htmlFor="service-search-category">Type</label>
            <select id="service-search-category" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="service-search-status">Status</label>
            <select id="service-search-status" value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="service-search-min-price">Min price</label>
            <input id="service-search-min-price" type="number" min="0" step="0.01" placeholder="20.00" value={minPriceFilter} onChange={(e) => { setMinPriceFilter(e.target.value); setPage(1); }} />
          </div>
          <div className="form-field">
            <label htmlFor="service-search-max-price">Max price</label>
            <input id="service-search-max-price" type="number" min="0" step="0.01" placeholder="90.00" value={maxPriceFilter} onChange={(e) => { setMaxPriceFilter(e.target.value); setPage(1); }} />
          </div>
          <div className="form-field">
            <label htmlFor="service-sort">Sort by</label>
            <select id="service-sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
              <option value="createdAt">Creation date</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="service-order">Order</label>
            <select id="service-order" value={order} onChange={(e) => { setOrder(e.target.value); setPage(1); }}>
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
          </div>
        </div>
        <div className="row">
          <button className="btn-ghost" onClick={resetFilters}>Reset filters</button>
          {canManage && <button className="btn-soft" onClick={openCreateModal}>Add service</button>}
        </div>
      </div>

      <div className="stack">
        {message && <InlineNotification tone="success" title="Saved" message={message} />}
        {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Status</th><th>Duration</th><th>Price</th><th>Type</th><th>Composition</th><th>Description</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td>{i.name}</td>
                <td><span className={i.isActive ? 'status-badge active' : 'status-badge inactive'}>{i.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>{i.durationMinutes} min</td>
                <td>{i.price}</td>
                <td>{i.category?.name ?? '-'}</td>
                <td>{i.composition && i.composition.trim() !== '' ? 'Filled' : 'Empty'}</td>
                <td>{i.description && i.description.trim() !== '' ? 'Filled' : 'Empty'}</td>
                <td>
                  <div className="row">
                    {canManage && (
                      <button className="btn-icon btn-soft" title="Edit service" aria-label="Edit service" onClick={() => openEditModal(i)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4Zm13.7-11.3a1 1 0 0 0 0-1.4l-1-1a1 1 0 0 0-1.4 0l-1.2 1.2 4 4 1.6-1.8Z" fill="currentColor" /></svg>
                      </button>
                    )}
                    {canManage && (
                      <button className="btn-icon btn-danger" title="Delete service" aria-label="Delete service" onClick={() => removeService(i.id)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM7 9h2v9H7V9Z" fill="currentColor" /></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row">
        <button className="btn-soft" onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
        <span>Page {page}</span>
        <button className="btn-soft" onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit service' : 'Add service'}</h3>
            <div className="grid-form grid-2">
              <div className="form-field">
                <label htmlFor="service-name">Name</label>
                <input id="service-name" placeholder="Keratin treatment" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-field">
                <label htmlFor="service-category">Type</label>
                <select id="service-category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Select one</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {canManage && <button type="button" className="btn-link-inline" onClick={openTypeModal}>Manage types</button>}
              </div>
              <div className="form-field">
                <label htmlFor="service-price">Price</label>
                <input id="service-price" type="number" min="0" step="0.01" placeholder="59.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="form-field">
                <label htmlFor="service-duration">Duration (minutes)</label>
                <input id="service-duration" type="number" min="5" step="5" placeholder="45" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="service-composition">Composition</label>
                <textarea id="service-composition" placeholder="Shampoo + treatment + blow dry" value={form.composition} onChange={(e) => setForm({ ...form, composition: e.target.value })} />
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="service-description">Description</label>
                <textarea id="service-description" placeholder="Intensive treatment for damaged hair." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-field-inline">
                <input id="service-active" type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <label htmlFor="service-active">Active service</label>
              </div>
            </div>
            <div className="row">
              <button onClick={submit}>Save</button>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showTypeModal && (
        <div className="modal-backdrop" onClick={closeTypeModal}>
          <div className="modal-card catalog-value-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head">
              <div className="stack stack-tight">
                <h3>Manage types</h3>
                <p className="catalog-value-modal-copy">Add a new type or replace linked services and products before deleting one that is no longer used.</p>
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="service-new-type-name">Type name</label>
              <input
                id="service-new-type-name"
                value={newTypeName}
                onChange={(e) => {
                  setNewTypeName(e.target.value);
                  if (newTypeError) setNewTypeError(null);
                }}
                placeholder="Coloring"
                autoFocus
              />
              {newTypeError && <span className="field-error">{newTypeError}</span>}
            </div>
            <div className="stack">
              <strong>Existing types</strong>
              <div className="catalog-value-list">
                {categories.map((item) => {
                  const replacementOptions = categories.filter((option) => option.id !== item.id);

                  return (
                    <article key={item.id} className="catalog-value-list-item">
                      <div className="catalog-value-list-copy">
                        <strong>{item.name}</strong>
                        <span>{item.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="catalog-value-list-actions">
                        {pendingTypeDeleteId === item.id ? (
                          <div className="catalog-value-replacement-flow">
                            <label htmlFor={`service-type-replacement-${item.id}`}>Replacement</label>
                            <select
                              id={`service-type-replacement-${item.id}`}
                              value={replacementTypeId}
                              onChange={(e) => setReplacementTypeId(e.target.value)}
                              disabled={typeDeleting}
                            >
                              <option value="">Delete without replacement</option>
                              {replacementOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                            </select>
                            <div className="row">
                              <button type="button" onClick={confirmTypeDelete} disabled={typeDeleting}>
                                {typeDeleting ? 'Saving...' : 'Confirm delete'}
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => {
                                  setPendingTypeDeleteId(null);
                                  setReplacementTypeId('');
                                  setNewTypeError(null);
                                }}
                                disabled={typeDeleting}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" className="btn-soft btn-xs" onClick={() => startTypeDelete(item.id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
            <div className="row catalog-value-modal-actions">
              <button type="button" onClick={createType} disabled={newTypeSaving}>
                {newTypeSaving ? 'Saving...' : 'Create type'}
              </button>
              <button type="button" className="btn-ghost" onClick={closeTypeModal} disabled={newTypeSaving}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
