interface MiniBarChartProps {
  title: string;
  data: { label: string; value: number }[];
  max?: number;
}

const MiniBarChart = ({ title, data, max }: MiniBarChartProps) => {
  const peak = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm p-5 text-foreground">
      <div className="text-sm font-semibold mb-3">{title}</div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{d.label}</span>
              <span className="font-semibold text-foreground">{d.value}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, (d.value / peak) * 100)}%` }}
                aria-label={`${d.label} ${d.value}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniBarChart;
