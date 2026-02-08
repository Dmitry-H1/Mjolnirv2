from fastapi import Depends
from grpc import services
from services.log_service import LogService
from services.legacy_log_service import LegacyLogService

def get_log_service() -> LogService:
    """
    Dependency that returns an initialized LogService.
    Can be extended later to include configuration, DB clients, etc.
    """
    return LogService(allowed_types=["csv", "txt", "json", "ndjson", "log"])

def get_legacy_log_service() -> LegacyLogService:
    return LegacyLogService()