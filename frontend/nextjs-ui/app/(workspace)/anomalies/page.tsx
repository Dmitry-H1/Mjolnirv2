"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import authFetch from "@/app/api/authFetch";
import type { Log, LogsResponse } from "@/lib/contracts";
import {
  formatDateTime,
  scoreLevel,
  scoreLevelColor,
  type ScoreLevel,
} from "@/lib/format";
import SeverityBadge from "@/components/ui/severity-badge";
import ScoreIndicator from "@/components/ui/score-indicator";
import MetricCard from "@/components/dashboard/metric-card";

const LEVEL_ORDER: ScoreLevel[] = ["critical", "high", "medium", "low", "normal"];

export default function AnomaliesPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterLevel, setFilterLevel] = useState<ScoreLevel | "all">("all");

  useEffect(() => {
    authFetch
      .get<LogsResponse>("/logs")
      .then((r) => {
        const sorted = [...r.data.rows].sort(
          (a, b) => (b.anomaly_score ?? 0) - (a.anomaly_score ?? 0)
        );
        setLogs(sorted);
      })
      .catch(() => setError("Failed to load anomaly data."))
      .finally(() => setLoading(false));
  }, []);

  const criticalCount = logs.filter((l) => (l.anomaly_score ?? 0) >= 0.85).length;
  const highCount = logs.filter((l) => {
    const s = l.anomaly_score ?? 0;
    return s >= 0.7 && s < 0.85;
  }).length;
  const medCount = logs.filter((l) => {
    const s = l.anomaly_score ?? 0;
    return s >= 0.5 && s < 0.7;
  }).length;
  const avgScore =
    logs.length > 0
      ? logs.reduce((s, l) => s + (l.anomaly_score ?? 0), 0) / logs.length
      : 0;

  const filtered =
    filterLevel === "all"
      ? logs
      : logs.filter((l) => scoreLevel(l.anomaly_score) === filterLevel);

  const levelColors: Record<ScoreLevel, string> = {
    normal: "var(--success)",
    low: "#c18a1a",
    medium: "var(--warn)",
    high: "var(--danger)",
    critical: "#7a1515",
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8 fade-up">
        <h1
          className="display-title text-3xl font-bold"
          style={{ color: "var(--text)" }}
        >
          Anomaly Analysis
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Logs ranked by anomaly score · highest risk first · click any row for
          full detail
        </p>
      </div>

      {error && (
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
                borderTopColor: "var(--danger)",
              }}
            />
            Analysing anomalies…
          </div>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <MetricCard
              title="Critical"
              value={criticalCount}
              subtitle="score ≥ 0.85"
              danger={criticalCount > 0}
            />
            <MetricCard
              title="High"
              value={highCount}
              subtitle="score 0.70–0.84"
              accent={highCount > 0}
            />
            <MetricCard
              title="Medium"
              value={medCount}
              subtitle="score 0.50–0.69"
            />
            <MetricCard
              title="Avg Score"
              value={avgScore.toFixed(4)}
              subtitle="across shown logs"
              danger={avgScore >= 0.7}
              accent={avgScore >= 0.5 && avgScore < 0.7}
              success={avgScore < 0.3}
            />
          </div>

          {/* ── Level filter ── */}
          <div className="flex items-center gap-2 flex-wrap mb-5 fade-up">
            <span
              className="text-xs font-semibold uppercase tracking-wide mr-1"
              style={{ color: "var(--muted)" }}
            >
              Filter
            </span>
            {(["all", ...LEVEL_ORDER] as const).map((l) => {
              const active = filterLevel === l;
              const color = l === "all" ? "var(--muted)" : levelColors[l];
              return (
                <button
                  key={l}
                  onClick={() => setFilterLevel(l)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all"
                  style={{
                    background: active
                      ? l === "all"
                        ? "rgba(98,88,77,0.15)"
                        : `${color}18`
                      : "transparent",
                    color: active ? color : "var(--muted)",
                    border: `1px solid ${
                      active ? (l === "all" ? "rgba(98,88,77,0.3)" : `${color}40`) : "transparent"
                    }`,
                  }}
                >
                  {l}
                </button>
              );
            })}
            <span
              className="ml-auto text-xs"
              style={{ color: "var(--muted)" }}
            >
              {filtered.length} events
            </span>
          </div>

          {/* ── Anomaly table ── */}
          <div className="section-card rounded-2xl overflow-auto fade-up">
            <table className="w-full text-sm border-collapse min-w-max">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[
                    "Score",
                    "Level",
                    "Severity",
                    "Service",
                    "Component",
                    "Category",
                    "Time",
                    "Message",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: "var(--muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-12 text-sm"
                      style={{ color: "var(--muted)" }}
                    >
                      No logs match this filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log, i) => {
                    const level = scoreLevel(log.anomaly_score);
                    const color = scoreLevelColor(level);
                    return (
                      <tr
                        key={log.ingestion_id ?? i}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: "1px solid var(--border)" }}
                        onClick={() => {
                          const id = log.log_id;
                          if (id) router.push(`/logs?id=${encodeURIComponent(id)}`);
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "rgba(159,59,39,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                        }}
                      >
                        <td className="px-4 py-3">
                          <ScoreIndicator score={log.anomaly_score} showBar />
                        </td>
                        <td className="px-4 py-3">
                          {log.anomaly_score != null ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold uppercase"
                              style={{
                                background: `${color}18`,
                                color,
                                border: `1px solid ${color}30`,
                              }}
                            >
                              {level}
                            </span>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <SeverityBadge severity={log.severity} />
                        </td>
                        <td
                          className="px-4 py-3 text-sm whitespace-nowrap"
                          style={{ color: "var(--text)" }}
                        >
                          {log.user_ingest_service || "—"}
                        </td>
                        <td
                          className="px-4 py-3 text-xs whitespace-nowrap"
                          style={{ color: "var(--muted)" }}
                        >
                          {log.service || "—"}
                        </td>
                        <td
                          className="px-4 py-3 text-xs whitespace-nowrap"
                          style={{ color: "var(--muted)" }}
                        >
                          {log.category || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs font-mono whitespace-nowrap"
                            style={{ color: "var(--muted)" }}
                          >
                            {formatDateTime(log.event_time ?? log.inserted_at)}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-sm"
                          style={{ maxWidth: "260px", color: "var(--text)" }}
                        >
                          <span
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {log.message}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs font-medium"
                            style={{ color: "var(--accent)" }}
                          >
                            →
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && logs.length === 0 && !error && (
        <div
          className="flex flex-col items-center justify-center h-64 text-sm"
          style={{ color: "var(--muted)" }}
        >
          No log data available yet.
        </div>
      )}
    </div>
  );
}
