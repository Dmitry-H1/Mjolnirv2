'use client'

import { useEffect, useState } from 'react'
import { LogRow } from '../types/log'

function formatTime(value: any) {
  if (!value) return ''

  // If it's already a Date
  if (value instanceof Date) {
    return value.toISOString().split('T')[1].slice(0, 8)
  }

  
  if (typeof value === 'string') {
    const normalized = value
      .replace(' UTC', 'Z')
      .replace(' ', 'T')

    const date = new Date(normalized)

    if (isNaN(date.getTime())) return ''

    return date.toISOString().split('T')[1].slice(0, 8)
  }

  return ''
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('ALL')

  useEffect(() => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => {
        setLogs(data)
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

  return (
    
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">System Logs</h1>

      {/* Filter Bar */}
      <div className="mb-6 flex items-center gap-6 bg-white p-4 rounded-lg border shadow-sm">
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

        <span className="text-sm text-slate-500">
          {filtered.length} logs
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Service</th>
              <th className="px-4 py-3 font-semibold">Severity</th>
              <th className="px-4 py-3 font-semibold">Message</th>
              <th className="px-4 py-3 font-semibold text-right">Anomaly</th>
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

                  <td className="px-4 py-3 font-medium">
                    {log.service}
                  </td>

                  <td className="px-4 py-3 font-semibold">
                    {sev}
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    {log.normalized_message}
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
                    {log.anomaly_score.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>

        </table>
        
      </div>
    </div>
  )
}
