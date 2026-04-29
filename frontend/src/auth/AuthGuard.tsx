import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from './auth';

export function AuthGuard() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'ko'>('loading');

  useEffect(() => {
    isAuthenticated().then((ok) => setStatus(ok ? 'ok' : 'ko'));
  }, []);

  if (status === 'loading') {
    return null;
  }

  return status === 'ok' ? <Outlet /> : <Navigate to="/login" replace />;
}
