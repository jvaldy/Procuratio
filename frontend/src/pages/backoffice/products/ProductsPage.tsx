import { useEffect, useState } from 'react';
import { createBrand, createCategory, createProduct, deleteProduct, listBrands, listCategories, listProducts, updateProduct } from '../../../api/stock';
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
    refresh().catch((e) => setError((e as Error).message));
  }, [page, sort, order]);

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
    await deleteProduct(id);
    await refresh();
    setMessage('Product deleted successfully.');
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

  async function createCatalogValue(kind: 'brand' | 'category') {
    if (!canManage) return;
    const label = kind === 'brand' ? 'brand' : 'type';
    const value = window.prompt(`Enter the new ${label} name`);
    if (!value || !value.trim()) return;

    try {
      if (kind === 'brand') {
        await createBrand({ name: value.trim() });
        setBrands(await listBrands());
      } else {
        await createCategory({ name: value.trim() });
        const refreshed = await listCategories();
        setCategories(refreshed);
      }
      setMessage(`${label[0].toUpperCase()}${label.slice(1)} created successfully.`);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <div className="stack">
      <h1 className="page-title">Products</h1>

      <div className="panel stack">
        <h3>Search and sorting</h3>
        <div className="grid-form grid-3">
          <div className="form-field">
            <label htmlFor="product-search-name">Name</label>
            <input id="product-search-name" placeholder="e.g. Repair Shampoo" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="product-search-brand">Brand</label>
            <select id="product-search-brand" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
              <option value="">All</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="product-search-type">Type</label>
            <select id="product-search-type" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="product-search-min-price">Min price</label>
            <input id="product-search-min-price" type="number" min="0" step="0.01" placeholder="e.g. 10.00" value={minPriceFilter} onChange={(e) => setMinPriceFilter(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="product-search-max-price">Max price</label>
            <input id="product-search-max-price" type="number" min="0" step="0.01" placeholder="e.g. 49.90" value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="product-search-status">Status</label>
            <select id="product-search-status" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="product-sort">Sort by</label>
            <select id="product-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="createdAt">Creation date</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="stock">Quantity</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="product-order">Order</label>
            <select id="product-order" value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
          </div>
        </div>
        <div className="row">
          <button onClick={() => { setPage(1); refresh().catch((e) => setError((e as Error).message)); }}>Apply filters</button>
          <button className="btn-ghost" onClick={() => { resetFilters(); setTimeout(() => refresh().catch((e) => setError((e as Error).message)), 0); }}>Reset filters</button>
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
                <input id="product-name" placeholder="e.g. Repair Shampoo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="product-sku">SKU</label>
                <input id="product-sku" placeholder="e.g. SH-REPAIR-250" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                {fieldErrors.sku && <span className="field-error">{fieldErrors.sku}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="product-brand">Brand</label>
                <select id="product-brand" value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
                  <option value="">Select one</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {canManage && <button type="button" className="btn-link-inline" onClick={() => createCatalogValue('brand')}>New brand</button>}
                {fieldErrors.brandId && <span className="field-error">{fieldErrors.brandId}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="product-category">Type</label>
                <select id="product-category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Select one</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {canManage && <button type="button" className="btn-link-inline" onClick={() => createCatalogValue('category')}>New type</button>}
                {fieldErrors.categoryId && <span className="field-error">{fieldErrors.categoryId}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="product-price">Price</label>
                <input id="product-price" type="number" min="0" step="0.01" placeholder="e.g. 19.90" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                {fieldErrors.price && <span className="field-error">{fieldErrors.price}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="product-stock">Quantity</label>
                <input id="product-stock" type="number" min="0" step="1" placeholder="e.g. 25" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                {fieldErrors.stock && <span className="field-error">{fieldErrors.stock}</span>}
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="product-image-file">Image file (jpg, png, webp)</label>
                <input id="product-image-file" type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0] ?? null).catch((err) => setError((err as Error).message))} />
                {fieldErrors.imageUrl && <span className="field-error">{fieldErrors.imageUrl}</span>}
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="product-description">Description</label>
                <textarea id="product-description" placeholder="e.g. Sulfate-free shampoo for colored hair." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
    </div>
  );
}
