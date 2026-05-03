export type StatsKpis = {
  revenueTotal: number;
  revenuePos: number;
  revenueEcommerce: number;
  taxTotal: number;
  profitEstimate: number;
  salesPaidCount: number;
  ordersPaidCount: number;
  avgBasket: number;
  productsSoldQty: number;
  servicesSoldQty: number;
};

export type StatsOverviewResponse = {
  period: {
    from: string;
    to: string;
  };
  kpis: StatsKpis;
};

export type StatsTimeSeriesPoint = {
  bucket: string;
  revenue: number;
  salesCount: number;
  ordersCount: number;
  productsQty: number;
  servicesQty: number;
};

export type StatsTimeSeriesResponse = {
  period: {
    from: string;
    to: string;
    granularity: 'day' | 'week' | 'month';
  };
  data: StatsTimeSeriesPoint[];
};

