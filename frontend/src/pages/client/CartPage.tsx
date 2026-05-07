import { useEffect, useState } from 'react';
import { getCart, removeCartItem, updateCartItem } from '../../api/ecommerce';
import type { CartState } from '../../types/ecommerce';
import { Link } from 'react-router-dom';

export function CartPage() {
  const [cart, setCart] = useState<CartState | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      setCart(await getCart());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, []);

  async function changeQuantity(productId: number, quantity: number) {
    setError(null);
    try {
      setCart(await updateCartItem(productId, quantity));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(productId: number) {
    setError(null);
    try {
      setCart(await removeCartItem(productId));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="stack">
      <h2>Panier</h2>
      {error && <p className="error">{error}</p>}
      {!cart && !error && <div className="panel">Chargement...</div>}
      {cart && (
        <div className="panel stack">
          <table>
            <thead><tr><th>Produit</th><th>Qte</th><th>PU</th><th>Total</th><th>Action</th></tr></thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.name}</td>
                  <td>
                    <input
                      value={item.quantity}
                      onChange={(e) => changeQuantity(item.productId, Number(e.target.value))}
                      type="number"
                      min={0}
                    />
                  </td>
                  <td>{item.unitPrice.toFixed(2)} EUR</td>
                  <td>{item.lineTotal.toFixed(2)} EUR</td>
                  <td><button onClick={() => remove(item.productId)}>Retirer</button></td>
                </tr>
              ))}
              {cart.items.length === 0 && <tr><td colSpan={5}>Panier vide.</td></tr>}
            </tbody>
          </table>
          <div className="row">
            <strong>Sous-total: {cart.totals.subTotal.toFixed(2)} EUR</strong>
            <strong>TVA: {cart.totals.taxTotal.toFixed(2)} EUR</strong>
            <strong>Total: {cart.totals.total.toFixed(2)} EUR</strong>
          </div>
          <div className="row">
            <Link to="/client/catalog">Continuer mes achats</Link>
            <Link to="/client/checkout">Passer au paiement</Link>
          </div>
        </div>
      )}
    </div>
  );
}
