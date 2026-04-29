import { apiRequest } from '../api/client';

export async function login(email: string, password: string): Promise<void> {
  await apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await apiRequest('/api/v1/auth/logout', { method: 'POST' });
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    await apiRequest('/api/v1/me');
    return true;
  } catch {
    return false;
  }
}
