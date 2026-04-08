import re
import uuid
import joblib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sklearn.pipeline import Pipeline

from app.schemas.raw_log import RawLogSchema
from app.schemas.enriched_log import EnrichedLog
from app.core.constants import SEVERITY_PATTERNS


class LogEnrichmentService:

    def __init__(self, category_model_path: str = "ai/ml/category_model.pkl", severity_model_path: str = "ai/ml/severity_model.pkl",):

        self.category_model: Pipeline = None#joblib.load(category_model_path)
        self.severity_model: Pipeline = None#joblib.load(severity_model_path)


    def enrich_logs(self, raw_logs: List[RawLogSchema]) -> List[EnrichedLog]:

        if not raw_logs:
            return []

        enriched_logs: List[EnrichedLog] = []

        for log in raw_logs:
            enriched_logs.append(self.enrich(log))

        return enriched_logs

        

    def enrich(self, raw: RawLogSchema) -> EnrichedLog:

        enriched = EnrichedLog(message=raw.message)

        # Core metadata
        enriched.ingestion_id = str(uuid.uuid4())
        enriched.inserted_at = datetime.now(timezone.utc)
        enriched.event_time = raw.timestamp

        enriched.service = raw.service
        enriched.trace_id = raw.trace_id
        enriched.user_id = raw.user_id

        # Normalize message
        enriched.normalized_message = self.normalize_message(raw.message)

        # Severity
        if raw.severity and raw.severity.upper() in SEVERITY_PATTERNS.keys():
            enriched.severity = raw.severity.upper()
        else:
            enriched.severity = self.infer_severity(raw.message)

        # Category
        enriched.category = self.infer_category(enriched.normalized_message)

        #
        # ANOMALY DETECTION LATER
        #

        # Entity extraction
        enriched.entities = self.extract_entities(raw.message)

        enriched.model_version = "v1.0" # EXAMPLE???

        return enriched


    def normalize_message(self, message: str) -> str:

        message = message.lower()

        message = re.sub(r'\d+', '<NUM>', message)
        message = re.sub(r'[a-f0-9]{8,}', '<HEX>', message)
        message = re.sub(r'\s+', ' ', message)

        return message.strip()


    def infer_severity(self, message: str) -> str:

        msg = message.lower()

        # Regex-based severity first
        for severity, patterns in SEVERITY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, msg):
                    return severity

        # Optional: ML fallback
        if self.severity_model:
            return self.severity_model.predict([message])[0]

        # Default if nothing found
        return "INFO"



    def infer_category(self, normalized_message: str) -> Optional[str]:

        if self.category_model:
            return self.category_model.predict([normalized_message])[0]

        if "timeout" in normalized_message:
            return "network"

        if "database" in normalized_message:
            return "database"

        if "auth" in normalized_message:
            return "authentication"

        return "application"



    def extract_entities(self, message: str) -> Dict[str, Any]:

        return {}

