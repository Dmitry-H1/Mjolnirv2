"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import authFetch from "@/app/api/authFetch";
import type { Log } from "@/lib/contracts";
import {
  formatDateTime,
  scoreLevel,
  scoreLevelColor,
} from "@/lib/format";
import SeverityBadge from "@/components/ui/severity-badge";
import ScoreIndicator from "@/components/ui/score-indicator";

export default function LogDetailPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const id = rawId ? decodeURIComponent(rawId) : "";
  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    authFetch
      .get<Log>(`/logs/${id}`)
      .then((r) => setLog(r.data))
      .catch(() => setError("Log not found or access denied."))
      .finally(() => setLoading(false));
  }, [id]);

  const level = log?.anomaly_score != null ? scoreLevel(log.anomaly_score) : "normal";
  const scoreColor = scoreLevelColor(level);

  const metaFields = log
    ? [
        { label: "Ingestion ID", value: log.id ?? log.ingestion_id },
        { label: "Event Time", value: formatDateTime(log.event_time) },
        { label: "Inserted At", value: formatDateTime(log.inserted_at) },
        { label: "Service", value: log.service },
        { label: "Trace ID", value: log.trace_id },
        { label: "User ID", value: log.user_id },
        { label: "Source Bucket", value: log.source_bucket },
        { label: "Source Object", value: log.source_object },
        { label: "Model Version", value: log.model_version },
      ].filter((f) => f.value)
    : [];

  return (
    <div className="p-8 min-h-screen" style={{ maxWidth: "960px" }}>
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-sm mb-6 fade-up"
        style={{ color: "var(--muted)" }}
      >
        <Link
          href="/logs"
          style={{ color: "var(--accent)" }}
          className="hover:underline"
        >
          Log Explorer
        </Link>
        <span>/</span>
        <span className="font-mono text-xs truncate max-w-xs">{id}</span>
      </nav>

      {loading && (
        <div
          className="flex items-center gap-3 text-sm"
          style={{ color: "var(--muted)" }}
        >
          <div
            className="w-5 h-5 border-2 rounded-full animate-spin flex-shrink-0"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--accent)",
            }}
          />
          Loading log…
        </div>
      )}

      {error && (
        <div
          className="px-5 py-4 rounded-xl text-sm"
          style={{
            background: "rgba(158,47,47,0.08)",
            color: "var(--danger)",
            border: "1px solid rgba(158,47,47,0.2)",
          }}
        >
          {error}
        </div>
      )}

      {log && (
        <>
          {/* ── Header ── */}
          <div className="mb-6 fade-up">
            <div className="flex items-center gap-2.5 flex-wrap mb-3">
              <SeverityBadge severity={log.severity} />

              {log.anomaly_score != null && (
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: `${scoreColor}18`,
                    color: scoreColor,
                  }}
                >
                  Anomaly · {level.toUpperCase()}
                </span>
              )}

              {log.category && (
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  {log.category}
                </span>
              )}
            </div>

            <h1
              className="display-title text-2xl font-bold"
              style={{ color: "var(--text)" }}
            >
              {log.service || "Log Event"}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              {formatDateTime(log.event_time)}
            </p>
          </div>

          {/* ── Meta grid ── */}
          {metaFields.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6 fade-up">
              {metaFields.map((f) => (
                <div key={f.label} className="section-card rounded-xl p-4">
                  <div
                    className="text-xs uppercase tracking-wide mb-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    {f.label}
                  </div>
                  <div
                    className="text-sm font-medium break-all font-mono"
                    style={{ color: "var(--text)" }}
                  >
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Anomaly panel ── */}
          {log.anomaly_score != null && (
            <div
              className="section-card rounded-2xl p-6 mb-6 fade-up"
              style={{ borderLeft: `3px solid ${scoreColor}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="display-title font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  Anomaly Analysis
                </div>
                <ScoreIndicator score={log.anomaly_score} />
              </div>

              {/* Score bar */}
              <div
                className="h-2.5 rounded-full overflow-hidden mb-4"
                style={{ background: "rgba(98,88,77,0.12)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(log.anomaly_score * 100, 100)}%`,
                    background: scoreColor,
                  }}
                />
              </div>

              {/* Level pills row */}
              <div className="flex gap-2 flex-wrap mb-4">
                {(["normal", "low", "medium", "high", "critical"] as const).map(
                  (l) => {
                    const thresholds = {
                      normal: "< 0.30",
                      low: "0.30–0.49",
                      medium: "0.50–0.69",
                      high: "0.70–0.84",
                      critical: "≥ 0.85",
                    };
                    const isActive = level === l;
                    return (
                      <span
                        key={l}
                        className="inline-flex flex-col items-center px-3 py-1.5 rounded-lg text-xs"
                        style={{
                          background: isActive
                            ? `${scoreLevelColor(l)}18`
                            : "rgba(98,88,77,0.07)",
                          color: isActive
                            ? scoreLevelColor(l)
                            : "var(--muted)",
                          fontWeight: isActive ? 600 : 400,
                          border: isActive
                            ? `1px solid ${scoreLevelColor(l)}40`
                            : "1px solid transparent",
                        }}
                      >
                        <span className="uppercase tracking-wide">{l}</span>
                        <span style={{ fontSize: "10px", opacity: 0.7 }}>
                          {thresholds[l]}
                        </span>
                      </span>
                    );
                  }
                )}
              </div>

              {log.anomaly_reason && (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {log.anomaly_reason}
                </p>
              )}
            </div>
          )}

          {/* ── Raw message ── */}
          <div className="section-card rounded-2xl p-6 mb-6 fade-up">
            <div
              className="display-title font-semibold mb-3"
              style={{ color: "var(--text)" }}
            >
              Raw Message
            </div>
            <pre
              className="text-sm whitespace-pre-wrap break-words p-4 rounded-xl"
              style={{
                fontFamily: "monospace",
                color: "var(--text)",
                background: "rgba(62,43,22,0.04)",
                lineHeight: 1.7,
              }}
            >
              {log.message}
            </pre>
          </div>

          {/* ── Normalized message ── */}
          {log.normalized_message && (
            <div className="section-card rounded-2xl p-6 mb-6 fade-up">
              <div
                className="display-title font-semibold mb-3"
                style={{ color: "var(--text)" }}
              >
                Normalized Message
              </div>
              <pre
                className="text-sm whitespace-pre-wrap break-words p-4 rounded-xl"
                style={{
                  fontFamily: "monospace",
                  color: "var(--muted)",
                  background: "rgba(62,43,22,0.04)",
                  lineHeight: 1.7,
                }}
              >
                {log.normalized_message}
              </pre>
            </div>
          )}

          {/* ── Entities ── */}
          {log.entities && Object.keys(log.entities).length > 0 && (
            <div className="section-card rounded-2xl p-6 mb-6 fade-up">
              <div
                className="display-title font-semibold mb-3"
                style={{ color: "var(--text)" }}
              >
                Extracted Entities
              </div>
              <pre
                className="text-sm whitespace-pre-wrap p-4 rounded-xl"
                style={{
                  fontFamily: "monospace",
                  color: "var(--text)",
                  background: "rgba(62,43,22,0.04)",
                  lineHeight: 1.7,
                }}
              >
                {JSON.stringify(log.entities, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
