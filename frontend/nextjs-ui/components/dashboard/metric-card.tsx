export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="section-card rounded-[1.5rem] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
        {label}
      </p>
      <p className="display-title mt-3 text-3xl font-semibold text-[color:var(--surface-dark)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{detail}</p>
    </article>
  );
}
