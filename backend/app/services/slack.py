import requests
from app.core.config import SLACK_WEBHOOK

def notify(incident):
    payload = {
        "text": (
            f"Incident detected\n"
            f"Service: {incident.service}\n"
            f"Severity: {incident.severity}"
        )
    }
    requests.post(SLACK_WEBHOOK, json=payload, timeout=5)
