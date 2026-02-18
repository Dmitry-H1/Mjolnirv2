import { NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery()

// Using practice logs for testing
export async function GET() {
  
  try {
    const query = `
      SELECT
        event_time,
        service,
        severity,
        normalized_message,
        anomaly_score
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET}.${process.env.BQ_TABLE}\` 
      ORDER BY event_time DESC
      LIMIT 100
    `

    const [rows] = await bigquery.query({
      query,
      location: 'US',
    })

    return NextResponse.json(rows)
  } catch (error) {
    console.error('BigQuery error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
