import { NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery()

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const incidentId = params.id

    if (!incidentId) {
      return NextResponse.json({ error: 'Missing incident id' }, { status: 400 })
    }

    const [service, reason] = incidentId.split('__')

    if (!service || !reason) {
      return NextResponse.json({ error: 'Invalid incident id format' }, { status: 400 })
    }

    const query = `
      SELECT
        event_time,
        service,
        anomaly_reason,
        anomaly_score,
        normalized_message
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET}.${process.env.BQ_TABLE}\`
      WHERE service = @service
        AND anomaly_reason = @reason
        AND anomaly_score >= 0.8
      ORDER BY event_time DESC
      LIMIT 100
    `

    const options = {
      query,
      location: 'US',
      params: { service, reason }
    }

    const [rows] = await bigquery.query(options)

    const cleaned = rows.map((row: any) => {
    const unwrap = (field: any) =>
        field && typeof field === 'object' && 'value' in field
        ? field.value
        : field

    return {
        event_time: unwrap(row.event_time),
        service: unwrap(row.service),
        anomaly_reason: unwrap(row.anomaly_reason),
        anomaly_score: Number(unwrap(row.anomaly_score)),
        normalized_message: unwrap(row.normalized_message),
    }
    })

    return NextResponse.json(cleaned)

  } catch (err) {
    console.error('Incident detail error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch incident logs' },
      { status: 500 }
    )
  }
}
