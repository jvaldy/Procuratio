import { apiRequest } from '../api/client';

export type UserRole = 'ROLE_ADMIN' | 'ROLE_EMPLOYEE' | 'ROLE_CUSTOMER' | 'ROLE_USER';

export type CurrentUser = {
  email: string;
  roles: string[];
  primaryRole: string;
  displayName: string;
  phoneNumber: string | null;
};

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

export async function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/api/v1/me');
}

export function hasRole(roles: string[], expected: UserRole): boolean {
  return roles.includes(expected);
}
