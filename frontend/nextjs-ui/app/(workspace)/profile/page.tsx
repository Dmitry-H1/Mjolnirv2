"use client";

import { useEffect, useState } from "react";
import authFetch from "@/app/api/authFetch";
import type { User } from "@/lib/contracts";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    authFetch
      .get<User>("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {});
  }, []);

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

    </div>
  );
}
