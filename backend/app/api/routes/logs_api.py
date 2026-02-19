from fastapi import APIRouter, UploadFile, Depends, File
from typing import List, Union
from schemas.raw_log import RawLogSchema
from services.log_service import LogService
from services.legacy_log_service import LegacyLogService
from services.log_enrichment_service import LogEnrichmentService
from dependencies.service_dependencies import get_log_ingestion_service, get_log_service, get_legacy_log_service, get_log_enrichment_service
from typing import Annotated
from ai.llm.legacy_log_ai_service import LegacyLogAiService
from core.config import settings

router = APIRouter()
ingestion_service = get_log_ingestion_service()


# Endpoint for direct log ingestion
@router.post("/ingest")
async def ingest_logs(
    logs: Union[RawLogSchema, List[RawLogSchema], List[dict]],
    log_service: Annotated[LogService, Depends(get_log_service)]
):
    # Normalize single log into a list
    if isinstance(logs, (RawLogSchema, dict)):
        logs = [logs]

    validated_logs = log_service.parse_logs(logs)

    ingestion_service.publish_logs(validated_logs, settings.raw_logs_topic_id)

    return {"status": "success", "count": len(validated_logs)}


@router.post("/upload")
async def upload_logs(file: UploadFile = File(...)):
    contents = await file.read()
    path = ingestion_service.upload_file(contents, file.filename, file_type="raw_logs")
    return {"status": "uploaded", "path": path}


@router.post("/upload/legacy")
async def upload_legacy_file(file: UploadFile = File(...)):
    contents = await file.read()
    path = ingestion_service.upload_file(contents, file.filename, file_type="legacy_logs")
    return {"status": "uploaded", "path": path}



'''@router.post("/ai")
async def extraxt_with_ai(
    service: Annotated[LegacyLogAiService, Depends(get_legacy_log_ai_service)],
    file: UploadFile = File(..., description="The log file to upload")
):
    
    
    content = await file.read()
    decoded = content.decode("utf-8", errors="ignore")
    lines = [line for line in decoded.splitlines() if line.strip()]

    return service.extract_structure(lines)'''
    