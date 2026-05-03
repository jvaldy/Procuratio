import { useEffect, useState } from 'react';
import { createService, deleteService, listCategories, listServices, updateService } from '../../../api/stock';
import { hasRole } from '../../../auth/auth';
import { useCurrentUser } from '../../../auth/useCurrentUser';
import type { CatalogItem, ServiceItem } from '../../../types/stock';

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
    refresh().catch((e) => setError((e as Error).message));
  }, [page, sort, order]);

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
      } else {
        await createService(payload);
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="stack">
      <h1 className="page-title">Services</h1>

      <div className="panel stack">
        <h3>Recherche et tri</h3>
        <div className="grid-form grid-3">
          <div className="form-field">
            <label htmlFor="service-search-name">Nom</label>
            <input id="service-search-name" placeholder="Ex: Coupe premium" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="service-search-category">Type</label>
            <select id="service-search-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Tous</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="service-search-status">Etat</label>
            <select id="service-search-status" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
              <option value="">Tous</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="service-search-min-price">Prix min</label>
            <input id="service-search-min-price" type="number" min="0" step="0.01" placeholder="Ex: 20.00" value={minPriceFilter} onChange={(e) => setMinPriceFilter(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="service-search-max-price">Prix max</label>
            <input id="service-search-max-price" type="number" min="0" step="0.01" placeholder="Ex: 90.00" value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="service-sort">Trier par</label>
            <select id="service-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="createdAt">Date de creation</option>
              <option value="name">Nom</option>
              <option value="price">Prix</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="service-order">Ordre</label>
            <select id="service-order" value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="DESC">Decroissant</option>
              <option value="ASC">Croissant</option>
            </select>
          </div>
        </div>
        <div className="row">
          <button onClick={() => { setPage(1); refresh().catch((e) => setError((e as Error).message)); }}>Rechercher</button>
          {canManage && <button className="btn-soft" onClick={openCreateModal}>Ajouter un service</button>}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="panel">
        <table>
          <thead>
            <tr><th>ID</th><th>Nom</th><th>Duree</th><th>Prix</th><th>Type</th><th>Composition</th><th>Description</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td>{i.name}</td>
                <td>{i.durationMinutes} min</td>
                <td>{i.price}</td>
                <td>{i.category?.name ?? '-'}</td>
                <td>{i.composition ?? '-'}</td>
                <td>{i.description ?? '-'}</td>
                <td>
                  <div className="row">
                    {canManage && <button className="btn-soft" onClick={() => openEditModal(i)}>Editer</button>}
                    {canManage && <button className="btn-danger" onClick={async () => { await deleteService(i.id); await refresh(); }}>Supprimer</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row">
        <button className="btn-soft" onClick={() => setPage((p) => Math.max(1, p - 1))}>Precedent</button>
        <span>Page {page}</span>
        <button className="btn-soft" onClick={() => setPage((p) => p + 1)}>Suivant</button>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Modifier le service' : 'Ajouter un service'}</h3>
            <div className="grid-form grid-2">
              <div className="form-field">
                <label htmlFor="service-name">Nom</label>
                <input id="service-name" placeholder="Ex: Soin keratine" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-field">
                <label htmlFor="service-category">Type</label>
                <select id="service-category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Selectionner</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="service-price">Prix</label>
                <input id="service-price" type="number" min="0" step="0.01" placeholder="Ex: 59.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="form-field">
                <label htmlFor="service-duration">Duree (minutes)</label>
                <input id="service-duration" type="number" min="5" step="5" placeholder="Ex: 45" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="service-composition">Composition</label>
                <textarea id="service-composition" placeholder="Ex: Shampooing + soin + brushing" value={form.composition} onChange={(e) => setForm({ ...form, composition: e.target.value })} />
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="service-description">Description</label>
                <textarea id="service-description" placeholder="Ex: Soin intense cheveux sensibilises." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-field-inline">
                <input id="service-active" type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <label htmlFor="service-active">Service actif</label>
              </div>
            </div>
            <div className="row">
              <button onClick={submit}>Enregistrer</button>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
