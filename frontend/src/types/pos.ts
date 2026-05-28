export type PosItemPayload = {
  itemType: 'product' | 'service';
  itemId: number;
  quantity: number;
  discountAmount?: number;
  taxRate?: number;
};

export type Sale = {
  id: number;
  status: string;
  paymentStatus: string;
  canCancel?: boolean;
  receiptNumber: string | null;
  customer: {
    id: number;
    fullName: string;
  } | null;
  seller: {
    id: number;
    email: string;
  } | null;
  store: {
    id: number;
    name: string;
  } | null;
  total: number;
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  loyalty: {
    pointsBalance: number;
    pointsEarned: number;
    subscriptionName: string | null;
    visitCardName: string | null;
    visitCardUsed: number;
    visitCardTarget: number | null;
  } | null;
  items: Array<{
    id: number;
    itemType: 'product' | 'service';
    itemId: number;
    label: string;
    unitPrice: number;
    quantity: number;
    discountAmount: number;
    taxRate: number;
    lineTotal: number;
  }>;
  payments: Array<{
    id: number;
    method: string;
    amount: number;
    status: string;
    paidAt: string;
    externalRef: string | null;
  }>;
  createdAt: string;
};

export type PaginatedSales = {
  data: Sale[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export type PosCustomerSearchResult = {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
};
