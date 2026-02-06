from pydantic import BaseModel
from datetime import datetime

class NormalizedLog(BaseModel):
    timestamp: datetime
    service: str
    severity: int
    message: str
    trace_id: str | None = None
    latency_ms: int | None = None