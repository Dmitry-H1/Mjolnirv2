"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { SeverityBadge } from "@/components/ui/severity-badge";
import type { LogRecord } from "@/lib/contracts";
import { formatScore, formatTimestamp } from "@/lib/format";

export function LogsTable({
  initialRows,
  initialCursor,
}: {
  initialRows: LogRecord[];
  initialCursor: string | null;
}) {
  const [rows, setRows] = useState(initialRows);
  const [cursor, setCursor] = useState(initialCursor);
  const [severity, setSeverity] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const deferredQuery = useDeferredValue(query);

  const filteredRows = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const severityMatch = severity === "ALL" || row.severity === severity;
      const text = `${row.service || ""} ${row.normalized_message || ""} ${
        row.message || ""
      }`.toLowerCase();
      const queryMatch = !normalizedQuery || text.includes(normalizedQuery);

      return severityMatch && queryMatch;
    });
  }, [deferredQuery, rows, severity]);

  async function loadMore() {
    if (!cursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError("");

    try {
      const response = await fetch(`/api/logs?cursor=${encodeURIComponent(cursor)}`);
      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error || "Unable to load more logs.");
        return;
      }

      startTransition(() => {
        setRows((current) => [...current, ...(payload.rows || [])]);
        setCursor(payload.nextCursor ?? null);
      });
    } catch (_error) {
      setError("Unable to load more logs.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="section-card rounded-[1.75rem] p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,320px)]">
          <label className="text-sm font-semibold text-[color:var(--muted)]">
            Severity
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
              className="mt-2 block w-full rounded-2xl border border-[color:var(--border)] bg-white/85 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
            >
              <option value="ALL">All severities</option>
              <option value="INFO">Info</option>
              <option value="WARN">Warn</option>
              <option value="ERROR">Error</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-[color:var(--muted)]">
            Search loaded rows
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-2 block w-full rounded-2xl border border-[color:var(--border)] bg-white/85 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
              placeholder="service, message, error text..."
            />
          </label>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 py-3 text-sm text-[color:var(--muted)]">
          Showing {filteredRows.length} of {rows.length} loaded records
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-[rgba(158,47,47,0.16)] bg-[rgba(158,47,47,0.08)] px-4 py-3 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[color:var(--border)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[color:var(--border)]">
            <thead className="bg-[rgba(34,29,24,0.04)]">
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                <th className="px-4 py-4 font-semibold">Time</th>
                <th className="px-4 py-4 font-semibold">Service</th>
                <th className="px-4 py-4 font-semibold">Severity</th>
                <th className="px-4 py-4 font-semibold">Message</th>
                <th className="px-4 py-4 font-semibold">Score</th>
                <th className="px-4 py-4 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)] bg-white/70">
              {filteredRows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-4 text-sm text-[color:var(--muted)]">
                    {formatTimestamp(row.event_time)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold">
                      {row.service || "Unknown service"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <SeverityBadge severity={row.severity} />
                  </td>
                  <td className="max-w-xl px-4 py-4 text-sm leading-6 text-[color:var(--muted)]">
                    {row.normalized_message || row.message || "No message available."}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-[color:var(--surface-dark)]">
                    {formatScore(row.anomaly_score)}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/logs/${row.id}`}
                      className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                    >
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        {cursor ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingMore ? "Loading more..." : "Load next page"}
          </button>
        ) : (
          <p className="text-sm text-[color:var(--muted)]">
            You have reached the end of the currently available log stream.
          </p>
        )}
      </div>
    </section>
  );
}
