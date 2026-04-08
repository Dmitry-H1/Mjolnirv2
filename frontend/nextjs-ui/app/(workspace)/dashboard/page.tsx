import Link from "next/link";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RecentLogList } from "@/components/dashboard/recent-log-list";
import { SourceBars } from "@/components/dashboard/source-bars";
import { SparklineChart } from "@/components/dashboard/sparkline-chart";
import type { DashboardMetricsResponse, LogListResponse } from "@/lib/contracts";
import { formatCompactNumber } from "@/lib/format";
import { getAuthorizedData, getPublicData } from "@/lib/session";

export default async function DashboardPage() {
  const [metrics, recentLogs, incidentHealth] = await Promise.all([
    getAuthorizedData<DashboardMetricsResponse>("/metrics"),
    getAuthorizedData<LogListResponse>("/logs"),
    getPublicData<string>("/incidents"),
  ]);

  const totalEvents = metrics.countSeries.reduce(
    (sum, [, count]) => sum + count,
    0
  );
  const peakBucket = metrics.countSeries.reduce(
    (max, point) => Math.max(max, point[1]),
    0
  );
  const averageScore =
    metrics.scoreSeries.length > 0
      ? metrics.scoreSeries.reduce((sum, [, score]) => sum + score, 0) /
        metrics.scoreSeries.length
      : 0;

  return (
    <div className="space-y-8">
      <section className="grid-overlay relative overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(255,249,240,0.96),rgba(255,245,232,0.82))] px-6 py-8 shadow-[var(--shadow-lg)] sm:px-8">
        <div className="relative z-10 max-w-3xl">
          <p className="display-title text-xs uppercase tracking-[0.28em] text-[color:var(--accent)]">
            Operations Overview
          </p>
          <h1 className="display-title mt-4 text-4xl font-semibold text-[color:var(--surface-dark)]">
            Fast visibility into authentication, metrics, and recent log flow.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
            Metrics are loaded once on the server, recent logs are preloaded for
            the first render, and the rest of the app reuses the same session
            plumbing.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/logs"
              className="rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
            >
              Open log explorer
            </Link>
            <div className="rounded-full border border-[color:var(--border)] bg-white/70 px-5 py-2.5 text-sm text-[color:var(--muted)]">
              Incidents API: {incidentHealth}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Events in sampled timeline"
          value={formatCompactNumber(totalEvents)}
          detail="Derived from the current metrics API payload."
        />
        <MetricCard
          label="Peak six-hour volume"
          value={formatCompactNumber(peakBucket)}
          detail="Highest bucket returned from the backend chart series."
        />
        <MetricCard
          label="Average anomaly score"
          value={averageScore.toFixed(2)}
          detail="Average of the scatter series currently returned by the API."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="section-card rounded-[1.75rem] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="display-title text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Volume Trend
              </p>
              <h2 className="display-title mt-2 text-2xl font-semibold">
                Event density over time
              </h2>
            </div>
            <span className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
              Server rendered
            </span>
          </div>
          <div className="mt-6">
            <SparklineChart
              data={metrics.countSeries}
              stroke="#9f3b27"
              fill="rgba(159, 59, 39, 0.12)"
              chartId="volume"
            />
          </div>
        </div>

        <div className="section-card rounded-[1.75rem] p-6">
          <p className="display-title text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Top Sources
          </p>
          <h2 className="display-title mt-2 text-2xl font-semibold">
            Where the log volume is coming from
          </h2>
          <div className="mt-6">
            <SourceBars sourceObjectSeries={metrics.sourceObjectSeries} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="section-card rounded-[1.75rem] p-6">
          <p className="display-title text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Score Spread
          </p>
          <h2 className="display-title mt-2 text-2xl font-semibold">
            Anomaly scatter preview
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            The current backend still returns sampled and synthetic-looking
            chart data, but the new frontend keeps that behavior isolated to one
            place so it can be swapped out cleanly later.
          </p>
          <div className="mt-6">
            <SparklineChart
              data={metrics.scoreSeries}
              stroke="#295b3f"
              fill="rgba(41, 91, 63, 0.10)"
              chartId="score"
            />
          </div>
        </div>

        <RecentLogList rows={recentLogs.rows.slice(0, 6)} />
      </section>
    </div>
  );
}
