import json
from google.cloud import pubsub_v1, storage

from app.services.legacy_log_service import LegacyLogService
from app.services.log_service import LogService

PROJECT_ID = "mjolnir333"
SUBSCRIPTION_ID = "gcs-log-ingestion-sub"

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(
    PROJECT_ID, SUBSCRIPTION_ID
)

storage_client = storage.Client()
legacy_parser = LegacyLogService()
log_service = LogService()


def process_gcs_event(event: dict):
    """
    Handles GCS object finalize events.
    """
    bucket_name = event["bucket"]
    file_name = event["name"]

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_name)

    content = blob.download_as_bytes()

    # uses legacy logs / other struct
    parsed_logs = legacy_parser.parse_file(content, file_name)
    raw_logs = legacy_parser.to_raw_schema(parsed_logs)

    # At this point you have List[RawLogSchema]
    print(f"Parsed {len(raw_logs)} logs from {file_name}")

    # TODO: send to DB, ML pipeline ...


def callback(message: pubsub_v1.subscriber.message.Message):
    try:
        payload = json.loads(message.data.decode("utf-8"))

        # gcs events structured in this way
        if "bucket" in payload and "name" in payload:
            process_gcs_event(payload)
        else:
            print("Unknown message format:", payload)

        message.ack()

    except Exception as e:
        print("Worker error:", e)
        message.nack()


subscriber.subscribe(subscription_path, callback=callback)
print(f"Listening on {subscription_path}")

import time
while True:
    time.sleep(60)
