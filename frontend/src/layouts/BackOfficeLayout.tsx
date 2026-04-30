import { NavLink, Outlet } from 'react-router-dom';

export function BackOfficeLayout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h2 className="brand">PROCURATIO</h2>
        <nav className="nav">
          <NavLink to="/backoffice" end className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>
          <NavLink to="/backoffice/products" className={({ isActive }) => (isActive ? 'active' : '')}>Produits</NavLink>
          <NavLink to="/backoffice/services" className={({ isActive }) => (isActive ? 'active' : '')}>Services</NavLink>
          <NavLink to="/backoffice/pos" className={({ isActive }) => (isActive ? 'active' : '')}>Caisse POS</NavLink>
          <NavLink to="/backoffice/planning" className={({ isActive }) => (isActive ? 'active' : '')}>Planning</NavLink>
          <NavLink to="/client" className={({ isActive }) => (isActive ? 'active' : '')}>Client</NavLink>
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
