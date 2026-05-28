export type CatalogProduct = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  stock?: number;
  availableStock?: number;
  isActive: boolean;
  brand: { id: number; name: string };
  category: { id: number; name: string };
  reviews: { count: number; average: number };
};

export type GiftVoucherPurchasePayload = {
  amount: number;
  purchaserName: string;
  recipientName: string;
  recipientEmail: string;
  serviceLabel?: string;
  effectiveAt?: string;
  durationDays?: number;
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
  totals: {
    subTotal: number;
    taxTotal: number;
    total: number;
    giftVoucherDiscount: number;
    payableTotal: number;
  };
  appliedGiftVoucher: GiftVoucherSummary | null;
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
  store: { id: number; name: string; city: string | null } | null;
  pickupSlot: string | null;
  pickupNote: string | null;
  giftVoucherAmount: number;
  giftVoucher: GiftVoucherSummary | null;
  purchasedGiftVoucher: GiftVoucherSummary | null;
  appointmentBooking: {
    id: number;
    startAt: string;
    endAt: string;
    employee: { id: number; fullName: string };
    services: Array<{
      serviceId: number;
      serviceName: string;
      quantity: number;
      durationMinutes: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  } | null;
  giftVoucherDeliveryEmail: string | null;
  deliveryAddress: {
    fullName: string | null;
    line1: string | null;
    line2: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    instructions: string | null;
  };
  paymentIntentId: string | null;
  paymentClientSecret: string | null;
  stockStillAvailable: boolean;
  canCancel: boolean;
  items: OrderItem[];
  createdAt: string;
};

export type LoyaltyState = {
  account: {
    pointsBalance: number;
    isActive: boolean;
    subscriptionName: string | null;
    subscriptionStatus: string;
    subscriptionStartedAt: string | null;
    subscriptionEndsAt: string | null;
    visitCardName: string | null;
    visitCardTarget: number | null;
    visitCardUsed: number;
    visitCardActive: boolean;
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
  store: { id: number; name: string } | null;
  expiresAt: string;
  createdAt: string;
};

export type PickupHour = {
  dayOfWeek: number;
  storeId?: number | null;
  startTime: string;
  endTime: string;
  isOpen: boolean;
};

export type GiftVoucherSummary = {
  id: number;
  code: string | null;
  status: string;
  isCodeAvailable?: boolean;
  purchaserName: string | null;
  recipientName: string | null;
  serviceLabel: string | null;
  initialAmount: number;
  balanceAmount: number;
  effectiveAt: string | null;
  expiresAt: string | null;
  durationDays: number | null;
  createdAt: string;
};
