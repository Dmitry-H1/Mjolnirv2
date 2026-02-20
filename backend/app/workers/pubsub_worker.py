import os
import json
import time
import uuid
from google.cloud import pubsub_v1
from google.cloud import storage
from google.api_core.exceptions import ServiceUnavailable, InternalServerError

from services.legacy_log_service import LegacyLogService
from dependencies.service_dependencies import get_legacy_log_service, get_log_service

PROJECT_ID = os.getenv("GCP_PROJECT_ID", "mjolnir333")

GCS_SUB_ID = os.getenv("GCS_SUB_ID", "gcs-log-ingestion-sub")
RAW_LOGS_TOPIC_ID = os.getenv("RAW_LOGS_TOPIC_ID", "raw-logs-topic")

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(PROJECT_ID, GCS_SUB_ID)

publisher = pubsub_v1.PublisherClient()
raw_logs_topic_path = publisher.topic_path(PROJECT_ID, RAW_LOGS_TOPIC_ID)

storage_client = storage.Client()
legacy_parser = get_legacy_log_service()
raw_parser = get_log_service()

def process_gcs_event(event: dict):
    bucket_name = event["bucket"]
    file_name = event["name"]

    blob = storage_client.bucket(bucket_name).blob(file_name)
    content = blob.download_as_bytes()

    # detect type by folder
    if file_name.startswith("legacy_logs/"):
        parsed_logs = legacy_parser.parse_file(content, file_name)
        raw_logs = legacy_parser.to_raw_schema(parsed_logs)
    elif file_name.startswith("raw_logs/"):
        raw_logs = raw_parser.parse_logs_from_file(content, file_name)


    # publish parsed logs into raw-logs-topic
    payload = {
        "ingestion_id": str(uuid.uuid4()),
        "bucket": bucket_name,
        "object": file_name,
        "logs": [x.model_dump_json() for x in raw_logs],  # pydantic v2
    }

    # wait for publish to succeed BEFORE acking the GCS event message
    publisher.publish(raw_logs_topic_path, json.dumps(payload).encode("utf-8")).result()

    print(f"Parsed {len(raw_logs)} logs from gs://{bucket_name}/{file_name} and published to {RAW_LOGS_TOPIC_ID}")

def callback(message: pubsub_v1.subscriber.message.Message):
    try:
        payload = json.loads(message.data.decode("utf-8"))

        # gcs payload notif 
        if "bucket" in payload and ("name" in payload or "object" in payload):
            # normalize key
            if "object" in payload and "name" not in payload:
                payload["name"] = payload["object"]

            process_gcs_event(payload)
            message.ack()
        else:
            print("Unknown message format:", payload)
            message.ack()

    except Exception as e:
        print("Worker A error:", e)
        
        if isinstance(e, (FileNotFoundError, ValueError)):
            # Permanent failures → ack
            message.ack()
            print("Acknowledged message (permanent failure).")
        else:
            # Transient failures → nack
            message.nack()
            print("NACKed message (transient error, will retry).")

subscriber.subscribe(subscription_path, callback=callback)
print(f"Worker A listening on {subscription_path}")

while True:
    time.sleep(60)
