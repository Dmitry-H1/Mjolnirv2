from google.cloud import bigquery
from typing import List, Optional, Dict

class UserRepository:

    def __init__(self, client: bigquery.Client, project: str, dataset: str, table: str):
        self.client = client
        self.project = project
        self.dataset = dataset
        self.table = table

    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        query = f"""
            SELECT
                user_id,
                username,
                password,
                role,
                slack_webhook_url
            FROM `{self.project}.{self.dataset}.{self.table}`
            WHERE user_id = @user_id
            LIMIT 1
        """
        params = [
            bigquery.ScalarQueryParameter("user_id", "STRING", user_id)
        ]
        job_config = bigquery.QueryJobConfig(query_parameters=params)
        job = self.client.query(query, job_config=job_config)
        rows = [dict(row) for row in job.result()]
        return rows[0] if rows else None

    def get_user_by_username(self, username: str) -> Optional[Dict]:
        query = f"""
            SELECT
                user_id,
                username,
                password,
                role,
                slack_webhook_url
            FROM `{self.project}.{self.dataset}.{self.table}`
            WHERE username = @username
            LIMIT 1
        """
        params = [
            bigquery.ScalarQueryParameter("username", "STRING", username)
        ]
        job_config = bigquery.QueryJobConfig(query_parameters=params)
        job = self.client.query(query, job_config=job_config)
        rows = [dict(row) for row in job.result()]
        return rows[0] if rows else None

    def get_all_users(self) -> List[Dict]:
        query = f"""
            SELECT
                user_id,
                username,
                password,
                role,
                slack_webhook_url
            FROM `{self.project}.{self.dataset}.{self.table}`
            ORDER BY username
        """
        job = self.client.query(query)
        return [dict(row) for row in job.result()]
    

    def insert_user(self, user: Dict) -> None:
        query = f"""
            INSERT INTO `{self.project}.{self.dataset}.{self.table}` (user_id, username, password, role, slack_webhook_url)
            VALUES (@user_id, @username, @password, @role, @slack_webhook_url)
        """
        params = [
            bigquery.ScalarQueryParameter("user_id", "STRING", user["user_id"]),
            bigquery.ScalarQueryParameter("username", "STRING", user["username"]),
            bigquery.ScalarQueryParameter("password", "STRING", user["password"]),
            bigquery.ScalarQueryParameter("role", "STRING", user["role"]),
            bigquery.ScalarQueryParameter("slack_webhook_url", "STRING", user.get("slack_webhook_url")),
        ]
        job_config = bigquery.QueryJobConfig(query_parameters=params)
        self.client.query(query, job_config=job_config).result()  # wait for completion

    def update_slack_webhook(self, user_id: str, webhook_url: Optional[str]) -> None:
        query = f"""
            UPDATE `{self.project}.{self.dataset}.{self.table}`
            SET slack_webhook_url = @slack_webhook_url
            WHERE user_id = @user_id
        """
        params = [
            bigquery.ScalarQueryParameter("user_id", "STRING", user_id),
            bigquery.ScalarQueryParameter("slack_webhook_url", "STRING", webhook_url),
        ]
        job_config = bigquery.QueryJobConfig(query_parameters=params)
        self.client.query(query, job_config=job_config).result()