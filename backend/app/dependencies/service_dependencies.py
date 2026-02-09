from fastapi import Depends
from grpc import services
from ai.legacy_log_ai_service import LegacyLogAiService
from services.log_service import LogService
from services.legacy_log_service import LegacyLogService
from ai.ai_client import AiClient
from core.config import settings

# Shared AI client (created once)
ai_client = AiClient(
    api_key=settings.api_key,
    model="gemini-2.5-flash",
)




def get_log_service() -> LogService:
    """
    Dependency that returns an initialized LogService.
    Can be extended later to include configuration, DB clients, etc.
    """
    return LogService(allowed_types=["csv", "txt", "json", "ndjson", "log"])

def get_legacy_log_service() -> LegacyLogService:
    ai_service = get_legacy_log_ai_service()
    return LegacyLogService(ai_service)

def get_legacy_log_ai_service() -> LegacyLogAiService:
    return LegacyLogAiService(ai_client)