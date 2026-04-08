import os
import json
import joblib
import numpy as np
import pandas as pd

from google.cloud import bigquery
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler
from pathlib import Path

PROJECT_ID = os.getenv("PROJECT_ID", "mjolnir333")
DATASET = os.getenv("DATASET", "mjolnir_logs")
FEATURE_TABLE = f"{PROJECT_ID}.{DATASET}.log_features_5m"

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

print("Saving models to:", MODEL_DIR)

FEATURE_COLUMNS = [
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
]

MIN_ROWS_PER_SERVICE = 20
CONTAMINATION = 0.02


def load_training_data() -> pd.DataFrame:
    client = bigquery.Client(project=PROJECT_ID)
    query = f"""
    SELECT *
    FROM `{FEATURE_TABLE}`
    WHERE bucket_start >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    ORDER BY component, bucket_start
    """
    return client.query(query).to_dataframe()


def clean_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0

    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].replace([np.inf, -np.inf], np.nan)
    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].fillna(0.0)

    return df


def train_for_component(component_df: pd.DataFrame, component: str):
    X_df = component_df[FEATURE_COLUMNS].copy()

    # replace inf with NaN
    X_df = X_df.replace([np.inf, -np.inf], np.nan)
    X_df = X_df.fillna(0.0)

    X = X_df.astype(float).values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Safety check after scaling too
    X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=0.0, neginf=0.0)

    iforest = IsolationForest(
        n_estimators=200,
        contamination=0.1,
        random_state=42,
        n_jobs=-1
    )
    iforest.fit(X_scaled)

    lof = LocalOutlierFactor(
        n_neighbors=min(5, max(2, len(component_df) - 1)),
        contamination=0.1,
        novelty=True
    )
    lof.fit(X_scaled)

    artifact = {
        "component": component,
        "feature_columns": FEATURE_COLUMNS,
        "scaler": scaler,
        "iforest": iforest,
        "lof": lof,
    }

    safe_name = component.replace("/", "_")
    path = MODEL_DIR / f"{safe_name}.joblib"
    print("Writing model to:", path)
    joblib.dump(artifact, path)
    return path


def main():
    print("Starting training...")

    df = load_training_data()
    df = clean_features(df)

    print("Loaded rows:", len(df))
    print("Columns:", list(df.columns))

    if df.empty:
        print("ERROR: No data returned")
        return

    if "component" in df.columns:
        print("Unique components:", df["component"].nunique())
        print(df["component"].value_counts(dropna=False).head(20))
    else:
        print("ERROR: component column missing")
        return

    # Train one global model for now
    print("Training global model...")
    path = train_for_component(df, "global")
    print(f"Saved global model -> {path}")

    print("Done")


if __name__ == "__main__":
    main()