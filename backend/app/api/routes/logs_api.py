from fastapi import APIRouter, UploadFile, Depends, File
from typing import List, Union
from schemas.raw_log import RawLogSchema
from services.log_service import LogService
from services.legacy_log_service import LegacyLogService
from dependencies.service_dependencies import get_legacy_log_ai_service, get_log_service, get_legacy_log_service
from typing import Annotated
from ai.legacy_log_ai_service import LegacyLogAiService

router = APIRouter()

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

    for log in validated_logs:
        print(f"[{log.timestamp}]: {log.message}")

    return {"status": "success", "count": len(validated_logs)}


# Endpoint for file uploads
@router.post("/upload")
async def upload_logs(
    log_service: Annotated[LogService, Depends(get_log_service)],
    file: UploadFile = File(..., description="The log file to upload")
):
    print(file.filename)
    # Read the file contents
    contents = await file.read()
    
    try:
        validated_logs = log_service.parse_logs_from_file(contents, file.filename)
    except ValueError as e:
        return {"error": str(e)}

    for log in validated_logs:
        print(f"[{log.timestamp}]: {log.message}")

    return {"status": "success", "count": len(validated_logs)}


# legacy file with logs
@router.post("/upload/legacy")
async def upload_legacy_file(
    legacy_log_service: Annotated[LegacyLogService, Depends(get_legacy_log_service)],
    file: UploadFile = File(..., description="Legacy log file to upload")
):
    """
    Upload a legacy log file and parse it into the new RawLogSchema.
    """
    contents = await file.read()
    parsed_dicts = legacy_log_service.parse_file(contents, file.filename)
    validated_logs = legacy_log_service.to_raw_schema(parsed_dicts)

    #for log in validated_logs:
    #    print(f"[{log.timestamp}]: {log.message}")

    return {"status": "success", "logs": validated_logs}



'''@router.post("/ai")
async def extraxt_with_ai(
    service: Annotated[LegacyLogAiService, Depends(get_legacy_log_ai_service)],
    file: UploadFile = File(..., description="The log file to upload")
):
    
    
    content = await file.read()
    decoded = content.decode("utf-8", errors="ignore")
    lines = [line for line in decoded.splitlines() if line.strip()]

    return service.extract_structure(lines)'''
    

