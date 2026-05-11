import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addToCart, createProductReview, getCatalogProduct, listProductReviews, reserveProduct } from '../../api/ecommerce';
import { listPublicStores } from '../../api/stores';
import { updateCurrentUserPreferences } from '../../auth/auth';
import { useCurrentUser } from '../../auth/useCurrentUser';
import { BarcodeVisual } from '../../components/BarcodeVisual';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import type { CatalogProduct, ProductReservation } from '../../types/ecommerce';
import { InlineNotification } from '../../ui/InlineNotification';
import { formatDateOnly, formatEuro, toPriceInclVat } from '../../utils/pricing';
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
  const { user } = useCurrentUser();
  const { productId } = useParams();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [stores, setStores] = useState<Array<{ id: number; name: string; city: string | null }>>([]);
  const [storeId, setStoreId] = useState(0);
  const [reviews, setReviews] = useState<Array<{ id: number; rating: number; comment: string; customerName: string; createdAt: string }>>([]);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ProductReservation | null>(null);

  useDocumentMeta({
    title: product ? `Procuratio · ${product.name}` : 'Procuratio · Product',
    description: product?.description || 'Read the product details, stock level and customer reviews before buying.',
  });

  useEffect(() => {
    if (!productId) {
      return;
    }

    Promise.all([getCatalogProduct(Number(productId)), listProductReviews(Number(productId)), listPublicStores()])
      .then(([productResult, reviewResult, storesResult]) => {
        setProduct(productResult);
        setReviews(reviewResult.data);
        setStores(storesResult.data);
        setStoreId(user?.preferredStore?.id ?? storesResult.data[0]?.id ?? 0);
      })
      .catch((reason) => setError((reason as Error).message));
  }, [productId, user?.preferredStore?.id]);

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
    if (!storeId) {
      setError('Choose a store before creating a pickup reservation.');
      return;
    }

    setError(null);
    setMessage(null);
    try {
      const result = await reserveProduct(product.id, 1, 120, storeId);
      setReservation(result);
      setMessage('The product has been reserved for in-store pickup.');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function onReviewSubmit(): Promise<void> {
    if (!product) {
      return;
    }

    setError(null);
    setMessage(null);
    try {
      const review = await createProductReview(product.id, { rating: Number(rating), comment: comment.trim() });
      setReviews((current) => [review, ...current]);
      setComment('');
      setRating('5');
      setMessage('Thank you, your review has been saved.');
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
        <>
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
                <div className="summary-tile">
                  <span>Reviews</span>
                  <strong>{product.reviews.average.toFixed(1)}/5</strong>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="product-store">Pickup store</label>
                <select
                  id="product-store"
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
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.name}{store.city ? ` · ${store.city}` : ''}</option>)}
                </select>
              </div>

              <BarcodeVisual value={product.barcode} label={`Barcode for ${product.name}`} />

              <div className="catalog-card-actions">
                <button type="button" className="planning-action-btn planning-action-btn-primary" onClick={onAdd} disabled={(product.availableStock ?? 0) <= 0}>
                  Add to cart
                </button>
                <button type="button" className="planning-action-btn btn-ghost" onClick={onReserve} disabled={(product.availableStock ?? 0) <= 0 || !storeId}>
                  Reserve for pickup
                </button>
              </div>
            </div>
          </section>

          <section className="panel stack">
            <div className="profile-section-head">
              <div>
                <h3>Product reviews</h3>
                <p className="muted">Useful feedback from customers who already tried this product.</p>
              </div>
              <span className="catalog-count-pill">{reviews.length} reviews</span>
            </div>

            <div className="checkout-fulfilment-grid">
              <div className="form-field">
                <label htmlFor="review-rating">Rating</label>
                <select id="review-rating" value={rating} onChange={(event) => setRating(event.target.value)}>
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}/5</option>)}
                </select>
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="review-comment">Comment</label>
                <textarea id="review-comment" placeholder="Share a concise review for other customers." value={comment} onChange={(event) => setComment(event.target.value)} />
              </div>
              <div className="form-field form-field-full">
                <button type="button" className="planning-action-btn planning-action-btn-primary" onClick={onReviewSubmit} disabled={!comment.trim()}>
                  Publish review
                </button>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="empty-state-card">No review has been published for this product yet.</div>
            ) : (
              <div className="profile-modal-list">
                {reviews.map((review) => (
                  <article key={review.id} className="customer-file-item-card">
                    <strong>{review.customerName} · {review.rating}/5</strong>
                    <span>{formatDateOnly(review.createdAt)}</span>
                    <small>{review.comment}</small>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
