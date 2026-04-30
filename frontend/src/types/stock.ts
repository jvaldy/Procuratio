export type CatalogItem = { id: number; name: string; isActive: boolean };

export type Product = {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  isActive: boolean;
  brand: { id: number; name: string };
  category: { id: number; name: string };
  createdAt: string;
};

export type ServiceItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  category: { id: number; name: string } | null;
  createdAt: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    sort: string;
    order: string;
  };
};
