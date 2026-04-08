const severityStyles: Record<string, string> = {
  ERROR: "bg-[rgba(158,47,47,0.12)] text-[color:var(--danger)]",
  WARN: "bg-[rgba(163,103,20,0.14)] text-[color:var(--warn)]",
  INFO: "bg-[rgba(41,91,63,0.12)] text-[color:var(--success)]",
};

export function SeverityBadge({ severity }: { severity?: string | null }) {
  const normalized = (severity || "UNKNOWN").toUpperCase();
  const tone =
    severityStyles[normalized] ||
    "bg-[rgba(34,29,24,0.08)] text-[color:var(--muted)]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}
    >
      {normalized}
    </span>
  );
}
