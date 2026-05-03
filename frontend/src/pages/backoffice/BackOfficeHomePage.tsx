import { useEffect, useMemo, useState } from 'react';
import { getStatsOverview, getStatsTimeSeries } from '../../api/stats';
import { StatsKpis, StatsTimeSeriesPoint } from '../../types/stats';

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
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

export function BackOfficeHomePage() {
  const [from, setFrom] = useState<string>(monthStartIso());
  const [to, setTo] = useState<string>(todayIso());
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [kpis, setKpis] = useState<StatsKpis>(EMPTY_KPIS);
  const [series, setSeries] = useState<StatsTimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  const peakRevenue = useMemo<number>(() => {
    if (series.length === 0) {
      return 1;
    }
    return Math.max(...series.map((item) => item.revenue), 1);
  }, [series]);

  return (
    <div className="reference-screen stats-reference stack">
      <div className="panel row stats-filters">
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <select value={granularity} onChange={(event) => setGranularity(event.target.value as 'day' | 'week' | 'month')}>
          <option value="day">Jour</option>
          <option value="week">Semaine</option>
          <option value="month">Mois</option>
        </select>
        <button className="btn-soft" onClick={() => loadStats()}>Actualiser</button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Chargement...</p>}

      <section className="panel stats-main">
        <div className="stats-donut">
          <h3>Service Roundtable</h3>
          <div className="donut"><div className="donut-hole" /></div>
          <ul>
            <li><span className="dot violet" /> Massages</li>
            <li><span className="dot coral" /> Cutting</li>
            <li><span className="dot amber" /> Coloring</li>
            <li><span className="dot cyan" /> Facial</li>
          </ul>
        </div>
        <div className="stats-bars">
          <h2>Services</h2>
          <div className="stats-chart">
            {series.map((point) => (
              <div className="stats-bar" key={point.bucket}>
                <div className="stats-bar-fill soft" style={{ height: `${Math.max(16, Math.round((point.ordersCount / peakRevenue) * 130))}px` }} />
                <div className="stats-bar-fill" style={{ height: `${Math.max(20, Math.round((point.revenue / peakRevenue) * 130))}px` }} />
                <span>{point.bucket}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="stats-kpis">
        <article className="panel"><h3>Professional request</h3><p className="stat-value">60%</p></article>
        <article className="panel"><h3>New Clients Invoice</h3><p className="stat-value">20%</p></article>
        <article className="panel"><h3>Services Per Professional Invoice</h3><p className="stat-value">{formatCurrency(kpis.revenueTotal || 100000)}</p></article>
        <article className="panel"><h3>Products Per Professional</h3><p className="stat-value">{formatCurrency(kpis.profitEstimate || 80000)}</p></article>
        <article className="panel"><h3>Daily Visits Per Professional</h3><p className="stat-value">2.93</p></article>
      </section>

      <button className="panel stats-analysis-btn">View Analysis</button>
    </div>
  );
}

