from app.schemas.raw_log import RawLogSchema
# from app.schemas.enriched_log import EnrichedLogSchema 
from .normalizer import Normalizer
from .enricher import Enricher
from .anomaly import AnomalyService

class AIPipeline:
    def __init__(self):
        self.norm = Normalizer()
        self.enricher = Enricher()
        self.anom = AnomalyService()

    def process_one(self, log: RawLogSchema) -> dict:
        service = log.service or "unknown"
        template = self.norm.template(log.message)
        sev = self.enricher.severity(log.message)
        cat = self.enricher.category(log.service, log.message)
        entities = self.enricher.extract_entities(log.message)

        s1 = self.anom.score_template(service, template)
        s2 = self.anom.score_latency(service, log.latency_ms)
        score = max(s1, s2)

        reason = "new_template" if s1 >= s2 else "high_latency"

        # update baselines after scoring
        self.anom.update(service, template, log.latency_ms)

        return {
            "timestamp": log.timestamp,
            "service": log.service,
            "trace_id": log.trace_id,
            "message": log.message,
            "normalized_message": template,
            "severity": sev,
            "category": cat,
            "entities": entities,
            "anomaly_score": score,
            "anomaly_reason": reason,
            "model_version": "v1-rules+baseline"
        }
