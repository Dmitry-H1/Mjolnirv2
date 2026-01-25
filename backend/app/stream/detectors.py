import numpy as np
from collections import deque
from sklearn.ensemble import IsolationForest

WINDOW = 100
latencies = deque(maxlen=WINDOW)

iso = IsolationForest(contamination=0.02, random_state=42)
trained = False

def detect_anomaly(features: np.ndarray) -> dict:
    global trained
    latency = features[-1]
    latencies.append(latency)

    threshold = latency > 2000

    z_score = False
    if len(latencies) > 30:
        mean = np.mean(latencies)
        std = np.std(latencies) or 1
        z_score = abs((latency - mean) / std) > 3

    iso_anomaly = False
    if len(latencies) == WINDOW:
        X = np.array(latencies).reshape(-1, 1)
        if not trained:
            iso.fit(X)
            trained = True
        iso_anomaly = iso.predict([[latency]])[0] == -1

    return {
        "is_anomaly": threshold or z_score or iso_anomaly,
        "threshold": threshold,
        "z_score": z_score,
        "isolation_forest": iso_anomaly,
    }
