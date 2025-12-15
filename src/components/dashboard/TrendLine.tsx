interface TrendLineProps {
  title: string;
  data: { label: string; value: number }[];
  subtitle?: string;
}

const TrendLine = ({ title, data, subtitle }: TrendLineProps) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const positions = data.map((d, idx) => {
    const x = (idx / Math.max(data.length - 1, 1)) * 100;
    const y = 100 - (d.value / maxValue) * 100;
    return { x, y };
  });
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((maxValue / 4) * i));

  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return "";
    const tension = 0.25;
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[0];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const linePath = buildSmoothPath(positions);
  const areaPath = `${linePath} L 100,100 L 0,100 Z`;

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-lg shadow-black/10 text-foreground">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="text-xs text-muted-foreground">{data.length} points</div>
      </div>
      <div className="mt-4 h-60 rounded-2xl bg-gradient-to-b from-accent/10 via-transparent to-transparent p-4 ring-1 ring-border/60 relative overflow-hidden">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-border">
          {ticks.map((t, idx) => (
            <line
              key={t}
              x1="0"
              x2="100"
              y1={100 - (t / Math.max(maxValue, 1)) * 100}
              y2={100 - (t / Math.max(maxValue, 1)) * 100}
              stroke="currentColor"
              strokeWidth={0.25}
              opacity={idx === 0 ? 0.2 : 0.1}
              strokeDasharray="4 4"
            />
          ))}
        </svg>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative h-full w-full text-accent">
          <defs>
            <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#trendArea)" />
          <path d={linePath} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          {positions.map((p, idx) => (
            <g key={data[idx].label}>
              <circle cx={p.x} cy={p.y} r="3.2" className="fill-card" />
              <circle cx={p.x} cy={p.y} r="2.5" className="fill-current" />
            </g>
          ))}
        </svg>
        <div className="mt-4 grid grid-cols-4 gap-2 text-[11px] text-muted-foreground">
          {data.map((d) => (
            <span key={d.label} className="truncate">
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendLine;
