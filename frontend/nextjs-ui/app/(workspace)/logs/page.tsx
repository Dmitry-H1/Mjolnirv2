"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import authFetch from "@/app/api/authFetch";
import type { Log, LogsResponse } from "@/lib/contracts";
import LogsTable from "@/components/logs/logs-table";

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(
    async (cur: string | null, append: boolean) => {
      const params: Record<string, string> = {};
      if (cur) params.cursor = cur;

      const { data } = await authFetch.get<LogsResponse>("/logs", { params });
      setLogs((prev) => (append ? [...prev, ...data.rows] : data.rows));
      setCursor(data.nextCursor);
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    fetchLogs(null, false)
      .catch(() => setError("Failed to load logs."))
      .finally(() => setLoading(false));
  }, [fetchLogs]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    await fetchLogs(cursor, true).catch(() =>
      setError("Failed to load more logs.")
    );
    setLoadingMore(false);
  }

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8 fade-up">
        <h1
          className="display-title text-3xl font-bold"
          style={{ color: "var(--text)" }}
        >
          Log Explorer
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Browse and inspect your enriched log events · click any row for full
          detail
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

      <div className="fade-up">
        <LogsTable
          logs={logs}
          loading={loading}
          onRowClick={(log) => {
            const id = log.id ?? log.ingestion_id ?? log.trace_id;
            if (id) router.push(`/logs/${encodeURIComponent(id)}`);
          }}
        />
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-center gap-4">
        {cursor && !loading && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 rounded-xl text-sm font-medium transition-opacity"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent)",
              opacity: loadingMore ? 0.6 : 1,
              cursor: loadingMore ? "not-allowed" : "pointer",
            }}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}

        {!cursor && !loading && logs.length > 0 && (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            All {logs.length} logs loaded
          </p>
        )}
      </div>
    </div>
  );
}
