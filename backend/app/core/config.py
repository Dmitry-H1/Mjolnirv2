from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    api_key: str
    gcp_project_id: str
    gcs_sub_id: str
    raw_logs_topic_id: str
    raw_logs_sub_id: str
    bq_dataset: str
    bq_table: str
    class Config:
        env_file = BASE_DIR / ".env"  

settings = Settings()