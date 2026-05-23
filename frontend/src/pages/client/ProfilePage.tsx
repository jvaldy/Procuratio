import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listClientAppointments } from '../../api/booking';
import { createStoreReview, getMyLoyalty, listMyGiftVouchers, listMyOrders, listStoreReviews } from '../../api/ecommerce';
import { updateCurrentUserPreferences } from '../../auth/auth';
import { useCurrentUser } from '../../auth/useCurrentUser';
import { listPublicStores, type StoreSummary } from '../../api/stores';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import type { ClientAppointment } from '../../types/booking';
import type { GiftVoucherSummary, LoyaltyState, Order } from '../../types/ecommerce';
import { InlineNotification } from '../../ui/InlineNotification';
import { formatDateOnly, formatEuro, formatOrderStatus } from '../../utils/pricing';

type ProfileModal = 'loyalty' | 'vouchers' | 'appointments' | 'store' | null;
type KpiTab = 'orders' | 'loyalty' | 'vouchers' | 'appointments' | 'store';

export function ProfilePage() {
  useDocumentMeta({
    title: 'Procuratio - Profile',
    description: 'Manage your account, loyalty, appointments and gift vouchers in one place.',
  });

  const { user, loading } = useCurrentUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyState | null>(null);
  const [giftVouchers, setGiftVouchers] = useState<GiftVoucherSummary[]>([]);
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ProfileModal>(null);
  const [activeKpi, setActiveKpi] = useState<KpiTab>('orders');
  const [ordersCount, setOrdersCount] = useState(0);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [storeReviews, setStoreReviews] = useState<Array<{ id: number; rating: number; comment: string; customerName: string; createdAt: string }>>([]);
  const [storeRating, setStoreRating] = useState('5');
  const [storeComment, setStoreComment] = useState('');

  useEffect(() => {
    Promise.all([
      listMyOrders(new URLSearchParams({ page: '1', perPage: '3' })),
      getMyLoyalty(),
      listMyGiftVouchers(),
      listClientAppointments('upcoming'),
      listPublicStores(),
    ])
      .then(([ordersResult, loyaltyResult, vouchersResult, appointmentsResult, storesResult]) => {
        setOrders(ordersResult.data);
        setOrdersCount(((ordersResult.meta as { total?: number } | undefined)?.total) ?? ordersResult.data.length);
        setLoyalty(loyaltyResult);
        setGiftVouchers(vouchersResult.data);
        setAppointments(appointmentsResult.data);
        setStores(storesResult.data);
      })
      .catch((reason) => setError((reason as Error).message));
  }, []);

  const latestOrder = orders[0] ?? null;
  const nextAppointment = appointments[0] ?? null;

  useEffect(() => {
    if (!user?.preferredStore?.id) {
      setStoreReviews([]);
      return;
    }

    listStoreReviews(user.preferredStore.id)
      .then((response) => setStoreReviews(response.data))
      .catch(() => undefined);
  }, [user?.preferredStore?.id]);

  return (
    <div className="stack">
      <section className="panel profile-card profile-card-compact">
        <div className="profile-card-header">
          <div>
            <span className="eyebrow">Profile</span>
            <h2 className="ecommerce-title">Your account</h2>
            <p className="muted">Everything essential in one place, without the clutter.</p>
          </div>
          <span className="status-badge active">Account</span>
        </div>

        {message && <InlineNotification tone="success" title="Saved" message={message} />}
        {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
        {loading && <p className="muted">Loading your profile...</p>}

        {!loading && user && (
          <>
            <div className="profile-grid profile-grid-compact">
              <div className="profile-item">
                <span>Name</span>
                <strong>{user.displayName}</strong>
              </div>
              <div className="profile-item">
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div className="profile-item">
                <span>Phone</span>
                <strong>{user.phoneNumber || 'Not provided yet'}</strong>
              </div>
              <div className="profile-item">
                <span>Store</span>
                <strong>{user.preferredStore?.name || 'No preferred store'}</strong>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="profile-store">Preferred store</label>
                <select
                  id="profile-store"
                  value={user.preferredStore?.id ?? 0}
                  onChange={(event) => {
                    updateCurrentUserPreferences({ preferredStoreId: Number(event.target.value) || null })
                      .then(() => window.location.reload())
                      .catch((reason) => setError((reason as Error).message));
                  }}
                >
                  <option value={0}>No preferred store</option>
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="profile-theme">Theme</label>
                <select
                  id="profile-theme"
                  value={user.preferences.theme}
                  onChange={(event) => {
                    updateCurrentUserPreferences({ theme: event.target.value })
                      .then(() => window.location.reload())
                      .catch((reason) => setError((reason as Error).message));
                  }}
                >
                  <option value="soft">Soft</option>
                  <option value="ocean">Ocean</option>
                  <option value="sunset">Sunset</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="profile-font-size">Font size</label>
                <select
                  id="profile-font-size"
                  value={user.preferences.fontSize}
                  onChange={(event) => {
                    updateCurrentUserPreferences({ fontSize: event.target.value })
                      .then(() => window.location.reload())
                      .catch((reason) => setError((reason as Error).message));
                  }}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>

            <div className="profile-kpi-tabs">
              <button type="button" className={`profile-kpi-tab ${activeKpi === 'orders' ? 'is-active' : ''}`} onClick={() => setActiveKpi('orders')}>
                <span>Orders</span>
                <strong>{ordersCount}</strong>
              </button>
              <button type="button" className={`profile-kpi-tab ${activeKpi === 'loyalty' ? 'is-active' : ''}`} onClick={() => setActiveKpi('loyalty')}>
                <span>Loyalty</span>
                <strong>{loyalty?.account.pointsBalance ?? 0} pts</strong>
              </button>
              <button type="button" className={`profile-kpi-tab ${activeKpi === 'vouchers' ? 'is-active' : ''}`} onClick={() => setActiveKpi('vouchers')}>
                <span>Gift vouchers</span>
                <strong>{giftVouchers.length}</strong>
              </button>
              <button type="button" className={`profile-kpi-tab ${activeKpi === 'appointments' ? 'is-active' : ''}`} onClick={() => setActiveKpi('appointments')}>
                <span>Appointments</span>
                <strong>{appointments.length}</strong>
              </button>
              {user.preferredStore && (
                <button type="button" className={`profile-kpi-tab ${activeKpi === 'store' ? 'is-active' : ''}`} onClick={() => setActiveKpi('store')}>
                  <span>Store reviews</span>
                  <strong>{storeReviews.length}</strong>
                </button>
              )}
            </div>
            <div className="profile-kpi-panel">
              {activeKpi === 'orders' && (
                <>
                  <h3>Orders</h3>
                  <p className="muted">{ordersCount} total orders</p>
                  <Link to="/client/orders" className="cta-link cta-link-secondary">Open orders</Link>
                </>
              )}
              {activeKpi === 'loyalty' && (
                <>
                  <h3>Loyalty</h3>
                  <p className="muted">{loyalty?.account.pointsBalance ?? 0} points balance</p>
                  <button type="button" className="cta-link cta-link-secondary" onClick={() => setActiveModal('loyalty')}>Open loyalty</button>
                </>
              )}
              {activeKpi === 'vouchers' && (
                <>
                  <h3>Gift vouchers</h3>
                  <p className="muted">{giftVouchers.length} linked vouchers</p>
                  <button type="button" className="cta-link cta-link-secondary" onClick={() => setActiveModal('vouchers')}>Open vouchers</button>
                </>
              )}
              {activeKpi === 'appointments' && (
                <>
                  <h3>Upcoming appointments</h3>
                  <p className="muted">{appointments.length} planned appointments</p>
                  <button type="button" className="cta-link cta-link-secondary" onClick={() => setActiveModal('appointments')}>Open appointments</button>
                </>
              )}
              {activeKpi === 'store' && user.preferredStore && (
                <>
                  <h3>Store reviews</h3>
                  <p className="muted">{storeReviews.length} published reviews</p>
                  <button type="button" className="cta-link cta-link-secondary" onClick={() => setActiveModal('store')}>Open reviews</button>
                </>
              )}
            </div>

            <div className="profile-mini-grid">
              <article className="customer-file-item-card">
                <span className="muted">Latest order</span>
                {latestOrder ? (
                  <>
                    <strong>{latestOrder.orderNumber}</strong>
                    <span>{formatDateOnly(latestOrder.createdAt)} - {formatEuro(latestOrder.total)}</span>
                    <span>{formatOrderStatus(latestOrder.status)}</span>
                  </>
                ) : (
                  <span>No order yet.</span>
                )}
              </article>

              <article className="customer-file-item-card">
                <span className="muted">Next appointment</span>
                {nextAppointment ? (
                  <>
                    <strong>{nextAppointment.services.map((item) => item.serviceName).join(', ')}</strong>
                    <span>{formatDateOnly(nextAppointment.startAt)}</span>
                    <span>{nextAppointment.employee.fullName}</span>
                    <span>{formatEuro(nextAppointment.services.reduce((sum, service) => sum + service.lineTotal, 0))}</span>
                  </>
                ) : (
                  <span>No appointment booked.</span>
                )}
              </article>
            </div>
          </>
        )}
      </section>

      {activeModal === 'loyalty' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row crm-modal-head">
              <h3>Loyalty details</h3>
              <button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Close</button>
            </div>
            <div className="profile-modal-grid">
              <article className="customer-file-item-card">
                <span className="muted">Points balance</span>
                <strong>{loyalty?.account.pointsBalance ?? 0} pts</strong>
              </article>
              <article className="customer-file-item-card">
                <span className="muted">Subscription</span>
                <strong>{loyalty?.account.subscriptionName || 'No active subscription'}</strong>
                <span>{loyalty?.account.subscriptionStatus || 'inactive'}</span>
              </article>
              <article className="customer-file-item-card">
                <span className="muted">Visit card</span>
                <strong>{loyalty?.account.visitCardName || 'No visit card'}</strong>
                <span>
                  {loyalty?.account.visitCardName
                    ? `${loyalty.account.visitCardUsed}/${loyalty.account.visitCardTarget ?? 0} visits used`
                    : 'No progress yet'}
                </span>
              </article>
            </div>
            {loyalty && loyalty.events.length > 0 ? (
              <div className="profile-modal-list">
                {loyalty.events.map((event) => (
                  <div key={event.createdAt + event.eventType} className="profile-order-row">
                    <div>
                      <strong>{event.eventType}</strong>
                      <span>{formatDateOnly(event.createdAt)}</span>
                    </div>
                    <div>
                      <strong>{event.pointsDelta > 0 ? `+${event.pointsDelta}` : event.pointsDelta} pts</strong>
                      <span>{event.reason || 'Loyalty update'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-card">No loyalty activity yet.</div>
            )}
          </div>
        </div>
      )}

      {activeModal === 'vouchers' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row crm-modal-head">
              <h3>Gift vouchers</h3>
              <button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Close</button>
            </div>
            {giftVouchers.length > 0 ? (
              <div className="profile-modal-list">
                {giftVouchers.map((voucher) => (
                  <div key={voucher.id} className="profile-order-row">
                    <div>
                      <strong>{voucher.code ?? 'Code available after payment confirmation'}</strong>
                      <span>{voucher.recipientName || voucher.serviceLabel || 'Gift voucher'}</span>
                    </div>
                    <div>
                      <strong>{formatEuro(voucher.balanceAmount)}</strong>
                      <span>{voucher.expiresAt ? `Expires ${formatDateOnly(voucher.expiresAt)}` : 'No expiry date'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-card">No gift voucher linked yet.</div>
            )}
          </div>
        </div>
      )}

      {activeModal === 'appointments' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row crm-modal-head">
              <h3>Upcoming appointments</h3>
              <button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Close</button>
            </div>
            {appointments.length > 0 ? (
              <div className="profile-modal-list">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="profile-order-row">
                    <div>
                      <strong>{appointment.services.map((item) => item.serviceName).join(', ')}</strong>
                      <span>{appointment.employee.fullName}</span>
                    </div>
                    <div>
                      <strong>{formatDateOnly(appointment.startAt)}</strong>
                      <span>{formatEuro(appointment.services.reduce((sum, service) => sum + service.lineTotal, 0))} - {formatOrderStatus(appointment.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-card">No upcoming appointment.</div>
            )}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Link to="/client/booking" className="cta-link cta-link-primary">Open booking</Link>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'store' && user?.preferredStore && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row crm-modal-head">
              <h3>{user.preferredStore.name} reviews</h3>
              <button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Close</button>
            </div>
            <div className="checkout-fulfilment-grid">
              <div className="form-field">
                <label htmlFor="store-review-rating">Rating</label>
                <select id="store-review-rating" value={storeRating} onChange={(event) => setStoreRating(event.target.value)}>
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}/5</option>)}
                </select>
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="store-review-comment">Comment</label>
                <textarea id="store-review-comment" value={storeComment} placeholder="Friendly team, on time, very clean salon." onChange={(event) => setStoreComment(event.target.value)} />
              </div>
              <div className="form-field form-field-full">
                <button
                  type="button"
                  className="planning-action-btn planning-action-btn-primary"
                  onClick={async () => {
                    try {
                      const review = await createStoreReview(user.preferredStore!.id, { rating: Number(storeRating), comment: storeComment.trim() });
                      setStoreReviews((current) => [review, ...current]);
                      setStoreComment('');
                      setStoreRating('5');
                      setMessage('Your store review has been published.');
                    } catch (reason) {
                      setError((reason as Error).message);
                    }
                  }}
                  disabled={!storeComment.trim()}
                >
                  Publish review
                </button>
              </div>
            </div>
            {storeReviews.length > 0 ? (
              <div className="profile-modal-list">
                {storeReviews.map((review) => (
                  <div key={review.id} className="profile-order-row">
                    <div>
                      <strong>{review.customerName}</strong>
                      <span>{formatDateOnly(review.createdAt)}</span>
                    </div>
                    <div>
                      <strong>{review.rating}/5</strong>
                      <span>{review.comment}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-card">No review has been published for this store yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

