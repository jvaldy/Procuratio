import { apiRequest } from './client';
import type { Order } from '../types/ecommerce';

export function listWarehouseOrders(params: URLSearchParams): Promise<{ data: Order[]; meta: unknown }> {
  return apiRequest(`/api/v1/warehouse/orders?${params.toString()}`);
}

