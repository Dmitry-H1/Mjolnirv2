from google.cloud import pubsub_v1

project_id = "mjolnir333"
topic_id = "logs-ingestion"
subscription_id = "logs-ingestion-sub"

# pub client
publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(project_id, topic_id)

# sub client
subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(project_id, subscription_id)

# check topic exists
try:
    topic = publisher.get_topic(request={"topic": topic_path})
    print(f"Topic exists: {topic.name}")
except Exception as e:
    print(f"Topic check failed: {e}")

# check subscription exists
try:
    sub = subscriber.get_subscription(request={"subscription": subscription_path})
    print(f"Subscription exists: {sub.name}")
except Exception as e:
    print(f"Subscription check failed: {e}")
