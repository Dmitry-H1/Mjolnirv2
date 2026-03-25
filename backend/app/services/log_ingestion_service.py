from google.cloud import pubsub_v1, storage
import os
import uuid
import json
from typing import List

from schemas.raw_log import RawLogSchema


class LogIngestionService:
    def __init__(self, project_id: str, bucket_name: str):
        self.publisher = pubsub_v1.PublisherClient()
        self.storage_client = storage.Client()
        self.bucket = self.storage_client.bucket(bucket_name)
        self.project_id = project_id

    def publish_logs(self, logs: list[RawLogSchema], topic_id: str):
        topic_path = self.publisher.topic_path(self.project_id, topic_id)
        payload = {
            "ingestion_id": str(uuid.uuid4()),
            "logs": [log.model_dump_json() for log in logs]
        }
        self.publisher.publish(topic_path, json.dumps(payload).encode("utf-8")).result()

    def upload_file(self, file_bytes: bytes, filename: str, file_type: str, user_id: uuid.UUID) -> str:
        blob_name = f"user_{user_id}/{file_type}/{uuid.uuid4()}_{filename}"
        blob = self.bucket.blob(blob_name)
        blob.upload_from_string(file_bytes)
        return blob_name
    
    
