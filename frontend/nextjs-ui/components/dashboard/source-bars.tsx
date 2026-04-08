import { formatCompactNumber } from "@/lib/format";

export function SourceBars({
  sourceObjectSeries,
}: {
  sourceObjectSeries: { categories: string[]; data: number[] };
}) {
  const maxValue = Math.max(...sourceObjectSeries.data, 1);

  return (
    <div className="space-y-4">
      {sourceObjectSeries.categories.map((category, index) => {
        const value = sourceObjectSeries.data[index] || 0;
        const width = `${(value / maxValue) * 100}%`;

        return (
          <div key={`${category}-${index}`} className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="truncate font-semibold text-[color:var(--text)]">
                {category || "Unknown source"}
              </span>
              <span className="text-[color:var(--muted)]">
                {formatCompactNumber(value)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[rgba(34,29,24,0.08)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#9f3b27,#d27d3d)]"
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
