from app.ai.llm.legacy_log_ai_service import LegacyLogAiService
from app.services.metrics_service import MetricsService
from app.services.log_service import LogService
from app.services.legacy_log_service import LegacyLogService
from app.services.log_ingestion_service import LogIngestionService
from app.services.log_enrichment_service import LogEnrichmentService
from app.ai.llm.ai_client import AiClient
from app.core.config import settings
from google.cloud import bigquery
from app.repositories.log_repository import LogRepository
from app.services.log_query_service import LogQueryService

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


# BigQuery stack
bigquery_client = bigquery.Client()

log_repository = LogRepository(
    bigquery_client,
    settings.gcp_project_id,
    settings.bq_dataset,
    settings.bq_table,
)

log_query_service = LogQueryService(log_repository)
metrics_service = MetricsService(log_repository)

def get_log_query_service():
    return log_query_service

def get_metrics_service():
    return metrics_service



