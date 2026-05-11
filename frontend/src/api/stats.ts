import { apiRequest } from './client';
import { StatsOverviewResponse, StatsTimeSeriesResponse } from '../types/stats';

export async function getStatsOverview(params: { from: string; to: string; storeId?: number }): Promise<StatsOverviewResponse> {
  const query = new URLSearchParams({ from: params.from, to: params.to });
  if (params.storeId) {
    query.set('storeId', String(params.storeId));
  }
  return apiRequest<StatsOverviewResponse>(`/api/v1/stats/overview?${query.toString()}`);
}

export async function getStatsTimeSeries(params: {
  from: string;
  to: string;
  granularity: 'day' | 'week' | 'month';
  storeId?: number;
}): Promise<StatsTimeSeriesResponse> {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    granularity: params.granularity,
  });
  if (params.storeId) {
    query.set('storeId', String(params.storeId));
  }
  return apiRequest<StatsTimeSeriesResponse>(`/api/v1/stats/timeseries?${query.toString()}`);
}
