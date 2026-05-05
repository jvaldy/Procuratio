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
  receiptNumber: string | null;
  customer: {
    id: number;
    fullName: string;
  } | null;
  seller: {
    id: number;
    email: string;
  } | null;
  total: number;
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
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
