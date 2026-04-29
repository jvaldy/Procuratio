import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from './auth';

export function AuthGuard() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}
