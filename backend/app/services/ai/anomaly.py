from collections import defaultdict, deque
from math import sqrt
from typing import Deque, Dict, Tuple

class AnomalyService:
    def __init__(self, window: int = 500):
        self.counts = defaultdict(int)  # (service, template) -> count
        self.lat_hist: Dict[str, Deque[int]] = defaultdict(lambda: deque(maxlen=window))

    def score_template(self, service: str, template: str) -> float:
        key = (service, template)
        c = self.counts[key]
        # new/rare => higher score
        if c == 0: return 0.9
        if c < 5: return 0.6
        return 0.1

    def score_latency(self, service: str, latency_ms: int | None) -> float:
        if latency_ms is None: return 0.0
        hist = self.lat_hist[service]
        if len(hist) < 30:
            return 0.0
        mean = sum(hist) / len(hist)
        var = sum((x - mean) ** 2 for x in hist) / len(hist)
        std = sqrt(var) if var > 0 else 1.0
        z = (latency_ms - mean) / std
        # map z-score to 0..1 
        return min(1.0, max(0.0, (z - 2.0) / 6.0))

    def update(self, service: str, template: str, latency_ms: int | None):
        self.counts[(service, template)] += 1
        if latency_ms is not None:
            self.lat_hist[service].append(latency_ms)
