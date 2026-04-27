"""
Fake Log Sender
---------------
Generates fake logs and POSTs them to POST /logs/ingest.

Auth — pick one:
  1. Set MJOLNIR_API_KEY  (generated from Profile page)
  2. Set MJOLNIR_USERNAME + MJOLNIR_PASSWORD  (logs in and refreshes automatically)

Config (env vars or edit the CONFIG block below):
  MJOLNIR_API_URL   — base URL of the API  (default: http://127.0.0.1:8000)
  MJOLNIR_API_KEY   — long-lived API key
  MJOLNIR_USERNAME  — username for login auth
  MJOLNIR_PASSWORD  — password for login auth
  BATCH_SIZE        — logs per request       (default: 5)
  INTERVAL_SECONDS  — seconds between sends  (default: 10)

Install deps:
  pip install requests faker

Run:
  python test_server.py
"""

import os
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import requests
from faker import Faker

# ── Config ─────────────────────────────────────────────────────────────────────
API_URL          = os.getenv("MJOLNIR_API_URL",      "http://127.0.0.1:8000")
API_KEY          = os.getenv("MJOLNIR_API_KEY",      "")
USERNAME         = os.getenv("MJOLNIR_USERNAME",     "")
PASSWORD         = os.getenv("MJOLNIR_PASSWORD",     "")
BATCH_SIZE       = int(os.getenv("BATCH_SIZE",       "5"))
INTERVAL_SECONDS = float(os.getenv("INTERVAL_SECONDS", "10"))

INGEST_URL = f"{API_URL}/logs/ingest"
LOGIN_URL  = f"{API_URL}/auth/login"

# ── Fake data pools ────────────────────────────────────────────────────────────
fake = Faker()

SERVICES = [
    "auth-service", "api-gateway", "payment-service",
    "user-service", "notification-service", "data-pipeline",
    "search-service", "storage-service", "scheduler",
]

SEVERITIES        = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
SEVERITY_WEIGHTS  = [10, 50, 20, 15, 5]

MESSAGE_TEMPLATES = [
    ("INFO",     "User {user} logged in successfully from {ip}"),
    ("INFO",     "GET /api/{endpoint} responded in {ms}ms"),
    ("INFO",     "Query executed in {ms}ms on table '{table}'"),
    ("INFO",     "Scheduled job '{job}' completed successfully"),
    ("WARNING",  "Response time exceeded threshold: {ms}ms on /api/{endpoint}"),
    ("WARNING",  "Slow query detected ({ms}ms): SELECT * FROM {table}"),
    ("WARNING",  "Disk usage at {pct}% on volume /dev/{vol}"),
    ("WARNING",  "Retrying connection to {host} (attempt {n}/3)"),
    ("ERROR",    "Failed login attempt for user {user} from {ip}"),
    ("ERROR",    "Connection to database pool timed out after {ms}ms"),
    ("ERROR",    "POST /api/{endpoint} failed with status 500"),
    ("ERROR",    "Unable to reach upstream service {host}: connection refused"),
    ("CRITICAL", "Multiple failed auth attempts detected from {ip} — possible brute force"),
    ("CRITICAL", "Disk full on volume /dev/{vol} — writes are failing"),
    ("DEBUG",    "Cache hit for key '{key}' in {ms}ms"),
    ("DEBUG",    "Polling queue '{job}' — {n} items pending"),
]


def _fill(template: str) -> str:
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
    severity, template = random.choices(
        MESSAGE_TEMPLATES,
        weights=[SEVERITY_WEIGHTS[SEVERITIES.index(t[0])] for t in MESSAGE_TEMPLATES],
    )[0]

    return {
        "timestamp":   datetime.now(timezone.utc).isoformat(),
        "service":     random.choice(SERVICES),
        "message":     _fill(template),
        "severity":    severity,
        "latency_ms":  random.randint(5, 5000) if random.random() > 0.4 else None,
        "raw_payload": {"ip": fake.ipv4(), "host": fake.hostname()},
    }


# ── Auth ───────────────────────────────────────────────────────────────────────
class TokenManager:
    """Handles both API key auth and username/password login with auto-refresh."""

    def __init__(self):
        self._token: Optional[str] = None

        if API_KEY:
            self._token = API_KEY
            print(f"[auth] Using API key")
        elif USERNAME and PASSWORD:
            self._login()
        else:
            raise RuntimeError(
                "No auth configured. Set MJOLNIR_API_KEY or MJOLNIR_USERNAME + MJOLNIR_PASSWORD."
            )

    def _login(self):
        resp = requests.post(
            LOGIN_URL,
            json={"username": USERNAME, "password": PASSWORD},
            timeout=10,
        )
        resp.raise_for_status()
        self._token = resp.json()["access_token"]
        print(f"[auth] Logged in as {USERNAME}")

    def headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self._token}"}

    def refresh(self):
        """Re-login on 401. API keys don't expire so only used for JWT sessions."""
        if not API_KEY:
            print("[auth] Token expired — re-logging in...")
            self._login()


# ── Sender ─────────────────────────────────────────────────────────────────────
def send_batch(token_mgr: TokenManager, batch: list) -> bool:
    try:
        resp = requests.post(
            INGEST_URL,
            json=batch,
            headers=token_mgr.headers(),
            timeout=15,
        )

        if resp.status_code == 401:
            token_mgr.refresh()
            # retry once after refresh
            resp = requests.post(
                INGEST_URL,
                json=batch,
                headers=token_mgr.headers(),
                timeout=15,
            )

        resp.raise_for_status()
        data = resp.json()
        print(f"[send] ✓ {data.get('count', len(batch))} logs accepted  — {datetime.now().strftime('%H:%M:%S')}")
        return True

    except requests.HTTPError as e:
        print(f"[send] ✗ HTTP {e.response.status_code}: {e.response.text[:120]}")
    except requests.RequestException as e:
        print(f"[send] ✗ Request failed: {e}")
    return False


# ── Main loop ──────────────────────────────────────────────────────────────────
def main():
    print(f"Mjolnir log sender")
    print(f"  API    : {INGEST_URL}")
    print(f"  Batch  : {BATCH_SIZE} logs every {INTERVAL_SECONDS}s")
    print(f"  Press Ctrl+C to stop\n")

    token_mgr  = TokenManager()
    total_sent = 0

    try:
        while True:
            batch = [generate_log() for _ in range(BATCH_SIZE)]
            if send_batch(token_mgr, batch):
                total_sent += len(batch)
            time.sleep(INTERVAL_SECONDS)
    except KeyboardInterrupt:
        print(f"\nStopped. Total logs sent: {total_sent}")


if __name__ == "__main__":
    main()
