'use client'

import { useEffect, useState } from 'react'
import { LogRow } from '../types/log'
import { LogDetailRow } from '../types/log'
import Link from 'next/dist/client/link'
import authFetch from "../api/authentication/authFetch";


function formatTime(ts: any) {
  if (!ts) return '—'

  const raw =
    typeof ts === 'string'
      ? ts
      : typeof ts === 'object' && ts.value
      ? ts.value
      : null

  if (!raw) return '—'

  return new Date(raw).toLocaleString()
}

export default function LogsPage() {
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [logs, setLogs] = useState<LogDetailRow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  

  useEffect(() => {
    setLoading(true) // start loading

    authFetch('/logs')
      .then(res => {
        const data = res.data // Axios stores response JSON here
        setLogs(Array.isArray(data.rows) ? data.rows : [])
        setCursor(data.nextCursor ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        Loading logs…
      </div>
    )
  }

  const filtered = logs.filter(
    l => severityFilter === 'ALL' || l.severity === severityFilter
  )
  
  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }
  const loadMore = async () => {
  if (!cursor) return
  setLoadingMore(true)

  const res = await authFetch.get('/logs', {
    params: { cursor }
  })

  setLogs(prev => [...prev, ...(res.data.rows || [])])
  setCursor(res.data.nextCursor)
  setLoadingMore(false)
  }

  return (
    
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">System Logs</h1>

      {/* Filter Bar */}
      <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
  
        {/* LEFT: Filters */}
        <div className="flex items-center gap-6">
          <label className="text-sm font-medium text-slate-700">
            Severity
            <select
              className="ml-2 rounded-md border-slate-300 text-sm focus:ring-2 focus:ring-slate-400"
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="INFO">Info</option>
              <option value="WARN">Warn</option>
              <option value="ERROR">Error</option>
            </select>
          </label>
        </div>

        {/* RIGHT: Count + Button */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            {filtered.length} logs
          </span>

          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm shadow-sm"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="w-full text-left text-sm table-fixed">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="px-4 py-3 font-semibold w-2/12">Time</th>
              <th className="px-4 py-3 font-semibold w-2/12">Service</th>
              <th className="px-4 py-3 font-semibold w-1/12">Severity</th>
              <th className="px-4 py-3 font-semibold w-5/12">Message</th>
              <th className="px-4 py-3 font-semibold w-1/12">Anomaly</th>
              <th className="px-4 py-3 font-semibold w-1/12">Details</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((log, i) => {
              const sev = log.severity?.toUpperCase().trim()

              const rowStyle =
                sev === 'ERROR'
                  ? 'bg-red-50 hover:bg-red-100'
                  : sev === 'WARN'
                  ? 'bg-amber-50 hover:bg-amber-100'
                  : 'bg-white hover:bg-slate-50'

              return (
                <tr
                  key={i}
                  className={`${rowStyle} border-b border-slate-200 transition-colors`}
                >
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {formatTime(log.event_time)}
                  </td>

                  <td className="px-4 py-3 font-medium max-w-[12rem] truncate">
                    {log.service}
                  </td>

                  <td className="px-4 py-3 font-semibold">
                    {sev}
                  </td>

                  <td className="px-4 py-3 text-slate-700 max-w-[28rem]">
                    <div
                      className={`cursor-pointer ${
                        expandedRows.has(i)
                          ? 'whitespace-normal'
                          : 'truncate'
                      }`}
                      onClick={() => toggleRow(i)}
                      title="Click to expand"
                    >
                      {log.normalized_message || log.message}
                    </div>

                    {!expandedRows.has(i) && (
                      <div className="text-xs text-slate-400 mt-1">
                        Click to expand
                      </div>
                    )}
                  </td>
                  
                  <td
                    className={`px-4 py-3 text-right font-mono font-semibold
                      ${log.anomaly_score > 0.8
                        ? 'text-red-700'
                        : log.anomaly_score > 0.5
                        ? 'text-amber-600'
                        : 'text-slate-500'
                      }`}
                  >
                    {log.anomaly_score != null
                      ? log.anomaly_score.toFixed(2)
                      : '—'}
                  </td>
                  <td>
                    <Link href={`/logs/${log.id}`} className="text-end">
                      View
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>

        </table> 
        
      </div>
      <div className="flex justify-center mt-6">
        {cursor ? (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm shadow-sm"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        ) : (
          <span className="text-slate-400 text-sm">End of logs</span>
        )}
      </div>
    </div>
  )
}


