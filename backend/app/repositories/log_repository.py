from google.cloud import bigquery

class LogRepository:

    def __init__(self, client: bigquery.Client, project: str, dataset: str, table: str):
        self.client = client
        self.project = project
        self.dataset = dataset
        self.table = table


    def get_logs(self, cursor: str | None):

        where_clause = ""
        params = []

        if cursor:
            where_clause = "WHERE inserted_at < @cursor"
            params.append(
                bigquery.ScalarQueryParameter("cursor", "TIMESTAMP", cursor)
            )

        query = f"""
        SELECT
            ingestion_id AS id,
            inserted_at AS event_time,
            service,
            severity,
            normalized_message,
            message,
            anomaly_reason,
            anomaly_score
        FROM `{self.project}.{self.dataset}.{self.table}`
        {where_clause}
        ORDER BY inserted_at DESC
        LIMIT 100
        """

        job_config = bigquery.QueryJobConfig(query_parameters=params)

        job = self.client.query(query, job_config=job_config)

        return [dict(row) for row in job.result()]
    

    def get_log_by_id(self, log_id: str):

        query = f"""
            SELECT
                ingestion_id AS id,
                inserted_at AS event_time,
                service,
                severity,
                normalized_message,
                message,
                anomaly_reason,
                anomaly_score
            FROM `{self.project}.{self.dataset}.{self.table}`
            WHERE ingestion_id = @id
            LIMIT 1
        """

        params = [
            bigquery.ScalarQueryParameter("id", "STRING", log_id)
        ]

        job_config = bigquery.QueryJobConfig(query_parameters=params)

        job = self.client.query(query, job_config=job_config)

        rows = [dict(row) for row in job.result()]

        if not rows:
            return None

        return rows[0]
    

    def get_metrics_rows(self):

        query = f"""
            SELECT
                inserted_at,
                anomaly_score
            FROM `{self.project}.{self.dataset}.{self.table}`
            WHERE inserted_at > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
            ORDER BY inserted_at
        """

        job = self.client.query(query)

        return [dict(row) for row in job.result()]
    

    def get_source_object_counts(self):

        query = f"""
            SELECT
                source_object,
                COUNT(*) AS count
            FROM `{self.project}.{self.dataset}.{self.table}`
            GROUP BY source_object
            ORDER BY count DESC
            LIMIT 10
        """

        job = self.client.query(query)

        return [dict(row) for row in job.result()]