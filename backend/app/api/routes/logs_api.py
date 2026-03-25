from fastapi import APIRouter, UploadFile, Depends, File, HTTPException
from typing import List, Union
from schemas.raw_log import RawLogSchema
from services.log_service import LogService
from services.legacy_log_service import LegacyLogService
from services.log_enrichment_service import LogEnrichmentService
from dependencies.dependencies import get_log_query_service, get_log_ingestion_service, get_log_service, get_legacy_log_service, get_log_enrichment_service
from typing import Annotated
from ai.llm.legacy_log_ai_service import LegacyLogAiService
from core.config import settings
from services.log_query_service import LogQueryService
from dependencies.auth_dependencies import get_current_user
from models.user import User

router = APIRouter()
ingestion_service = get_log_ingestion_service()


# Endpoint for direct log ingestion
@router.post("/ingest")
async def ingest_logs(
    logs: Union[RawLogSchema, List[RawLogSchema], List[dict]],
    log_service: Annotated[LogService, Depends(get_log_service)],
    user: User = Depends(get_current_user)
):
    # Normalize single log into a list
    if isinstance(logs, (RawLogSchema, dict)):
        logs = [logs]

    validated_logs = log_service.parse_logs(logs)
    validated_logs = log_service.attach_user_to_logs(validated_logs, user.id)

    ingestion_service.publish_logs(validated_logs, settings.raw_logs_topic_id)

    return {"status": "success", "count": len(validated_logs)}


@router.post("/upload")
async def upload_logs(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    contents = await file.read()
    path = ingestion_service.upload_file(contents, file.filename, file_type="raw_logs", user_id=user.id)
    return {"status": "uploaded", "path": path}


@router.post("/upload/legacy")
async def upload_legacy_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    contents = await file.read()
    path = ingestion_service.upload_file(contents, file.filename, file_type="legacy_logs", user_id=user.id)
    return {"status": "uploaded", "path": path}


@router.get("")
def get_logs(cursor: str | None = None,
             service: LogQueryService = Depends(get_log_query_service)):

    rows, next_cursor = service.get_logs(cursor)

    return {
        "rows": rows,
        "nextCursor": next_cursor
    }

@router.get("/{log_id}")
def get_log_by_id(
    log_id: str,
    service: LogQueryService = Depends(get_log_query_service)
):

    log = service.get_log_by_id(log_id)

    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    return log