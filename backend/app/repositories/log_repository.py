from google.cloud import bigquery

class LogRepository:

    def __init__(self, client: bigquery.Client, project: str, dataset: str, table: str):
        self.client = client
        self.project = project
        self.dataset = dataset
        self.table = table


    def get_logs(self, cursor: str | None, user_id: str):
        where_clause = "WHERE user_id = @user_id"
        params = [
            bigquery.ScalarQueryParameter("user_id", "STRING", user_id)
        ]

        if cursor:
            where_clause += " AND inserted_at < @cursor"
            params.append(
                bigquery.ScalarQueryParameter("cursor", "TIMESTAMP", cursor)
            )

        query = f"""
        SELECT
            log_id,
            ingestion_id,
            inserted_at AS event_time,
            service,
            severity,
            normalized_message,
            category,
            message,
            anomaly_reason,
            anomaly_score,
            user_id
        FROM `{self.project}.{self.dataset}.{self.table}`
        {where_clause}
        ORDER BY inserted_at DESC
        LIMIT 100
        """

        job_config = bigquery.QueryJobConfig(query_parameters=params)
        job = self.client.query(query, job_config=job_config)

        return [dict(row) for row in job.result()]
    

    def get_log_by_id(self, log_id: str, user_id: str):
        query = f"""
            SELECT
                log_id,
                ingestion_id,
                inserted_at AS event_time,
                service,
                severity,
                normalized_message,
                category,
                message,
                anomaly_reason,
                anomaly_score,
                user_id
            FROM `{self.project}.{self.dataset}.{self.table}`
            WHERE log_id = @id AND user_id = @user_id
            LIMIT 1
        """

        params = [
            bigquery.ScalarQueryParameter("id", "STRING", log_id),
            bigquery.ScalarQueryParameter("user_id", "STRING", user_id)
        ]

        job_config = bigquery.QueryJobConfig(query_parameters=params)
        job = self.client.query(query, job_config=job_config)

        rows = [dict(row) for row in job.result()]

        if not rows:
            return None

        return rows[0]
    

    def get_metrics_rows(self, user_id: str):

        query = f"""
            SELECT
                log_id,
                inserted_at,
                anomaly_score
            FROM `{self.project}.{self.dataset}.{self.table}`
            WHERE user_id = @user_id
            AND inserted_at > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
            ORDER BY inserted_at
        """

        params = [
            bigquery.ScalarQueryParameter("user_id", "STRING", user_id)
        ]

        job_config = bigquery.QueryJobConfig(query_parameters=params)
        job = self.client.query(query, job_config=job_config)

        return [dict(row) for row in job.result()]
    

    def get_source_object_counts(self, user_id: str):

        query = f"""
            SELECT
                source_object,
                COUNT(*) AS count
            FROM `{self.project}.{self.dataset}.{self.table}`
            WHERE user_id = @user_id
            GROUP BY source_object
            ORDER BY count DESC
            LIMIT 10
        """

        params = [
            bigquery.ScalarQueryParameter("user_id", "STRING", user_id)
        ]

        job_config = bigquery.QueryJobConfig(query_parameters=params)
        job = self.client.query(query, job_config=job_config)

        return [dict(row) for row in job.result()]