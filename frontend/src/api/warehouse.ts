import { API_BASE_URL, apiRequest } from './client';
import type { Order } from '../types/ecommerce';

export function listWarehouseOrders(params: URLSearchParams): Promise<{ data: Order[]; meta: unknown }> {
  return apiRequest(`/api/v1/warehouse/orders?${params.toString()}`);
}

export function updateWarehouseOrderStatus(orderId: number, status: string): Promise<Order> {
  return apiRequest(`/api/v1/warehouse/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getWarehouseShippingNote(orderId: number): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/warehouse/orders/${orderId}/shipping-note`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Unable to generate the shipping note.');
  }

  return response.blob();
}
