"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import authFetch from "@/app/api/authFetch";
import { API_BASE_URL } from "@/app/constants";
import type { User } from "@/lib/contracts";

type UploadType = "standard" | "legacy";

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  message: string;
}

// ── Must be its own component because useSearchParams requires Suspense ──
function SlackSection() {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [channel, setChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const slackParam = searchParams.get("slack");
    const channelParam = searchParams.get("channel");
    if (slackParam === "connected" && channelParam) {
      setConnected(true);
      setChannel(channelParam);
      setLoading(false);
      return;
    }
    authFetch
      .get("/auth/slack/status")
      .then(({ data }) => setConnected(data.connected))
      .finally(() => setLoading(false));
  }, [searchParams]);

  function handleConnect() {
    const token = localStorage.getItem("access_token");
    window.location.href = `${API_BASE_URL}/auth/slack/connect?token=${token}`;
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await authFetch.delete("/auth/slack/disconnect");
      setConnected(false);
      setChannel(null);
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="section-card rounded-2xl p-6 fade-up-delay">
      <div
        className="display-title font-semibold text-base mb-1"
        style={{ color: "var(--text)" }}
      >
        Integrations
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Connect third-party services to receive alerts and notifications.
      </p>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Slack logo */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/>
            <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
            <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/>
            <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
            <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/>
            <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
            <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/>
            <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
          </svg>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Slack
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {loading
                ? "Checking status…"
                : connected
                ? `Sending alerts to ${channel ?? "your channel"}`
                : "Get notified when anomaly score ≥ 0.70"}
            </div>
          </div>
        </div>

        {/* Action */}
        {!loading && (
          connected ? (
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1"
                style={{ color: "#22c55e" }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd"/>
                </svg>
                Connected
              </span>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                  opacity: disconnecting ? 0.5 : 1,
                  cursor: disconnecting ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--danger)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--danger)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                }}
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "var(--accent)", color: "#fff" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              Connect Slack
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ── Main page ──
export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [upload, setUpload] = useState<Record<UploadType, UploadState>>({
    standard: { status: "idle", message: "" },
    legacy: { status: "idle", message: "" },
  });

  useEffect(() => {
    authFetch.get<User>("/auth/me").then((r) => setUser(r.data)).catch(() => {});
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, type: UploadType) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpload((prev) => ({ ...prev, [type]: { status: "uploading", message: "" } }));
    try {
      const form = new FormData();
      form.append("file", file);
      const endpoint = type === "legacy" ? "/logs/upload/legacy" : "/logs/upload";
      await authFetch.post(endpoint, form, { headers: { "Content-Type": "multipart/form-data" } });
      setUpload((prev) => ({ ...prev, [type]: { status: "success", message: `"${file.name}" uploaded successfully` } }));
    } catch {
      setUpload((prev) => ({ ...prev, [type]: { status: "error", message: "Upload failed. Please try again." } }));
    } finally {
      e.target.value = "";
    }
  }

  const initials = user?.username?.[0]?.toUpperCase() ?? "?";
  const roleColors: Record<string, { bg: string; color: string }> = {
    ADMIN: { bg: "rgba(158, 47, 47, 0.12)", color: "var(--danger)" },
    USER: { bg: "var(--accent-soft)", color: "var(--accent)" },
  };
  const roleStyle = roleColors[user?.role ?? "USER"] ?? roleColors.USER;

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ maxWidth: "680px" }}>
      <div className="mb-8 fade-up">
        <h1 className="display-title text-3xl font-bold" style={{ color: "var(--text)" }}>
          Profile
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Your account details and log ingestion tools
        </p>
      </div>

      {/* User card — unchanged */}
      <div className="section-card rounded-2xl p-6 mb-6 fade-up">
        <div className="flex items-center gap-5 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold display-title flex-shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {initials}
          </div>
          <div>
            <div className="display-title text-xl font-bold" style={{ color: "var(--text)" }}>
              {user?.username ?? "—"}
            </div>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold mt-1.5 uppercase tracking-wide"
              style={roleStyle}
            >
              {user?.role ?? "—"}
            </span>
          </div>
        </div>
        <div className="space-y-3 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
          {[
            { label: "Username", value: user?.username },
            { label: "Role", value: user?.role },
            { label: "User ID", value: user?.id, mono: true },
          ].map((row) => (
            <div key={row.label} className="flex items-start gap-4">
              <div className="text-xs uppercase tracking-wide w-20 pt-0.5 flex-shrink-0" style={{ color: "var(--muted)" }}>
                {row.label}
              </div>
              <div className={`text-sm font-medium break-all ${row.mono ? "font-mono" : ""}`} style={{ color: "var(--text)" }}>
                {row.value ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slack integration — new */}
      <div className="mb-6">
        <Suspense fallback={null}>
          <SlackSection />
        </Suspense>
      </div>

      {/* Upload section — unchanged */}
      <div className="section-card rounded-2xl p-6 fade-up-delay">
        <div className="display-title font-semibold text-base mb-1" style={{ color: "var(--text)" }}>
          Upload Logs
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Upload a log file for processing and enrichment. Use <strong>Legacy</strong> format for older, non-standard log files.
        </p>
        <div className="space-y-5">
          {([
            { type: "standard" as UploadType, label: "Standard Logs", id: "upload-std" },
            { type: "legacy" as UploadType, label: "Legacy Logs", id: "upload-leg" },
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
                          <path fillRule="evenodd" d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z" clipRule="evenodd" transform="rotate(180, 10, 10)"/>
                        </svg>
                        <span className="text-sm">Click to select or drag a file here</span>
                        <span className="text-xs" style={{ opacity: 0.6 }}>Any log file format</span>
                      </>
                    )}
                  </div>
                  <input id={id} type="file" className="hidden" onChange={(e) => handleUpload(e, type)} disabled={isUploading} />
                </label>
                {state.status !== "idle" && state.message && (
                  <div
                    className="mt-2 px-4 py-2.5 rounded-xl text-sm"
                    style={{
                      background: state.status === "success" ? "rgba(41,91,63,0.1)" : "rgba(158,47,47,0.08)",
                      color: state.status === "success" ? "var(--success)" : "var(--danger)",
                    }}
                  >
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