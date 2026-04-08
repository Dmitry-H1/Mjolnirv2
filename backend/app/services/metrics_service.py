import random
from datetime import datetime
from uuid import UUID

from app.repositories.log_repository import LogRepository


class MetricsService:

    def __init__(self, repository: LogRepository):
        self.repository = repository


    def get_metrics(self, user_id: UUID):

        rows = self.repository.get_metrics_rows(str(user_id))
        source_rows = self.repository.get_source_object_counts(str(user_id))

        start = datetime(2026, 2, 1).timestamp() * 1000
        end = datetime(2026, 2, 28, 23, 59, 59).timestamp() * 1000

        count_series = []
        score_series = []

        SAMPLE_RATE = 0.05
        bucket_size = 1000 * 60 * 60 * 6

        bucket_map = {}

        for row in rows:

            if random.random() > SAMPLE_RATE:
                continue

            fake_ts = start + random.random() * (end - start)

            bucket = int(fake_ts // bucket_size) * bucket_size
            bucket_map[bucket] = bucket_map.get(bucket, 0) + 1

            is_error = random.random() < 0.3

            fake_score = (
                round(0.1 + random.random() * 0.7, 3)
                if is_error
                else round(random.random() * 0.08, 3)
            )

            score_series.append([fake_ts, fake_score])

        for ts, count in bucket_map.items():
            count_series.append([ts, count])

        count_series.sort()
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