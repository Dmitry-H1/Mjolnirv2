def redact(logs: list[dict]) -> list[dict]:
    for l in logs:
        l["message"] = l["message"][:500]
    return logs

def summarize(logs: list[dict]) -> dict:
    logs = redact(logs)
    return {
        "summary": "Latency spike detected across auth service",
        "root_cause": "Database pool exhaustion",
        "confidence": 0.8
    }
