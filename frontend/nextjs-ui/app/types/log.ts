export type Severity = 'INFO' | 'WARN' | 'ERROR'

export type LogRow = {
  inserted_at: string | null
  event_time: string | null
  service: string | null
  severity: Severity | null
  normalized_message: string | null
  message: string | null
  anomaly_score: number | null
}

// For details view
export type LogDetailRow = {
  id: string
  event_time: string
  service: string
  severity: Severity | null
  anomaly_reason: string
  anomaly_score: number
  normalized_message: string
  message: string | null
}