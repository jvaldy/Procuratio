import { useEffect, useMemo, useState } from 'react';
import { getStatsOverview, getStatsTimeSeries } from '../../api/stats';
import { listAdminStores } from '../../api/stores';
import type { StatsKpis, StatsTimeSeriesPoint } from '../../types/stats';
import { InlineNotification } from '../../ui/InlineNotification';

const EMPTY_KPIS: StatsKpis = {
  revenueTotal: 0,
  revenuePos: 0,
  revenueEcommerce: 0,
  taxTotal: 0,
  profitEstimate: 0,
  salesPaidCount: 0,
  ordersPaidCount: 0,
  avgBasket: 0,
  productsSoldQty: 0,
  servicesSoldQty: 0,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(value);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function BackOfficeHomePage() {
  const [from, setFrom] = useState(monthStartIso());
  const [to, setTo] = useState(todayIso());
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');
  const [stores, setStores] = useState<Array<{ id: number; name: string; city: string | null }>>([]);
  const [storeId, setStoreId] = useState(0);
  const [kpis, setKpis] = useState<StatsKpis>(EMPTY_KPIS);
  const [series, setSeries] = useState<StatsTimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStats(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [overview, timeline] = await Promise.all([
        getStatsOverview({ from, to, storeId: storeId || undefined }),
        getStatsTimeSeries({ from, to, granularity, storeId: storeId || undefined }),
      ]);
      setKpis(overview.kpis);
      setSeries(timeline.data);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats().catch(() => undefined);
  }, [from, to, granularity, storeId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadStats().catch(() => undefined);
    }, 60000);

    return () => window.clearInterval(timer);
  }, [from, to, granularity, storeId]);

  useEffect(() => {
    listAdminStores(new URLSearchParams({ page: '1', perPage: '50', status: 'active' }))
      .then((response) => setStores(response.data))
      .catch(() => undefined);
  }, []);

  const maxRevenue = useMemo(() => Math.max(...series.map((point) => point.revenue), 1), [series]);
  const maxClients = useMemo(() => Math.max(...series.map((point) => point.salesCount + point.ordersCount), 1), [series]);
  const maxChartValue = useMemo(() => Math.max(maxRevenue, maxClients, 1), [maxClients, maxRevenue]);
  const chartTicks = useMemo(() => {
    const step = Math.max(10, Math.ceil(maxChartValue / 5 / 10) * 10);
    return Array.from({ length: 6 }, (_, index) => step * (5 - index));
  }, [maxChartValue]);

  const donutSegments = useMemo(() => {
    const segments = [
      { label: 'Services', color: '#4447f2', value: kpis.servicesSoldQty || 0 },
      { label: 'Products', color: '#fd767e', value: kpis.productsSoldQty || 0 },
      { label: 'POS sales', color: '#f4c145', value: kpis.salesPaidCount || 0 },
      { label: 'Web orders', color: '#21c7cf', value: kpis.ordersPaidCount || 0 },
    ];
    const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
    let cursor = 0;

    return segments.map((segment) => {
      const start = cursor;
      const end = cursor + (segment.value / total) * 100;
      cursor = end;
      return { ...segment, start, end, percentage: Math.round((segment.value / total) * 100) };
    });
  }, [kpis]);

  const donutGradient = donutSegments
    .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
    .join(', ');

  const totalTransactions = Math.max(kpis.salesPaidCount + kpis.ordersPaidCount, 1);
  const avgServicesPerTicket = (kpis.servicesSoldQty / totalTransactions).toFixed(2);
  const avgProductsPerTicket = (kpis.productsSoldQty / totalTransactions).toFixed(2);
  const ecommerceShare = Math.round(((kpis.revenueEcommerce || 0) / Math.max(kpis.revenueTotal || 1, 1)) * 100);

  return (
    <div className="reference-screen stats-reference">
      <section className="panel row stats-filters">
        <div className="form-field stats-filter-field">
          <label htmlFor="stats-from-date">From</label>
          <input id="stats-from-date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div className="form-field stats-filter-field">
          <label htmlFor="stats-to-date">To</label>
          <input id="stats-to-date" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        <div className="form-field stats-filter-field">
          <label htmlFor="stats-granularity">Granularity</label>
          <select id="stats-granularity" value={granularity} onChange={(event) => setGranularity(event.target.value as 'day' | 'week' | 'month')}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
        <div className="form-field stats-filter-field">
          <label htmlFor="stats-store">Store</label>
          <select id="stats-store" value={storeId} onChange={(event) => setStoreId(Number(event.target.value))}>
            <option value={0}>All stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}{store.city ? ` · ${store.city}` : ''}</option>
            ))}
          </select>
        </div>
        <button className="btn-soft" type="button" onClick={loadStats}>{loading ? 'Refreshing...' : 'Refresh stats'}</button>
      </section>

      {error && <InlineNotification tone="error" title="Unable to load statistics" message={error} />}

      <section className="stats-main">
        <div className="stats-donut">
          <h3>Business mix</h3>
          <div className="donut" style={{ background: `conic-gradient(${donutGradient})` }}>
            <div className="donut-hole">
              <strong>{formatCurrency(kpis.revenueTotal)}</strong>
              <span>Total revenue</span>
            </div>
          </div>
          <ul>
            {donutSegments.map((segment) => (
              <li key={segment.label}>
                <span className="dot" style={{ background: segment.color }} />
                <span>{segment.label}</span>
                <small>{segment.value}</small>
                <strong>{segment.percentage}%</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="stats-bars">
          <div className="stats-bars-header">
            <div>
              <h2>Services</h2>
              <p className="muted">Revenue and customer activity over the selected period.</p>
            </div>
            <div className="stats-legend">
              <div className="stats-legend-item"><div className="stats-legend-dot services" /> Revenue</div>
              <div className="stats-legend-item"><div className="stats-legend-dot clients" /> Clients</div>
            </div>
          </div>
          <div className="stats-chart">
            <div className="stats-axis">
              {chartTicks.map((tick) => (
                <div key={tick} className="stats-axis-row">
                  <span>{tick}</span>
                  <div className="stats-axis-line" />
                </div>
              ))}
            </div>
            {series.map((point, index) => (
              <div className="stats-bar" key={`${point.bucket}-${index}`}>
                <div className="stats-bar-group">
                  <div className="stats-bar-fill soft" style={{ height: `${Math.max(10, Math.round(((point.salesCount + point.ordersCount) / maxChartValue) * 170))}px` }} />
                  <div className="stats-bar-fill" style={{ height: `${Math.max(12, Math.round((point.revenue / maxChartValue) * 170))}px` }} />
                </div>
                <span>{point.bucket}</span>
              </div>
            ))}
            {series.length === 0 && <p className="muted">No chart data is available for this period.</p>}
          </div>
        </div>
      </section>

      <section className="stats-kpis">
        <article className="panel">
          <h3>Revenue</h3>
          <p className="stat-value">{formatCurrency(kpis.revenueTotal)}</p>
        </article>
        <article className="panel">
          <h3>Estimated profit</h3>
          <p className="stat-value">{formatCurrency(kpis.profitEstimate)}</p>
        </article>
        <article className="panel">
          <h3>Average basket</h3>
          <p className="stat-value">{formatCurrency(kpis.avgBasket)}</p>
        </article>
        <article className="panel">
          <h3>Services per ticket</h3>
          <p className="stat-value">{avgServicesPerTicket}</p>
        </article>
        <article className="panel">
          <h3>Products per ticket</h3>
          <p className="stat-value">{avgProductsPerTicket}</p>
        </article>
      </section>

      <section className="stats-kpis stats-kpis-secondary">
        <article className="panel">
          <h3>POS revenue</h3>
          <p className="stat-value">{formatCurrency(kpis.revenuePos)}</p>
        </article>
        <article className="panel">
          <h3>Web revenue</h3>
          <p className="stat-value">{formatCurrency(kpis.revenueEcommerce)}</p>
        </article>
        <article className="panel">
          <h3>E-commerce share</h3>
          <p className="stat-value">{ecommerceShare}%</p>
        </article>
        <article className="panel">
          <h3>Products sold</h3>
          <p className="stat-value">{kpis.productsSoldQty.toFixed(0)}</p>
        </article>
        <article className="panel">
          <h3>Services sold</h3>
          <p className="stat-value">{kpis.servicesSoldQty.toFixed(0)}</p>
        </article>
      </section>
    </div>
  );
}

