export function SparklineChart({
  data,
  stroke,
  fill,
  chartId,
}: {
  data: [number, number][];
  stroke: string;
  fill: string;
  chartId: string;
}) {
  if (!data.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-white/60 p-8 text-sm text-[color:var(--muted)]">
        No chart data returned by the API.
      </div>
    );
  }

  const width = 640;
  const height = 260;
  const values = data.map(([, value]) => value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = Math.max(maxValue - minValue, 1);

  const points = data
    .map(([, value], index) => {
      const x = (index / Math.max(data.length - 1, 1)) * width;
      const y = height - ((value - minValue) / range) * (height - 24) - 12;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[260px] w-full overflow-visible"
      role="img"
      aria-label="Trend chart"
    >
      <defs>
        <linearGradient id={`chart-fill-${chartId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#chart-fill-${chartId})`}
        opacity="1"
      />
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
