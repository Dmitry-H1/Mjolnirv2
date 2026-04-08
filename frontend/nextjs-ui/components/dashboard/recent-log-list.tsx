import Link from "next/link";
import { SeverityBadge } from "@/components/ui/severity-badge";
import type { LogRecord } from "@/lib/contracts";
import { formatScore, formatTimestamp } from "@/lib/format";

export function RecentLogList({ rows }: { rows: LogRecord[] }) {
  return (
    <section className="section-card rounded-[1.75rem] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="display-title text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Recent activity
          </p>
          <h2 className="display-title mt-2 text-2xl font-semibold">
            Latest records returned by the logs API
          </h2>
        </div>
        <Link
          href="/logs"
          className="rounded-full border border-[color:var(--border)] bg-white/80 px-4 py-2 text-sm font-semibold text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
        >
          View all
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/logs/${row.id}`}
            className="block rounded-[1.25rem] border border-[color:var(--border)] bg-white/70 p-4 transition hover:border-[color:var(--accent)] hover:bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="display-title text-lg font-semibold">
                  {row.service || "Unknown service"}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {formatTimestamp(row.event_time)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <SeverityBadge severity={row.severity} />
                <span className="rounded-full bg-[rgba(41,91,63,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--success)]">
                  {formatScore(row.anomaly_score)}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              {row.normalized_message || row.message || "No message available."}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
