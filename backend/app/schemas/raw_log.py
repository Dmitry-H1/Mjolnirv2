from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Any

class RawLogSchema(BaseModel):
    """
    Schema for raw logs, either uploaded from a client or parsed from historical files.
    These logs may be incomplete or unstructured; the AI/parser will normalize them.
    """
    timestamp: Optional[datetime] = Field(None, description="Time the log was generated, if available")
    service: Optional[str] = Field(None, description="Name of the service that produced the log, if known")
    message: str = Field(..., description="Raw log message text")
    trace_id: Optional[str] = Field(None, description="Optional trace ID for request tracing")
    latency_ms: Optional[int] = Field(None, description="Optional latency in milliseconds")
    raw_payload: Optional[Any] = Field(None, description="Full original log or extra fields")