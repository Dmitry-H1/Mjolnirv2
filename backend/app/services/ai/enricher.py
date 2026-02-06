import re
from typing import Dict, Any, Tuple

class Enricher:
    def severity(self, msg: str) -> str:
        m = msg.lower()
        if any(k in m for k in ["error", "exception", "traceback", "failed", "fatal"]):
            return "error"
        if any(k in m for k in ["warn", "timeout", "retry", "slow"]):
            return "warn"
        return "info"

    def extract_entities(self, msg: str) -> Dict[str, Any]:
        entities: Dict[str, Any] = {}
        ip = re.search(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", msg)
        if ip: entities["ip"] = ip.group(0)
        return entities

    def category(self, service: str | None, msg: str) -> str:
        s = (service or "").lower()
        if "auth" in s or "login" in msg.lower(): return "auth"
        if "db" in s or "sql" in msg.lower(): return "db"
        if "api" in s or "http" in msg.lower(): return "api"
        return "other"
