export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:18080';

let isRefreshing = false;

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
  const payload = await res.json().catch(() => ({}));

  if (res.status === 401 && !path.includes('/api/v1/auth/login') && !path.includes('/api/v1/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      const refresh = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      isRefreshing = false;

      if (refresh.ok) {
        return apiRequest<T>(path, options);
      }
    }

    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  }

  if (!res.ok) {
    const message = payload?.error?.message ?? payload?.message ?? 'API error';
    throw new Error(message);
  }

  return payload as T;
}
