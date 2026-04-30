"use client";

import { useEffect, useState } from "react";
import authFetch from "@/app/api/authFetch";
import type { MetricsData } from "@/lib/contracts";
import MetricCard from "@/components/dashboard/metric-card";
import CountChart from "@/components/dashboard/count-chart";
import ScoreChart from "@/components/dashboard/score-chart";
import SourceChart from "@/components/dashboard/source-chart";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch
      .get<MetricsData>("/metrics")
      .then((r) => setMetrics(r.data))
      .catch(() => setError("Failed to load metrics. Check your connection."))
      .finally(() => setLoading(false));
  }, []);

  // Derived summary stats — guard against API returning unexpected shape
  const countSeries = metrics?.countSeries ?? [];
  const scoreSeries = metrics?.scoreSeries ?? [];

  const totalLogs = countSeries.reduce((sum, [, count]) => sum + (count ?? 0), 0);

  const avgScore =
    scoreSeries.length > 0
      ? scoreSeries.reduce((sum, [, v]) => sum + (v ?? 0), 0) / scoreSeries.length
      : 0;

  const alertCount = scoreSeries.filter(([, v]) => (v ?? 0) >= 0.7).length;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      {/* Page header */}
      <div className="mb-8 fade-up">
        <h1
          className="display-title text-3xl font-bold"
          style={{ color: "var(--text)" }}
        >
          Operational Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Real-time visibility into your log pipeline and anomaly detection engine ·{" "}
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>past 7 days</span>
        </p>
      </div>

      {loading && (
        <div
          className="flex items-center justify-center h-64 text-sm"
          style={{ color: "var(--muted)" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--border)",
                borderTopColor: "var(--accent)",
              }}
            />
            Loading metrics…
          </div>
        </div>
      )}

      {error && !loading && (
        <div
          className="px-5 py-4 rounded-xl mb-6 text-sm"
          style={{
            background: "rgba(158,47,47,0.08)",
            color: "var(--danger)",
            border: "1px solid rgba(158,47,47,0.2)",
          }}
        >
          {error}
        </div>
      )}

      {metrics && !loading && (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            <MetricCard
              title="Total Logs (Sample)"
              value={totalLogs.toLocaleString()}
              subtitle="past 7 days"
            />
            <MetricCard
              title="Avg Anomaly Score"
              value={avgScore.toFixed(4)}
              subtitle="across past 7 days"
              accent={avgScore >= 0.5 && avgScore < 0.7}
              danger={avgScore >= 0.7}
              success={avgScore < 0.3}
            />
            <MetricCard
              title="Alert Events"
              value={alertCount.toLocaleString()}
              subtitle="anomaly score ≥ 0.70"
              danger={alertCount > 0}
              success={alertCount === 0}
            />
          </div>

          {/* ── Chart row 1 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
            <div className="section-card rounded-2xl p-6 fade-up">
              <div
                className="display-title font-semibold text-base mb-0.5"
                style={{ color: "var(--text)" }}
              >
                Log Ingestion Rate
              </div>
              <div className="text-xs mb-5" style={{ color: "var(--muted)" }}>
                Log volume over the past 7 days · 30-minute buckets
              </div>
              <CountChart series={metrics.countSeries} />
            </div>

            <div className="section-card rounded-2xl p-6 fade-up-delay">
              <div
                className="display-title font-semibold text-base mb-0.5"
                style={{ color: "var(--text)" }}
              >
                Anomaly Score Trend
              </div>
              <div className="text-xs mb-5" style={{ color: "var(--muted)" }}>
                Average anomaly score over the past 7 days · dashed line = alert threshold (0.70)
              </div>
              <ScoreChart series={metrics.scoreSeries} />
            </div>
          </div>

          {/* ── Chart row 2 ── */}
          <div className="section-card rounded-2xl p-6 fade-up-delay">
            <div
              className="display-title font-semibold text-base mb-0.5"
              style={{ color: "var(--text)" }}
            >
              Source Distribution
            </div>
            <div className="text-xs mb-5" style={{ color: "var(--muted)" }}>
              Log volume by source · past 7 days
            </div>
            {(metrics.sourceObjectSeries?.categories?.length ?? 0) > 0 ? (
              <SourceChart
                categories={metrics.sourceObjectSeries.categories}
                data={metrics.sourceObjectSeries.data}
              />
            ) : (
              <div
                className="py-12 text-center text-sm"
                style={{ color: "var(--muted)" }}
              >
                No source distribution data available yet
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
