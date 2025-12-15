interface RadarPoint {
  label: string;
  value: number;
}

interface RadarChartProps {
  title: string;
  data: RadarPoint[];
  max?: number;
}

const polarToCartesian = (center: number, radius: number, angle: number) => {
  const rad = (angle - 90) * (Math.PI / 180);
  return {
    x: center + radius * Math.cos(rad),
    y: center + radius * Math.sin(rad),
  };
};

const RadarChart = ({ title, data, max }: RadarChartProps) => {
  const size = 220;
  const center = size / 2;
  const radius = size / 2 - 20;
  const maxValue = max ?? Math.max(...data.map((d) => d.value), 1);
  const angleStep = 360 / data.length;

  const points = data
    .map((d, idx) => {
      const angle = idx * angleStep;
      const r = (d.value / maxValue) * radius;
      const { x, y } = polarToCartesian(center, r, angle);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm p-5">
      <div className="text-sm font-semibold text-foreground mb-3">{title}</div>
      <div className="flex justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={title}>
          <defs>
            <linearGradient id="radarStroke" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="radarFill" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.06" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((factor) => (
            <circle
              key={factor}
              cx={center}
              cy={center}
              r={radius * factor}
              className="stroke-border/60 fill-none"
              strokeDasharray="4 4"
            />
          ))}
          {data.map((d, idx) => {
            const angle = idx * angleStep;
            const { x, y } = polarToCartesian(center, radius + 8, angle);
            return (
              <text
                key={d.label}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[11px] fill-muted-foreground"
              >
                {d.label}
              </text>
            );
          })}
          <polygon points={points} fill="url(#radarFill)" stroke="url(#radarStroke)" strokeWidth={2} />
          {data.map((d, idx) => {
            const angle = idx * angleStep;
            const r = (d.value / maxValue) * radius;
            const { x, y } = polarToCartesian(center, r, angle);
            return <circle key={d.label} cx={x} cy={y} r={3} className="fill-accent" />;
          })}
        </svg>
      </div>
    </div>
  );
};

export default RadarChart;
