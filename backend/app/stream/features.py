import numpy as np
from datetime import datetime

def extract_features(log: dict) -> np.ndarray:
    ts = datetime.fromisoformat(log["timestamp"]).timestamp()
    return np.array([
        ts % 60,
        log.get("severity", 0),
        len(log.get("message", "")),
        log.get("latency_ms", 0),
    ])
