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

    const scoreSeries = rows 
      .map(row => { 
        const raw = typeof row.event_time === "object" && row.event_time.value 
          ? row.event_time.value 
          : row.event_time;
        
        const date = new Date(raw); 

        if (isNaN(date.getTime())) { 
          console.warn("Invalid timestamp:", row.event_time); 
          return null; 
        } 
        
        return { 
          x: date.toISOString(), 
          y: Number(row.anomaly_score) 
        }; 
      }) 
      .filter(Boolean);

      return NextResponse.json({ 
        rows, 
        scoreSeries 
      });
      
  } catch (error) {
    console.error('BigQuery error:', error.message, error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}