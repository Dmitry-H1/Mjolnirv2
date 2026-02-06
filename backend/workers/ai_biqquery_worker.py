import os
import json
import uuid
from datetime import datetime, timezone
from google.cloud import pubsub_v1, bigquery

from app.schemas.raw_log import RawLogSchema
from app.services.ai.pipeline import AIPipeline

PROJECT_ID = os.getenv("GCP_PROJECT_ID", "mjolnir333")
SUBSCRIPTION_ID = os.getenv("RAW_LOGS_SUB_ID", "raw-logs-sub")

BQ_DATASET = os.getenv("BQ_DATASET", "mjolnir_logs")
BQ_TABLE = os.getenv("BQ_TABLE", "enriched_logs")

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(PROJECT_ID, SUBSCRIPTION_ID)

bq = bigquery.Client(project=PROJECT_ID)
ai = AIPipeline()

def to_bq_row(enriched: dict, meta: dict) -> dict:
    # bigquery takes ISO strings for timestamps in insert_rows_json
    return {
        "ingestion_id": meta["ingestion_id"],
        "event_time": enriched["timestamp"].isoformat() if enriched.get("timestamp") else None,
        "service": enriched.get("service"),
        "trace_id": enriched.get("trace_id"),
        "message": enriched["message"],
        "normalized_message": enriched.get("normalized_message"),
        "severity": enriched.get("severity"),
        "category": enriched.get("category"),
        "entities": enriched.get("entities"),  # JSON column supports dict
        "anomaly_score": enriched.get("anomaly_score"),
        "anomaly_reason": enriched.get("anomaly_reason"),
        "source_bucket": meta.get("bucket"),
        "source_object": meta.get("object"),
        "model_version": enriched.get("model_version"),
        "inserted_at": datetime.now(timezone.utc).isoformat(),
    }

def insert_batch(rows: list[dict]) -> None:
    table_id = f"{PROJECT_ID}.{BQ_DATASET}.{BQ_TABLE}"
    errors = bq.insert_rows_json(table_id, rows)
    if errors:
        raise RuntimeError(f"BigQuery insert errors: {errors}")

def callback(message: pubsub_v1.subscriber.message.Message):
    try:
        payload = json.loads(message.data.decode("utf-8"))

        # expected result:
        # { "bucket": "...", "object": "...", "logs": [ {rawlog...}, ... ] }
        meta = {
            "ingestion_id": payload.get("ingestion_id") or str(uuid.uuid4()),
            "bucket": payload.get("bucket"),
            "object": payload.get("object"),
        }

        logs = [RawLogSchema(**x) for x in payload["logs"]]

        enriched_rows = []
        for log in logs:
            enriched = ai.process_one(log)  # returns dict from AIPipeline
            enriched_rows.append(to_bq_row(enriched, meta))

        insert_batch(enriched_rows)

        message.ack()
        print(f"Inserted {len(enriched_rows)} rows into BigQuery.")

    except Exception as e:
        print("AI/BQ worker error:", e)
        message.nack()

subscriber.subscribe(subscription_path, callback=callback)
print(f"AI/BQ worker listening on {subscription_path}")

# runs process
import time
while True:
    time.sleep(60)
