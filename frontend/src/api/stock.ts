import { apiRequest } from './client';
import type { CatalogItem, PaginatedResponse, Product, ServiceItem } from '../types/stock';

export function listBrands(): Promise<CatalogItem[]> {
  return apiRequest('/api/v1/catalog/brands');
}

export function listCategories(): Promise<CatalogItem[]> {
  return apiRequest('/api/v1/catalog/categories');
}

export function listProducts(params: URLSearchParams): Promise<PaginatedResponse<Product>> {
  return apiRequest(`/api/v1/products?${params.toString()}`);
}

export function createProduct(payload: unknown): Promise<Product> {
  return apiRequest('/api/v1/products', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateProduct(id: number, payload: unknown): Promise<Product> {
  return apiRequest(`/api/v1/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteProduct(id: number): Promise<void> {
  return apiRequest(`/api/v1/products/${id}`, { method: 'DELETE' });
}

export function adjustProductStock(id: number, payload: unknown): Promise<Product> {
  return apiRequest(`/api/v1/products/${id}/stock-adjustments`, { method: 'POST', body: JSON.stringify(payload) });
}

export function listServices(params: URLSearchParams): Promise<PaginatedResponse<ServiceItem>> {
  return apiRequest(`/api/v1/services?${params.toString()}`);
}

export function createService(payload: unknown): Promise<ServiceItem> {
  return apiRequest('/api/v1/services', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateService(id: number, payload: unknown): Promise<ServiceItem> {
  return apiRequest(`/api/v1/services/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteService(id: number): Promise<void> {
  return apiRequest(`/api/v1/services/${id}`, { method: 'DELETE' });
}
