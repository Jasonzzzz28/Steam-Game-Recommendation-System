import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'green' | 'blue' | 'amber' | 'pink';
}

const ACCENT_CLASS: Record<NonNullable<StatCardProps['accent']>, string> = {
  green: 'stat-card--green',
  blue: 'stat-card--blue',
  amber: 'stat-card--amber',
  pink: 'stat-card--pink',
};

function StatCard({ label, value, hint, accent = 'blue' }: StatCardProps) {
  return (
    <div className={clsx('stat-card', ACCENT_CLASS[accent])}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export default StatCard;
