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
  total: number;
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
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

