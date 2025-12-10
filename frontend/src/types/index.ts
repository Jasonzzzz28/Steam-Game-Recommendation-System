export interface RecommendationItem {
  appId: string;
  title: string;
  score: number;
  reason?: string;
  tags?: string[];
  price?: number;
  platforms?: string[];
  language?: string;
}

export interface RecommendationQuery {
  userId: string;
  language?: string;
  priceCap?: number;
  platform?: string;
  limit?: number;
}

export interface PipelineStatus {
  stage: string;
  owner: string;
  status: 'pass' | 'warn' | 'fail';
  updatedAt?: string;
  details?: string;
  outputPath?: string;
}

export interface MetricCard {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'green' | 'blue' | 'amber' | 'pink';
}
