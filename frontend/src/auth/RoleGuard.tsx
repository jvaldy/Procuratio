import { Navigate, Outlet } from 'react-router-dom';
import { hasRole, type UserRole } from './auth';
import { useCurrentUser } from './useCurrentUser';

type RoleGuardProps = {
  allowed: UserRole[];
  redirectTo?: string;
};

export function RoleGuard({ allowed, redirectTo = '/login' }: RoleGuardProps) {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowedByRole = allowed.some((role) => hasRole(user.roles, role));
  if (!allowedByRole) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
