import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addToCart, listCatalog, purchaseGiftVoucher, reserveProduct } from '../../api/ecommerce';
import { listPublicStores } from '../../api/stores';
import { listBrands, listCategories } from '../../api/stock';
import { updateCurrentUserPreferences } from '../../auth/auth';
import { useCurrentUser } from '../../auth/useCurrentUser';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import type { CatalogProduct, GiftVoucherPurchasePayload, ProductReservation } from '../../types/ecommerce';
import type { CatalogItem } from '../../types/stock';
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

const EMPTY_GIFT_FORM: GiftVoucherPurchasePayload = {
  amount: 25,
  purchaserName: '',
  recipientName: '',
  recipientEmail: '',
  serviceLabel: '',
};

export function CatalogPage() {
  useDocumentMeta({
    title: 'Procuratio · Catalog',
    description: 'Shop salon products, compare stock and buy or reserve items online.',
  });

  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [brands, setBrands] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [stores, setStores] = useState<Array<{ id: number; name: string; city: string | null }>>([]);
  const [storeId, setStoreId] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastReservation, setLastReservation] = useState<ProductReservation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [giftVoucherOpen, setGiftVoucherOpen] = useState(false);
  const [giftForm, setGiftForm] = useState<GiftVoucherPurchasePayload>(EMPTY_GIFT_FORM);
  const [giftSubmitting, setGiftSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([listBrands(), listCategories(), listPublicStores()])
      .then(([brandsResult, categoriesResult, storesResult]) => {
        setBrands(brandsResult);
        setCategories(categoriesResult);
        setStores(storesResult.data);
        setStoreId(user?.preferredStore?.id ?? storesResult.data[0]?.id ?? 0);
      })
      .catch((reason) => setError((reason as Error).message));
  }, [user?.preferredStore?.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setError(null);
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        perPage: '12',
        sort,
        order,
      });

      if (nameFilter.trim()) params.set('name', nameFilter.trim());
      if (brandFilter) params.set('brand', brandFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (minPriceFilter.trim()) params.set('minPrice', minPriceFilter.trim());
      if (maxPriceFilter.trim()) params.set('maxPrice', maxPriceFilter.trim());

      listCatalog(params)
        .then((result) => {
          setProducts(result.data);
          setTotalPages(result.meta.totalPages || 1);
        })
        .catch((reason) => setError((reason as Error).message))
        .finally(() => setLoading(false));
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [nameFilter, brandFilter, categoryFilter, minPriceFilter, maxPriceFilter, sort, order, page]);

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
    if (!storeId) {
      setError('Choose a store before creating a pickup reservation.');
      return;
    }
    try {
      const reservation = await reserveProduct(productId, 1, 120, storeId);
      setLastReservation(reservation);
      setMessage('The product has been reserved for in-store pickup.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function onBuyGiftVoucher() {
    setError(null);
    setMessage(null);

    if (!giftForm.recipientName.trim() || !giftForm.recipientEmail.trim() || giftForm.amount < 10) {
      setError('Complete the gift voucher form before continuing.');
      return;
    }

    setGiftSubmitting(true);
    try {
      const response = await purchaseGiftVoucher(giftForm);
      setGiftVoucherOpen(false);
      setGiftForm(EMPTY_GIFT_FORM);
      navigate(`/client/orders/${response.order.orderNumber}`, {
        state: { infoMessage: 'The gift voucher order has been created. Complete the payment to activate and send it.' },
      });
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setGiftSubmitting(false);
    }
  }

  function resetFilters() {
    setNameFilter('');
    setBrandFilter('');
    setCategoryFilter('');
    setMinPriceFilter('');
    setMaxPriceFilter('');
    setSort('name');
    setOrder('ASC');
    setPage(1);
  }

  const productCountLabel = useMemo(() => `${products.length} products`, [products.length]);

  return (
    <div className="stack">
      <section className="panel ecommerce-hero-card">
        <div className="ecommerce-hero-head">
          <div>
            <span className="eyebrow">Catalog</span>
            <h2 className="ecommerce-title">Beauty products and gift vouchers</h2>
            <p className="muted">Search by brand, type, price or reference, then buy products or a printable gift voucher online.</p>
          </div>
          <span className="catalog-count-pill">{productCountLabel}</span>
        </div>
        <div className="ecommerce-filter-bar ecommerce-filter-bar-extended">
          <div className="form-field catalog-search-shell">
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
          <div className="form-field">
            <label htmlFor="catalog-store">Pickup store</label>
            <select
              id="catalog-store"
              value={storeId}
              onChange={async (event) => {
                const nextStoreId = Number(event.target.value);
                setStoreId(nextStoreId);
                if (nextStoreId > 0) {
                  await updateCurrentUserPreferences({ preferredStoreId: nextStoreId }).catch(() => undefined);
                }
              }}
            >
              <option value={0}>Choose a store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}{store.city ? ` · ${store.city}` : ''}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="ecommerce-filter-bar ecommerce-filter-bar-extended catalog-secondary-filters">
          <div className="form-field">
            <label htmlFor="catalog-brand">Brand</label>
            <select id="catalog-brand" value={brandFilter} onChange={(event) => { setBrandFilter(event.target.value); setPage(1); }}>
              <option value="">All brands</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="catalog-category">Type</label>
            <select id="catalog-category" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}>
              <option value="">All types</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="catalog-min-price">Min price</label>
            <input id="catalog-min-price" type="number" min="0" step="0.01" value={minPriceFilter} onChange={(event) => { setMinPriceFilter(event.target.value); setPage(1); }} />
          </div>
          <div className="form-field">
            <label htmlFor="catalog-max-price">Max price</label>
            <input id="catalog-max-price" type="number" min="0" step="0.01" value={maxPriceFilter} onChange={(event) => { setMaxPriceFilter(event.target.value); setPage(1); }} />
          </div>
          <div className="form-field">
            <label htmlFor="catalog-sort">Sort by</label>
            <select id="catalog-sort" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="createdAt">Newest</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="catalog-order">Direction</label>
            <select id="catalog-order" value={order} onChange={(event) => { setOrder(event.target.value as 'ASC' | 'DESC'); setPage(1); }}>
              <option value="ASC">Ascending</option>
              <option value="DESC">Descending</option>
            </select>
          </div>
          <div className="form-field form-field-actions">
            <label>&nbsp;</label>
            <button type="button" className="btn-ghost" onClick={resetFilters}>Reset filters</button>
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
        <article className="panel catalog-card catalog-card-highlight">
          <div className="catalog-card-media catalog-card-media-voucher">
            <div className="catalog-card-voucher-badge">Gift voucher</div>
          </div>
          <div className="catalog-card-body">
            <div className="catalog-card-headline">
              <div>
                <h3>Buy a gift voucher</h3>
                <p>Printable and sent by email after payment</p>
              </div>
              <span className="catalog-sku">GV</span>
            </div>
            <p className="catalog-description">Choose an amount and the recipient. The voucher becomes active and is sent by email after payment confirmation.</p>
            <div className="catalog-price-block">
              <div>
                <span>Starting from</span>
                <strong>{formatEuro(10)}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong>Email</strong>
              </div>
            </div>
            <div className="catalog-card-actions">
              <button type="button" className="planning-action-btn planning-action-btn-primary" onClick={() => setGiftVoucherOpen(true)}>
                Buy gift voucher
              </button>
            </div>
          </div>
        </article>

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

                <div className="catalog-card-metadata">
                  <span>Barcode {product.barcode}</span>
                  <span>{product.reviews.count} review{product.reviews.count > 1 ? 's' : ''} · {product.reviews.average.toFixed(1)}/5</span>
                </div>

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
                  <Link to={`/client/catalog/${product.id}`} className="planning-action-btn btn-ghost catalog-card-detail-btn">
                    View product
                  </Link>
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
                    disabled={(product.availableStock ?? 0) <= 0 || !storeId}
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

      {giftVoucherOpen && (
        <div className="modal-backdrop" onClick={() => setGiftVoucherOpen(false)}>
          <div className="modal-card crm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row crm-modal-head">
              <h3>Gift voucher checkout</h3>
              <button type="button" className="btn-soft" onClick={() => setGiftVoucherOpen(false)}>Close</button>
            </div>
            <p className="muted">Keep it simple: choose an amount of at least €10, then enter the recipient details.</p>
            <div className="gift-voucher-amount-presets">
              {[10, 25, 50, 100].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`btn-soft ${giftForm.amount === value ? 'is-active' : ''}`}
                  onClick={() => setGiftForm((current) => ({ ...current, amount: value }))}
                >
                  {formatEuro(value)}
                </button>
              ))}
            </div>
            <div className="checkout-fulfilment-grid">
              <div className="form-field">
                <label htmlFor="gift-recipient-name">Recipient name</label>
                <input id="gift-recipient-name" placeholder="Example: Emma Rossi" value={giftForm.recipientName} onChange={(event) => setGiftForm((current) => ({ ...current, recipientName: event.target.value }))} />
              </div>
              <div className="form-field">
                <label htmlFor="gift-recipient-email">Recipient email</label>
                <input id="gift-recipient-email" type="email" placeholder="example@email.com" value={giftForm.recipientEmail} onChange={(event) => setGiftForm((current) => ({ ...current, recipientEmail: event.target.value }))} />
              </div>
              <div className="form-field">
                <label htmlFor="gift-amount">Amount</label>
                <input id="gift-amount" type="number" min="10" step="5" value={giftForm.amount} onChange={(event) => setGiftForm((current) => ({ ...current, amount: Number(event.target.value) }))} />
              </div>
              <div className="form-field">
                <label htmlFor="gift-service-label">Service (optional)</label>
                <input id="gift-service-label" placeholder="Example: Signature haircut" value={giftForm.serviceLabel || ''} onChange={(event) => setGiftForm((current) => ({ ...current, serviceLabel: event.target.value }))} />
              </div>
            </div>
            <div className="catalog-card-actions">
              <button type="button" className="planning-action-btn btn-ghost" onClick={() => setGiftVoucherOpen(false)}>Cancel</button>
              <button type="button" className="planning-action-btn planning-action-btn-primary" onClick={onBuyGiftVoucher} disabled={giftSubmitting}>
                {giftSubmitting ? 'Creating order...' : 'Continue to payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

