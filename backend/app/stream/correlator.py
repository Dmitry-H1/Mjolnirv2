from collections import defaultdict
from datetime import datetime, timedelta

WINDOW = timedelta(minutes=5)
buffer = defaultdict(list)

def correlate(log: dict):
    key = log.get("trace_id") or log.get("service")
    buffer[key].append(log)

    now = datetime.utcnow()
    buffer[key] = [
        l for l in buffer[key]
        if datetime.fromisoformat(l["timestamp"]) > now - WINDOW
    ]

    return buffer[key]
