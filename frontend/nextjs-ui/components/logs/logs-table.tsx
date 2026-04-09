"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import type { Log } from "@/lib/contracts";
import { formatDateTime } from "@/lib/format";
import SeverityBadge from "@/components/ui/severity-badge";
import ScoreIndicator from "@/components/ui/score-indicator";

interface Props {
  logs: Log[];
  onRowClick: (log: Log) => void;
  loading?: boolean;
}

const col = createColumnHelper<Log>();

const columns = [
  col.accessor("event_time", {
    header: "Time",
    cell: (info) => (
      <span
        className="text-xs font-mono whitespace-nowrap"
        style={{ color: "var(--muted)" }}
      >
        {formatDateTime(info.getValue())}
      </span>
    ),
    size: 170,
  }),
  col.accessor("service", {
    header: "Service",
    cell: (info) => {
      const val = info.getValue() || "—";
      return (
        <span
          className="text-sm font-medium block truncate"
          style={{ color: "var(--text)", maxWidth: "130px" }}
          title={val}
        >
          {val}
        </span>
      );
    },
    size: 130,
  }),
  col.accessor("severity", {
    header: "Severity",
    cell: (info) => <SeverityBadge severity={info.getValue()} />,
    size: 100,
  }),
  col.accessor("category", {
    header: "Category",
    cell: (info) => (
      <span className="text-xs" style={{ color: "var(--muted)" }}>
        {info.getValue() || "—"}
      </span>
    ),
    size: 120,
  }),
  col.accessor("anomaly_score", {
    header: "Anomaly",
    cell: (info) => <ScoreIndicator score={info.getValue()} showBar />,
    size: 140,
  }),
  col.accessor("message", {
    header: "Message",
    cell: (info) => (
      <span
        className="text-sm"
        style={{
          color: "var(--text)",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {info.getValue()}
      </span>
    ),
  }),
];

export default function LogsTable({ logs, onRowClick, loading }: Props) {
  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-auto rounded-2xl section-card">
      <table className="w-full text-sm border-collapse min-w-max">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr
              key={hg.id}
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest whitespace-nowrap"
                  style={{ color: "var(--muted)" }}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
              {/* Arrow column header */}
              <th className="px-4 py-3 w-6" />
            </tr>
          ))}
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="text-center py-16 text-sm"
                style={{ color: "var(--muted)" }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-5 h-5 border-2 rounded-full animate-spin"
                    style={{
                      borderColor: "var(--border)",
                      borderTopColor: "var(--accent)",
                    }}
                  />
                  Loading logs…
                </div>
              </td>
            </tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="text-center py-16 text-sm"
                style={{ color: "var(--muted)" }}
              >
                No logs found.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer transition-colors"
                style={{ borderBottom: "1px solid var(--border)" }}
                onClick={() => onRowClick(row.original)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(159,59,39,0.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3"
                    style={{ maxWidth: cell.column.getSize() + "px" }}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--accent)" }}
                  >
                    →
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
