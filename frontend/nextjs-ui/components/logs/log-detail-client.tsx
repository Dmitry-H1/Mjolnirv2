"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import authFetch from "@/app/api/authFetch";
import type { Log } from "@/lib/contracts";
import {
  formatDateTime,
  formatScore,
  scoreLevel,
  scoreLevelColor,
  severityColor,
  severityBg,
} from "@/lib/format";

interface Props {
  id: string;
}

const LEVELS = [
  { key: "normal",   label: "NORMAL",   range: "< 0.30" },
  { key: "low",      label: "LOW",      range: "0.30–0.49" },
  { key: "medium",   label: "MEDIUM",   range: "0.50–0.69" },
  { key: "high",     label: "HIGH",     range: "0.70–0.84" },
  { key: "critical", label: "CRITICAL", range: "≥ 0.85" },
] as const;

function MetaCard({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div
      style={{
        background: "rgba(255,251,245,0.7)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--muted)",
          fontFamily: "var(--font-display)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "var(--text)",
          wordBreak: "break-all",
          lineHeight: 1.5,
          fontFamily: "var(--font-body)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function MessageBlock({
  title,
  content,
  color,
  icon,
}: {
  title: string;
  content: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color }}>
        {icon}
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text)",
            fontFamily: "var(--font-display)",
          }}
        >
          {title}
        </span>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "14px 16px",
          borderRadius: 12,
          background: "var(--bg)",
          border: `1px solid ${color}33`,
          borderLeft: `3px solid ${color}`,
          fontSize: 13,
          fontFamily: "monospace",
          color: "var(--text)",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          overflowX: "auto",
        }}
      >
        {content}
      </pre>
    </div>
  );
}

function SectionCard({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,251,245,0.82)",
        border: `1.5px solid ${accent ?? "var(--border)"}`,
        borderRadius: 20,
        padding: "28px 28px",
        boxShadow: "0 4px 24px rgba(62,43,22,0.06)",
      }}
    >
      {children}
    </div>
  );
}

export default function LogDetailClient({ id }: Props) {
  const router = useRouter();
  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    authFetch
      .get<Log>(`/logs/${encodeURIComponent(id)}`)
      .then((res) => setLog(res.data))
      .catch(() => setError("Failed to load log details."))
      .finally(() => setLoading(false));
  }, [id]);

  const level = scoreLevel(log?.anomaly_score);
  const levelColor = scoreLevelColor(level);
  const scoreVal = log?.anomaly_score ?? 0;
  const barPct = Math.min(scoreVal * 100, 100);
  const logId = log?.id ?? log?.ingestion_id ?? id;
  const shortId = logId.length > 40 ? logId.slice(0, 40) + "…" : logId;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 880, minHeight: "100vh" }}>
      {/* Breadcrumb */}
      <div
        className="fade-up"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 28,
          fontSize: 13,
        }}
      >
        <button
          onClick={() => router.push("/logs")}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--accent)",
            fontWeight: 600,
            fontFamily: "var(--font-display)",
          }}
        >
          Log Explorer
        </button>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 10.5L9 7 5 3.5" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span
          style={{
            color: "var(--muted)",
            fontFamily: "monospace",
            fontSize: 12,
          }}
          title={logId}
        >
          {shortId}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 14 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="9" cy="9" r="7" stroke="var(--border)" strokeWidth="2.5" />
            <path d="M9 2a7 7 0 0 1 7 7" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Loading log…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 14,
            background: "rgba(158,47,47,0.08)",
            color: "var(--danger)",
            border: "1px solid rgba(158,47,47,0.2)",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {log && !loading && (
        <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Header ── */}
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              border: `1.5px solid ${severityColor(log.severity)}33`,
              boxShadow: `0 4px 28px ${severityColor(log.severity)}18`,
            }}
          >
            {/* Severity color bar */}
            <div
              style={{
                height: 5,
                background: `linear-gradient(90deg, ${severityColor(log.severity)}, ${severityColor(log.severity)}66)`,
              }}
            />

            <div
              style={{
                padding: "22px 26px 24px",
                background: `linear-gradient(135deg, ${severityBg(log.severity)}, rgba(255,251,245,0.9))`,
              }}
            >
              {/* Badges row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {log.severity && (
                  <span
                    style={{
                      padding: "5px 16px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      background: severityBg(log.severity),
                      color: severityColor(log.severity),
                      border: `1.5px solid ${severityColor(log.severity)}44`,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {log.severity}
                  </span>
                )}
                {log.category && (
                  <span
                    style={{
                      padding: "5px 16px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      border: "1.5px solid rgba(159,59,39,0.18)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {log.category}
                  </span>
                )}
                <span
                  style={{
                    padding: "5px 16px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    background: `${levelColor}18`,
                    color: levelColor,
                    border: `1.5px solid ${levelColor}44`,
                    fontFamily: "var(--font-display)",
                  }}
                >
                  Anomaly · {level.toUpperCase()}
                </span>
              </div>

              {/* Message title */}
              <h1
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text)",
                  fontFamily: "var(--font-display)",
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                }}
              >
                {log.message}
              </h1>

              {/* Timestamp + service row */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 10 }}>
                <span style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--font-body)" }}>
                  {formatDateTime(log.event_time ?? log.inserted_at)}
                </span>
                {log.service && (
                  <>
                    <span style={{ color: "var(--border)", fontSize: 16 }}>·</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        color: severityColor(log.severity),
                        background: severityBg(log.severity),
                        padding: "2px 10px",
                        borderRadius: 6,
                      }}
                    >
                      {log.service}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Metadata grid ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <MetaCard label="Ingestion ID" value={logId} />
            <MetaCard label="Event Time"   value={formatDateTime(log.event_time)} />
            <MetaCard label="Inserted At"  value={formatDateTime(log.inserted_at)} />
            <MetaCard label="Service"      value={log.service} />
            <MetaCard label="User ID"      value={log.user_id} />
            <MetaCard label="Trace ID"     value={log.trace_id} />
            <MetaCard label="Source Bucket" value={log.source_bucket} />
            <MetaCard label="Source Object" value={log.source_object} />
            <MetaCard label="Model Version" value={log.model_version} />
          </div>

          {/* ── Anomaly Analysis ── */}
          <SectionCard accent={`${levelColor}55`}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Anomaly Analysis
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: "monospace",
                  color: levelColor,
                  letterSpacing: "-0.02em",
                }}
              >
                {formatScore(log.anomaly_score)}
              </span>
            </div>

            {/* Progress bar track */}
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 999,
                background: "var(--bg-strong)",
                marginBottom: 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 999,
                  width: `${barPct}%`,
                  background: `linear-gradient(90deg, ${levelColor}88, ${levelColor})`,
                  transition: "width 0.6s ease",
                }}
              />
            </div>

            {/* Level chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: log.anomaly_reason ? 18 : 0 }}>
              {LEVELS.map((l) => {
                const active = l.key === level;
                const c = scoreLevelColor(l.key);
                return (
                  <div
                    key={l.key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      padding: "8px 14px",
                      borderRadius: 12,
                      border: `1.5px solid ${active ? c : "var(--border)"}`,
                      background: active ? `${c}18` : "transparent",
                      minWidth: 76,
                      transition: "all 0.2s",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        color: active ? c : "var(--muted)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {l.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: active ? c : "var(--muted)",
                        opacity: active ? 0.85 : 0.6,
                        marginTop: 2,
                      }}
                    >
                      {l.range}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Anomaly reason */}
            {log.anomaly_reason && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: `${levelColor}0d`,
                  border: `1px solid ${levelColor}33`,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: levelColor,
                    fontFamily: "var(--font-display)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Reason
                </span>
                <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>
                  {log.anomaly_reason}
                </span>
              </div>
            )}
          </SectionCard>

          {/* ── Messages ── */}
          <SectionCard>
            <MessageBlock
              title="Raw Message"
              content={log.message}
              color={severityColor(log.severity)}
              icon={
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="1" y="2.5" width="13" height="1.8" rx="0.9" fill="currentColor" opacity="0.45" />
                  <rect x="1" y="6.5" width="9"  height="1.8" rx="0.9" fill="currentColor" opacity="0.45" />
                  <rect x="1" y="10.5" width="11" height="1.8" rx="0.9" fill="currentColor" opacity="0.45" />
                </svg>
              }
            />

            {log.normalized_message && (
              <>
                <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />
                <MessageBlock
                  title="Normalized Message"
                  content={log.normalized_message}
                  color="var(--success)"
                  icon={
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M2 7.5h11M9 4l4 3.5L9 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
                    </svg>
                  }
                />
              </>
            )}
          </SectionCard>

          {/* ── Entities ── */}
          {log.entities && Object.keys(log.entities).length > 0 && (
            <SectionCard>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="4" cy="4" r="2" fill="var(--muted)" opacity="0.5" />
                  <circle cx="12" cy="4" r="2" fill="var(--muted)" opacity="0.5" />
                  <circle cx="4" cy="12" r="2" fill="var(--muted)" opacity="0.5" />
                  <circle cx="12" cy="12" r="2" fill="var(--muted)" opacity="0.5" />
                  <line x1="4" y1="6" x2="4" y2="10" stroke="var(--muted)" strokeWidth="1.5" opacity="0.4" />
                  <line x1="12" y1="6" x2="12" y2="10" stroke="var(--muted)" strokeWidth="1.5" opacity="0.4" />
                  <line x1="6" y1="4" x2="10" y2="4" stroke="var(--muted)" strokeWidth="1.5" opacity="0.4" />
                  <line x1="6" y1="12" x2="10" y2="12" stroke="var(--muted)" strokeWidth="1.5" opacity="0.4" />
                </svg>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--text)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  Entities
                </span>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "16px 18px",
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: "var(--text)",
                  lineHeight: 1.65,
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(log.entities, null, 2)}
              </pre>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
