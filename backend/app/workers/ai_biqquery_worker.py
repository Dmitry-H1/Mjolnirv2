import os
import json
import re
import uuid
import time
import joblib
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
from google.cloud import pubsub_v1, bigquery
from app.schemas.raw_log import RawLogSchema
from app.services.log_enrichment_service import LogEnrichmentService
from app.services.anomaly_score_service import (
    load_models,
    score_service,
    score_service_no_model,
    _pick_artifact,
    FEATURE_COLUMNS,
)
from app.services.log_level_scorer import score_log

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
APP_DIR = Path(__file__).resolve().parents[1]
CLASSIFIER_PATH = Path(os.getenv("CLASSIFIER_PATH",str(APP_DIR / "ai" / "ml" / "models" / "log_classifier.pkl")))
PROJECT_ID      = os.getenv("GCP_PROJECT_ID", "mjolnir333")
SUBSCRIPTION_ID = os.getenv("RAW_LOGS_SUB_ID", "raw-logs-sub")
BQ_DATASET      = os.getenv("BQ_DATASET", "mjolnir_logs")
BQ_TABLE        = os.getenv("BQ_TABLE", "enriched_logs")
FEATURE_TABLE   = f"{PROJECT_ID}.{BQ_DATASET}.log_features_5m"

# weight for blending log-level score vs window score.
# tune based on which signal is more reliable.
LOG_SCORE_WEIGHT    = float(os.getenv("LOG_SCORE_WEIGHT", "0.4"))
WINDOW_SCORE_WEIGHT = 1.0 - LOG_SCORE_WEIGHT

subscriber        = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(PROJECT_ID, SUBSCRIPTION_ID)
bq                = bigquery.Client(project=PROJECT_ID)
enricher          = LogEnrichmentService()

_models: dict = load_models()
_component_classifier = joblib.load(CLASSIFIER_PATH)


# component normalization 

def infer_component(enriched_obj) -> str:
    """
    Use the trained component classifier to infer the real component name.

    This should return labels from classifier.py, for example:
    Apache, Spark, Zookeeper, OpenSSH, Hadoop, Linux OS, Windows OS.
    """
    text = (
        getattr(enriched_obj, "message", None)
        or getattr(enriched_obj, "normalized_message", None)
        or getattr(enriched_obj, "service", None)
        or ""
    )

    text = str(text).strip()

    if not text:
        return "unknown"

    try:
        return str(_component_classifier.predict([text])[0])
    except Exception as exc:
        print(f"[WARN] Component classifier failed: {exc}")
        return "unknown"


# feature lookup — one BQ call per unique comp per batch

def fetch_component_features(component: str) -> dict | None:
    """
    Pull the most recent feature row for this component from log_features_5m.
    Returns a dict keyed by column name, or None if no history exists yet.
    """
    query = f"""
        SELECT *
        FROM `{FEATURE_TABLE}`
        WHERE component = @component
        ORDER BY bucket_start DESC
        LIMIT 1
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("component", "STRING", component)
        ]
    )
    rows = list(bq.query(query, job_config=job_config).result())
    return dict(rows[0]) if rows else None



# window score helper
# Returns (window_score: float, anomaly_reason: str, model_source: str)

def get_window_score(
    component: str,
    feature_row: dict | None,
) -> tuple[float, str, str]:
    
    if feature_row is None:
        return 0.0, "insufficient_history|no_feature_row", "no_feature_row"

    artifact, source = _pick_artifact(_models, component)

    if artifact is None:
        # score by hard rules only (no ML model)
        feature_df = pd.DataFrame([feature_row]).reindex(
            columns=FEATURE_COLUMNS, fill_value=0.0
        )
        scored = score_service_no_model(feature_df)
        reason = str(scored["anomaly_reason"].iloc[0])
        return 0.0, reason, "no_model"

    try:
        feature_df = pd.DataFrame([feature_row]).reindex(
            columns=FEATURE_COLUMNS, fill_value=0.0
        )
        scored = score_service(feature_df, artifact)
        window_score = float(scored["window_score"].iloc[0])
        reason       = str(scored["anomaly_reason"].iloc[0])
        return window_score, reason, source
    except Exception as exc:
        print(f"[ERROR] Scoring failed for component={component}: {exc}")
        return 0.0, f"scoring_error|{type(exc).__name__}", "error"


# score combiner
def combine_scores(
    log_score: float,
    window_score: float,
    model_source: str,
) -> float:
    """
    Blend per-log and per-window scores.

    When the window score is not available (cold-start / no model), the
    blend weight shifts entirely to the log-level score so new components
    are not silently scored at 0.
    """
    if model_source in ("no_feature_row", "no_model", "error"):
        return log_score                    # fall back to log-only scoring

    return LOG_SCORE_WEIGHT * log_score + WINDOW_SCORE_WEIGHT * window_score


# row build — matches enriched_logs 

def to_bq_row(
    enriched_obj,
    meta: dict,
    component: str,
    anomaly_score: float,
    anomaly_reason: str,
    log_anomaly_score: float,
    window_score: float,
    model_source: str,
    log_score_reasons: str,
) -> dict:
    data = (
        enriched_obj.model_dump()
        if hasattr(enriched_obj, "model_dump")
        else enriched_obj.dict()
    )

    entities_obj = data.get("entities") or {}
    if hasattr(entities_obj, "model_dump"):
        entities_obj = entities_obj.model_dump()
    elif hasattr(entities_obj, "dict"):
        entities_obj = entities_obj.dict()

    event_time = data.get("event_time") or data.get("timestamp")
    if hasattr(event_time, "isoformat"):
        event_time = event_time.isoformat()

    return {
        "log_id":             str(uuid.uuid4()),
        "user_id":            data.get("user_id"),
        "ingestion_id":       meta["ingestion_id"],
        "inserted_at":        datetime.now(timezone.utc).isoformat(),
        "event_time":         event_time,
        "service":            component,
        "user_ingest_service": data.get("service"),
        "message":            data.get("message"),
        "normalized_message": data.get("normalized_message"),
        "severity":           data.get("severity"),
        "category":           data.get("category"),
        "entities":           json.dumps(entities_obj, ensure_ascii=False),
        "source_bucket":      meta.get("bucket"),
        "source_object":      meta.get("object"),

        # Combined score — the primary field consumers should read
        "anomaly_score":      round(anomaly_score, 6),
        "anomaly_reason":     anomaly_reason,

        # Decomposed scores for explainability / tuning
        "log_anomaly_score":  round(log_anomaly_score, 6),
        "window_score":       round(window_score, 6),
        "model_source":       model_source,
        "log_score_reasons":  log_score_reasons,
    }

# BQ insert

def insert_batch(rows: list[dict]) -> None:
    table_id = f"{PROJECT_ID}.{BQ_DATASET}.{BQ_TABLE}"
    errors = bq.insert_rows_json(table_id, rows)
    if errors:
        raise RuntimeError(f"BigQuery insert errors: {errors}")


# pub/sub callback

def callback(message: pubsub_v1.subscriber.message.Message):
    try:
        payload = json.loads(message.data.decode("utf-8"))
        meta = {
            "ingestion_id": payload.get("ingestion_id") or str(uuid.uuid4()),
            "bucket":       payload.get("bucket"),
            "object":       payload.get("object"),
        }

        raw_logs = [
            RawLogSchema(**(json.loads(x) if isinstance(x, str) else x))
            for x in payload["logs"]
        ]

        if not raw_logs:
            print(f"[WARN] Empty logs in message ingestion_id={meta['ingestion_id']} — skipping")
            message.ack()
            return

        enriched_logs = enricher.enrich_logs(raw_logs)

        if not enriched_logs:
            print(f"[WARN] Enrichment produced no logs for ingestion_id={meta['ingestion_id']} — skipping")
            message.ack()
            return

        components = [
            infer_component(e)
            for e in enriched_logs
        ]

        # window scores (one BQ lookup per unique comp)
        unique_components = set(components)
        window_scores: dict[str, tuple[float, str, str]] = {}

        for component in unique_components:
            feature_row = fetch_component_features(component)
            window_scores[component] = get_window_score(component, feature_row)

        # per log scoring + row  
        rows: list[dict] = []

        for enriched_obj, component in zip(enriched_logs, components):
            try:
                # log level score — works for any log
                log_result = score_log(
                    severity=getattr(enriched_obj, "severity", None),
                    message=getattr(enriched_obj, "message", None),
                    normalized_message=getattr(enriched_obj, "normalized_message", None),
                )

                window_score, window_reason, model_source = window_scores[component]

                # final combined score
                final_score = combine_scores(
                    log_score=log_result.score,
                    window_score=window_score,
                    model_source=model_source,
                )

                # log-level reasons take precedence,
                # window reason appended 
                combined_reason = window_reason
                if log_result.reasons:
                    combined_reason = ",".join(log_result.reasons) + "|" + window_reason

                rows.append(to_bq_row(
                    enriched_obj=enriched_obj,
                    meta=meta,
                    component=component,
                    anomaly_score=final_score,
                    anomaly_reason=combined_reason,
                    log_anomaly_score=log_result.score,
                    window_score=window_score,
                    model_source=model_source,
                    log_score_reasons=",".join(log_result.reasons),
                ))

            except Exception as exc:
                print(f"[ERROR] Failed to build row for component={component}: {exc}")

        if not rows:
            print(f"[WARN] No rows to insert for ingestion_id={meta['ingestion_id']} — skipping")
            message.ack()
            return

        insert_batch(rows)
        message.ack()
        print(
            f"Inserted {len(rows)} rows | "
            f"{len(unique_components)} components scored | "
            f"ingestion_id={meta['ingestion_id']}"
        )

    except Exception as exc:
        print(f"[ERROR] Worker B error: {exc}")
        message.nack()

subscriber.subscribe(subscription_path, callback=callback)
print(f"Worker listening on {subscription_path}")

while True:
    time.sleep(60)