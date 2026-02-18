import os
import json
import uuid
import time
from datetime import datetime, timezone
from typing import Dict, Tuple, Optional, Any
from google.api_core.exceptions import NotFound, Forbidden, BadRequest, GoogleAPICallError


from google.cloud import pubsub_v1, bigquery

from schemas.raw_log import RawLogSchema
from services.log_enrichment_service import LogEnrichmentService

PROJECT_ID = os.getenv("GCP_PROJECT_ID", "mjolnir333")
SUBSCRIPTION_ID = os.getenv("RAW_LOGS_SUB_ID", "raw-logs-sub")

BQ_DATASET = os.getenv("BQ_DATASET", "mjolnir_logs")
BQ_TABLE = os.getenv("BQ_TABLE", "enriched_logs")

# baseline tables
BQ_BASE_TEMPLATE = os.getenv("BQ_BASE_TEMPLATE", "baselines_template_daily")
BQ_BASE_LATENCY = os.getenv("BQ_BASE_LATENCY", "baselines_service_latency_daily")
BQ_BASE_ERROR = os.getenv("BQ_BASE_ERROR", "baselines_service_errorrate_5m")

BASELINE_TTL_SECONDS = int(os.getenv("BASELINE_TTL_SECONDS", "600"))  

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(PROJECT_ID, SUBSCRIPTION_ID)

bq = bigquery.Client(project=PROJECT_ID)
enricher = LogEnrichmentService()

_last_loaded = 0.0
_latest_date: Optional[str] = None
_template_freq: Dict[Tuple[str, str], float] = {}
_latency_p95: Dict[str, int] = {}
_error_rate: Dict[str, float] = {}

def _load_baselines_if_needed() -> None:
    global _last_loaded, _latest_date, _template_freq, _latency_p95, _error_rate

    now = time.time()
    if now - _last_loaded < BASELINE_TTL_SECONDS:
        return

    # defaults
    latest_date: Optional[str] = None
    template_freq: Dict[Tuple[str, str], float] = {}
    latency_p95: Dict[str, int] = {}
    error_rate: Dict[str, float] = {}

    try:
        # find latest baseline_date from template 
        q_date = f"""
        SELECT CAST(MAX(baseline_date) AS STRING) AS d
        FROM `{PROJECT_ID}.{BQ_DATASET}.{BQ_BASE_TEMPLATE}`
        """
        rows = list(bq.query(q_date).result())
        latest_date = rows[0]["d"] if rows and rows[0].get("d") else None

        # load freq templates
        if latest_date:
            q_templates = f"""
            SELECT service, normalized_message, freq
            FROM `{PROJECT_ID}.{BQ_DATASET}.{BQ_BASE_TEMPLATE}`
            WHERE baseline_date = DATE("{latest_date}")
            """
            for r in bq.query(q_templates).result():
                svc = (r.get("service") or "unknown")
                tmpl = (r.get("normalized_message") or "")
                freq_val = r.get("freq")
                freq = float(freq_val) if freq_val is not None else 0.0
                template_freq[(svc, tmpl)] = freq

        if latest_date:
            q_latency = f"""
            SELECT service, p95_latency_ms
            FROM `{PROJECT_ID}.{BQ_DATASET}.{BQ_BASE_LATENCY}`
            WHERE baseline_date = DATE("{latest_date}")
            """
            for r in bq.query(q_latency).result():
                svc = (r.get("service") or "unknown")
                p95 = r.get("p95_latency_ms")
                if p95 is not None:
                    latency_p95[svc] = int(p95)

        q_err = f"""
        SELECT service, error_rate
        FROM `{PROJECT_ID}.{BQ_DATASET}.{BQ_BASE_ERROR}`
        WHERE window_start = (
          SELECT MAX(window_start)
          FROM `{PROJECT_ID}.{BQ_DATASET}.{BQ_BASE_ERROR}`
        )
        """
        for r in bq.query(q_err).result():
            svc = (r.get("service") or "unknown")
            er = r.get("error_rate")
            if er is not None:
                error_rate[svc] = float(er)

        #commit latest values
        _latest_date = latest_date
        _template_freq = template_freq
        _latency_p95 = latency_p95
        _error_rate = error_rate

        print(
            f"Loaded baselines: date={_latest_date}, "
            f"templates={len(_template_freq)}, latency={len(_latency_p95)}, error={len(_error_rate)}",
            flush=True
        )

    except (NotFound, Forbidden, BadRequest, GoogleAPICallError) as e:
        # if template invalid or inaccessible
        _latest_date = None
        _template_freq = {}
        _latency_p95 = {}
        _error_rate = {}
        print(f"[WARN] Baselines unavailable; continuing without baselines. Error: {e}", flush=True)

    except Exception as e:
        # catch
        _latest_date = None
        _template_freq = {}
        _latency_p95 = {}
        _error_rate = {}
        print(f"[WARN] Unexpected baseline load failure; continuing without baselines. Error: {e}", flush=True)

    finally:
        _last_loaded = now

def score_with_baselines(service: Optional[str],normalized_message: Optional[str],severity: Optional[str],latency_ms: Optional[int] = None,) -> Tuple[float, str]:

    svc = service or "unknown"
    tmpl = normalized_message or ""
    sev = (severity or "").upper()

    # template scoring
    if not _template_freq:
        s_template, reason = 0.0, "no_template_baseline"
    else:
        freq = _template_freq.get((svc, tmpl), 0.0)
        if freq == 0.0:
            s_template, reason = 0.9, "new_template"
        elif freq < 0.001:
            s_template, reason = 0.6, "rare_template"
        else:
            s_template, reason = 0.1, "common_template"

    # latency scoring
    s_latency = 0.0
    p95 = _latency_p95.get(svc)
    if latency_ms is not None and p95 is not None and latency_ms > p95:
        s_latency, reason = 0.7, "latency_over_p95"

    # error spike scoring
    s_error = 0.0
    er = _error_rate.get(svc)
    if er is not None and er > 0.2 and sev == "ERROR":
        s_error, reason = 0.7, "error_spike"

    score = max(s_template, s_latency, s_error)
    return score, reason

def to_bq_row(enriched_obj, meta: dict, score: float, reason: str) -> dict:

    data = enriched_obj.model_dump() if hasattr(enriched_obj, "model_dump") else enriched_obj.dict()
    entities_obj = data.get("entities") or {}
    if hasattr(entities_obj, "model_dump"):
        entities_obj = entities_obj.model_dump()
    elif hasattr(entities_obj, "dict"):
        entities_obj = entities_obj.dict()
    entities = json.dumps(entities_obj, ensure_ascii=False)
    event_time = data.get("event_time") or data.get("timestamp")
    if hasattr(event_time, "isoformat"):
        event_time = event_time.isoformat()

    return {
        "ingestion_id": meta["ingestion_id"],
        "event_time": event_time,
        "service": data.get("service"),
        "trace_id": data.get("trace_id"),
        "message": data.get("message"),
        "normalized_message": data.get("normalized_message"),
        "severity": data.get("severity"),
        "category": data.get("category"),
        "entities": entities,
        "anomaly_score": score,
        "anomaly_reason": reason,
        "source_bucket": meta.get("bucket"),
        "source_object": meta.get("object"),
        "model_version": data.get("model_version"),
        "inserted_at": datetime.now(timezone.utc).isoformat(),
    }

def insert_batch(rows: list[dict]) -> None:
    table_id = f"{PROJECT_ID}.{BQ_DATASET}.{BQ_TABLE}"
    errors = bq.insert_rows_json(table_id, rows)
    if errors:
        raise RuntimeError(f"BigQuery insert errors: {errors}")

def callback(message: pubsub_v1.subscriber.message.Message):
    try:
        _load_baselines_if_needed()

        payload = json.loads(message.data.decode("utf-8"))
        meta = {
            "ingestion_id": payload.get("ingestion_id") or str(uuid.uuid4()),
            "bucket": payload.get("bucket"),
            "object": payload.get("object"),
        }

        raw_logs = [RawLogSchema(**x) for x in payload["logs"]]
        enriched_logs = enricher.enrich_logs(raw_logs)

        rows: list[dict] = []
        for raw, enriched_obj in zip(raw_logs, enriched_logs): 
            latency_ms = getattr(raw, "latency_ms", None)

            score, reason = score_with_baselines(
                service=getattr(enriched_obj, "service", None),
                normalized_message=getattr(enriched_obj, "normalized_message", None),
                severity=getattr(enriched_obj, "severity", None),
                latency_ms=latency_ms,
    )

            rows.append(to_bq_row(enriched_obj, meta, score, reason))

        insert_batch(rows)
        message.ack()
        print(f"Inserted {len(rows)} rows into BigQuery.")

    except Exception as e:
        print("Worker B error:", e)
        message.nack()

subscriber.subscribe(subscription_path, callback=callback)
print(f"Worker B listening on {subscription_path}")

while True:
    time.sleep(60)
