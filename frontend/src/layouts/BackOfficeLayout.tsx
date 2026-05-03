import { NavLink, Outlet } from 'react-router-dom';
import { hasRole, type UserRole } from '../auth/auth';
import { useCurrentUser } from '../auth/useCurrentUser';

const NAV_ITEMS: Array<{ to: string; label: string; end: boolean; roles: UserRole[] }> = [
  { to: '/backoffice', label: 'Dashboard', end: true, roles: ['ROLE_ADMIN'] },
  { to: '/backoffice/products', label: 'Produits', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/services', label: 'Services', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/pos', label: 'Caisse', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/planning', label: 'Planning', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/crm', label: 'CRM', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/backoffice/warehouse', label: 'Entrepot', end: false, roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
  { to: '/client', label: 'Espace client', end: false, roles: ['ROLE_ADMIN', 'ROLE_CUSTOMER'] },
];

export function BackOfficeLayout() {
  const { user } = useCurrentUser();
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
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
