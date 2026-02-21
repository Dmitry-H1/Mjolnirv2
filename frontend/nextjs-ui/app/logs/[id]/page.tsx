'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'


interface LogRow {
  event_time: string
  service: string
  anomaly_reason: string
  anomaly_score: number
  normalized_message: string
  severity?: string
}

interface LLMSummary {
  simplifiedIssue: string
  probableCause: string
  potentialResolution: string
}

export default function IncidentDetailPage() {
  const params = useParams()
  const incidentId = params?.id as string
  const router = useRouter()

  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!incidentId) return

    fetch(`/api/logs/${incidentId}`)
        .then(res => res.json())
        .then(data => {
        setLogs(data ? [data] : [])
        setLoading(false)
        })
        .catch(() => setLoading(false))
    }, [incidentId])

  const summary = useMemo(() => {
    if (!logs.length) return null

    const combined = logs.map(l => l.normalized_message).join(' ').toLowerCase()

    const serviceName =
        logs.find(l => l.service)?.service ?? 'Unknown service'

    const reason =
        combined.includes('timeout') ? 'timeouts' :
        combined.includes('connection refused') ? 'connection failures' :
        combined.includes('memory') ? 'memory pressure' :
        logs[0]?.anomaly_reason?.replace('_', ' ') ?? 'anomalous behaviour'

    const hasErrors = logs.some(l => l.severity === 'ERROR')
    const avgScore =
        logs.reduce((a, l) => a + l.anomaly_score, 0) / logs.length

    let probableCause = 'Unexpected system behaviour detected.'
    if (hasErrors && avgScore > 0.9)
        probableCause = 'A hard failure or crashing dependency is likely.'
    else if (hasErrors)
        probableCause = 'An upstream or downstream dependency may be failing.'
    else if (avgScore > 0.8)
        probableCause = 'The service is showing abnormal runtime patterns.'

    let potentialResolution = 'Investigate recent deployments or configuration changes.'
    if (combined.includes('timeout'))
        potentialResolution = 'Check upstream latency and network health. Consider scaling dependencies.'
    else if (combined.includes('connection refused'))
        potentialResolution = 'Verify the target service is reachable and healthy.'
    else if (combined.includes('memory'))
        potentialResolution = 'Inspect memory usage and restart frequency.'

    return {
        simplifiedIssue: `${serviceName} is experiencing repeated ${reason}.`,
        probableCause,
        potentialResolution
    }
    }, [logs])

  if (loading) {
  return <div className="p-6 animate-pulse">Loading incident...</div>
  }
  if (error) {
    return (
        <div className="p-6 text-red-500">
        Failed to load incident: {error}
        </div>
    )
  }

  if (!summary) {
  return <div className="p-6">Incident not found.</div>
}

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Incident Detail</h1>
        <p className="text-sm text-gray-500 font-mono">{incidentId}</p>
        <div className="flex items-center gap-4">
        <button
            onClick={() => router.push('/logs')}
            className="text-sm text-slate-600 hover:text-black underline">
            ← Back to logs
        </button>
        </div>
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
