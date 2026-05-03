export type CatalogProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock?: number;
  availableStock?: number;
  isActive: boolean;
  brand: { id: number; name: string };
  category: { id: number; name: string };
};

export type CartLine = {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CartState = {
  id: number;
  status: string;
  currency: string;
  items: CartLine[];
  totals: { subTotal: number; taxTotal: number; total: number };
  updatedAt: string;
};

export type OrderItem = {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  id: number;
  orderNumber: string;
  status: string;
  currency: string;
  subTotal: number;
  taxTotal: number;
  total: number;
  pickupInStore: boolean;
  pickupSlot: string | null;
  pickupNote: string | null;
  paymentIntentId: string | null;
  items: OrderItem[];
  createdAt: string;
};

export type LoyaltyState = {
  account: {
    pointsBalance: number;
    isActive: boolean;
    updatedAt: string;
  };
  events: Array<{
    eventType: string;
    pointsDelta: number;
    balanceAfter: number;
    reason: string | null;
    createdAt: string;
  }>;
};

export type ProductReservation = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  status: string;
  expiresAt: string;
  createdAt: string;
};
