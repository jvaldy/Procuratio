import { apiRequest } from './client';
import { StatsOverviewResponse, StatsTimeSeriesResponse } from '../types/stats';

export async function getStatsOverview(params: { from: string; to: string }): Promise<StatsOverviewResponse> {
  const query = new URLSearchParams({ from: params.from, to: params.to });
  return apiRequest<StatsOverviewResponse>(`/api/v1/stats/overview?${query.toString()}`);
}

export async function getStatsTimeSeries(params: {
  from: string;
  to: string;
  granularity: 'day' | 'week' | 'month';
}): Promise<StatsTimeSeriesResponse> {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    granularity: params.granularity,
  });
  return apiRequest<StatsTimeSeriesResponse>(`/api/v1/stats/timeseries?${query.toString()}`);
}

