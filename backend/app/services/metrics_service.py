from uuid import UUID

from app.repositories.log_repository import LogRepository


class MetricsService:

    def __init__(self, repository: LogRepository):
        self.repository = repository

    def get_metrics(self, user_id: UUID):
        rows = self.repository.get_metrics_rows(str(user_id))
        source_rows = self.repository.get_source_object_counts(str(user_id))

        bucket_size = 1000 * 60 * 30  # 30-minute buckets in ms
        bucket_map = {}
        score_series = []

        for row in rows:
            inserted_at = row.get("inserted_at")
            anomaly_score = row.get("anomaly_score")

            if inserted_at is None:
                continue

            ts = int(inserted_at.timestamp() * 1000)

            bucket = int(ts // bucket_size) * bucket_size
            bucket_map[bucket] = bucket_map.get(bucket, 0) + 1

            if anomaly_score is not None:
                score_series.append([ts, float(anomaly_score), row.get("log_id")])

        count_series = sorted([ts, count] for ts, count in bucket_map.items())
        score_series.sort()

        source_categories = []
        source_data = []
        for row in source_rows:
            source_categories.append(row["source_object"])
            source_data.append(int(row["count"]))

        return {
            "countSeries": count_series,
            "scoreSeries": score_series,
            "sourceObjectSeries": {
                "categories": source_categories,
                "data": source_data,
            },
        }