import { apiRequest } from './client';

export type StoreSummary = {
  id: number;
  name: string;
  code: string;
  email: string | null;
  phoneNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  status: string;
  themeColor: string;
  canDelete: boolean;
  linkCount: number;
};

export function listPublicStores(): Promise<{ data: StoreSummary[] }> {
  return apiRequest('/api/v1/public/stores');
}

export function listAdminStores(params: URLSearchParams): Promise<{ data: StoreSummary[]; meta: { page: number; perPage: number; total: number; totalPages: number } }> {
  return apiRequest(`/api/v1/admin/stores?${params.toString()}`);
}

export function createStore(payload: Partial<StoreSummary>): Promise<StoreSummary> {
  return apiRequest('/api/v1/admin/stores', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateStore(id: number, payload: Partial<StoreSummary>): Promise<StoreSummary> {
  return apiRequest(`/api/v1/admin/stores/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteStore(id: number): Promise<{ message: string }> {
  return apiRequest(`/api/v1/admin/stores/${id}`, { method: 'DELETE' });
}
