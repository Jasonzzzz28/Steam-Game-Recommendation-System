import clsx from 'clsx';

interface QualityBadgeProps {
  label: string;
  status?: 'pass' | 'warn' | 'fail';
}

const STATUS_CLASS: Record<NonNullable<QualityBadgeProps['status']>, string> = {
  pass: 'badge--pass',
  warn: 'badge--warn',
  fail: 'badge--fail',
};

function QualityBadge({ label, status = 'pass' }: QualityBadgeProps) {
  return <span className={clsx('badge', STATUS_CLASS[status])}>{label}</span>;
}

export default QualityBadge;
