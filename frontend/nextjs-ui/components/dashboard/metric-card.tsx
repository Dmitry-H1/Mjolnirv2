interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: boolean;
  danger?: boolean;
  success?: boolean;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  accent,
  danger,
  success,
}: Props) {
  const valueColor = danger
    ? "var(--danger)"
    : accent
    ? "var(--accent)"
    : success
    ? "var(--success)"
    : "var(--text)";

  return (
    <div className="section-card rounded-2xl p-5 fade-up">
      <div
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--muted)" }}
      >
        {title}
      </div>
      <div
        className="display-title text-3xl font-bold"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
