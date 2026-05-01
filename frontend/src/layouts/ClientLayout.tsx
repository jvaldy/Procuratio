import { NavLink, Outlet } from 'react-router-dom';

export function ClientLayout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h2 className="brand">PROCURATIO</h2>
        <nav className="nav">
          <NavLink to="/backoffice" className={({ isActive }) => (isActive ? 'active' : '')}>Back-office</NavLink>
          <NavLink to="/client" end className={({ isActive }) => (isActive ? 'active' : '')}>Client</NavLink>
          <NavLink to="/client/catalog" className={({ isActive }) => (isActive ? 'active' : '')}>Catalogue</NavLink>
          <NavLink to="/client/cart" className={({ isActive }) => (isActive ? 'active' : '')}>Panier</NavLink>
          <NavLink to="/client/checkout" className={({ isActive }) => (isActive ? 'active' : '')}>Checkout</NavLink>
          <NavLink to="/client/orders" className={({ isActive }) => (isActive ? 'active' : '')}>Commandes</NavLink>
          <NavLink to="/client/booking" className={({ isActive }) => (isActive ? 'active' : '')}>Reservation</NavLink>
          <NavLink to="/client/appointments" className={({ isActive }) => (isActive ? 'active' : '')}>Rendez-vous</NavLink>
        </nav>
      </aside>
      <main className="content">
        <h1 className="page-title">Espace Client</h1>
        <Outlet />
      </main>
    </div>
  );
}
