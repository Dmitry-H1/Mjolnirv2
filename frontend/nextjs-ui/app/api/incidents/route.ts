import { NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
})

interface Incident {
  id: string
  service: string
  reason: string
  count: number
  maxScore: number
  firstSeen: string
  lastSeen: string
}

export async function GET() {
  try {
    const query = `
      SELECT
        service,
        anomaly_reason,
        COUNT(*) AS count,
        MAX(anomaly_score) AS maxScore,
        MIN(event_time) AS firstSeen,
        MAX(event_time) AS lastSeen
      FROM \`${process.env.BQ_DATASET}.${process.env.BQ_TABLE}\`
      WHERE anomaly_score >= 0.8
      GROUP BY service, anomaly_reason
      ORDER BY maxScore DESC
    `

    const [rows] = await bigquery.query({ query })

    const incidents: Incident[] = rows.map((row: any) => {
      // BigQuery sometimes wraps values like { value: ... }
      const unwrap = (field: any) =>
        field && typeof field === 'object' && 'value' in field
          ? field.value
          : field

      const service = unwrap(row.service)
      const reason = unwrap(row.anomaly_reason)

      const firstSeen = unwrap(row.firstSeen)
      const lastSeen = unwrap(row.lastSeen)

      const maxScoreRaw = unwrap(row.maxScore)
      const countRaw = unwrap(row.count)

      return {
        id: `${service}__${reason}`,
        service,
        reason,
        count: Number(countRaw),
        maxScore: Number(maxScoreRaw),
        firstSeen: new Date(firstSeen).toISOString(),
        lastSeen: new Date(lastSeen).toISOString(),
      }
    })

    return NextResponse.json(incidents)
  } catch (error) {
    console.error('Incident API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch incidents' },
      { status: 500 }
    )
  }
}
