import { useEffect, useState } from 'react';
import { createBrand, createCategory, createProduct, deleteProduct, listBrands, listCategories, listProducts, retireBrand, retireCategory, updateProduct } from '../../../api/stock';
import { hasRole } from '../../../auth/auth';
import { useCurrentUser } from '../../../auth/useCurrentUser';
import type { CatalogItem, Product } from '../../../types/stock';
import { InlineNotification } from '../../../ui/InlineNotification';

type ProductFormState = {
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  price: string;
  stock: string;
  brandId: string;
  categoryId: string;
  isActive: boolean;
};

const EMPTY_FORM: ProductFormState = {
  name: '',
  sku: '',
  description: '',
  imageUrl: '',
  price: '',
  stock: '0',
  brandId: '',
  categoryId: '',
  isActive: true,
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export function ProductsPage() {
  const { user } = useCurrentUser();
  const canManage = user ? hasRole(user.roles, 'ROLE_ADMIN') : false;

  const [items, setItems] = useState<Product[]>([]);
  const [brands, setBrands] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('DESC');
  const [page, setPage] = useState(1);

  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCatalogValueModal, setShowCatalogValueModal] = useState(false);
  const [catalogValueKind, setCatalogValueKind] = useState<'brand' | 'category'>('brand');
  const [catalogValueName, setCatalogValueName] = useState('');
  const [catalogValueSaving, setCatalogValueSaving] = useState(false);
  const [catalogValueDeleting, setCatalogValueDeleting] = useState(false);
  const [catalogValueError, setCatalogValueError] = useState<string | null>(null);
  const [catalogValuePendingDeleteId, setCatalogValuePendingDeleteId] = useState<number | null>(null);
  const [catalogValueReplacementId, setCatalogValueReplacementId] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  async function refresh() {
    const params = new URLSearchParams({
      page: String(page),
      perPage: '10',
      sort,
      order,
    });
    if (nameFilter.trim()) params.set('name', nameFilter.trim());
    if (brandFilter) params.set('brand', brandFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (minPriceFilter) params.set('minPrice', minPriceFilter);
    if (maxPriceFilter) params.set('maxPrice', maxPriceFilter);
    if (activeFilter) params.set('active', activeFilter);

    const result = await listProducts(params);
    setItems(result.data);
  }

  useEffect(() => {
    (async () => {
      setBrands(await listBrands());
      setCategories(await listCategories());
    })().catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh().catch((e) => setError((e as Error).message));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [page, sort, order, nameFilter, brandFilter, categoryFilter, minPriceFilter, maxPriceFilter, activeFilter]);

  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowProductModal(true);
  }

  function openEditModal(item: Product) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      sku: item.sku,
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      price: String(item.price),
      stock: String(item.stock),
      brandId: String(item.brand.id),
      categoryId: String(item.category.id),
      isActive: item.isActive,
    });
    setShowProductModal(true);
  }

  async function submitProduct() {
    if (!canManage) return;
    setError(null);
    setMessage(null);
    setFieldErrors({});
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Name is required.';
    if (!form.sku.trim()) nextErrors.sku = 'SKU is required.';
    if (!form.brandId) nextErrors.brandId = 'Brand is required.';
    if (!form.categoryId) nextErrors.categoryId = 'Type is required.';
    if (!form.price || Number(form.price) < 0) nextErrors.price = 'Price must be greater than or equal to 0.';
    if (!form.stock || Number(form.stock) < 0) nextErrors.stock = 'Quantity must be greater than or equal to 0.';
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        price: Number(form.price),
        stock: Number(form.stock),
        brandId: Number(form.brandId),
        categoryId: Number(form.categoryId),
        isActive: form.isActive,
      };
      if (editingId) {
        await updateProduct(editingId, payload);
        setMessage('Product updated successfully.');
      } else {
        await createProduct(payload);
        setMessage('Product created successfully.');
      }
      setShowProductModal(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await refresh();
    } catch (e) {
      const message = (e as Error).message;
      if (message.toLowerCase().includes('image')) {
        setFieldErrors({ imageUrl: 'Image format is invalid or too large.' });
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: number) {
    if (!canManage) return;
    setError(null);
    setMessage(null);
    try {
      await deleteProduct(id);
      await refresh();
      setMessage('Product deleted successfully.');
    } catch (reason) {
      const apiMessage = (reason as Error).message;
      setError(apiMessage || 'Unable to delete this product right now.');
    }
  }

  function resetFilters() {
    setNameFilter('');
    setBrandFilter('');
    setCategoryFilter('');
    setMinPriceFilter('');
    setMaxPriceFilter('');
    setActiveFilter('');
    setSort('createdAt');
    setOrder('DESC');
    setPage(1);
  }

  async function onPickImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setForm((prev) => ({ ...prev, imageUrl: dataUrl }));
  }

  function openCatalogValueModal(kind: 'brand' | 'category') {
    setCatalogValueKind(kind);
    setCatalogValueName('');
    setCatalogValueError(null);
    setCatalogValuePendingDeleteId(null);
    setCatalogValueReplacementId('');
    setShowCatalogValueModal(true);
  }

  function closeCatalogValueModal() {
    if (catalogValueSaving || catalogValueDeleting) return;
    setShowCatalogValueModal(false);
    setCatalogValueName('');
    setCatalogValueError(null);
    setCatalogValuePendingDeleteId(null);
    setCatalogValueReplacementId('');
  }

  async function createCatalogValue() {
    if (!canManage) return;
    const label = catalogValueKind === 'brand' ? 'brand' : 'type';
    const value = catalogValueName.trim();
    if (!value) {
      setCatalogValueError(`Please enter a ${label} name.`);
      return;
    }

    try {
      setCatalogValueSaving(true);
      setCatalogValueError(null);
      if (catalogValueKind === 'brand') {
        const created = await createBrand({ name: value });
        const refreshed = await listBrands();
        setBrands(refreshed);
        setForm((prev) => ({ ...prev, brandId: String(created.id) }));
      } else {
        const created = await createCategory({ name: value });
        const refreshed = await listCategories();
        setCategories(refreshed);
        setForm((prev) => ({ ...prev, categoryId: String(created.id) }));
      }
      setMessage(`${label[0].toUpperCase()}${label.slice(1)} created successfully.`);
      closeCatalogValueModal();
    } catch (reason) {
      setCatalogValueError((reason as Error).message);
    } finally {
      setCatalogValueSaving(false);
    }
  }

  function startCatalogValueDelete(id: number) {
    const source = catalogValueKind === 'brand' ? brands : categories;
    const fallbackReplacement = source.find((item) => item.id !== id);
    setCatalogValuePendingDeleteId(id);
    setCatalogValueReplacementId(fallbackReplacement ? String(fallbackReplacement.id) : '');
    setCatalogValueError(null);
  }

  async function confirmCatalogValueDelete() {
    if (!catalogValuePendingDeleteId) {
      return;
    }

    try {
      setCatalogValueDeleting(true);
      setCatalogValueError(null);
      const replacementId = catalogValueReplacementId ? Number(catalogValueReplacementId) : null;
      const result = catalogValueKind === 'brand'
        ? await retireBrand(catalogValuePendingDeleteId, replacementId)
        : await retireCategory(catalogValuePendingDeleteId, replacementId);

      if (catalogValueKind === 'brand') {
        const refreshed = await listBrands();
        setBrands(refreshed);
        if (form.brandId === String(catalogValuePendingDeleteId)) {
          setForm((prev) => ({ ...prev, brandId: replacementId ? String(replacementId) : '' }));
        }
        if (brandFilter === String(catalogValuePendingDeleteId)) {
          setBrandFilter('');
        }
      } else {
        const refreshed = await listCategories();
        setCategories(refreshed);
        if (form.categoryId === String(catalogValuePendingDeleteId)) {
          setForm((prev) => ({ ...prev, categoryId: replacementId ? String(replacementId) : '' }));
        }
        if (categoryFilter === String(catalogValuePendingDeleteId)) {
          setCategoryFilter('');
        }
      }

      setMessage(result.message);
      setCatalogValuePendingDeleteId(null);
      setCatalogValueReplacementId('');
      await refresh();
    } catch (reason) {
      setCatalogValueError((reason as Error).message);
    } finally {
      setCatalogValueDeleting(false);
    }
  }

  return (
    <div className="stack">
      <div className="panel stack">
        <h3>Search and sorting</h3>
        <div className="grid-form grid-3">
          <div className="form-field">
            <label htmlFor="product-search-name">Name</label>
            <input id="product-search-name" placeholder="Repair Shampoo" value={nameFilter} onChange={(e) => { setNameFilter(e.target.value); setPage(1); }} />
          </div>
          <div className="form-field">
            <label htmlFor="product-search-brand">Brand</label>
            <select id="product-search-brand" value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="product-search-type">Type</label>
            <select id="product-search-type" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="product-search-min-price">Min price</label>
            <input id="product-search-min-price" type="number" min="0" step="0.01" placeholder="10.00" value={minPriceFilter} onChange={(e) => { setMinPriceFilter(e.target.value); setPage(1); }} />
          </div>
          <div className="form-field">
            <label htmlFor="product-search-max-price">Max price</label>
            <input id="product-search-max-price" type="number" min="0" step="0.01" placeholder="49.90" value={maxPriceFilter} onChange={(e) => { setMaxPriceFilter(e.target.value); setPage(1); }} />
          </div>
          <div className="form-field">
            <label htmlFor="product-search-status">Status</label>
            <select id="product-search-status" value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="product-sort">Sort by</label>
            <select id="product-sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
              <option value="createdAt">Creation date</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="stock">Quantity</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="product-order">Order</label>
            <select id="product-order" value={order} onChange={(e) => { setOrder(e.target.value); setPage(1); }}>
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
          </div>
        </div>
        <div className="row">
          <button className="btn-ghost" onClick={resetFilters}>Reset filters</button>
          {canManage && <button className="btn-soft" onClick={openCreateModal}>Add product</button>}
        </div>
      </div>

      <div className="stack">
        {message && <InlineNotification tone="success" title="Saved" message={message} />}
        {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr><th>ID</th><th>Image</th><th>Name</th><th>Status</th><th>Brand</th><th>Type</th><th>Price</th><th>Quantity</th><th>Description</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td>{i.imageUrl ? <button className="btn-soft btn-xs" onClick={() => setPreviewImageUrl(i.imageUrl ?? null)}>View</button> : '-'}</td>
                <td>{i.name}</td>
                <td><span className={i.isActive ? 'status-badge active' : 'status-badge inactive'}>{i.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>{i.brand.name}</td>
                <td>{i.category.name}</td>
                <td>{i.price}</td>
                <td>{i.stock}</td>
                <td>{i.description && i.description.trim() !== '' ? 'Filled' : 'Empty'}</td>
                <td>
                  <div className="row">
                    {canManage && (
                      <button className="btn-icon btn-soft" title="Edit product" aria-label="Edit product" onClick={() => openEditModal(i)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4Zm13.7-11.3a1 1 0 0 0 0-1.4l-1-1a1 1 0 0 0-1.4 0l-1.2 1.2 4 4 1.6-1.8Z" fill="currentColor" /></svg>
                      </button>
                    )}
                    {canManage && (
                      <button className="btn-icon btn-danger" title="Delete product" aria-label="Delete product" onClick={() => removeProduct(i.id)}>
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

      {showProductModal && (
        <div className="modal-backdrop" onClick={() => setShowProductModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit product' : 'Add product'}</h3>
            <div className="grid-form grid-2">
              <div className="form-field">
                <label htmlFor="product-name">Name</label>
                <input id="product-name" placeholder="Repair Shampoo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="product-sku">SKU</label>
                <input id="product-sku" placeholder="SH-REPAIR-250" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                {fieldErrors.sku && <span className="field-error">{fieldErrors.sku}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="product-brand">Brand</label>
                <select id="product-brand" value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
                  <option value="">Select one</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {canManage && <button type="button" className="btn-link-inline" onClick={() => openCatalogValueModal('brand')}>Manage brands</button>}
                {fieldErrors.brandId && <span className="field-error">{fieldErrors.brandId}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="product-category">Type</label>
                <select id="product-category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Select one</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {canManage && <button type="button" className="btn-link-inline" onClick={() => openCatalogValueModal('category')}>Manage types</button>}
                {fieldErrors.categoryId && <span className="field-error">{fieldErrors.categoryId}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="product-price">Price</label>
                <input id="product-price" type="number" min="0" step="0.01" placeholder="19.90" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                {fieldErrors.price && <span className="field-error">{fieldErrors.price}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="product-stock">Quantity</label>
                <input id="product-stock" type="number" min="0" step="1" placeholder="25" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                {fieldErrors.stock && <span className="field-error">{fieldErrors.stock}</span>}
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="product-image-file">Image file (jpg, png, webp)</label>
                <input id="product-image-file" type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0] ?? null).catch((err) => setError((err as Error).message))} />
                {fieldErrors.imageUrl && <span className="field-error">{fieldErrors.imageUrl}</span>}
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="product-description">Description</label>
                <textarea id="product-description" placeholder="Sulfate-free shampoo for coloured hair." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-field-inline">
                <input id="product-active" type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <label htmlFor="product-active">Active product</label>
              </div>
            </div>
            <div className="row">
              <button onClick={submitProduct} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn-ghost" onClick={() => setShowProductModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {previewImageUrl && (
        <div className="modal-backdrop" onClick={() => setPreviewImageUrl(null)}>
          <div className="modal-card modal-image-preview" onClick={(e) => e.stopPropagation()}>
            <h3>Product image</h3>
            <img src={previewImageUrl} alt="Product preview" className="preview-image" />
            <div className="row">
              <button className="btn-ghost" onClick={() => setPreviewImageUrl(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showCatalogValueModal && (
        <div className="modal-backdrop" onClick={closeCatalogValueModal}>
          <div className="modal-card catalog-value-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head">
              <div className="stack stack-tight">
                <h3>{catalogValueKind === 'brand' ? 'Manage brands' : 'Manage types'}</h3>
                <p className="catalog-value-modal-copy">
                  {catalogValueKind === 'brand'
                    ? 'Add a new brand or replace linked products before deleting one that is no longer used.'
                    : 'Add a new type or replace linked products and services before deleting one that is no longer used.'}
                </p>
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="catalog-value-name">{catalogValueKind === 'brand' ? 'Brand name' : 'Type name'}</label>
              <input
                id="catalog-value-name"
                value={catalogValueName}
                onChange={(e) => {
                  setCatalogValueName(e.target.value);
                  if (catalogValueError) setCatalogValueError(null);
                }}
                placeholder={catalogValueKind === 'brand' ? 'Kérastase' : 'Haircare'}
                autoFocus
              />
              {catalogValueError && <span className="field-error">{catalogValueError}</span>}
            </div>
            <div className="stack">
              <strong>{catalogValueKind === 'brand' ? 'Existing brands' : 'Existing types'}</strong>
              <div className="catalog-value-list">
                {(catalogValueKind === 'brand' ? brands : categories).map((item) => {
                  const replacementOptions = (catalogValueKind === 'brand' ? brands : categories).filter((option) => option.id !== item.id);

                  return (
                    <article key={item.id} className="catalog-value-list-item">
                      <div className="catalog-value-list-copy">
                        <strong>{item.name}</strong>
                        <span>{item.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="catalog-value-list-actions">
                        {catalogValuePendingDeleteId === item.id ? (
                          <div className="catalog-value-replacement-flow">
                            <label htmlFor={`catalog-replacement-${item.id}`}>Replacement</label>
                            <select
                              id={`catalog-replacement-${item.id}`}
                              value={catalogValueReplacementId}
                              onChange={(e) => setCatalogValueReplacementId(e.target.value)}
                              disabled={catalogValueDeleting}
                            >
                              <option value="">Delete without replacement</option>
                              {replacementOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                            </select>
                            <div className="row">
                              <button type="button" onClick={confirmCatalogValueDelete} disabled={catalogValueDeleting}>
                                {catalogValueDeleting ? 'Saving...' : 'Confirm delete'}
                              </button>
                              <button type="button" className="btn-ghost" onClick={() => {
                                setCatalogValuePendingDeleteId(null);
                                setCatalogValueReplacementId('');
                                setCatalogValueError(null);
                              }} disabled={catalogValueDeleting}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" className="btn-soft btn-xs" onClick={() => startCatalogValueDelete(item.id)}>
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
              <button type="button" onClick={createCatalogValue} disabled={catalogValueSaving}>
                {catalogValueSaving ? 'Saving...' : catalogValueKind === 'brand' ? 'Create brand' : 'Create type'}
              </button>
              <button type="button" className="btn-ghost" onClick={closeCatalogValueModal} disabled={catalogValueSaving}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
