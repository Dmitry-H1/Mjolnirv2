import { NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery()

export async function GET() {
  try {
    const query = `
      SELECT
        TIMESTAMP_TRUNC(inserted_at, MINUTE) AS bucket,
        COUNT(*) AS count,
        AVG(anomaly_score) AS avg_score
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET}.${process.env.BQ_TABLE}\`
      WHERE inserted_at > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
      GROUP BY bucket
      ORDER BY bucket
    `

    const [rows] = await bigquery.query({
      query,
      location: 'US',
    })

    const unwrap = (v: any) =>
      v && typeof v === 'object' && 'value' in v ? v.value : v

    const countSeries: [number, number][] = []
    const scoreSeries: [number, number][] = []

    rows.forEach((row: any) => {
      const ts = new Date(unwrap(row.bucket)).getTime()
      const count = Number(unwrap(row.count))
      const avg = Number(unwrap(row.avg_score))

      countSeries.push([ts, count])
      scoreSeries.push([ts, avg])
    })

    return NextResponse.json({
      countSeries,
      scoreSeries,
    })
  } catch (err: any) {
    console.error('Metrics error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}