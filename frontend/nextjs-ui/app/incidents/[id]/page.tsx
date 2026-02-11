'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

interface LogRow {
  event_time: string
  service: string
  anomaly_reason: string
  anomaly_score: number
  normalized_message: string
}

interface LLMSummary {
  simplifiedIssue: string
  probableCause: string
  potentialResolution: string
}

export default function IncidentDetailPage() {
  const params = useParams()
  const incidentId = params?.id as string

  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!incidentId) return

    fetch(`/api/incidents/${incidentId}`)
      .then(res => res.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [incidentId])

  const summary: LLMSummary | null = useMemo(() => {
    if (logs.length === 0) return null

    const { service, anomaly_reason } = logs[0]

    return {
      simplifiedIssue: `${service} is experiencing repeated ${anomaly_reason.replace('_', ' ')} issues.`,
      probableCause:
        anomaly_reason === 'persistent_error'
          ? 'A downstream dependency or database may be failing repeatedly.'
          : anomaly_reason === 'latency_spike'
          ? 'The service may be under high load or experiencing resource contention.'
          : 'Unexpected system behavior detected.',
      potentialResolution:
        anomaly_reason === 'persistent_error'
          ? 'Check service logs for stack traces and validate dependent services are healthy.'
          : anomaly_reason === 'latency_spike'
          ? 'Inspect CPU/memory usage and consider scaling the service horizontally.'
          : 'Investigate recent deployments or configuration changes.'
    }
  }, [logs])

  if (loading) {
    return <div className="p-6">Loading incident...</div>
  }

  if (!summary) {
    return <div className="p-6">Incident not found.</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Incident Detail</h1>
        <p className="text-sm text-gray-500 font-mono">{incidentId}</p>
      </div>

      <div className="border rounded-2xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Simplified Issue</h2>
        <p>{summary.simplifiedIssue}</p>
      </div>

      <div className="border rounded-2xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Probable Cause</h2>
        <p>{summary.probableCause}</p>
      </div>

      <div className="border rounded-2xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Potential Resolution</h2>
        <p>{summary.potentialResolution}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Related Logs</h2>
        <ul className="text-sm space-y-2">
          {logs.map((log, i) => (
            <li key={i} className="font-mono text-xs border p-2 rounded">
              {log.event_time} — {log.normalized_message} (
              {log.anomaly_score.toFixed(2)})
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
