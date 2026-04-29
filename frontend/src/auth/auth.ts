import { apiRequest } from '../api/client';

export async function login(email: string, password: string): Promise<string> {
  const data = await apiRequest<{ token: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('token', data.token);
  return data.token;
}

export function logout(): void {
  localStorage.removeItem('token');
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem('token'));
}
