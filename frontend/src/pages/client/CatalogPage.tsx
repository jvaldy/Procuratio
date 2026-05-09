import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addToCart, listCatalog, reserveProduct } from '../../api/ecommerce';
import type { CatalogProduct, ProductReservation } from '../../types/ecommerce';
import { InlineNotification } from '../../ui/InlineNotification';
import { formatEuro, toPriceInclVat, truncateText } from '../../utils/pricing';
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

export function CatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastReservation, setLastReservation] = useState<ProductReservation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setError(null);
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), perPage: '12', sort: 'name', order: 'ASC' });
      if (nameFilter.trim()) {
        params.set('name', nameFilter.trim());
      }

      listCatalog(params)
        .then((result) => {
          setProducts(result.data);
          setTotalPages(result.meta.totalPages || 1);
        })
        .catch((reason) => setError((reason as Error).message))
        .finally(() => setLoading(false));
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [nameFilter, page]);

  async function onAdd(productId: number) {
    setError(null);
    setMessage(null);
    try {
      await addToCart(productId, 1);
      setMessage('The product has been added to your cart.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function onReserve(productId: number) {
    setError(null);
    setMessage(null);
    try {
      const reservation = await reserveProduct(productId, 1, 120);
      setLastReservation(reservation);
      setMessage('The product has been reserved for in-store pickup.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const productCountLabel = useMemo(() => `${products.length} visible`, [products.length]);

  return (
    <div className="stack">
      <section className="panel ecommerce-hero-card">
        <div className="ecommerce-hero-head">
          <div>
            <span className="eyebrow">Catalog</span>
            <h2 className="ecommerce-title">Beauty products</h2>
            <p className="muted">Browse products, check stock quickly and open any product sheet for more detail.</p>
          </div>
          <span className="catalog-count-pill">{productCountLabel}</span>
        </div>
        <div className="ecommerce-filter-bar">
          <div className="form-field grow">
            <label htmlFor="catalog-search">Search by name, brand or reference</label>
            <input
              id="catalog-search"
              className="catalog-search-input"
              placeholder="Example: Luminea, Shampoo or PROD-1007"
              value={nameFilter}
              onChange={(event) => {
                setNameFilter(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </section>

      <div className="stack">
        {message && <InlineNotification tone="success" title="Saved" message={message} />}
        {lastReservation && (
          <InlineNotification
            tone="info"
            title="Reservation created"
            message={`${lastReservation.productName} is reserved until ${new Date(lastReservation.expiresAt).toLocaleString('en-GB')}.`}
          />
        )}
        {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
      </div>

      <section className="catalog-grid">
        {products.map((product) => {
          const stock = stockLabel(product.availableStock);
          const inclusivePrice = toPriceInclVat(product.price);

          return (
            <article key={product.id} className="panel catalog-card">
              <Link to={`/client/catalog/${product.id}`} className="catalog-card-media catalog-card-link">
                <img src={productImageUrl(product)} alt={product.name} className="catalog-card-image" />
                <span className={`status-badge ${stock.tone}`}>{stock.label}</span>
              </Link>

              <div className="catalog-card-body">
                <div className="catalog-card-headline">
                  <div>
                    <Link to={`/client/catalog/${product.id}`} className="catalog-title-link">
                      <h3>{product.name}</h3>
                    </Link>
                    <p>{product.brand.name} · {product.category.name}</p>
                  </div>
                  <span className="catalog-sku">{product.sku}</span>
                </div>

                <p className="catalog-description">{truncateText(product.description, 110) || 'Product description coming soon.'}</p>

                <div className="catalog-price-block">
                  <div>
                    <span>Excl. VAT</span>
                    <strong>{formatEuro(product.price)}</strong>
                  </div>
                  <div>
                    <span>Incl. VAT</span>
                    <strong>{formatEuro(inclusivePrice)}</strong>
                  </div>
                </div>

                <div className="catalog-card-actions">
                  <button
                    type="button"
                    className="planning-action-btn planning-action-btn-primary"
                    onClick={() => onAdd(product.id)}
                    disabled={(product.availableStock ?? 0) <= 0}
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    className="planning-action-btn btn-ghost"
                    onClick={() => onReserve(product.id)}
                    disabled={(product.availableStock ?? 0) <= 0}
                  >
                    Reserve for pickup
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {!loading && products.length === 0 && (
        <div className="empty-state-card">No active products match your search right now.</div>
      )}

      {totalPages > 1 && (
        <div className="catalog-pagination">
          <button type="button" className="planning-action-btn btn-ghost" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" className="planning-action-btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
