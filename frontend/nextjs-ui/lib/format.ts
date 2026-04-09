export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatScore(score?: number | null): string {
  if (score == null) return "—";
  return score.toFixed(4);
}

export type ScoreLevel = "normal" | "low" | "medium" | "high" | "critical";

export function scoreLevel(score?: number | null): ScoreLevel {
  if (score == null) return "normal";
  if (score < 0.3) return "normal";
  if (score < 0.5) return "low";
  if (score < 0.7) return "medium";
  if (score < 0.85) return "high";
  return "critical";
}

export function scoreLevelColor(level: ScoreLevel): string {
  switch (level) {
    case "normal":
      return "var(--success)";
    case "low":
      return "#c18a1a";
    case "medium":
      return "var(--warn)";
    case "high":
      return "var(--danger)";
    case "critical":
      return "#7a1515";
  }
}

export function severityColor(severity?: string | null): string {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
    case "ERROR":
      return "var(--danger)";
    case "WARNING":
    case "WARN":
      return "var(--warn)";
    case "INFO":
      return "var(--success)";
    case "DEBUG":
      return "var(--muted)";
    default:
      return "var(--muted)";
  }
}

export function severityBg(severity?: string | null): string {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
    case "ERROR":
      return "rgba(158, 47, 47, 0.12)";
    case "WARNING":
    case "WARN":
      return "rgba(163, 103, 20, 0.12)";
    case "INFO":
      return "rgba(41, 91, 63, 0.12)";
    case "DEBUG":
      return "rgba(98, 88, 77, 0.1)";
    default:
      return "rgba(98, 88, 77, 0.1)";
  }
}
