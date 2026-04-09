export interface User {
  id: string;
  username: string;
  role: string;
}

export interface Log {
  id?: string;          // backend aliases ingestion_id → id
  ingestion_id?: string;
  inserted_at?: string;
  event_time?: string;
  service?: string;
  trace_id?: string;
  message: string;
  normalized_message?: string;
  severity?: string;
  category?: string;
  anomaly_score?: number;
  anomaly_reason?: string;
  model_version?: string;
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
  scoreSeries: [number, number][];
  sourceObjectSeries: {
    categories: string[];
    data: number[];
  };
}
