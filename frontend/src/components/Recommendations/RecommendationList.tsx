import { RecommendationItem } from '../../types';

interface RecommendationListProps {
  items: RecommendationItem[];
  loading?: boolean;
}

function RecommendationList({ items, loading }: RecommendationListProps) {
  if (loading) {
    return <div className="card">Loading recommendations...</div>;
  }

  if (!items.length) {
    return <div className="card">No recommendations yet. Choose a user and fetch results.</div>;
  }

  return (
    <div className="recommendation-grid">
      {items.map((rec) => (
        <div key={rec.appId} className="card recommendation-card">
          <div className="card-top">
            <div>
              <p className="eyebrow">App ID {rec.appId}</p>
              <h3 className="rec-title">{rec.title}</h3>
            </div>
            <div className="score">{rec.score.toFixed(2)}</div>
          </div>
          {rec.reason && <p className="rec-reason">{rec.reason}</p>}
          <div className="rec-meta">
            {rec.price !== undefined && <span>${rec.price.toFixed(2)}</span>}
            {rec.language && <span className="pill">{rec.language}</span>}
            {rec.platforms?.length && (
              <span className="muted">{rec.platforms.join(' - ')}</span>
            )}
          </div>
          {rec.tags && (
            <div className="tag-row">
              {rec.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default RecommendationList;
