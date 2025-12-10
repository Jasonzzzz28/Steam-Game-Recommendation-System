import { PipelineStatus, RecommendationItem, RecommendationQuery } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface StatsResponse {
  reviews: number;
  games: number;
  users: number;
  avg_price: number;
  positive_ratio: number;
  trends: { label: string; value: number }[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed ${res.status}`);
  return res.json();
}

export async function getStats(): Promise<StatsResponse> {
  if (API_BASE) {
    try {
      return await fetchJson<StatsResponse>(`${API_BASE}/stats`);
    } catch (err) {
      console.warn('Falling back to mock stats', err);
    }
  }
  return fetchJson<StatsResponse>('/mock/stats.json');
}

export async function getPipeline(): Promise<PipelineStatus[]> {
  if (API_BASE) {
    try {
      return await fetchJson<PipelineStatus[]>(`${API_BASE}/pipeline`);
    } catch (err) {
      console.warn('Falling back to mock pipeline', err);
    }
  }
  return fetchJson<PipelineStatus[]>('/mock/pipeline.json');
}

export async function getRecommendations(query: RecommendationQuery): Promise<RecommendationItem[]> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== '') params.append(key, String(val));
  });

  if (API_BASE) {
    try {
      return await fetchJson<RecommendationItem[]>(`${API_BASE}/recommendations?${params.toString()}`);
    } catch (err) {
      console.warn('Falling back to mock recommendations', err);
    }
  }
  return fetchJson<RecommendationItem[]>('/mock/recommendations.json');
}
