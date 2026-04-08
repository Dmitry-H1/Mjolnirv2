export type SessionUser = {
  id: string;
  username: string;
  role: string;
};

export type MetricPoint = [number, number];

export type DashboardMetricsResponse = {
  countSeries: MetricPoint[];
  scoreSeries: MetricPoint[];
  sourceObjectSeries: {
    categories: string[];
    data: number[];
  };
};

export type LogRecord = {
  id: string;
  event_time: string | null;
  service: string | null;
  severity: string | null;
  normalized_message: string | null;
  message: string | null;
  anomaly_reason?: string | null;
  anomaly_score: number | null;
};

export type LogListResponse = {
  rows: LogRecord[];
  nextCursor: string | null;
};
