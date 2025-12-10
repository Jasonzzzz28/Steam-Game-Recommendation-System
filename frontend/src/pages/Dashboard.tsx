import { useEffect, useState } from 'react';
import TrendChart from '../components/Charts/TrendChart';
import DataPipelineCard from '../components/DataQuality/DataPipelineCard';
import StatCard from '../components/Stats/StatCard';
import { getPipeline, getStats } from '../services/api';
import { PipelineStatus } from '../types';

type StatsState = {
  reviews: number;
  games: number;
  users: number;
  avg_price: number;
  positive_ratio: number;
  trends: { label: string; value: number }[];
};

function Dashboard() {
  const [stats, setStats] = useState<StatsState | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus[]>([]);

  useEffect(() => {
    getStats().then(setStats).catch(console.error);
    getPipeline().then(setPipeline).catch(console.error);
  }, []);

  return (
    <div className="page">
      <section className="grid stats-grid">
        <StatCard
          label="Reviews in curated layer"
          value={stats ? stats.reviews.toLocaleString() : '...'}
          hint="S3 curated/reviews_clean (Snappy Parquet)"
          accent="blue"
        />
        <StatCard
          label="Games"
          value={stats ? stats.games.toLocaleString() : '...'}
          hint="games_clean app catalog"
          accent="green"
        />
        <StatCard
          label="Users"
          value={stats ? stats.users.toLocaleString() : '...'}
          hint="Distinct user_id in reviews"
          accent="amber"
        />
        <StatCard
          label="Positive ratio"
          value={stats ? `${Math.round(stats.positive_ratio * 100)}%` : '...'}
          hint={stats ? `Avg price $${stats.avg_price.toFixed(2)}` : ''}
          accent="pink"
        />
      </section>

      <section className="grid two-cols">
        <TrendChart
          title="Monthly review volume"
          subtitle="Source: Hive/Athena on reviews_clean partitioned by review_year"
          data={stats?.trends ?? []}
        />
        <div className="card">
          <div className="card-top">
            <div>
              <p className="eyebrow">Person1 / PySpark / S3</p>
              <h3 className="card-title">Data quality checklist</h3>
            </div>
          </div>
          <ul className="list">
            <li>Raw zone versioned under dt partitions (CSV + JSON)</li>
            <li>Curated Parquet written with Snappy; coalesced to healthy file sizes</li>
            <li>Hive external tables pointing to S3 curated paths</li>
            <li>QA: row counts, distinct users/apps, voted_up in [0,1]</li>
          </ul>
        </div>
      </section>

      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Pipeline ownership</p>
            <h3 className="card-title">Who owns what</h3>
          </div>
        </div>
        <div className="pipeline-grid">
          {pipeline.map((item) => (
            <DataPipelineCard
              key={item.stage}
              stage={item.stage}
              owner={item.owner}
              status={item.status}
              updatedAt={item.updatedAt}
              details={item.details}
              outputPath={item.outputPath}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
