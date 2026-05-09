import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyOrders } from '../../api/ecommerce';
import { useCurrentUser } from '../../auth/useCurrentUser';
import type { Order } from '../../types/ecommerce';
import { InlineNotification } from '../../ui/InlineNotification';
import { formatDateOnly, formatEuro, formatOrderStatus, formatRole } from '../../utils/pricing';

export function ProfilePage() {
  const { user, loading } = useCurrentUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyOrders(new URLSearchParams({ page: '1', perPage: '4' }))
      .then((result) => setOrders(result.data))
      .catch((reason) => setError((reason as Error).message));
  }, []);

  const roleLabel = useMemo(() => formatRole(user?.primaryRole ?? 'ROLE_CUSTOMER'), [user]);

  return (
    <div className="stack">
      <section className="panel profile-card">
        <div className="profile-card-header">
          <div>
            <span className="eyebrow">Profile</span>
            <h2 className="ecommerce-title">Your account</h2>
          </div>
          <span className="status-badge active">{roleLabel}</span>
        </div>

        {loading && <p className="muted">Loading your profile...</p>}
        {!loading && user && (
          <div className="profile-grid">
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
              <span>Roles</span>
              <strong>{user.roles.map(formatRole).join(', ')}</strong>
            </div>
          </div>
        )}
      </section>

      <section className="panel profile-orders-card">
        <div className="profile-section-head">
          <div>
            <h3>Recent orders</h3>
            <p className="muted">You can reopen your full history whenever you need it.</p>
          </div>
          <Link to="/client/orders" className="cta-link cta-link-secondary">View all orders</Link>
        </div>

        {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}

        {!error && orders.length === 0 && <div className="empty-state-card">You do not have any orders yet.</div>}

        {!error && orders.length > 0 && (
          <div className="profile-orders-list">
            {orders.map((order) => (
              <Link key={order.id} to={`/client/orders/${order.orderNumber}`} className="profile-order-row">
                <div>
                  <strong>{order.orderNumber}</strong>
                  <span>{formatDateOnly(order.createdAt)}</span>
                </div>
                <div>
                  <strong>{formatEuro(order.total)}</strong>
                  <span>{formatOrderStatus(order.status)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
