import { apiRequest } from './client';

export type EmployeeAdmin = {
  id: number;
  fullName: string;
  email: string;
  jobTitle: string | null;
  phoneNumber: string | null;
  status: string;
  isBookable: boolean;
  archivedAt: string | null;
  store: { id: number; name: string } | null;
};

export function listEmployees(params: URLSearchParams): Promise<{ data: EmployeeAdmin[]; meta: { page: number; perPage: number; total: number; totalPages: number } }> {
  return apiRequest(`/api/v1/admin/employees?${params.toString()}`);
}

export function createEmployee(payload: {
  fullName: string;
  email: string;
  password: string;
  storeId: number;
  jobTitle?: string;
  phoneNumber?: string;
  status?: string;
  isBookable?: boolean;
}): Promise<EmployeeAdmin> {
  return apiRequest('/api/v1/admin/employees', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateEmployee(id: number, payload: Partial<{
  fullName: string;
  email: string;
  password: string;
  storeId: number | null;
  jobTitle: string | null;
  phoneNumber: string | null;
  status: string;
  isBookable: boolean;
}>): Promise<EmployeeAdmin> {
  return apiRequest(`/api/v1/admin/employees/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
