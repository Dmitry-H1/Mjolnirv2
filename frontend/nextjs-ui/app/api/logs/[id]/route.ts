import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const backend = 'http://127.0.0.1:8000'
  const id = params.id

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const res = await fetch(`${backend}/logs/${id}`)

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch log from backend' },
      { status: res.status }
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}

/* Old code with querying in frontend:

import { NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery()

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
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
      WHERE ingestion_id = @id
      LIMIT 1
    `

    const [rows] = await bigquery.query({
      query,
      params: { id },
      location: 'US',
    })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    const unwrap = (v: any) =>
      v && typeof v === 'object' && 'value' in v ? v.value : v

    const log = rows[0]

    const normalized = {
      id: unwrap(log.id),
      event_time: unwrap(log.event_time),
      service: unwrap(log.service),
      severity: unwrap(log.severity),
      anomaly_reason: unwrap(log.anomaly_reason),
      anomaly_score: Number(unwrap(log.anomaly_score)),
      normalized_message: unwrap(log.normalized_message),
      message: unwrap(log.message),
    }

    return NextResponse.json(normalized)
  } catch (err: any) {
    console.error('Log detail error:', err)
    return NextResponse.json(
      { error: 'Failed to load log' },
      { status: 500 }
    )
  }
}

*/