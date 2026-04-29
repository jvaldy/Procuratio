import { NavLink, Outlet } from 'react-router-dom';

export function ClientLayout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h2 className="brand">PROCURATIO</h2>
        <nav className="nav">
          <NavLink to="/backoffice" className={({ isActive }) => (isActive ? 'active' : '')}>Back-office</NavLink>
          <NavLink to="/client" end className={({ isActive }) => (isActive ? 'active' : '')}>Client</NavLink>
        </nav>
      </aside>
      <main className="content">
        <h1 className="page-title">Espace Client</h1>
        <Outlet />
      </main>
    </div>
  );
}
