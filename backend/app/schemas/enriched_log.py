from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any


class EnrichedLog(BaseModel):
    log_id: Optional[str] = Field(default=None)
    ingestion_id: Optional[str] = Field(default=None)
    
    inserted_at: Optional[datetime] = Field(default=None)
    event_time: Optional[datetime] = Field(default=None)
    
    service: Optional[str] = Field(default=None)
    user_ingest_service: Optional[str] = Field(default=None)

    message: str = Field(...)
    normalized_message: Optional[str] = Field(default=None)
    
    severity: Optional[str] = Field(default=None)
    category: Optional[str] = Field(default=None)
    
    anomaly_score: Optional[float] = Field(default=None)
    anomaly_reason: Optional[str] = Field(default=None)
    
    source_bucket: Optional[str] = Field(default=None)
    source_object: Optional[str] = Field(default=None)
    
    entities: Optional[Dict[str, Any]] = Field(default=None)

    user_id: Optional[str] = Field(None)
