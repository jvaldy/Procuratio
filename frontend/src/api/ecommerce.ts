import { apiRequest } from './client';
import type { CartState, CatalogProduct, LoyaltyState, Order, ProductReservation } from '../types/ecommerce';

export function listCatalog(params: URLSearchParams): Promise<{ data: CatalogProduct[]; meta: unknown }> {
  return apiRequest(`/api/v1/catalog/products?${params.toString()}`);
}

export function getCart(): Promise<CartState> {
  return apiRequest('/api/v1/cart');
}

export function addToCart(productId: number, quantity = 1): Promise<CartState> {
  return apiRequest('/api/v1/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
}

export function updateCartItem(productId: number, quantity: number): Promise<CartState> {
  return apiRequest(`/api/v1/cart/items/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(productId: number): Promise<CartState> {
  return apiRequest(`/api/v1/cart/items/${productId}`, { method: 'DELETE' });
}

export function checkout(payload: { pickupInStore: boolean; pickupSlot?: string; pickupNote?: string; redeemPoints?: number }) {
  return apiRequest<{ order: Order; loyalty?: { redeemedPoints: number; discountAmount: number }; paymentIntent: { id: string; clientSecret: string; status: string } }>('/api/v1/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listMyOrders(params: URLSearchParams): Promise<{ data: Order[]; meta: unknown }> {
  return apiRequest(`/api/v1/orders/me?${params.toString()}`);
}

export function getOrder(orderNumber: string): Promise<Order> {
  return apiRequest(`/api/v1/orders/${orderNumber}`);
}

export function getMyLoyalty(): Promise<LoyaltyState> {
  return apiRequest('/api/v1/loyalty/me');
}

export function reserveProduct(productId: number, quantity = 1, durationMinutes = 120): Promise<ProductReservation> {
  return apiRequest(`/api/v1/catalog/products/${productId}/reservations`, {
    method: 'POST',
    body: JSON.stringify({ quantity, durationMinutes }),
  });
}

export function listMyReservations(): Promise<{ data: ProductReservation[] }> {
  return apiRequest('/api/v1/reservations/me');
}
