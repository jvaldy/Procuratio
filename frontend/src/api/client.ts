export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:18080';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  // Le token est injecté ici de façon centralisée pour éviter les oublis endpoint par endpoint.
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    // On normalise le message d'erreur pour garder un comportement UI cohérent
    // même si le backend renvoie des formats différents selon les cas.
    const message = payload?.error?.message ?? payload?.message ?? 'API error';
    throw new Error(message);
  }

  return payload as T;
}
