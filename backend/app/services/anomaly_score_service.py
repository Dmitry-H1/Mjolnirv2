import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from google.cloud import bigquery

PROJECT_ID   = os.getenv("PROJECT_ID", "mjolnir333")
DATASET      = os.getenv("DATASET", "mjolnir_logs")
FEATURE_TABLE  = f"{PROJECT_ID}.{DATASET}.log_features_5m"
OUTPUT_TABLE   = f"{PROJECT_ID}.{DATASET}.log_anomaly_scores"
APP_MODEL_DIR    = Path(__file__).resolve().parents[1] / "ai" / "ml" / "models"
LEGACY_MODEL_DIR = Path(__file__).resolve().parents[2] / "ai" / "ml" / "models"
LOG_CLASSIFIER_PATH = Path(__file__).resolve().parents[1] / "ai" / "ml" / "models" / "log_classifier.pkl"


_log_classifier = None

def _load_log_classifier():
    global _log_classifier
    if _log_classifier is not None:
        return _log_classifier
    if LOG_CLASSIFIER_PATH.exists():
        _log_classifier = joblib.load(LOG_CLASSIFIER_PATH)
        print(f"[INFO] Log classifier loaded from {LOG_CLASSIFIER_PATH}")
    else:
        print(f"[WARN] Log classifier not found at {LOG_CLASSIFIER_PATH} — component resolution disabled")
    return _log_classifier


def resolve_component(raw_component: str, sample_lines: list[str] | None = None) -> str:
    """
    Resolve a raw component/service name to a canonical label.

    Resolution order:
      1. If a log classifier is available AND sample_lines are provided,
         classify the lines and use the majority-vote label.
      2. Otherwise fall back to the raw component string (slug-normalised).

    Parameters
    ----------
    raw_component : str
        The raw service/component name from the log metadata.
    sample_lines : list[str] | None
        A sample of actual log lines from this component (used for
        content-based classification). Pass None to skip ML resolution.

    Returns
    -------
    str
        Canonical component label, e.g. "Apache", "OpenSSH", "Linux OS".
    """
    clf = _load_log_classifier()

    if clf is not None and sample_lines:
        lines = [l.strip() for l in sample_lines if l.strip()]
        if lines:
            try:
                predictions = clf.predict(lines)
                # Majority vote across sampled lines
                series = pd.Series(predictions)
                top = series.value_counts().index[0]
                confidence = series.value_counts().iloc[0] / len(predictions)
                if confidence >= 0.5:          # require at least 50% agreement
                    return top
            except Exception as exc:
                print(f"[WARN] Log classifier inference failed: {exc}")

    # Fallback: return raw component as-is (normalisation happens in the worker)
    return raw_component

FEATURE_COLUMNS = [
    "total_logs", "error_logs", "warn_logs", "info_logs",
    "distinct_traces", "distinct_users", "distinct_messages", "distinct_categories",
    "error_ratio", "warn_ratio", "info_ratio", "trace_ratio", "user_ratio",
    "unique_message_ratio", "hour_of_day", "day_of_week",
    "total_logs_delta", "error_logs_delta", "error_ratio_delta",
    "total_logs_roll_mean_12", "total_logs_roll_std_12",
    "error_logs_roll_mean_12", "error_logs_roll_std_12",
    "error_ratio_roll_mean_12", "error_ratio_roll_std_12",
    "total_logs_zscore", "error_logs_zscore", "error_ratio_zscore",
]

MIN_BUCKETS_REQUIRED = 3
CONTAMINATION        = 0.02


#load model

def get_model_dir() -> Path:
    if APP_MODEL_DIR.exists():
        return APP_MODEL_DIR
    return LEGACY_MODEL_DIR


def load_models() -> dict:
    models = {}
    model_dir = get_model_dir()
    if not model_dir.exists():
        print(f"WARNING: model dir does not exist: {model_dir}")
        return models
    for path in model_dir.glob("*.joblib"):
        models[path.stem] = joblib.load(path)
    print(f"Loaded {len(models)} models from {model_dir}")
    return models



def load_recent_features() -> pd.DataFrame:
    client = bigquery.Client(project=PROJECT_ID)
    query = f"""
    SELECT *
    FROM `{FEATURE_TABLE}`
    WHERE bucket_start >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 DAY)
    ORDER BY component, bucket_start
    """
    print("Running scoring query...")
    df = client.query(query).to_dataframe()
    print("Loaded recent rows:", len(df))
    return df



def _normalise_iforest(raw: np.ndarray) -> np.ndarray:
    """
    Negative values are outliers
    Map to [0, 1] where 1 = most anomalous

    Clip to [-0.5, 0.5] first to bound the output - then invert and scale
    Lower raw score - higher normalised score.
    """
    clipped = np.clip(raw, -0.5, 0.5)
    return (0.5 - clipped)               # range [0, 1], 1 = outlier


def _normalise_lof(raw: np.ndarray) -> np.ndarray:
    """
    Clip to [-3, 0], invert, scale to [0, 1].
    Scores below -3 are treated as extremely anomalous.
    """
    clipped = np.clip(raw, -3.0, 3.0)
    anomaly = np.where(clipped < 0, -clipped / 3.0, 0.0)
    return np.clip(anomaly, 0.0, 1.0)             # range [0, 1], 1 = most anomalous


def _pick_artifact(
    models: dict,
    component: str,
) -> tuple[dict | None, str]:
    """
    Return artifact and source_label
    Exact component name - global fallback.
    """
    safe = str(component).replace("/", "_")
    if component in models:
        return models[component], "component"
    if safe in models:
        return models[safe], "component"
    if "global" in models:
        return models["global"], "global_fallback"
    return None, "no_model"



def build_reason(row: dict | pd.Series) -> str:
    reasons = []
    if row.get("error_ratio", 0) > 0.5 and row.get("total_logs", 0) > 20:
        reasons.append("high_absolute_error_rate")
    if row.get("error_ratio_zscore", 0) > 3:
        reasons.append("high_error_ratio_spike")
    if row.get("error_logs_zscore", 0) > 3:
        reasons.append("high_error_count_spike")
    if row.get("total_logs_zscore", 0) > 3:
        reasons.append("high_log_volume_spike")
    if row.get("total_logs_zscore", 0) < -3:
        reasons.append("log_volume_drop")
    if row.get("unique_message_ratio", 0) > 0.8 and row.get("total_logs", 0) > 20:
        reasons.append("message_pattern_shift")
    return ",".join(reasons) if reasons else "model_outlier"



def score_service(df: pd.DataFrame, artifact: dict) -> pd.DataFrame:

    scaler  = artifact["scaler"]
    iforest = artifact["iforest"]
    lof     = artifact.get("lof")

    X_df = df[FEATURE_COLUMNS].copy()
    X_df = X_df.replace([np.inf, -np.inf], np.nan)
    X_df = X_df.infer_objects(copy=False).fillna(0.0)
    X    = X_df.astype(float).values

    X_scaled = scaler.transform(X)
    X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=0.0, neginf=0.0)

    # IF
    iforest_raw   = iforest.decision_function(X_scaled)
    iforest_pred  = iforest.predict(X_scaled)
    iforest_norm  = _normalise_iforest(iforest_raw)

    # LOF
    if lof is not None:
        lof_raw  = lof.decision_function(X_scaled)
        lof_pred = lof.predict(X_scaled)
        lof_norm = _normalise_lof(lof_raw)
    else:
        lof_raw  = np.zeros(len(df))
        lof_pred = np.ones(len(df), dtype=int)
        lof_norm = np.zeros(len(df))

    out = df.copy()

    out["iforest_normal_score"] = 1.0 - iforest_norm
    out["lof_normal_score"]     = 1.0 - lof_norm

    # binary flags
    out["iforest_is_anomaly"] = (iforest_pred == -1).astype(int)
    out["lof_is_anomaly"]     = (lof_pred == -1).astype(int)

    #   1 = normal
    #   0 = anomalous
    combined_anomaly_score = (iforest_norm + lof_norm) / 2.0
    out["combined_normal_score"] = 1.0 - combined_anomaly_score

    # used by Worker B
    #   1 = anomalous
    #   0 = normal
    out["window_score"] = combined_anomaly_score

    # Z-score reliability flag
    out["zscore_reliable"] = (df["total_logs_roll_std_12"] > 0).astype(int)

    for col in ["total_logs_zscore", "error_logs_zscore", "error_ratio_zscore"]:
        out[col] = out[col].infer_objects(copy=False).fillna(0.0)

    # Reason per row
    out["anomaly_reason"] = out.apply(build_reason, axis=1)
    out.loc[out["zscore_reliable"] == 0, "anomaly_reason"] = (
        "insufficient_history|" + out.loc[out["zscore_reliable"] == 0, "anomaly_reason"]
    )

    # anomaly flag — OR of both models
    out["is_anomaly"] = (
        (out["iforest_is_anomaly"] == 1) | (out["lof_is_anomaly"] == 1)
    ).astype(int)

    # high abs error rate always flagged
    out.loc[
        (out["error_ratio"] > 0.5) & (out["total_logs"] > 20),
        "is_anomaly"
    ] = 1

    return out


def score_service_no_model(df: pd.DataFrame) -> pd.DataFrame:

    #Fallback scorer for components where no model exists at all (new start no data).

    out = df.copy()
    for col in [
        "iforest_normal_score",
        "lof_normal_score",
        "combined_normal_score",
        "window_score",
    ]:
        out[col] = 0.0
    out["iforest_is_anomaly"] = 0
    out["lof_is_anomaly"]     = 0
    out["zscore_reliable"]    = (df["total_logs_roll_std_12"] > 0).astype(int)

    for col in ["total_logs_zscore", "error_logs_zscore", "error_ratio_zscore"]:
        out[col] = out[col].fillna(0.0)

    out["anomaly_reason"] = "no_model"
    out["model_source"]   = "no_model"

    # apply hard rules
    out["is_anomaly"] = 0
    out.loc[
        (out.get("error_ratio", 0) > 0.5) & (out.get("total_logs", 0) > 20),
        "is_anomaly"
    ] = 1

    return out



def write_results(df: pd.DataFrame):
    client = bigquery.Client(project=PROJECT_ID)

    min_ts = df["bucket_start"].min()
    max_ts = df["bucket_start"].max()
    delete_query = f"""
        DELETE FROM `{OUTPUT_TABLE}`
        WHERE bucket_start BETWEEN '{min_ts}' AND '{max_ts}'
    """
    client.query(delete_query).result()
    print(f"Cleared existing rows for window {min_ts} → {max_ts}")

    keep_cols = [
        "bucket_start", "component",
        "total_logs", "error_logs", "warn_logs", "info_logs",
        "distinct_traces", "distinct_users", "distinct_messages", "distinct_categories",
        "error_ratio", "warn_ratio", "info_ratio", "trace_ratio", "user_ratio",
        "unique_message_ratio", "hour_of_day", "day_of_week",
        "total_logs_delta", "error_logs_delta", "error_ratio_delta",
        "total_logs_roll_mean_12", "total_logs_roll_std_12",
        "error_logs_roll_mean_12", "error_logs_roll_std_12",
        "error_ratio_roll_mean_12", "error_ratio_roll_std_12",
        "total_logs_zscore", "error_logs_zscore", "error_ratio_zscore",
        "iforest_normal_score", "iforest_is_anomaly",
        "lof_normal_score", "lof_is_anomaly",
        "combined_normal_score",
        "is_anomaly", "anomaly_reason", "zscore_reliable",
    ]

    result = df[[c for c in keep_cols if c in df.columns]].copy()

    float_cols = [
        "error_ratio", "warn_ratio", "info_ratio", "trace_ratio", "user_ratio",
        "unique_message_ratio", "total_logs_delta", "error_logs_delta", "error_ratio_delta",
        "total_logs_roll_mean_12", "total_logs_roll_std_12",
        "error_logs_roll_mean_12", "error_logs_roll_std_12",
        "error_ratio_roll_mean_12", "error_ratio_roll_std_12",
        "total_logs_zscore", "error_logs_zscore", "error_ratio_zscore",
        "iforest_normal_score",
        "lof_normal_score",
        "combined_normal_score",
    ]
    int_cols = [
        "total_logs", "error_logs", "warn_logs", "info_logs",
        "distinct_traces", "distinct_users", "distinct_messages", "distinct_categories",
        "hour_of_day", "day_of_week",
        "iforest_is_anomaly", "lof_is_anomaly", "is_anomaly", "zscore_reliable",
    ]

    result["bucket_start"]   = pd.to_datetime(result["bucket_start"], utc=True, errors="coerce")
    result["component"]      = result["component"].astype(str)
    result["anomaly_reason"] = result["anomaly_reason"].fillna("").astype(str)

    for col in float_cols:
        if col in result.columns:
            result[col] = pd.to_numeric(result[col], errors="coerce").astype(float)
    for col in int_cols:
        if col in result.columns:
            result[col] = pd.to_numeric(result[col], errors="coerce").fillna(0).astype("int64")

    schema = [
        bigquery.SchemaField("bucket_start",            "TIMESTAMP"),
        bigquery.SchemaField("component",               "STRING"),
        bigquery.SchemaField("total_logs",              "INT64"),
        bigquery.SchemaField("error_logs",              "INT64"),
        bigquery.SchemaField("warn_logs",               "INT64"),
        bigquery.SchemaField("info_logs",               "INT64"),
        bigquery.SchemaField("distinct_traces",         "INT64"),
        bigquery.SchemaField("distinct_users",          "INT64"),
        bigquery.SchemaField("distinct_messages",       "INT64"),
        bigquery.SchemaField("distinct_categories",     "INT64"),
        bigquery.SchemaField("error_ratio",             "FLOAT64"),
        bigquery.SchemaField("warn_ratio",              "FLOAT64"),
        bigquery.SchemaField("info_ratio",              "FLOAT64"),
        bigquery.SchemaField("trace_ratio",             "FLOAT64"),
        bigquery.SchemaField("user_ratio",              "FLOAT64"),
        bigquery.SchemaField("unique_message_ratio",    "FLOAT64"),
        bigquery.SchemaField("hour_of_day",             "INT64"),
        bigquery.SchemaField("day_of_week",             "INT64"),
        bigquery.SchemaField("total_logs_delta",        "FLOAT64"),
        bigquery.SchemaField("error_logs_delta",        "FLOAT64"),
        bigquery.SchemaField("error_ratio_delta",       "FLOAT64"),
        bigquery.SchemaField("total_logs_roll_mean_12", "FLOAT64"),
        bigquery.SchemaField("total_logs_roll_std_12",  "FLOAT64"),
        bigquery.SchemaField("error_logs_roll_mean_12", "FLOAT64"),
        bigquery.SchemaField("error_logs_roll_std_12",  "FLOAT64"),
        bigquery.SchemaField("error_ratio_roll_mean_12","FLOAT64"),
        bigquery.SchemaField("error_ratio_roll_std_12", "FLOAT64"),
        bigquery.SchemaField("total_logs_zscore",       "FLOAT64"),
        bigquery.SchemaField("error_logs_zscore",       "FLOAT64"),
        bigquery.SchemaField("error_ratio_zscore",      "FLOAT64"),
        bigquery.SchemaField("iforest_normal_score",    "FLOAT64"),
        bigquery.SchemaField("iforest_is_anomaly",      "INT64"),
        bigquery.SchemaField("lof_normal_score",        "FLOAT64"),
        bigquery.SchemaField("lof_is_anomaly",          "INT64"),
        bigquery.SchemaField("combined_normal_score",   "FLOAT64"),
        bigquery.SchemaField("is_anomaly",              "INT64"),
        bigquery.SchemaField("anomaly_reason",          "STRING"),
        bigquery.SchemaField("zscore_reliable",         "INT64"),
    ]

    job_config = bigquery.LoadJobConfig(
        schema=schema,
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        create_disposition=bigquery.CreateDisposition.CREATE_IF_NEEDED,
    )

    print("Preparing to write rows:", len(result))
    job = client.load_table_from_dataframe(result, OUTPUT_TABLE, job_config=job_config)
    try:
        job.result()
    except Exception:
        print("BigQuery load job failed")
        print("Job ID:", job.job_id)
        print("Job errors:", job.errors)
        raise
    print(f"Wrote {len(result)} rows to {OUTPUT_TABLE}")



def main():
    print("Starting scoring run...")

    df = load_recent_features()
    if df.empty:
        print("No recent feature rows found")
        return

    models = load_models()
    if not models:
        raise RuntimeError(
            f"No models found in: {APP_MODEL_DIR} or {LEGACY_MODEL_DIR}"
        )

    scored_parts = []

    for component, component_df in df.groupby("component"):
        if len(component_df) < MIN_BUCKETS_REQUIRED:
            print(f"Skipping {component}: only {len(component_df)} buckets (need {MIN_BUCKETS_REQUIRED})")
            continue

        artifact, source = _pick_artifact(models, component)

        if artifact is None:
            print(f"No model (not even global) for component={component} — using rule-only scoring")
            scored = score_service_no_model(component_df)
        else:
            print(f"Scoring {component} with model_source={source}")
            scored = score_service(component_df, artifact)
            scored["model_source"] = source

        scored_parts.append(scored)

    if not scored_parts:
        print("No components matched available models")
        return

    scored = pd.concat(scored_parts, ignore_index=True)
    write_results(scored)
    print("Done")


if __name__ == "__main__":
    main()