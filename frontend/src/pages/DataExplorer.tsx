import StatCard from '../components/Stats/StatCard';

const hiveQueries = [
  'SELECT review_year, COUNT(*) AS cnt FROM reviews_clean GROUP BY review_year ORDER BY review_year;',
  'SELECT app_id, COUNT(*) AS reviews, AVG(voted_up) AS positive_rate FROM reviews_clean GROUP BY app_id ORDER BY reviews DESC LIMIT 20;',
  'SELECT user_id, COUNT(*) AS review_count FROM reviews_clean GROUP BY user_id ORDER BY review_count DESC LIMIT 20;',
];

function DataExplorer() {
  return (
    <div className="page">
      <section className="grid two-cols">
        <div className="card">
          <div className="card-top">
            <div>
              <p className="eyebrow">Person2 / Feature Engineering</p>
              <h3 className="card-title">Hive & Athena shortcuts</h3>
            </div>
          </div>
          <div className="code-block">
            {hiveQueries.map((query) => (
              <pre key={query}>{query}</pre>
            ))}
          </div>
          <p className="muted">Point these at steam_rec.reviews_clean / games_clean in Athena or EMR Hive.</p>
        </div>
        <div className="card">
          <div className="card-top">
            <div>
              <p className="eyebrow">Data paths</p>
              <h3 className="card-title">S3 + tables</h3>
            </div>
          </div>
          <ul className="list">
            <li>Raw: s3://steam-reco-team-yw1204/raw/steam_kaggle/dt=1205/</li>
            <li>Curated reviews: s3://steam-reco-team-yw1204/curated/reviews_clean/</li>
            <li>Curated games: s3://steam-reco-team-yw1204/curated/games_clean/</li>
            <li>Curated users: s3://steam-reco-team-yw1204/curated/users_clean/</li>
            <li>Hive DB: steam_rec (external tables)</li>
          </ul>
        </div>
      </section>

      <section className="grid stats-grid">
        <StatCard label="Training view" value="user_id, app_id, voted_up, timestamp" hint="ALS input" accent="blue" />
        <StatCard label="Feature view" value="language, popularity, price" hint="From Person2" accent="green" />
        <StatCard label="Serving" value="/recommendations endpoint" hint="Person3 API" accent="amber" />
        <StatCard label="Dashboard" value="QuickSight or custom charts" hint="Use Athena as source" accent="pink" />
      </section>
    </div>
  );
}

export default DataExplorer;
