function resolveApiBaseUrl(): string {
  const defaultBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:18080';

  // En E2E Docker, on force une base relative pour passer par le proxy Vite /api -> backend.
  if (import.meta.env.VITE_E2E_DOCKER === 'true') {
    return import.meta.env.VITE_API_BASE_URL_CYPRESS ?? 'http://api:8080';
  }

  return defaultBaseUrl;
}

export const API_BASE_URL = resolveApiBaseUrl();

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
