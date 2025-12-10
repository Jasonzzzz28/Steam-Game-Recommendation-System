import QualityBadge from './QualityBadge';

interface DataPipelineCardProps {
  stage: string;
  owner: string;
  status: 'pass' | 'warn' | 'fail';
  updatedAt?: string;
  details?: string;
  outputPath?: string;
}

function DataPipelineCard({ stage, owner, status, updatedAt, details, outputPath }: DataPipelineCardProps) {
  return (
    <div className="pipeline-card">
      <div className="pipeline-card__top">
        <div>
          <p className="eyebrow">{owner}</p>
          <h3 className="pipeline-title">{stage}</h3>
        </div>
        <QualityBadge status={status} label={status === 'pass' ? 'Ready' : status === 'warn' ? 'Attention' : 'Blocked'} />
      </div>
      {details && <p className="pipeline-details">{details}</p>}
      <div className="pipeline-meta">
        {updatedAt && <span>Updated {updatedAt}</span>}
        {outputPath && <span className="muted">Output: {outputPath}</span>}
      </div>
    </div>
  );
}

export default DataPipelineCard;
