import os
import glob
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from google.cloud import bigquery

PROJECT_ID = os.getenv("PROJECT_ID", "mjolnir333")
DATASET = os.getenv("DATASET", "mjolnir_logs")
FEATURE_TABLE = f"{PROJECT_ID}.{DATASET}.log_features_5m"
OUTPUT_TABLE = f"{PROJECT_ID}.{DATASET}.log_anomaly_scores"
APP_MODEL_DIR = Path(__file__).resolve().parents[1] / "ai" / "ml" / "models"
LEGACY_MODEL_DIR = Path(__file__).resolve().parents[2] / "ai" / "ml" / "models"


def get_model_dir() -> Path:
    if APP_MODEL_DIR.exists():
        return APP_MODEL_DIR
    return LEGACY_MODEL_DIR


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
    print("Columns:", list(df.columns))
    return df


def load_models():
    models = {}
    model_dir = get_model_dir()

    print("MODEL_DIR:", model_dir)
    print("MODEL_DIR exists:", model_dir.exists())
    print("APP_MODEL_DIR:", APP_MODEL_DIR)
    print("LEGACY_MODEL_DIR:", LEGACY_MODEL_DIR)

    files = list(model_dir.glob("*.joblib"))
    print("Found model files:", [str(f) for f in files])

    for path in files:
        component = path.stem
        models[component] = joblib.load(path)

    return models


def score_service(df: pd.DataFrame, artifact: dict) -> pd.DataFrame:
    feature_columns = artifact["feature_columns"]
    scaler = artifact["scaler"]
    iforest = artifact["iforest"]
    lof = artifact.get("lof")  # may be None

    X_df = df[feature_columns].copy()
    X_df = X_df.replace([np.inf, -np.inf], np.nan).fillna(0.0)
    X = X_df.astype(float).values

    X_scaled = scaler.transform(X)
    X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=0.0, neginf=0.0)

    # Isolation Forest
    iforest_normal_score = iforest.decision_function(X_scaled)
    iforest_pred = iforest.predict(X_scaled)

    # LOF
    if lof is not None:
        lof_normal_score = lof.decision_function(X_scaled)
        lof_pred = lof.predict(X_scaled)
    else:
        lof_normal_score = np.zeros(len(df))
        lof_pred = np.ones(len(df), dtype=int)  # +1 means normal

    out = df.copy()
    out["iforest_normal_score"] = iforest_normal_score
    out["iforest_is_anomaly"] = (iforest_pred == -1).astype(int)

    out["lof_normal_score"] = lof_normal_score
    out["lof_is_anomaly"] = (lof_pred == -1).astype(int)

    out["combined_normal_score"] = (
        out["iforest_normal_score"] + out["lof_normal_score"]
    ) / 2.0

    out["is_anomaly"] = (
        (out["iforest_is_anomaly"] == 1) | (out["lof_is_anomaly"] == 1)
    ).astype(int)

    def build_reason(row):
        reasons = []
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

    out["anomaly_reason"] = out.apply(build_reason, axis=1)
    return out


def write_results(df: pd.DataFrame):
    client = bigquery.Client(project=PROJECT_ID)

    keep_cols = [
        "bucket_start",
        "component",
        "total_logs",
        "error_logs",
        "warn_logs",
        "info_logs",
        "distinct_traces",
        "distinct_users",
        "distinct_messages",
        "distinct_categories",
        "error_ratio",
        "warn_ratio",
        "info_ratio",
        "trace_ratio",
        "user_ratio",
        "unique_message_ratio",
        "hour_of_day",
        "day_of_week",
        "total_logs_delta",
        "error_logs_delta",
        "error_ratio_delta",
        "total_logs_roll_mean_12",
        "total_logs_roll_std_12",
        "error_logs_roll_mean_12",
        "error_logs_roll_std_12",
        "error_ratio_roll_mean_12",
        "error_ratio_roll_std_12",
        "total_logs_zscore",
        "error_logs_zscore",
        "error_ratio_zscore",
        "iforest_normal_score",
        "iforest_is_anomaly",
        "lof_normal_score",
        "lof_is_anomaly",
        "combined_normal_score",
        "is_anomaly",
        "anomaly_reason",
    ]

    result = df[keep_cols].copy()
    float_cols = [
        "error_ratio",
        "warn_ratio",
        "info_ratio",
        "trace_ratio",
        "user_ratio",
        "unique_message_ratio",
        "total_logs_delta",
        "error_logs_delta",
        "error_ratio_delta",
        "total_logs_roll_mean_12",
        "total_logs_roll_std_12",
        "error_logs_roll_mean_12",
        "error_logs_roll_std_12",
        "error_ratio_roll_mean_12",
        "error_ratio_roll_std_12",
        "total_logs_zscore",
        "error_logs_zscore",
        "error_ratio_zscore",
        "iforest_normal_score",
        "lof_normal_score",
        "combined_normal_score",
    ]
    int_cols = [
        "total_logs",
        "error_logs",
        "warn_logs",
        "info_logs",
        "distinct_traces",
        "distinct_users",
        "distinct_messages",
        "distinct_categories",
        "hour_of_day",
        "day_of_week",
        "iforest_is_anomaly",
        "lof_is_anomaly",
        "is_anomaly",
    ]

    result["bucket_start"] = pd.to_datetime(result["bucket_start"], utc=True, errors="coerce")
    result["component"] = result["component"].astype(str)
    result["anomaly_reason"] = result["anomaly_reason"].fillna("").astype(str)

    for col in float_cols:
        result[col] = pd.to_numeric(result[col], errors="coerce").astype(float)

    for col in int_cols:
        result[col] = pd.to_numeric(result[col], errors="coerce").fillna(0).astype("int64")

    schema = [
        bigquery.SchemaField("bucket_start", "TIMESTAMP"),
        bigquery.SchemaField("component", "STRING"),
        bigquery.SchemaField("total_logs", "INT64"),
        bigquery.SchemaField("error_logs", "INT64"),
        bigquery.SchemaField("warn_logs", "INT64"),
        bigquery.SchemaField("info_logs", "INT64"),
        bigquery.SchemaField("distinct_traces", "INT64"),
        bigquery.SchemaField("distinct_users", "INT64"),
        bigquery.SchemaField("distinct_messages", "INT64"),
        bigquery.SchemaField("distinct_categories", "INT64"),
        bigquery.SchemaField("error_ratio", "FLOAT64"),
        bigquery.SchemaField("warn_ratio", "FLOAT64"),
        bigquery.SchemaField("info_ratio", "FLOAT64"),
        bigquery.SchemaField("trace_ratio", "FLOAT64"),
        bigquery.SchemaField("user_ratio", "FLOAT64"),
        bigquery.SchemaField("unique_message_ratio", "FLOAT64"),
        bigquery.SchemaField("hour_of_day", "INT64"),
        bigquery.SchemaField("day_of_week", "INT64"),
        bigquery.SchemaField("total_logs_delta", "FLOAT64"),
        bigquery.SchemaField("error_logs_delta", "FLOAT64"),
        bigquery.SchemaField("error_ratio_delta", "FLOAT64"),
        bigquery.SchemaField("total_logs_roll_mean_12", "FLOAT64"),
        bigquery.SchemaField("total_logs_roll_std_12", "FLOAT64"),
        bigquery.SchemaField("error_logs_roll_mean_12", "FLOAT64"),
        bigquery.SchemaField("error_logs_roll_std_12", "FLOAT64"),
        bigquery.SchemaField("error_ratio_roll_mean_12", "FLOAT64"),
        bigquery.SchemaField("error_ratio_roll_std_12", "FLOAT64"),
        bigquery.SchemaField("total_logs_zscore", "FLOAT64"),
        bigquery.SchemaField("error_logs_zscore", "FLOAT64"),
        bigquery.SchemaField("error_ratio_zscore", "FLOAT64"),
        bigquery.SchemaField("iforest_normal_score", "FLOAT64"),
        bigquery.SchemaField("iforest_is_anomaly", "INT64"),
        bigquery.SchemaField("lof_normal_score", "FLOAT64"),
        bigquery.SchemaField("lof_is_anomaly", "INT64"),
        bigquery.SchemaField("combined_normal_score", "FLOAT64"),
        bigquery.SchemaField("is_anomaly", "INT64"),
        bigquery.SchemaField("anomaly_reason", "STRING"),
    ]
    job_config = bigquery.LoadJobConfig(
        schema=schema,
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        create_disposition=bigquery.CreateDisposition.CREATE_IF_NEEDED,
    )

    print("Preparing to write rows:", len(result))
    print("Write dataframe dtypes:", result.dtypes.astype(str).to_dict())

    job = client.load_table_from_dataframe(result, OUTPUT_TABLE, job_config=job_config)
    try:
        job.result()
    except Exception:
        print("BigQuery load job failed")
        print("Job ID:", job.job_id)
        print("Job state:", job.state)
        print("Job errors:", job.errors)
        raise
    print(f"Wrote {len(result)} rows to {OUTPUT_TABLE}")


def main():
    df = load_recent_features()
    if df.empty:
        print("No recent feature rows found")
        return

    models = load_models()
    if not models:
        raise RuntimeError(
            f"No models found in model directories: {APP_MODEL_DIR} or {LEGACY_MODEL_DIR}"
        )

    scored_parts = []

    for component, component_df in df.groupby("component"):
        #component specific model (didnt work)
        safe_component = str(component).replace("/", "_")
        artifact = models.get(component) or models.get(safe_component)

        #global model
        if artifact is None:
            artifact = models.get("global")

        if artifact is None:
            print(f"No model found for component={component}, skipping")
            continue

        scored_parts.append(score_service(component_df, artifact))

    if not scored_parts:
        print("No components matched available models")
        return

    scored = pd.concat(scored_parts, ignore_index=True)
    write_results(scored)


if __name__ == "__main__":
    main()
