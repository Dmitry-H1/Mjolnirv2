import os
import json
import time
import uuid
import threading
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List

from google.cloud import pubsub_v1, storage

from app.dependencies.dependencies import get_legacy_log_service, get_log_service

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_ID        = os.getenv("GCP_PROJECT_ID", "mjolnir333")
GCS_SUB_ID        = os.getenv("GCS_SUB_ID", "gcs-log-ingestion-sub")
RAW_LOGS_TOPIC_ID = os.getenv("RAW_LOGS_TOPIC_ID", "raw-logs-topic")
ARCHIVE_SUB_ID    = os.getenv("RAW_LOGS_ARCHIVE_SUB_ID", "raw-logs-archive-sub")
GCS_BUCKET        = os.getenv("GCP_BUCKET", "mjolnir333")
FLUSH_SECONDS     = int(os.getenv("ARCHIVE_FLUSH_SECONDS", str(2 * 60)))

# ── Clients ───────────────────────────────────────────────────────────────────
subscriber            = pubsub_v1.SubscriberClient()
publisher             = pubsub_v1.PublisherClient()
storage_client        = storage.Client()

subscription_path     = subscriber.subscription_path(PROJECT_ID, GCS_SUB_ID)
archive_sub_path      = subscriber.subscription_path(PROJECT_ID, ARCHIVE_SUB_ID)
raw_logs_topic_path   = publisher.topic_path(PROJECT_ID, RAW_LOGS_TOPIC_ID)
bucket                = storage_client.bucket(GCS_BUCKET)

legacy_parser = get_legacy_log_service()
raw_parser    = get_log_service()


# ── GCS file upload handler (existing) ───────────────────────────────────────
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
    publisher.publish(raw_logs_topic_path, json.dumps(payload).encode("utf-8")).result()
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


# ── Archive buffer (/ingest logs → GCS window files) ─────────────────────────
_lock                              = threading.Lock()
_buffer: Dict[str, List[dict]]     = defaultdict(list)
_window_start: Dict[str, datetime] = {}


def _flush_user(user_id: str) -> None:
    with _lock:
        logs  = _buffer.pop(user_id, [])
        start = _window_start.pop(user_id, datetime.now(timezone.utc))

    if not logs:
        return

    end       = datetime.now(timezone.utc)
    fmt       = "%Y%m%dT%H%M%SZ"
    blob_name = f"user_{user_id}/raw_logs/{start.strftime(fmt)}_{end.strftime(fmt)}.ndjson"

    ndjson = "\n".join(json.dumps(log) for log in logs)
    bucket.blob(blob_name).upload_from_string(ndjson, content_type="application/x-ndjson")
    print(f"[archive] Flushed {len(logs)} logs for {user_id} → {blob_name}")


def _flush_loop() -> None:
    while True:
        time.sleep(60)
        now = datetime.now(timezone.utc)
        with _lock:
            due = [
                uid for uid, start in _window_start.items()
                if (now - start).total_seconds() >= FLUSH_SECONDS
            ]
        for uid in due:
            try:
                _flush_user(uid)
            except Exception as e:
                print(f"[archive] Flush error for {uid}: {e}")


def archive_callback(message: pubsub_v1.subscriber.message.Message) -> None:
    try:
        payload = json.loads(message.data.decode("utf-8"))

        # Only handle messages published by /ingest
        if payload.get("source") != "api_ingest":
            message.ack()
            return

        raw_logs = [
            json.loads(x) if isinstance(x, str) else x
            for x in payload.get("logs", [])
        ]

        with _lock:
            for log in raw_logs:
                user_id = log.get("user_id")
                if not user_id:
                    continue
                if user_id not in _window_start:
                    _window_start[user_id] = datetime.now(timezone.utc)
                _buffer[user_id].append(log)

        message.ack()
        print(f"[archive] Buffered {len(raw_logs)} logs from /ingest")

    except Exception as e:
        print(f"[archive] Error: {e}")
        message.nack()


# ── Start ─────────────────────────────────────────────────────────────────────
threading.Thread(target=_flush_loop, daemon=True).start()

subscriber.subscribe(subscription_path, callback=callback)
print(f"Worker A listening on {subscription_path}")

subscriber.subscribe(archive_sub_path, callback=archive_callback)
print(f"Worker A (archive) listening on {archive_sub_path} — flush every {FLUSH_SECONDS}s")

while True:
    time.sleep(60)
