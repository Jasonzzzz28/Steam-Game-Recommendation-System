import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface TrendChartProps {
  data: { label: string; value: number }[];
  title: string;
  subtitle?: string;
}

function TrendChart({ data, title, subtitle }: TrendChartProps) {
  return (
    <div className="card">
      <div className="card-top">
        <div>
          <p className="eyebrow">Trend</p>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
      </div>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#32a6b8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#32a6b8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="label" stroke="var(--muted)" />
            <YAxis stroke="var(--muted)" width={70} />
            <Tooltip contentStyle={{ background: '#0f1620', border: '1px solid #1f2a3a' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#32a6b8"
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TrendChart;
