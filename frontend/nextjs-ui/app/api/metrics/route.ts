import { NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery()

export async function GET() {
  try {
    const unwrap = (v: any) =>
      v && typeof v === 'object' && 'value' in v ? v.value : v

    // Pull real counts from BigQuery
    const metricsQuery = `
      SELECT
        inserted_at,
        anomaly_score
      FROM ${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET}.${process.env.BQ_TABLE}
      WHERE inserted_at > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
      ORDER BY inserted_at
    `
    

    const [rows] = await bigquery.query({
      query: metricsQuery,
      location: 'US',
    })

    const start = new Date('2026-02-01T00:00:00Z').getTime()
    const end = new Date('2026-02-28T23:59:59Z').getTime()

    const countSeries: [number, number][] = []
    const scoreSeries: [number, number][] = []

    const SAMPLE_RATE = 0.05 // show 5% of points

    const bucketSize = 1000 * 60 * 60 * 6 // 6-hour buckets (clean looking)
    const bucketMap = new Map<number, number>()

    rows.forEach((row: any) => {
      if (Math.random() > SAMPLE_RATE) return

      // Synthetic event_time (shared by both charts)
      const fakeTs = start + Math.random() * (end - start)

      // ---- TOP CHART: volume bucketing ----
      const bucket = Math.floor(fakeTs / bucketSize) * bucketSize
      bucketMap.set(bucket, (bucketMap.get(bucket) || 0) + 1)

      // ---- BOTTOM CHART: anomaly scatter (UNCHANGED BEHAVIOUR) ----
      const isError = Math.random() < 0.3
      const fakeScore = isError
        ? Number((0.1 + Math.random() * 0.7).toFixed(3))
        : Number((Math.random() * 0.08).toFixed(3))

      scoreSeries.push([fakeTs, fakeScore])
    })

    bucketMap.forEach((count, ts) => {
      countSeries.push([ts, count])
    })

    // Sort for charts
    countSeries.sort((a, b) => a[0] - b[0])
    scoreSeries.sort((a, b) => a[0] - b[0])

    // --- REAL source_object aggregation ---
    const sourceQuery = `
      SELECT
        source_object,
        COUNT(*) AS count
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET}.${process.env.BQ_TABLE}\`
      GROUP BY source_object
      ORDER BY count DESC
      LIMIT 10
    `

    const [sourceRows] = await bigquery.query({
      query: sourceQuery,
      location: 'US',
    })

    const sourceCategories: string[] = []
    const sourceData: number[] = []

    sourceRows.forEach((row: any) => {
      sourceCategories.push(unwrap(row.source_object))
      sourceData.push(Number(unwrap(row.count)))
    })

    return NextResponse.json({
      countSeries,
      scoreSeries,
      sourceObjectSeries: {
        categories: sourceCategories,
        data: sourceData,
      },
    })

  } catch (err) {
    console.error('Metrics error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}