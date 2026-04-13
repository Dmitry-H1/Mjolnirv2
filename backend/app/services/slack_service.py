import logging
import httpx
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

_last_alerted: dict[str, datetime] = {}
COOLDOWN = timedelta(minutes=1)


def _score_bar(score: float) -> str:
    if score >= 0.90:
        return "🔴 Critical"
    if score >= 0.80:
        return "🟠 High"
    return "🟡 Medium"


def send_anomaly_alert_sync(
    webhook_url: str,
    anomaly_score: float,
    timestamp: float | None = None,
) -> bool:
    now = datetime.now(timezone.utc)

    last = _last_alerted.get(webhook_url)
    if last and now - last < COOLDOWN:
        logger.debug("Suppressing alert — cooldown active")
        return False

    _last_alerted[webhook_url] = now

    ts = (
        datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        if timestamp
        else now.strftime("%Y-%m-%d %H:%M:%S UTC")
    )
    score_bar = _score_bar(anomaly_score)

    payload = {
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "🚨 Mjolnir Anomaly Alert", "emoji": True},
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Anomaly Score:*\n`{anomaly_score:.2f}` {score_bar}"},
                    {"type": "mrkdwn", "text": f"*Detected At:*\n{ts}"},
                ],
            },
            {"type": "divider"},
            {
                "type": "context",
                "elements": [
                    {"type": "mrkdwn", "text": "Threshold: score ≥ 0.70 | Mjolnirv2 Log Intelligence"}
                ],
            },
        ]
    }

    try:
        r = httpx.post(webhook_url, json=payload, timeout=5.0)
        r.raise_for_status()
        return True
    except Exception as e:
        logger.error("Slack alert failed: %s", e)
        return False