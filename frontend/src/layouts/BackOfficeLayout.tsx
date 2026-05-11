import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  { to: '/backoffice/stores', label: 'Stores', end: false, roles: ['ROLE_ADMIN'] },
  { to: '/backoffice/crm', label: 'CRM', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/warehouse', label: 'Warehouse', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/client', label: 'Client area', end: false, roles: ['ROLE_ADMIN', 'ROLE_CUSTOMER'] },
];

export function BackOfficeLayout() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
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
        <Outlet />
      </main>
    </div>
  );
}
