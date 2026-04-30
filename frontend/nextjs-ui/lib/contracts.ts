export interface User {
  id: string;
  username: string;
  email?: string;
  role: string;
}

export interface Log {
  log_id?: string;
  ingestion_id?: string;
  inserted_at?: string;
  event_time?: string;
  service?: string;
  user_ingest_service?: string;
  message: string;
  normalized_message?: string;
  severity?: string;
  category?: string;
  anomaly_score?: number;
  anomaly_reason?: string;
  source_bucket?: string;
  source_object?: string;
  entities?: Record<string, unknown>;
  user_id?: string;
}

export interface LogsResponse {
  rows: Log[];
  nextCursor: string | null;
}

export interface MetricsData {
  countSeries: [number, number][];
  scoreSeries: [number, number, string?][];
  sourceObjectSeries: {
    categories: string[];
    data: number[];
  };
}
