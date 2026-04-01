import os
import json
import uuid
import time
from datetime import datetime, timezone
from typing import Optional

from google.cloud import pubsub_v1, bigquery

from schemas.raw_log import RawLogSchema
from services.log_enrichment_service import LogEnrichmentService
from services.anomaly_detection_service import AnomalyDetectionService


PROJECT_ID = os.getenv("GCP_PROJECT_ID", "mjolnir333")
SUBSCRIPTION_ID = os.getenv("RAW_LOGS_SUB_ID", "raw-logs-sub")

BQ_DATASET = os.getenv("BQ_DATASET", "mjolnir_logs")
BQ_TABLE = os.getenv("BQ_TABLE", "enriched_logs")


subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(PROJECT_ID, SUBSCRIPTION_ID)

bq = bigquery.Client(project=PROJECT_ID)
enricher = LogEnrichmentService()
anomaly_detector = AnomalyDetectionService(bq_client=bq, project_id=PROJECT_ID)


def to_bq_row(enriched_obj, meta: dict, score: float, reason: str) -> dict:
    data = enriched_obj.model_dump() if hasattr(enriched_obj, "model_dump") else enriched_obj.dict()

    entities_obj = data.get("entities") or {}
    if hasattr(entities_obj, "model_dump"):
        entities_obj = entities_obj.model_dump()
    elif hasattr(entities_obj, "dict"):
        entities_obj = entities_obj.dict()

    entities = json.dumps(entities_obj, ensure_ascii=False)

    event_time = data.get("event_time") or data.get("timestamp")
    if hasattr(event_time, "isoformat"):
        event_time = event_time.isoformat()

    return {
        "ingestion_id": meta["ingestion_id"],
        "event_time": event_time,
        "service": data.get("service"),
        "trace_id": data.get("trace_id"),
        "message": data.get("message"),
        "normalized_message": data.get("normalized_message"),
        "severity": data.get("severity"),
        "category": data.get("category"),
        "entities": entities,
        "anomaly_score": score,
        "anomaly_reason": reason,
        "source_bucket": meta.get("bucket"),
        "source_object": meta.get("object"),
        "model_version": data.get("model_version"),
        "inserted_at": datetime.now(timezone.utc).isoformat(),
        "user_id": data.get("user_id")
    }


def insert_batch(rows: list[dict]) -> None:
    table_id = f"{PROJECT_ID}.{BQ_DATASET}.{BQ_TABLE}"
    errors = bq.insert_rows_json(table_id, rows)
    if errors:
        raise RuntimeError(f"BigQuery insert errors: {errors}")


def callback(message: pubsub_v1.subscriber.message.Message):
    try:
        payload = json.loads(message.data.decode("utf-8"))
        meta = {
            "ingestion_id": payload.get("ingestion_id") or str(uuid.uuid4()),
            "bucket": payload.get("bucket"),
            "object": payload.get("object"),
        }

        raw_logs = [RawLogSchema(**(json.loads(x) if isinstance(x, str) else x)) for x in payload["logs"]]
        enriched_logs = enricher.enrich_logs(raw_logs)

        rows: list[dict] = []
        for raw, enriched_obj in zip(raw_logs, enriched_logs):
            latency_ms = getattr(raw, "latency_ms", None)

            score, reason = anomaly_detector.score(
                service=getattr(enriched_obj, "service", None),
                normalized_message=getattr(enriched_obj, "normalized_message", None),
                severity=getattr(enriched_obj, "severity", None),
                latency_ms=latency_ms,
            )

            rows.append(to_bq_row(enriched_obj, meta, score, reason))

        insert_batch(rows)
        message.ack()
        print(f"Inserted {len(rows)} rows into BigQuery.")

    except Exception as e:
        print("Worker B error:", e)
        message.nack()


subscriber.subscribe(subscription_path, callback=callback)
print(f"Worker B listening on {subscription_path}")

while True:
    time.sleep(60)