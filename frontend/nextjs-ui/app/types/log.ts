export type Severity = 'INFO' | 'WARN' | 'ERROR'

export interface LogRow {
  event_time: string
  service: string
  severity: Severity
  normalized_message: string
  anomaly_score: number
  anomaly_reason: string
}