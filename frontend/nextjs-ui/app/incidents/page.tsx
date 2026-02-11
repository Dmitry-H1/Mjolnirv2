'use client'

import { useEffect, useState } from 'react'

interface Incident {
  id: string
  service: string
  reason: string
  count: number
  maxScore: number
  firstSeen: string
  lastSeen: string
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => {
        setIncidents(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-6">Loading incidents…</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Incidents</h1>

      {incidents.length === 0 ? (
        <p>No high-severity anomalies detected.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Incident ID</th>
              <th className="border p-2 text-left">Service</th>
              <th className="border p-2 text-left">Reason</th>
              <th className="border p-2 text-left">Count</th>
              <th className="border p-2 text-left">Max Score</th>
              <th className="border p-2 text-left">First Seen</th>
              <th className="border p-2 text-left">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map(incident => (
              <tr
                key={incident.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => window.location.href = `/incidents/${incident.id}`}
              >
                <td className="border p-2 font-mono text-xs text-blue-600 underline">
                  {incident.id}
                </td>
                <td className="border p-2">{incident.service}</td>
                <td className="border p-2 text-red-600">{incident.reason}</td>
                <td className="border p-2">{incident.count}</td>
                <td className="border p-2 font-semibold">
                  {incident.maxScore.toFixed(2)}
                </td>
                <td className="border p-2">{incident.firstSeen}</td>
                <td className="border p-2">{incident.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
