import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { hasRole, logout } from '../auth/auth';
import { useCurrentUser } from '../auth/useCurrentUser';

export function ClientLayout() {
  const { user } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const canAccessBackOffice = user ? hasRole(user.roles, 'ROLE_ADMIN') : false;
  const [timeLabel, setTimeLabel] = useState(() => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const update = () => setTimeLabel(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    document.documentElement.lang = user.preferences.language || 'en';
    document.body.dataset.theme = user.preferences.theme || 'soft';
    document.body.dataset.fontSize = user.preferences.fontSize || 'medium';
  }, [user]);

  const pageLabel = (() => {
    if (location.pathname.startsWith('/client/catalog/')) return 'CATALOG > PRODUCT';
    if (location.pathname.startsWith('/client/catalog')) return 'SHOP > CATALOG';
    if (location.pathname.startsWith('/client/cart')) return 'SHOP > CART';
    if (location.pathname.startsWith('/client/checkout')) return 'SHOP > CHECKOUT';
    if (location.pathname.startsWith('/client/orders/')) return 'SHOP > ORDER DETAIL';
    if (location.pathname.startsWith('/client/orders')) return 'SHOP > ORDERS';
    if (location.pathname.startsWith('/client/booking')) return 'CLIENT > APPOINTMENTS';
    if (location.pathname.startsWith('/client/profile')) return 'CLIENT > PROFILE';
    return 'CLIENT > HOME';
  })();

  return (
    <div className="shell">
      <aside className="sidebar">
        <h2 className="brand">PROCURATIO</h2>
        <nav className="nav">
          {canAccessBackOffice && (
            <NavLink to="/backoffice" className={({ isActive }) => (isActive ? 'active' : '')}>
              Back office
            </NavLink>
          )}
          <NavLink to="/client" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Home
          </NavLink>
          <NavLink to="/client/catalog" className={({ isActive }) => (isActive ? 'active' : '')}>
            Catalog
          </NavLink>
          <NavLink to="/client/cart" className={({ isActive }) => (isActive ? 'active' : '')}>
            Cart
          </NavLink>
          <NavLink to="/client/booking" className={({ isActive }) => (isActive ? 'active' : '')}>
            Appointments
          </NavLink>
          <NavLink to="/client/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
            Profile
          </NavLink>
        </nav>
        {user && (
          <div className="sidebar-footer">
            <button
              type="button"
              className="planning-action-btn btn-ghost sidebar-logout-btn"
              onClick={async () => {
                await logout().catch(() => undefined);
                navigate('/login', { replace: true });
              }}
            >
              Log out
            </button>
          </div>
        )}
      </aside>
      <main className="content">
        <header className="ref-topbar client-topbar">
          <div className="ref-topbar-left">{pageLabel}</div>
          <div className="ref-time">{timeLabel}</div>
          <div className="ref-topbar-right" />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
