import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addToCart, getCatalogProduct, reserveProduct } from '../../api/ecommerce';
import type { CatalogProduct, ProductReservation } from '../../types/ecommerce';
import { InlineNotification } from '../../ui/InlineNotification';
import { formatEuro, toPriceInclVat } from '../../utils/pricing';
import { productImageUrl } from '../../utils/productVisual';

function stockLabel(stock: number | undefined): { label: string; tone: 'active' | 'inactive' | 'pending' } {
  const value = stock ?? 0;
  if (value <= 0) {
    return { label: 'Out of stock', tone: 'inactive' };
  }
  if (value <= 3) {
    return { label: `Only ${value} left`, tone: 'pending' };
  }

  return { label: `${value} in stock`, tone: 'active' };
}

export function ProductDetailPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ProductReservation | null>(null);

  useEffect(() => {
    if (!productId) {
      return;
    }

    getCatalogProduct(Number(productId))
      .then((result) => setProduct(result))
      .catch((reason) => setError((reason as Error).message));
  }, [productId]);

  const prices = useMemo(() => {
    if (!product) {
      return null;
    }

    return {
      excl: formatEuro(product.price),
      incl: formatEuro(toPriceInclVat(product.price)),
    };
  }, [product]);

  async function onAdd(): Promise<void> {
    if (!product) {
      return;
    }

    setError(null);
    setMessage(null);
    try {
      await addToCart(product.id, 1);
      setMessage('The product has been added to your cart.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function onReserve(): Promise<void> {
    if (!product) {
      return;
    }

    setError(null);
    setMessage(null);
    try {
      const result = await reserveProduct(product.id, 1, 120);
      setReservation(result);
      setMessage('The product has been reserved for in-store pickup.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <div className="stack">
      <Link to="/client/catalog" className="cta-link cta-link-secondary product-back-link">Back to catalog</Link>

      {message && <InlineNotification tone="success" title="Saved" message={message} />}
      {reservation && <InlineNotification tone="info" title="Reservation created" message={`${reservation.productName} is reserved until ${new Date(reservation.expiresAt).toLocaleString('en-GB')}.`} />}
      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
      {!product && !error && <div className="panel">Loading product details...</div>}

      {product && prices && (
        <section className="panel product-detail-card">
          <div className="product-detail-media">
            <img src={productImageUrl(product)} alt={product.name} className="product-detail-image" />
          </div>
          <div className="product-detail-copy">
            <div className="product-detail-head">
              <div>
                <span className="eyebrow">Product sheet</span>
                <h2 className="ecommerce-title">{product.name}</h2>
                <p className="muted">{product.brand.name} · {product.category.name} · {product.sku}</p>
              </div>
              <span className={`status-badge ${stockLabel(product.availableStock).tone}`}>{stockLabel(product.availableStock).label}</span>
            </div>

            <p className="product-detail-description">{product.description || 'No additional description is available for this product yet.'}</p>

            <div className="product-detail-prices">
              <div className="summary-tile">
                <span>Excl. VAT</span>
                <strong>{prices.excl}</strong>
              </div>
              <div className="summary-tile">
                <span>Incl. VAT</span>
                <strong>{prices.incl}</strong>
              </div>
            </div>

            <div className="catalog-card-actions">
              <button type="button" className="planning-action-btn planning-action-btn-primary" onClick={onAdd} disabled={(product.availableStock ?? 0) <= 0}>
                Add to cart
              </button>
              <button type="button" className="planning-action-btn btn-ghost" onClick={onReserve} disabled={(product.availableStock ?? 0) <= 0}>
                Reserve for pickup
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
