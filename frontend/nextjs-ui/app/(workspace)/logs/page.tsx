import { LogsTable } from "@/components/logs/logs-table";
import type { LogListResponse } from "@/lib/contracts";
import { getAuthorizedData } from "@/lib/session";

export default async function LogsPage() {
  const logs = await getAuthorizedData<LogListResponse>("/logs");

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(255,251,245,0.95),rgba(255,246,236,0.84))] p-6 shadow-[var(--shadow-md)]">
        <p className="display-title text-xs uppercase tracking-[0.28em] text-[color:var(--accent)]">
          Log Explorer
        </p>
        <h1 className="display-title mt-3 text-3xl font-semibold text-[color:var(--surface-dark)]">
          Search, filter, and page through your BigQuery-backed event stream.
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
          The first page is loaded on the server for a faster first paint, and
          extra pages reuse the same authenticated proxy so the browser never
          talks to the backend directly.
        </p>
      </section>

      <LogsTable initialRows={logs.rows} initialCursor={logs.nextCursor} />
    </div>
  );
}
