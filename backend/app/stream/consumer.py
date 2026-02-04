import json
from google.cloud import pubsub_v1
from app.core.config import PROJECT_ID, PUBSUB_SUBSCRIPTION
from app.stream.features import extract_features
from app.stream.detectors import detect_anomaly
from backend.app.services.log_service import index_log
from app.services.incidents import create_incident

subscriber = pubsub_v1.SubscriberClient()

def callback(message):
    log = json.loads(message.data.decode())

    index_log(log)
    features = extract_features(log)
    result = detect_anomaly(features)

    if result["is_anomaly"]:
        create_incident(log, result)

    message.ack()

def run():
    sub_path = subscriber.subscription_path(
        PROJECT_ID,
        PUBSUB_SUBSCRIPTION
    )
    subscriber.subscribe(sub_path, callback=callback)
    print("Stream worker running...")
    while True:
        pass
