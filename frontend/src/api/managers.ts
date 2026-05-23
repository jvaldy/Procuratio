import { apiRequest } from './client';

export type ManagerAdmin = {
  id: number;
  fullName: string;
  email: string;
  jobTitle: string | null;
  phoneNumber: string | null;
  status: string;
  archivedAt: string | null;
  store: { id: number; name: string } | null;
  createdAt: string;
  accessLevel: 'manager';
};

export function listManagers(params: URLSearchParams): Promise<{ data: ManagerAdmin[]; meta: { page: number; perPage: number; total: number; totalPages: number } }> {
  return apiRequest(`/api/v1/admin/managers?${params.toString()}`);
}

export function createManager(payload: {
  fullName: string;
  email: string;
  password: string;
  storeId?: number | null;
  jobTitle?: string;
  phoneNumber?: string;
  status?: string;
}): Promise<ManagerAdmin> {
  return apiRequest('/api/v1/admin/managers', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateManager(id: number, payload: Partial<{
  fullName: string;
  email: string;
  password: string;
  storeId: number | null;
  jobTitle: string | null;
  phoneNumber: string | null;
  status: string;
}>): Promise<ManagerAdmin> {
  return apiRequest(`/api/v1/admin/managers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
