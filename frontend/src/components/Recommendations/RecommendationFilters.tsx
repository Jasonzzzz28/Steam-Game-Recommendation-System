import { ChangeEvent } from 'react';
import { RecommendationQuery } from '../../types';

interface RecommendationFiltersProps {
  value: RecommendationQuery;
  onChange: (value: RecommendationQuery) => void;
  onFetch?: () => void;
}

function RecommendationFilters({ value, onChange, onFetch }: RecommendationFiltersProps) {
  const handleChange = (evt: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value: inputValue } = evt.target;
    const next: RecommendationQuery = { ...value };

    if (name === 'limit') {
      next.limit = Number(inputValue) || undefined;
    } else if (name === 'priceCap') {
      next.priceCap = Number(inputValue) || undefined;
    } else {
      // @ts-expect-error index signature for dynamic form fields
      next[name] = inputValue;
    }

    onChange(next);
  };

  return (
    <div className="card filters">
      <div className="filters-row">
        <label className="field">
          <span>User ID</span>
          <input
            name="userId"
            placeholder="steam user id"
            value={value.userId}
            onChange={handleChange}
          />
        </label>
        <label className="field">
          <span>Language</span>
          <select name="language" value={value.language ?? ''} onChange={handleChange}>
            <option value="">Any</option>
            <option value="english">English</option>
            <option value="schinese">Simplified Chinese</option>
            <option value="japanese">Japanese</option>
          </select>
        </label>
        <label className="field">
          <span>Platform</span>
          <select name="platform" value={value.platform ?? ''} onChange={handleChange}>
            <option value="">Any</option>
            <option value="windows">Windows</option>
            <option value="mac">macOS</option>
            <option value="linux">Linux</option>
          </select>
        </label>
        <label className="field">
          <span>Price cap ($)</span>
          <input
            type="number"
            name="priceCap"
            placeholder="50"
            value={value.priceCap ?? ''}
            onChange={handleChange}
          />
        </label>
        <label className="field">
          <span>Top-N</span>
          <input
            type="number"
            name="limit"
            placeholder="20"
            value={value.limit ?? ''}
            onChange={handleChange}
          />
        </label>
        <button className="btn" onClick={onFetch} type="button">
          Fetch recommendations
        </button>
      </div>
    </div>
  );
}

export default RecommendationFilters;
