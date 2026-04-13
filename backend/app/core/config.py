from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    api_key: str
    gcp_project_id: str
    gcp_bucket: str
    gcs_sub_id: str
    raw_logs_topic_id: str
    raw_logs_sub_id: str
    bq_dataset: str
    bq_table: str
    bq_users_table: str

    jwt_secret_key: str
    jwt_algorithm: str
    jwt_access_expire_min: str
    jwt_refresh_expire_days: str

    slack_client_id: str = ""
    slack_client_secret: str = ""
    slack_redirect_uri: str = ""
    frontend_url: str = "http://localhost:3000"

    class Config:   
        env_file = BASE_DIR / ".env"  

settings = Settings()