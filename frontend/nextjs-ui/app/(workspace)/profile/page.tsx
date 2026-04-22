"use client";

import { useEffect, useState } from "react";
import authFetch from "@/app/api/authFetch";
import type { User } from "@/lib/contracts";

type KeyState = "idle" | "loading" | "revealed" | "copied" | "error";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [keyState, setKeyState] = useState<KeyState>("idle");
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    authFetch
      .get<User>("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {});
  }, []);

  async function generateKey() {
    setKeyState("loading");
    setApiKey(null);
    try {
      const { data } = await authFetch.post<{ api_key: string }>("/auth/api-key");
      setApiKey(data.api_key);
      setKeyState("revealed");
    } catch {
      setKeyState("error");
    }
  }

  function copyKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => {
      setKeyState("copied");
      setTimeout(() => setKeyState("revealed"), 2000);
    });
  }

  function dismissKey() {
    setApiKey(null);
    setKeyState("idle");
  }

  const initials = user?.username?.[0]?.toUpperCase() ?? "?";

  const roleColors: Record<string, { bg: string; color: string }> = {
    ADMIN: {
      bg: "rgba(158, 47, 47, 0.12)",
      color: "var(--danger)",
    },
    USER: {
      bg: "var(--accent-soft)",
      color: "var(--accent)",
    },
  };

  const roleStyle = roleColors[user?.role ?? "USER"] ?? roleColors.USER;

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ maxWidth: "680px" }}>
      {/* Header */}
      <div className="mb-8 fade-up">
        <h1
          className="display-title text-3xl font-bold"
          style={{ color: "var(--text)" }}
        >
          Profile
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Your account details
        </p>
      </div>

      {/* ── User card ── */}
      <div className="section-card rounded-2xl p-6 mb-6 fade-up">
        <div className="flex items-center gap-5 mb-6">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold display-title flex-shrink-0"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            {initials}
          </div>

          <div>
            <div
              className="display-title text-xl font-bold"
              style={{ color: "var(--text)" }}
            >
              {user?.username ?? "—"}
            </div>
            {user?.email && (
              <div className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                {user.email}
              </div>
            )}
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold mt-1.5 uppercase tracking-wide"
              style={roleStyle}
            >
              {user?.role ?? "—"}
            </span>
          </div>
        </div>

        {/* Details table */}
        <div
          className="space-y-3 pt-5"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {[
            { label: "Username", value: user?.username },
            { label: "Email",    value: user?.email },
            { label: "Role",     value: user?.role },
            { label: "User ID",  value: user?.id, mono: true },
          ].map((row) => (
            <div key={row.label} className="flex items-start gap-4">
              <div
                className="text-xs uppercase tracking-wide w-20 pt-0.5 flex-shrink-0"
                style={{ color: "var(--muted)" }}
              >
                {row.label}
              </div>
              <div
                className={`text-sm font-medium break-all ${row.mono ? "font-mono" : ""}`}
                style={{ color: "var(--text)" }}
              >
                {row.value ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── API Key ── */}
      <div className="section-card rounded-2xl p-6 fade-up-delay">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <div className="display-title font-semibold text-base" style={{ color: "var(--text)" }}>
              API Key
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Generates a long-lived Bearer token for use with <span style={{ fontFamily: "monospace", fontSize: 12 }}>POST /logs/ingest</span>. The key is shown once — copy it before closing.
            </p>
          </div>
          {keyState === "idle" || keyState === "error" ? (
            <button
              onClick={generateKey}
              style={{
                flexShrink: 0,
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--accent-soft)",
                border: "1.5px solid var(--accent)",
                padding: "9px 20px", borderRadius: 10, cursor: "pointer",
                color: "var(--accent)", fontSize: 12, fontWeight: 700,
                fontFamily: "var(--font-display)", whiteSpace: "nowrap",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7.5" cy="15.5" r="5.5"/>
                <path d="M21 2l-9.6 9.6"/>
                <path d="M15.5 7.5l3 3L22 7l-3-3"/>
              </svg>
              Generate API Key
            </button>
          ) : keyState === "loading" ? (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", color: "var(--muted)", fontSize: 12, fontFamily: "var(--font-display)" }}>
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
              Generating…
            </div>
          ) : null}
        </div>

        {keyState === "error" && (
          <div className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(158,47,47,0.08)", color: "var(--danger)", border: "1px solid rgba(158,47,47,0.2)" }}>
            Failed to generate API key. Please try again.
          </div>
        )}

        {(keyState === "revealed" || keyState === "copied") && apiKey && (
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "var(--font-display)" }}>
                Your API Key
              </div>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(158,47,47,0.08)", color: "var(--danger)", fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
                Copy now — will not be shown again
              </span>
            </div>
            <div style={{
              borderRadius: 12,
              background: "var(--bg)",
              border: "1.5px solid var(--accent)",
              overflow: "hidden",
            }}>
              <div style={{
                padding: "14px 16px",
                fontFamily: "monospace",
                fontSize: 11,
                color: "var(--text)",
                wordBreak: "break-all",
                lineHeight: 1.6,
              }}>
                {apiKey}
              </div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6,
                padding: "8px 10px",
                borderTop: "1px solid var(--border)",
                background: "rgba(255,251,245,0.6)",
              }}>
                <button
                  onClick={copyKey}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: keyState === "copied" ? "var(--accent-soft)" : "rgba(255,251,245,0.95)",
                    border: `1.5px solid ${keyState === "copied" ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 8, padding: "5px 14px", cursor: "pointer",
                    fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)",
                    color: keyState === "copied" ? "var(--accent)" : "var(--muted)",
                    transition: "all 0.15s",
                    boxShadow: "0 1px 4px rgba(62,43,22,0.07)",
                  }}
                >
                  {keyState === "copied" ? (
                    <>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M11 5V3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      Copy key
                    </>
                  )}
                </button>
                <button
                  onClick={dismissKey}
                  title="Dismiss"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,251,245,0.95)", border: "1.5px solid var(--border)",
                    borderRadius: 8, width: 30, height: 30, cursor: "pointer",
                    color: "var(--muted)", flexShrink: 0,
                    boxShadow: "0 1px 4px rgba(62,43,22,0.07)",
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
