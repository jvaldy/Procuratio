import { useEffect, useState } from 'react';
import { adjustProductStock, createProduct, deleteProduct, listBrands, listCategories, listProducts, updateProduct } from '../../../api/stock';
import type { CatalogItem, Product } from '../../../types/stock';

export function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [brands, setBrands] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', sku: '', price: '0', stock: '0', brandId: '', categoryId: '', isActive: true });

  async function refresh() {
    const params = new URLSearchParams({ page: String(page), perPage: '10', sort, order });
    if (nameFilter) params.set('name', nameFilter);
    const result = await listProducts(params);
    setItems(result.data);
  }

  useEffect(() => {
    (async () => {
      setBrands(await listBrands());
      setCategories(await listCategories());
    })();
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, [page, sort, order]);

  async function submit() {
    setError(null);
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), brandId: Number(form.brandId), categoryId: Number(form.categoryId) };
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await createProduct(payload);
      }
      setForm({ name: '', sku: '', price: '0', stock: '0', brandId: '', categoryId: '', isActive: true });
      setEditingId(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeItem(id: number) {
    await deleteProduct(id);
    await refresh();
  }

  async function adjustStock(item: Product) {
    const type = prompt('Type (in|out|adjust)', 'in');
    const quantity = Number(prompt('Quantity', '1') ?? '0');
    const reason = prompt('Reason', 'manual adjustment') ?? '';
    const comment = prompt('Comment (optional)', '') ?? '';
    if (!type || !reason) return;
    await adjustProductStock(item.id, { type, quantity, reason, comment });
    await refresh();
  }

  return (
    <div className="stack">
      <h1 className="page-title">Produits</h1>
      <div className="panel row">
        <input className="grow" placeholder="Recherche nom" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
        <button onClick={() => refresh()}>Rechercher</button>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="createdAt">createdAt</option>
          <option value="name">name</option>
          <option value="price">price</option>
          <option value="stock">stock</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value)}>
          <option value="DESC">DESC</option>
          <option value="ASC">ASC</option>
        </select>
      </div>

      <div className="panel stack">
        <h3>{editingId ? 'Editer produit' : 'Nouveau produit'}</h3>
        <div className="row">
          <input className="grow" placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="grow" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div className="row">
          <input className="grow" placeholder="Prix" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input className="grow" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </div>
        <div className="row">
        <select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
          <option value="">Brand</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">Category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        </div>
        <label>
          Active
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        </label>
        <button onClick={submit}>Enregistrer</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="panel">
      <table>
        <thead>
          <tr><th>ID</th><th>Nom</th><th>SKU</th><th>Prix</th><th>Stock</th><th>Brand</th><th>Category</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.id}</td><td>{i.name}</td><td>{i.sku}</td><td>{i.price}</td><td>{i.stock}</td><td>{i.brand.name}</td><td>{i.category.name}</td>
              <td>
                <div className="row">
                  <button className="btn-soft" onClick={() => { setEditingId(i.id); setForm({ name: i.name, sku: i.sku, price: String(i.price), stock: String(i.stock), brandId: String(i.brand.id), categoryId: String(i.category.id), isActive: i.isActive }); }}>Edit</button>
                  <button className="btn-danger" onClick={() => removeItem(i.id)}>Delete</button>
                  <button className="btn-soft" onClick={() => adjustStock(i)}>Stock</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="row">
        <button className="btn-soft" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <span>Page {page}</span>
        <button className="btn-soft" onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}
