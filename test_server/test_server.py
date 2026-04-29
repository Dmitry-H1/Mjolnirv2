"""
Fake Log Server
---------------
Streams fake logs matching the RawLogSchema via Server-Sent Events (SSE).

Install deps:
    pip install flask flask-cors faker

Run:
    python test_server.py

Frontend connects to:
    GET http://localhost:5050/logs/stream
    http://localhost:5050/logs/single
    http://localhost:5050/logs/batch
"""

import json
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from faker import Faker
from flask import Flask, Response, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow all origins — lock this down in production

fake = Faker()

# ── Fake data pools ────────────────────────────────────────────────────────────

SERVICES = [
    "auth-service", "api-gateway", "payment-service",
    "user-service", "notification-service", "data-pipeline",
    "search-service", "storage-service", "scheduler",
]

SEVERITIES = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
SEVERITY_WEIGHTS = [10, 50, 20, 15, 5]  # weighted so INFO is most common

MESSAGE_TEMPLATES = [
    ("INFO",        "authentication", "User {user} logged in successfully from {ip}"),
    ("INFO",        "api",            "GET /api/{endpoint} responded in {ms}ms"),
    ("INFO",        "database",       "Query executed in {ms}ms on table '{table}'"),
    ("INFO",        "scheduler",      "Scheduled job '{job}' completed successfully"),
    ("WARNING",     "performance",    "Response time exceeded threshold: {ms}ms on /api/{endpoint}"),
    ("WARNING",     "database",       "Slow query detected ({ms}ms): SELECT * FROM {table}"),
    ("WARNING",     "storage",        "Disk usage at {pct}% on volume /dev/{vol}"),
    ("WARNING",     "network",        "Retrying connection to {host} (attempt {n}/3)"),
    ("ERROR",       "authentication", "Failed login attempt for user {user} from {ip}"),
    ("ERROR",       "database",       "Connection to database pool timed out after {ms}ms"),
    ("ERROR",       "api",            "POST /api/{endpoint} failed with status 500"),
    ("ERROR",       "network",        "Unable to reach upstream service {host}: connection refused"),
    ("CRITICAL",    "security",       "Multiple failed auth attempts detected from {ip} — possible brute force"),
    ("CRITICAL",    "storage",        "Disk full on volume /dev/{vol} — writes are failing"),
    ("DEBUG",       "api",            "Cache hit for key '{key}' in {ms}ms"),
    ("DEBUG",       "scheduler",      "Polling queue '{job}' — {n} items pending"),
]


def _fill(template: str) -> str:
    """Fill a message template with random fake values."""
    return template.format(
        user=fake.user_name(),
        ip=fake.ipv4(),
        endpoint=random.choice(["users", "orders", "products", "auth", "analytics"]),
        ms=random.randint(10, 4000),
        table=random.choice(["users", "orders", "events", "sessions", "audit_log"]),
        job=random.choice(["cleanup", "report-gen", "email-digest", "sync", "backup"]),
        pct=random.randint(70, 99),
        vol=random.choice(["sda1", "sdb1", "nvme0n1"]),
        host=fake.hostname(),
        n=random.randint(1, 10),
        key=fake.md5()[:12],
    )


def generate_log() -> Dict[str, Any]:
    """Build one fake RawLogSchema-compatible dict."""
    severity, _, template = random.choices(
        MESSAGE_TEMPLATES,
        weights=[
            SEVERITY_WEIGHTS[SEVERITIES.index(t[0])] for t in MESSAGE_TEMPLATES
        ],
    )[0]

    message = _fill(template)
    now = datetime.now(timezone.utc)

    # latency_ms only makes sense for certain log types
    latency_ms = random.randint(5, 5000) if random.random() > 0.4 else None

    return {
        "timestamp":   now.isoformat(),
        "service":     random.choice(SERVICES),
        "message":     message,
        "severity":    severity,
        "trace_id":    str(uuid.uuid4()) if random.random() > 0.3 else None,
        "latency_ms":  latency_ms,
        "raw_payload": {
            "ip":   fake.ipv4(),
            "host": fake.hostname(),
        },
        "user_id":     None,
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/logs/stream")
def stream():
    """
    SSE endpoint — connect from your frontend with:
        const es = new EventSource("http://localhost:5050/logs/stream");
        es.onmessage = (e) => console.log(JSON.parse(e.data));
    """
    def event_stream():
        while True:
            log = generate_log()
            yield f"data: {json.dumps(log)}\n\n"
            time.sleep(random.uniform(0.5, 2.0))

    return Response(
        event_stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # important if behind nginx
        },
    )


@app.route("/logs/single")
def single():
    """Returns one fake log as plain JSON — useful for quick testing."""
    return jsonify(generate_log())


@app.route("/logs/batch")
def batch():
    """Returns a JSON array of 10 fake logs — useful for bulk testing."""
    return jsonify([generate_log() for _ in range(10)])


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Fake log server running at http://localhost:5050")
    print("  Stream : GET /logs/stream  (SSE)")
    print("  Single : GET /logs/single  (one log)")
    print("  Batch  : GET /logs/batch   (10 logs)")
    app.run(port=5050, threaded=True, debug=False)