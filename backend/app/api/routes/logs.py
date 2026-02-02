from fastapi import APIRouter, UploadFile
from typing import List, Union
from schemas.raw_log import RawLogSchema

router = APIRouter()

@router.post("")
async def ingest_logs(logs: Union[RawLogSchema, List[RawLogSchema]]):
    # Normalize single log into list
    if isinstance(logs, RawLogSchema):
        logs = [logs]
    
    # Process logs 
    for log in logs:
        print(f"[{log.timestamp}]: {log.message}")
    
    return {"status": "success", "count": len(logs)}

# File upload
@router.post("/upload")
async def upload_logs(file: UploadFile):
    contents = await file.read()
    # parse JSON/CSV, then validate with RawLogSchema
    return {"filename": file.filename}