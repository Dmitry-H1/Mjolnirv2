from fastapi import Depends
from grpc import services
from ai.llm.legacy_log_ai_service import LegacyLogAiService
from services.log_service import LogService
from services.legacy_log_service import LegacyLogService
from services.log_ingestion_service import LogIngestionService
from services.log_enrichment_service import LogEnrichmentService
from ai.llm.ai_client import AiClient
from core.config import settings

# Shared AI client (created once)
ai_client = AiClient(
    api_key=settings.api_key,
    model="gemini-2.5-flash",
)


# Initialize for every request to not reload models every time
log_enrichment_service = LogEnrichmentService(
    category_model_path="ai/ml/category_model.pkl",
    severity_model_path="ai/ml/severity_model.pkl",
)

def get_log_enrichment_service() -> LogEnrichmentService:
    return log_enrichment_service

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


log_ingestion_service = LogIngestionService(settings.gcp_project_id, settings.gcp_bucket)

# Dependency injection in FastAPI
def get_log_ingestion_service() -> LogIngestionService:
    return log_ingestion_service