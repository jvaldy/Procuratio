import { useEffect, useState } from 'react';
import { createService, deleteService, listCategories, listServices, updateService } from '../../../api/stock';
import type { CatalogItem, ServiceItem } from '../../../types/stock';

export function ServicesPage() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', description: '', price: '0', categoryId: '', isActive: true });

  async function refresh() {
    const params = new URLSearchParams({ page: String(page), perPage: '10', sort: 'createdAt', order: 'DESC' });
    if (nameFilter) params.set('name', nameFilter);
    const result = await listServices(params);
    setItems(result.data);
  }

  useEffect(() => {
    (async () => {
      setCategories(await listCategories());
    })();
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, [page]);

  async function submit() {
    setError(null);
    try {
      const payload = { ...form, price: Number(form.price), categoryId: form.categoryId ? Number(form.categoryId) : null };
      if (editingId) {
        await updateService(editingId, payload);
      } else {
        await createService(payload);
      }
      setForm({ name: '', description: '', price: '0', categoryId: '', isActive: true });
      setEditingId(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <h2>Services</h2>
      <input placeholder="Recherche nom" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
      <button onClick={() => refresh()}>Rechercher</button>

      <div>
        <h3>{editingId ? 'Editer service' : 'Nouveau service'}</h3>
        <input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input placeholder="Prix" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">Category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label>
          Active
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        </label>
        <button onClick={submit}>Enregistrer</button>
      </div>

      {error && <p>{error}</p>}

      <table>
        <thead>
          <tr><th>ID</th><th>Nom</th><th>Prix</th><th>Category</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.id}</td><td>{i.name}</td><td>{i.price}</td><td>{i.category?.name ?? '-'}</td>
              <td>
                <button onClick={() => { setEditingId(i.id); setForm({ name: i.name, description: i.description ?? '', price: String(i.price), categoryId: i.category ? String(i.category.id) : '', isActive: i.isActive }); }}>Edit</button>
                <button onClick={async () => { await deleteService(i.id); await refresh(); }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <span>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}
