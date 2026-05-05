import { useEffect, useState } from 'react';
import { addToCart, listCatalog, reserveProduct } from '../../api/ecommerce';
import type { CatalogProduct, ProductReservation } from '../../types/ecommerce';
import { InlineNotification } from '../../ui/InlineNotification';

export function CatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [lastReservation, setLastReservation] = useState<ProductReservation | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    setMessage(null);
    try {
      await addToCart(productId, 1);
      setMessage('The product has been added to your cart.');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onReserve(productId: number) {
    setError(null);
    setMessage(null);
    try {
      const reservation = await reserveProduct(productId, 1, 120);
      setLastReservation(reservation);
      setMessage('The product has been reserved successfully.');
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

      <div className="stack">
        {message && <InlineNotification tone="success" title="Done" message={message} />}
        {lastReservation && (
          <InlineNotification
            tone="info"
            title="Reservation active"
            message={`${lastReservation.productName} is reserved until ${new Date(lastReservation.expiresAt).toLocaleString()}.`}
          />
        )}
        {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr><th>Produit</th><th>Marque</th><th>Categorie</th><th>Prix</th><th>Stock dispo</th><th>Action</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.brand.name}</td>
                <td>{p.category.name}</td>
                <td>{p.price.toFixed(2)} EUR</td>
                <td>{p.availableStock ?? '-'}</td>
                <td>
                  <div className="row">
                    <button onClick={() => onAdd(p.id)}>Ajouter au panier</button>
                    <button className="btn-soft" onClick={() => onReserve(p.id)}>Reserver 2h</button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={6}>Aucun produit actif dans le catalogue.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
