import { NavLink, Outlet } from 'react-router-dom';
import { hasRole } from '../auth/auth';
import { useCurrentUser } from '../auth/useCurrentUser';

export function ClientLayout() {
  const { user } = useCurrentUser();
  const canAccessBackOffice = user ? hasRole(user.roles, 'ROLE_ADMIN') : false;

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
      </aside>
      <main className="content">
        <h1 className="page-title">Client area</h1>
        <Outlet />
      </main>
    </div>
  );
}
