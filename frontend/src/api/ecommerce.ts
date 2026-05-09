import { apiRequest } from './client';
import type { CartState, CatalogProduct, GiftVoucherSummary, LoyaltyState, Order, PickupHour, ProductReservation } from '../types/ecommerce';

export function listCatalog(params: URLSearchParams): Promise<{ data: CatalogProduct[]; meta: { page: number; perPage: number; total: number; totalPages: number } }> {
  return apiRequest(`/api/v1/catalog/products?${params.toString()}`);
}

export function getCatalogProduct(productId: number): Promise<CatalogProduct> {
  return apiRequest(`/api/v1/catalog/products/${productId}`);
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

export function applyCartGiftVoucher(payload: { code: string }): Promise<CartState> {
  return apiRequest('/api/v1/cart/gift-voucher', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function removeCartGiftVoucher(): Promise<CartState> {
  return apiRequest('/api/v1/cart/gift-voucher', { method: 'DELETE' });
}

export function checkout(payload: {
  pickupInStore: boolean;
  pickupSlot?: string;
  pickupNote?: string;
  redeemPoints?: number;
  deliveryAddress?: {
    fullName: string;
    line1: string;
    line2?: string;
    postalCode: string;
    city: string;
    country: string;
    instructions?: string;
  };
}) {
  return apiRequest<{ order: Order; loyalty?: { redeemedPoints: number; discountAmount: number }; paymentIntent: { id: string; clientSecret: string; status: string } | null }>('/api/v1/checkout', {
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

export function cancelReservation(reservationId: number): Promise<ProductReservation> {
  return apiRequest(`/api/v1/reservations/${reservationId}/cancel`, {
    method: 'POST',
  });
}

export function listPickupHours(): Promise<{ data: PickupHour[] }> {
  return apiRequest('/api/v1/pickup-hours');
}

export function listMyGiftVouchers(): Promise<{ data: GiftVoucherSummary[] }> {
  return apiRequest('/api/v1/gift-vouchers/me');
}

export function activateMyGiftVoucher(payload: { code: string }): Promise<GiftVoucherSummary> {
  return apiRequest('/api/v1/gift-vouchers/activate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
