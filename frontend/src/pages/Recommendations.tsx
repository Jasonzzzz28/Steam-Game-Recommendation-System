import { useEffect, useState } from 'react';
import RecommendationFilters from '../components/Recommendations/RecommendationFilters';
import RecommendationList from '../components/Recommendations/RecommendationList';
import { getRecommendations } from '../services/api';
import { RecommendationItem, RecommendationQuery } from '../types';

function Recommendations() {
  const [filters, setFilters] = useState<RecommendationQuery>({
    userId: '7360263',
    limit: 12,
  });
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getRecommendations(filters);
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Person3 / Model Serving</p>
            <h3 className="card-title">Recommendation console</h3>
            <p className="muted">Swap user id and filters to call your API or use mock data.</p>
          </div>
        </div>
        <RecommendationFilters value={filters} onChange={setFilters} onFetch={fetchData} />
        <RecommendationList items={items} loading={loading} />
      </section>
      <section className="card">
        <div className="card-top">
          <div>
            <p className="eyebrow">Integration hints</p>
            <h3 className="card-title">API contract</h3>
          </div>
        </div>
        <ul className="list">
          <li>GET {`$VITE_API_BASE_URL/recommendations?userId=<id>&limit=<n>&language=<lang>&platform=<os>&priceCap=<max>`}</li>
          <li>Return JSON array of RecommendationItem: appId, title, score, reason, tags[], price, platforms[], language</li>
          <li>Wire this to ALS/LightGBM rerank endpoint that reads curated features from S3 or feature store</li>
        </ul>
      </section>
    </div>
  );
}

export default Recommendations;
