import Link from "next/link";
import { notFound } from "next/navigation";
import { SeverityBadge } from "@/components/ui/severity-badge";
import type { LogRecord } from "@/lib/contracts";
import { formatScore, formatTimestamp } from "@/lib/format";
import { buildLogInsights } from "@/lib/log-insights";
import { getAuthorizedDataOrNull } from "@/lib/session";

export default async function LogDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const log = await getAuthorizedDataOrNull<LogRecord>(`/logs/${params.id}`);

  if (!log) {
    notFound();
  }

  const insights = buildLogInsights(log);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(255,251,245,0.96),rgba(255,247,237,0.84))] p-6 shadow-[var(--shadow-md)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="display-title text-xs uppercase tracking-[0.26em] text-[color:var(--accent)]">
              Log Detail
            </p>
            <h1 className="display-title mt-3 text-3xl font-semibold">
              {log.service || "Unknown service"}
            </h1>
          </div>
          <SeverityBadge severity={log.severity} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Event time
            </p>
            <p className="mt-2 text-lg">{formatTimestamp(log.event_time)}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Anomaly score
            </p>
            <p className="mt-2 text-lg">{formatScore(log.anomaly_score)}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Record id
            </p>
            <p className="mt-2 break-all font-mono text-sm">{log.id}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          {insights.map((card) => (
            <article
              key={card.title}
              className="section-card rounded-[1.5rem] p-5"
            >
              <p className="display-title text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                {card.title}
              </p>
              <p className="mt-3 text-base leading-7">{card.body}</p>
            </article>
          ))}
        </div>

        <article className="section-card rounded-[1.5rem] p-5">
          <p className="display-title text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
            Full payload
          </p>
          <div className="mt-4 space-y-5">
            <div>
              <h2 className="display-title text-lg font-semibold">Normalized message</h2>
              <p className="mt-2 leading-7 text-[color:var(--text)]">
                {log.normalized_message || "No normalized message available."}
              </p>
            </div>
            <div>
              <h2 className="display-title text-lg font-semibold">Original message</h2>
              <p className="mt-2 leading-7 text-[color:var(--muted)]">
                {log.message || "No raw message available."}
              </p>
            </div>
            <div>
              <h2 className="display-title text-lg font-semibold">Anomaly reason</h2>
              <p className="mt-2 leading-7 text-[color:var(--muted)]">
                {log.anomaly_reason || "No anomaly reason returned by the API."}
              </p>
            </div>
          </div>
        </article>
      </section>

      <Link
        href="/logs"
        className="inline-flex rounded-full border border-[color:var(--border)] bg-white/80 px-4 py-2 text-sm font-semibold text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
      >
        Back to log explorer
      </Link>
    </div>
  );
}
