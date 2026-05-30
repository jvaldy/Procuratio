import { apiRequest } from './client';
import type { CustomerFile, CustomerListItem } from '../types/customers';

export function listBackofficeCustomers(params: URLSearchParams): Promise<{ data: CustomerListItem[]; meta: { page: number; perPage: number; total: number; totalPages: number } }> {
  return apiRequest(`/api/v1/backoffice/customers?${params.toString()}`);
}

export function getBackofficeCustomer(customerId: number): Promise<CustomerFile> {
  return apiRequest(`/api/v1/backoffice/customers/${customerId}`);
}

export function createBackofficeCustomer(payload: {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  birthDate?: string;
  preferredStoreId?: number;
}): Promise<CustomerListItem> {
  return apiRequest('/api/v1/backoffice/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBackofficeCustomer(customerId: number, payload: Partial<{
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string | null;
  birthDate: string | null;
  preferredStoreId: number | null;
}>): Promise<CustomerListItem> {
  return apiRequest(`/api/v1/backoffice/customers/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function resetBackofficeCustomerPassword(customerId: number): Promise<{ message: string; temporaryPassword: string }> {
  return apiRequest(`/api/v1/backoffice/customers/${customerId}/reset-password`, {
    method: 'POST',
  });
}
