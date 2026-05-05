import { apiRequest } from './client';
import type { PaginatedSales, PosCustomerSearchResult, PosItemPayload, Sale } from '../types/pos';

export function createSale(payload: { customerId?: number; items: PosItemPayload[]; globalDiscount?: number }): Promise<Sale> {
  return apiRequest('/api/v1/pos/sales', { method: 'POST', body: JSON.stringify(payload) });
}

export function suspendSale(id: number, reason?: string): Promise<Sale> {
  return apiRequest(`/api/v1/pos/sales/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export function resumeSale(id: number): Promise<Sale> {
  return apiRequest(`/api/v1/pos/sales/${id}/resume`, { method: 'POST' });
}

export function paySale(id: number, payload: { method: 'cash' | 'card'; amount: number; externalRef?: string }): Promise<Sale> {
  return apiRequest(`/api/v1/pos/sales/${id}/payments`, { method: 'POST', body: JSON.stringify(payload) });
}

export function getCustomerSales(customerId: number, page = 1, perPage = 10): Promise<PaginatedSales> {
  return apiRequest(`/api/v1/customers/${customerId}/sales?page=${page}&perPage=${perPage}`);
}

export function searchCustomers(term: string): Promise<{ data: PosCustomerSearchResult[] }> {
  return apiRequest(`/api/v1/customers/search?q=${encodeURIComponent(term)}`);
}

export function getSuspendedSales(page = 1, perPage = 20): Promise<PaginatedSales> {
  return apiRequest(`/api/v1/pos/suspended-sales?page=${page}&perPage=${perPage}`);
}

export function getSaleReceipt(id: number): Promise<{ receipt: Sale }> {
  return apiRequest(`/api/v1/pos/sales/${id}/receipt`);
}
