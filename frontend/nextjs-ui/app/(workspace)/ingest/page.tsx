"use client";

import { useEffect, useRef, useState } from "react";
import authFetch from "@/app/api/authFetch";
import { API_BASE_URL } from "@/app/constants";

type UploadType = "standard" | "legacy";
interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  message: string;
}

const INGEST_URL = `${API_BASE_URL}/logs/ingest`;

const EXAMPLE_PAYLOAD = `[
  {
    "message": "Failed login attempt for user admin from 192.168.1.45",
    "timestamp": "2025-04-22T14:32:00Z",
    "service": "auth-service",
    "severity": "WARNING"
  }
]`;

const CURL_EXAMPLE = `curl -X POST ${INGEST_URL} \\
  -H "Authorization: Bearer <your_token>" \\
  -H "Content-Type: application/json" \\
  -d '[{"message": "disk usage at 91%", "service": "storage", "severity": "WARNING"}]'`;

const FIELDS = [
  { name: "message",   type: "string",   required: true,  desc: "The raw log message text." },
  { name: "timestamp", type: "datetime", required: false, desc: "ISO 8601 timestamp of when the event occurred. Defaults to ingestion time if omitted." },
  { name: "service",   type: "string",   required: false, desc: "Name of the service or application that produced the log." },
  { name: "severity",  type: "string",   required: false, desc: "Log level: DEBUG, INFO, WARNING, ERROR, or CRITICAL." },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      style={{
        background: copied ? "var(--accent-soft)" : "rgba(255,251,245,0.7)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "4px 12px",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--font-display)",
        color: copied ? "var(--accent)" : "var(--muted)",
        transition: "all 0.15s",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div style={{ position: "relative" }}>
      {label && (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8, fontFamily: "var(--font-display)" }}>
          {label}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <pre style={{
          margin: 0,
          padding: "16px 18px",
          borderRadius: 14,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
          fontSize: 12,
          fontFamily: "monospace",
          color: "var(--text)",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          overflowX: "auto",
        }}>
          {code}
        </pre>
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <CopyButton text={code} />
        </div>
      </div>
    </div>
  );
}

export default function IngestPage() {
  const [upload, setUpload] = useState<Record<UploadType, UploadState>>({
    standard: { status: "idle", message: "" },
    legacy:   { status: "idle", message: "" },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, type: UploadType) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpload((prev) => ({ ...prev, [type]: { status: "uploading", message: "" } }));
    try {
      const form = new FormData();
      form.append("file", file);
      await authFetch.post(type === "legacy" ? "/logs/upload/legacy" : "/logs/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUpload((prev) => ({ ...prev, [type]: { status: "success", message: `"${file.name}" uploaded successfully` } }));
    } catch {
      setUpload((prev) => ({ ...prev, [type]: { status: "error", message: "Upload failed. Please try again." } }));
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ maxWidth: 820 }}>
      {/* Header */}
      <div className="mb-8 fade-up">
        <h1 className="display-title text-3xl font-bold" style={{ color: "var(--text)" }}>
          Log Ingestion
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Send logs via the REST API or upload a file directly · all logs are enriched and scored automatically
        </p>
      </div>

      {/* ── Section 1: API Ingest ── */}
      <div className="section-card rounded-2xl p-6 mb-6 fade-up">
        <div className="display-title font-semibold text-base mb-1" style={{ color: "var(--text)" }}>
          REST API
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          POST a JSON array of log objects. Requires a Bearer token from{" "}
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>/auth/login</span>.
        </p>

        {/* Endpoint */}
        <div className="mb-6">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8, fontFamily: "var(--font-display)" }}>
            Endpoint
          </div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "12px 16px",
            borderRadius: 12,
            background: "var(--bg)",
            border: "1.5px solid var(--accent)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 800,
                background: "var(--accent-soft)", color: "var(--accent)",
                fontFamily: "var(--font-display)", letterSpacing: "0.05em", flexShrink: 0,
              }}>
                POST
              </span>
              <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text)", wordBreak: "break-all" }}>
                {INGEST_URL}
              </span>
            </div>
            <CopyButton text={INGEST_URL} />
          </div>
        </div>

        {/* Schema table */}
        <div className="mb-6">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10, fontFamily: "var(--font-display)" }}>
            Request body — array of log objects
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,251,245,0.6)" }}>
                  {["Field", "Type", "Required", "Description"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((f, i) => (
                  <tr key={f.name} style={{ borderBottom: i < FIELDS.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: "var(--accent)", whiteSpace: "nowrap" }}>
                      {f.name}
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {f.type}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      {f.required
                        ? <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6, background: "rgba(158,47,47,0.08)", color: "var(--danger)", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>required</span>
                        : <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-display)" }}>optional</span>
                      }
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text)", lineHeight: 1.5 }}>
                      {f.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Example payload */}
        <div className="mb-6">
          <CodeBlock code={EXAMPLE_PAYLOAD} label="Example payload" />
        </div>

        {/* Curl */}
        <CodeBlock code={CURL_EXAMPLE} label="cURL example" />
      </div>

      {/* ── Section 2: File Upload ── */}
      <div className="section-card rounded-2xl p-6 fade-up-delay">
        <div className="display-title font-semibold text-base mb-1" style={{ color: "var(--text)" }}>
          File Upload
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Upload a log file for batch processing. Accepted formats: CSV, TXT, JSON, NDJSON.{" "}
          Use <strong>Legacy</strong> for older non-standard formats.
        </p>

        <div className="space-y-5">
          {([
            { type: "standard" as UploadType, label: "Standard Logs", id: "upload-std" },
            { type: "legacy"   as UploadType, label: "Legacy Logs",   id: "upload-leg" },
          ]).map(({ type, label, id }) => {
            const state = upload[type];
            const isUploading = state.status === "uploading";
            return (
              <div key={type}>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>
                  {label}
                </div>
                <label
                  htmlFor={id}
                  className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                  style={{
                    borderColor: isUploading ? "var(--accent)" : "var(--border)",
                    background: isUploading ? "var(--accent-soft)" : "rgba(255,251,245,0.5)",
                  }}
                  onMouseEnter={(e) => { if (!isUploading) (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                  onMouseLeave={(e) => { if (!isUploading) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                >
                  <div className="flex flex-col items-center gap-1.5" style={{ color: "var(--muted)" }}>
                    {isUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
                        <span className="text-sm">Uploading…</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" style={{ opacity: 0.5 }}>
                          <path fillRule="evenodd" d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z" clipRule="evenodd" transform="rotate(180, 10, 10)" />
                        </svg>
                        <span className="text-sm">Click to select or drag a file here</span>
                        <span className="text-xs" style={{ opacity: 0.6 }}>CSV · TXT · JSON · NDJSON</span>
                      </>
                    )}
                  </div>
                  <input id={id} type="file" className="hidden" onChange={(e) => handleUpload(e, type)} disabled={isUploading} />
                </label>
                {state.status !== "idle" && state.message && (
                  <div className="mt-2 px-4 py-2.5 rounded-xl text-sm" style={{
                    background: state.status === "success" ? "rgba(41,91,63,0.1)" : "rgba(158,47,47,0.08)",
                    color: state.status === "success" ? "var(--success)" : "var(--danger)",
                  }}>
                    {state.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
