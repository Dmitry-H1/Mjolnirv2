"use client";

import { useEffect, useRef, useState } from "react";
import authFetch from "@/app/api/authFetch";
import type { User } from "@/lib/contracts";

type UploadType = "standard" | "legacy";

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  message: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [upload, setUpload] = useState<Record<UploadType, UploadState>>({
    standard: { status: "idle", message: "" },
    legacy: { status: "idle", message: "" },
  });

  useEffect(() => {
    authFetch
      .get<User>("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {});
  }, []);

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    type: UploadType
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpload((prev) => ({
      ...prev,
      [type]: { status: "uploading", message: "" },
    }));

    try {
      const form = new FormData();
      form.append("file", file);
      const endpoint =
        type === "legacy" ? "/logs/upload/legacy" : "/logs/upload";

      await authFetch.post(endpoint, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUpload((prev) => ({
        ...prev,
        [type]: {
          status: "success",
          message: `"${file.name}" uploaded successfully`,
        },
      }));
    } catch {
      setUpload((prev) => ({
        ...prev,
        [type]: {
          status: "error",
          message: "Upload failed. Please try again.",
        },
      }));
    } finally {
      e.target.value = "";
    }
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
    <div className="p-8 min-h-screen" style={{ maxWidth: "680px" }}>
      {/* Header */}
      <div className="mb-8 fade-up">
        <h1
          className="display-title text-3xl font-bold"
          style={{ color: "var(--text)" }}
        >
          Profile
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Your account details and log ingestion tools
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
            { label: "Role", value: user?.role },
            { label: "User ID", value: user?.id, mono: true },
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

      {/* ── Upload section ── */}
      <div className="section-card rounded-2xl p-6 fade-up-delay">
        <div
          className="display-title font-semibold text-base mb-1"
          style={{ color: "var(--text)" }}
        >
          Upload Logs
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Upload a log file for processing and enrichment. Use{" "}
          <strong>Legacy</strong> format for older, non-standard log files.
        </p>

        <div className="space-y-5">
          {(
            [
              { type: "standard" as UploadType, label: "Standard Logs", id: "upload-std" },
              { type: "legacy" as UploadType, label: "Legacy Logs", id: "upload-leg" },
            ]
          ).map(({ type, label, id }) => {
            const state = upload[type];
            const isUploading = state.status === "uploading";

            return (
              <div key={type}>
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-2"
                  style={{ color: "var(--muted)" }}
                >
                  {label}
                </div>

                <label
                  htmlFor={id}
                  className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                  style={{
                    borderColor: isUploading
                      ? "var(--accent)"
                      : "var(--border)",
                    background: isUploading
                      ? "var(--accent-soft)"
                      : "rgba(255,251,245,0.5)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isUploading)
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isUploading)
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--border)";
                  }}
                >
                  <div
                    className="flex flex-col items-center gap-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    {isUploading ? (
                      <>
                        <div
                          className="w-5 h-5 border-2 rounded-full animate-spin"
                          style={{
                            borderColor: "var(--border)",
                            borderTopColor: "var(--accent)",
                          }}
                        />
                        <span className="text-sm">Uploading…</span>
                      </>
                    ) : (
                      <>
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          width="20"
                          height="20"
                          style={{ opacity: 0.5 }}
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z"
                            clipRule="evenodd"
                            transform="rotate(180, 10, 10)"
                          />
                        </svg>
                        <span className="text-sm">
                          Click to select or drag a file here
                        </span>
                        <span className="text-xs" style={{ opacity: 0.6 }}>
                          Any log file format
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    id={id}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleUpload(e, type)}
                    disabled={isUploading}
                  />
                </label>

                {state.status !== "idle" && state.message && (
                  <div
                    className="mt-2 px-4 py-2.5 rounded-xl text-sm"
                    style={{
                      background:
                        state.status === "success"
                          ? "rgba(41,91,63,0.1)"
                          : "rgba(158,47,47,0.08)",
                      color:
                        state.status === "success"
                          ? "var(--success)"
                          : "var(--danger)",
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
