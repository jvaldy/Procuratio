import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { hasRole, logout, type UserRole } from '../auth/auth';
import { useCurrentUser } from '../auth/useCurrentUser';

const NAV_ITEMS: Array<{ to: string; label: string; end: boolean; roles: UserRole[] }> = [
  { to: '/backoffice', label: 'Dashboard', end: true, roles: ['ROLE_ADMIN'] },
  { to: '/backoffice/products', label: 'Products', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/services', label: 'Services', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/pos', label: 'Cash', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/planning', label: 'Planning', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/customers', label: 'Customers', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/employees', label: 'Employees', end: false, roles: ['ROLE_ADMIN'] },
  { to: '/backoffice/managers', label: 'Managers', end: false, roles: ['ROLE_ADMIN'] },
  { to: '/backoffice/stores', label: 'Stores', end: false, roles: ['ROLE_ADMIN'] },
  { to: '/backoffice/crm', label: 'CRM', end: false, roles: ['ROLE_ADMIN'] },
  { to: '/backoffice/warehouse', label: 'Warehouse', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/profile', label: 'Profile', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
];

export function BackOfficeLayout() {
  const { user } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
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

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!user) {
      return false;
    }
    return item.roles.some((role) => hasRole(user.roles, role));
  });

  const pageLabel = (() => {
    if (location.pathname.startsWith('/backoffice/products')) return 'BACK OFFICE > PRODUCTS';
    if (location.pathname.startsWith('/backoffice/services')) return 'BACK OFFICE > SERVICES';
    if (location.pathname.startsWith('/backoffice/pos')) return 'BACK OFFICE > CASH';
    if (location.pathname.startsWith('/backoffice/planning')) return 'BACK OFFICE > PLANNING';
    if (location.pathname.startsWith('/backoffice/customers')) return 'BACK OFFICE > CUSTOMERS';
    if (location.pathname.startsWith('/backoffice/employees')) return 'BACK OFFICE > EMPLOYEES';
    if (location.pathname.startsWith('/backoffice/managers')) return 'BACK OFFICE > MANAGERS';
    if (location.pathname.startsWith('/backoffice/stores')) return 'BACK OFFICE > STORES';
    if (location.pathname.startsWith('/backoffice/crm')) return 'BACK OFFICE > CRM';
    if (location.pathname.startsWith('/backoffice/warehouse')) return 'BACK OFFICE > WAREHOUSE';
    if (location.pathname.startsWith('/backoffice/profile')) return 'BACK OFFICE > PROFILE';
    return 'BACK OFFICE > DASHBOARD';
  })();

  return (
    <div className="shell">
      <aside className="sidebar">
        <h2 className="brand">PROCURATIO</h2>
        <nav className="nav">
          {visibleItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {label}
            </NavLink>
          ))}
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
