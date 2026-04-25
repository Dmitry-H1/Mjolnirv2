import os
import json
import time
import uuid
from google.cloud import pubsub_v1, storage

from app.services.legacy_log_service import LegacyLogService
from app.dependencies.dependencies import get_legacy_log_service, get_log_service

PROJECT_ID        = os.getenv("GCP_PROJECT_ID", "mjolnir333")
GCS_SUB_ID        = os.getenv("GCS_SUB_ID", "gcs-log-ingestion-sub")
RAW_LOGS_TOPIC_ID = os.getenv("RAW_LOGS_TOPIC_ID", "raw-logs-topic")

subscriber        = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(PROJECT_ID, GCS_SUB_ID)

publisher           = pubsub_v1.PublisherClient()
raw_logs_topic_path = publisher.topic_path(PROJECT_ID, RAW_LOGS_TOPIC_ID)

storage_client = storage.Client()
legacy_parser  = get_legacy_log_service()
raw_parser     = get_log_service()


def process_gcs_event(event: dict):
    bucket_name = event["bucket"]
    file_name   = event["name"]

    parts = file_name.split("/")
    if len(parts) < 2:
        raise ValueError(f"Unexpected GCS path format: {file_name}")

    user_part = parts[0]
    file_type = parts[1]

    if not user_part.startswith("user_"):
        raise ValueError(f"Invalid user folder: {user_part}")
    user_id = str(uuid.UUID(user_part.replace("user_", "")))

    blob    = storage_client.bucket(bucket_name).blob(file_name)
    content = blob.download_as_bytes()

    if file_type == "legacy_logs":
        parsed_logs = legacy_parser.parse_file(content, file_name)
        raw_logs    = legacy_parser.to_raw_schema(parsed_logs)
    elif file_type == "raw_logs":
        raw_logs = raw_parser.parse_logs_from_file(content, file_name)
    else:
        raise ValueError(f"Unknown file type: {file_type}")

    raw_logs = raw_parser.attach_user_to_logs(raw_logs, user_id)

    print(f"[DEBUG] file_type={file_type} | parsed {len(raw_logs)} logs from {file_name}")

    if not raw_logs:
        print(f"[WARN] No logs parsed from {file_name} — skipping publish")
        return

    payload = {
        "ingestion_id": str(uuid.uuid4()),
        "bucket":       bucket_name,
        "object":       file_name,
        "logs":         [x.model_dump_json() for x in raw_logs],
    }

    publisher.publish(
        raw_logs_topic_path,
        json.dumps(payload).encode("utf-8")
    ).result()

    print(f"Published {len(raw_logs)} logs from gs://{bucket_name}/{file_name} → {RAW_LOGS_TOPIC_ID}")


def callback(message: pubsub_v1.subscriber.message.Message):
    try:
        payload = json.loads(message.data.decode("utf-8"))

        if "bucket" in payload and ("name" in payload or "object" in payload):
            if "object" in payload and "name" not in payload:
                payload["name"] = payload["object"]

            process_gcs_event(payload)
            message.ack()
        else:
            print("[WARN] Unknown message format:", payload)
            message.ack()

    except (FileNotFoundError, ValueError) as e:
        print(f"[ERROR] Permanent failure in Worker A: {e}")
        message.ack()

    except Exception as e:
        print(f"[ERROR] Transient failure in Worker A: {e}")
        message.nack()


subscriber.subscribe(subscription_path, callback=callback)
print(f"Worker A listening on {subscription_path}")

while True:
    time.sleep(60)