import { scoreLevel, scoreLevelColor, formatScore } from "@/lib/format";

interface Props {
  score?: number | null;
  showBar?: boolean;
}

export default function ScoreIndicator({ score, showBar = false }: Props) {
  if (score == null) {
    return <span style={{ color: "var(--muted)" }}>—</span>;
  }

  const level = scoreLevel(score);
  const color = scoreLevelColor(level);
  const pct = Math.min(score * 100, 100);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className="text-sm font-mono font-semibold tabular-nums"
        style={{ color }}
      >
        {formatScore(score)}
      </span>
      {showBar && (
        <div
          className="h-1.5 rounded-full overflow-hidden flex-shrink-0"
          style={{
            background: "rgba(98,88,77,0.15)",
            width: "52px",
          }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}
