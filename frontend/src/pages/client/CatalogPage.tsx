import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listCatalog, purchaseGiftVoucher } from '../../api/ecommerce';
import { listBrands, listCategories } from '../../api/stock';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import type { CatalogProduct, GiftVoucherPurchasePayload } from '../../types/ecommerce';
import type { CatalogItem } from '../../types/stock';
import { InlineNotification } from '../../ui/InlineNotification';
import { formatEuro, toPriceInclVat } from '../../utils/pricing';
import { defaultProductImageUrl, generatedProductImageUrl, productImageUrl } from '../../utils/productVisual';

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
};

export function CatalogPage() {
  useDocumentMeta({
    title: 'Procuratio · Catalog',
    description: 'Shop salon products, compare stock and buy or reserve items online.',
  });

  const navigate = useNavigate();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [brands, setBrands] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
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
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [giftVoucherOpen, setGiftVoucherOpen] = useState(false);
  const [giftForm, setGiftForm] = useState<GiftVoucherPurchasePayload>(EMPTY_GIFT_FORM);
  const [giftSubmitting, setGiftSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([listBrands(), listCategories()])
      .then(([brandsResult, categoriesResult]) => {
        setBrands(brandsResult);
        setCategories(categoriesResult);
      })
      .catch((reason) => setError((reason as Error).message));
  }, []);

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
        state: {
          infoMessage: 'The gift voucher order has been created. Complete the payment to activate and send it.',
          forcePayment: true,
        },
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
                <p>Printable, sent by email</p>
              </div>
              <span className="catalog-sku">GV</span>
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
          const averageRating = Math.max(0, Math.min(5, product.reviews.average));
          const roundedRating = Math.round(averageRating);

          return (
            <Link key={product.id} to={`/client/catalog/${product.id}`} className="panel catalog-card catalog-card-amz catalog-card-full-link">
              <div className="catalog-card-media catalog-card-link">
                <img
                  src={productImageUrl(product)}
                  alt={product.name}
                  className="catalog-card-image"
                  loading="lazy"
                  onError={(event) => {
                    const target = event.currentTarget;
                    target.onerror = null;
                    target.src = product.imageUrl ? generatedProductImageUrl(product) : defaultProductImageUrl();
                  }}
                />
                <span className={`status-badge ${stock.tone}`}>{stock.label}</span>
              </div>

              <div className="catalog-card-body">
                <div className="catalog-card-headline">
                  <div>
                    <div className="catalog-title-link">
                      <h3>{product.name}</h3>
                    </div>
                    <p>{product.brand.name}</p>
                  </div>
                </div>

                <div className="catalog-card-metadata catalog-card-rating">
                  <span className="catalog-stars">{'★'.repeat(roundedRating)}{'☆'.repeat(5 - roundedRating)}</span>
                  <span>{averageRating.toFixed(1)} ({product.reviews.count})</span>
                </div>

                <div className="catalog-price-block">
                  <div>
                    <span>Price</span>
                    <strong>{formatEuro(inclusivePrice)}</strong>
                  </div>
                </div>

              </div>
            </Link>
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
          <div className="catalog-pagination-pages">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`planning-action-btn btn-ghost ${pageNumber === page ? 'is-active' : ''}`}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
          </div>
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

