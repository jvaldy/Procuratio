import { useEffect, useState } from 'react';
import { addToCart, listCatalog } from '../../api/ecommerce';
import type { CatalogProduct } from '../../types/ecommerce';

export function CatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');

  async function refresh() {
    setError(null);
    try {
      const params = new URLSearchParams({ page: '1', perPage: '24', sort: 'createdAt', order: 'DESC' });
      if (nameFilter) params.set('name', nameFilter);
      const result = await listCatalog(params);
      setProducts(result.data);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, []);

  async function onAdd(productId: number) {
    setError(null);
    try {
      await addToCart(productId, 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="stack">
      <h2>Catalogue</h2>
      <div className="panel row">
        <input className="grow" placeholder="Recherche produit" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
        <button onClick={() => refresh()}>Rechercher</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="panel">
        <table>
          <thead>
            <tr><th>Produit</th><th>Marque</th><th>Categorie</th><th>Prix</th><th>Action</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.brand.name}</td>
                <td>{p.category.name}</td>
                <td>{p.price.toFixed(2)} EUR</td>
                <td>
                  <button onClick={() => onAdd(p.id)}>Ajouter au panier</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={5}>Aucun produit actif dans le catalogue.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

