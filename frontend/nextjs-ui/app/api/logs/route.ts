import { NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rawCursor = searchParams.get('cursor')

    let safeCursor: string | null = null
    if (rawCursor) {
      const d = new Date(rawCursor)
      if (!isNaN(d.getTime())) safeCursor = d.toISOString()
    }

    const query = `
      SELECT
        ingestion_id AS id,
        inserted_at AS event_time,
        service,
        severity,
        normalized_message,
        message,
        anomaly_reason,
        anomaly_score
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET}.${process.env.BQ_TABLE}\`
      ${safeCursor ? 'WHERE inserted_at < TIMESTAMP(@cursor)' : ''}
      ORDER BY inserted_at DESC
      LIMIT 100
    `

    const [rows] = await bigquery.query({
      query,
      params: safeCursor ? { cursor: safeCursor } : {},
      location: 'US',
    })

    const unwrap = (v: any) =>
      v && typeof v === 'object' && 'value' in v ? v.value : v

    const normalized = rows.map((row: any) => ({
      id: unwrap(row.id), // ✅ FIXED
      event_time: unwrap(row.event_time),
      service: unwrap(row.service),
      severity: unwrap(row.severity),
      anomaly_reason: unwrap(row.anomaly_reason),
      anomaly_score: Number(unwrap(row.anomaly_score)),
      normalized_message: unwrap(row.normalized_message),
      message: unwrap(row.message),
    }))

    const nextCursor =
      rows.length > 0
        ? unwrap(rows[rows.length - 1].event_time) // ✅ FIXED
        : null

    return NextResponse.json({
      rows: normalized,
      nextCursor,
    })
  } catch (error: any) {
    console.error('BigQuery error:', error.message, error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}