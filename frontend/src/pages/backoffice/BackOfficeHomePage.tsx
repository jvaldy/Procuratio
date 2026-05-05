import { useEffect, useMemo, useState } from 'react';
import { getStatsOverview, getStatsTimeSeries } from '../../api/stats';
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

function fmt(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
  }).format(value);
}
function pct(value: number): string {
  return `${Math.round(value)}%`;
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
  const [from, setFrom]             = useState(monthStartIso());
  const [to, setTo]                 = useState(todayIso());
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');
  const [kpis, setKpis]             = useState<StatsKpis>(EMPTY_KPIS);
  const [series, setSeries]         = useState<StatsTimeSeriesPoint[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function loadStats(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [overview, timeline] = await Promise.all([
        getStatsOverview({ from, to }),
        getStatsTimeSeries({ from, to, granularity }),
      ]);
      setKpis(overview.kpis);
      setSeries(timeline.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats().catch(() => undefined);
  }, [from, to, granularity]);

  const displaySeries = series;
  const totalInvoices = Math.max(kpis.salesPaidCount + kpis.ordersPaidCount, 1);
  const servicesPerInvoice = (kpis.servicesSoldQty || 0) / totalInvoices;
  const productsPerInvoice = (kpis.productsSoldQty || 0) / totalInvoices;
  const newClientsRate = ((kpis.ordersPaidCount || 0) / totalInvoices) * 100;

  const peakRevenue = useMemo<number>(() => {
    return Math.max(...displaySeries.map((p) => p.revenue), 1);
  }, [displaySeries]);

  return (
    <div className="reference-screen stats-reference">
      {/* ── Filters ─────────────────────────────────────── */}
      <div className="panel row stats-filters">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <select value={granularity} onChange={(e) => setGranularity(e.target.value as 'day' | 'week' | 'month')}>
          <option value="day">Jour</option>
          <option value="week">Semaine</option>
          <option value="month">Mois</option>
        </select>
        <button className="btn-soft" onClick={loadStats}>
          {loading ? '…' : 'Actualiser'}
        </button>
      </div>

      {error && <InlineNotification tone="error" title="Unable to load statistics" message={error} />}

      {/* ── Main chart section ───────────────────────────── */}
      <section className="stats-main">
        {/* Donut */}
        <div className="stats-donut">
          <h3>Service Roundtable</h3>
          <div className="donut">
            <div className="donut-hole" />
          </div>
          <ul>
            <li><span className="dot violet" /> Massages</li>
            <li><span className="dot coral" />  Cutting</li>
            <li><span className="dot amber" />  Coloring</li>
            <li><span className="dot cyan" />   Facial</li>
          </ul>
        </div>

        {/* Bar chart */}
        <div className="stats-bars">
          <div className="stats-bars-header">
            <h2>Services</h2>
            <div className="stats-legend">
              <div className="stats-legend-item">
                <div className="stats-legend-dot services" />
                Services
              </div>
              <div className="stats-legend-item">
                <div className="stats-legend-dot clients" />
                Clients
              </div>
            </div>
          </div>
          <div className="stats-chart">
            {displaySeries.map((point, i) => (
              <div className="stats-bar" key={`${point.bucket}-${i}`}>
                <div className="stats-bar-group">
                  <div
                    className="stats-bar-fill soft"
                    style={{ height: `${Math.max(8, Math.round((point.ordersCount / peakRevenue) * 140))}px` }}
                  />
                  <div
                    className="stats-bar-fill"
                    style={{ height: `${Math.max(10, Math.round((point.revenue / peakRevenue) * 140))}px` }}
                  />
                </div>
                <span>{point.bucket}</span>
              </div>
            ))}
            {displaySeries.length === 0 && <p className="muted">Aucune donnee de serie sur cette periode.</p>}
          </div>
        </div>
      </section>

      {/* ── KPIs ────────────────────────────────────────── */}
      <section className="stats-kpis">
        <article className="panel">
          <h3>Professional request</h3>
          <p className="stat-value">{pct(kpis.taxTotal > 0 && kpis.revenueTotal > 0 ? (kpis.taxTotal / kpis.revenueTotal) * 100 : 0)}</p>
        </article>
        <article className="panel">
          <h3>New Clients Invoice</h3>
          <p className="stat-value">{pct(newClientsRate)}</p>
        </article>
        <article className="panel">
          <h3>Services Per Professional Invoice</h3>
          <p className="stat-value">{servicesPerInvoice.toFixed(2)}</p>
        </article>
        <article className="panel">
          <h3>Products Per Professional</h3>
          <p className="stat-value">{productsPerInvoice.toFixed(2)}</p>
        </article>
        <article className="panel">
          <h3>Daily Visits Per Professional</h3>
          <p className="stat-value">{(totalInvoices / 30).toFixed(2)}</p>
        </article>
      </section>

      <button className="panel stats-analysis-btn">View Analysis</button>
    </div>
  );
}
