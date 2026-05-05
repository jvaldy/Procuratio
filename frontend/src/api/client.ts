function resolveApiBaseUrl(): string {
  const defaultBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:18080';

  // En E2E Docker, on force une base relative pour passer par le proxy Vite /api -> backend.
  if (import.meta.env.VITE_E2E_DOCKER === 'true') {
    const cypressBaseUrl = import.meta.env.VITE_API_BASE_URL_CYPRESS;
    return cypressBaseUrl && cypressBaseUrl.trim() !== '' ? cypressBaseUrl : 'http://api:8080';
  }

  return defaultBaseUrl;
}

export const API_BASE_URL = resolveApiBaseUrl();

let isRefreshing = false;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function sanitizeMessage(message: string): string {
  const trimmed = message.trim();

  if (trimmed === '') {
    return 'An unexpected error occurred. Please try again.';
  }

  if (trimmed.includes('Access Denied by #[IsGranted')) {
    return 'You do not have permission to perform this action.';
  }

  if (trimmed.toLowerCase().includes('internal server error')) {
    return 'An internal error occurred. Please try again in a moment.';
  }

  if (trimmed === 'Invalid credentials.') {
    return 'The email address or password is incorrect.';
  }

  return trimmed;
}

function getApiErrorMessage(status: number, payload: any): string {
  const rawMessage = sanitizeMessage(payload?.error?.message ?? payload?.message ?? '');

  if (status === 400) {
    return rawMessage || 'Some information is invalid. Please review the form and try again.';
  }

  if (status === 401) {
    return 'Your session has expired or your login details are invalid. Please sign in again.';
  }

  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (status === 404) {
    return rawMessage || 'The requested resource could not be found.';
  }

  if (status >= 500) {
    return 'An internal error occurred. Please try again in a moment.';
  }

  return rawMessage || 'An unexpected error occurred. Please try again.';
}

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
    throw new ApiError(res.status, getApiErrorMessage(res.status, payload));
  }

  return payload as T;
}
