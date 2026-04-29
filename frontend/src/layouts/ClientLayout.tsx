import { Link, Outlet } from 'react-router-dom';

export function ClientLayout() {
  return (
    <div className="container">
      <nav className="nav">
        <Link to="/backoffice">Back-office</Link>
        <Link to="/client">Client</Link>
      </nav>
      <div className="card">
        <h1>Espace Client</h1>
        <Outlet />
      </div>
    </div>
  );
}
