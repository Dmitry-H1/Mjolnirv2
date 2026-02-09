from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    api_key: str

    class Config:
        env_file = BASE_DIR / ".env"  

settings = Settings()