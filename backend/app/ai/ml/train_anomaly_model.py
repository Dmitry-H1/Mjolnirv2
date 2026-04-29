import os
import json
import argparse
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

# classifier.py
CLASSIFIER_PATH = MODEL_DIR / "log_classifier.pkl"

print("Saving models to:", MODEL_DIR)
print("Classifier path:", CLASSIFIER_PATH)

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

TEXT_COLUMNS = [
    "log_line",
    "raw_log",
    "message",
    "log_message",
    "text",
    "body",
]

MIN_ROWS_PER_COMPONENT = 3
CONTAMINATION = 0.02
GLOBAL_COMPONENT = "global"


def safe_component_name(component: str) -> str:
    """Return a filesystem-safe component name."""
    return str(component).replace("/", "_").replace(" ", "_")


def model_path_for_component(component: str) -> Path:
    return MODEL_DIR / f"{safe_component_name(component)}.joblib"


def load_component_classifier(required: bool = False):
    if CLASSIFIER_PATH.exists():
        return joblib.load(CLASSIFIER_PATH)
    if required:
        raise FileNotFoundError(
            f"No classifier found at {CLASSIFIER_PATH}. Run classifier.py --train first, "
            "or set CLASSIFIER_PATH to the trained classifier."
        )
    print(f"[WARN] No classifier found at {CLASSIFIER_PATH}; using existing component column if present.")
    return None


def first_available_text_column(df: pd.DataFrame) -> str | None:
    for col in TEXT_COLUMNS:
        if col in df.columns:
            return col
    return None


def infer_components(df: pd.DataFrame, classifier=None, prefer_classifier: bool = True) -> pd.DataFrame:
    """
    Adds/overwrites df['component'] using the trained text classifier when a text column exists.
    Falls back to the existing component column when classification is not possible.
    """
    df = df.copy()
    text_col = first_available_text_column(df)

    if prefer_classifier and classifier is not None and text_col is not None:
        texts = df[text_col].fillna("").astype(str)
        non_empty = texts.str.strip().ne("")

        if non_empty.any():
            df.loc[non_empty, "component"] = classifier.predict(texts[non_empty].tolist())
            print(f"[INFO] Inferred component for {non_empty.sum()} rows using classifier column '{text_col}'.")
        else:
            print(f"[WARN] Text column '{text_col}' exists but all rows are empty.")

    if "component" not in df.columns:
        raise ValueError(
            "No component column available and no usable text column was found for classifier inference. "
            f"Expected one of: {TEXT_COLUMNS}"
        )

    df["component"] = df["component"].fillna(GLOBAL_COMPONENT).astype(str)
    return df


def load_training_data() -> pd.DataFrame:
    client = bigquery.Client(project=PROJECT_ID)
    query = f"""
    SELECT *
    FROM `{FEATURE_TABLE}`
    WHERE bucket_start >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    ORDER BY bucket_start
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
    X_df = X_df.replace([np.inf, -np.inf], np.nan).fillna(0.0)
    X = X_df.astype(float).values

    print(f"Training {component!r} on {len(X)} rows, {X.shape[1]} features")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=0.0, neginf=0.0)

    iforest = IsolationForest(
        n_estimators=200,
        contamination=CONTAMINATION,
        random_state=42,
        n_jobs=-1,
    )
    iforest.fit(X_scaled)

    lof = LocalOutlierFactor(
        n_neighbors=min(5, max(2, len(component_df) - 1)),
        contamination=CONTAMINATION,
        novelty=True,
    )
    lof.fit(X_scaled)

    artifact = {
        "component": component,
        "feature_columns": FEATURE_COLUMNS,
        "scaler": scaler,
        "iforest": iforest,
        "lof": lof,
        "training_rows": len(component_df),
        "contamination": CONTAMINATION,
    }

    path = model_path_for_component(component)
    joblib.dump(artifact, path)
    print(f"Saved model → {path}")
    return path


def train_models(prefer_classifier: bool = True):
    print("Starting training...")

    classifier = load_component_classifier(required=prefer_classifier)
    df = load_training_data()
    df = clean_features(df)
    df = infer_components(df, classifier=classifier, prefer_classifier=prefer_classifier)

    print("Loaded rows:", len(df))
    print("Columns:", list(df.columns))

    if df.empty:
        print("ERROR: No data returned")
        return []

    print("Unique components:", df["component"].nunique())
    print(df["component"].value_counts(dropna=False).head(50))

    saved_paths = []

    # always train a fallback global
    print("\nTraining fallback global model...")
    saved_paths.append(train_for_component(df, GLOBAL_COMPONENT))

    # Train one anomaly model per inferred component.
    for component, component_df in df.groupby("component"):
        if component == GLOBAL_COMPONENT:
            continue
        if len(component_df) < MIN_ROWS_PER_COMPONENT:
            print(
                f"[WARN] Skipping {component!r}: only {len(component_df)} rows; "
                f"need at least {MIN_ROWS_PER_COMPONENT}."
            )
            continue
        saved_paths.append(train_for_component(component_df, component))

    print("Done")
    return saved_paths


def load_anomaly_artifact(component: str):
    path = model_path_for_component(component)
    if path.exists():
        return joblib.load(path)

    fallback_path = model_path_for_component(GLOBAL_COMPONENT)
    if fallback_path.exists():
        print(f"[WARN] No model for component {component!r}; falling back to global model.")
        return joblib.load(fallback_path)

    raise FileNotFoundError(
        f"No anomaly model found for {component!r} and no global fallback at {fallback_path}. "
        "Run training first."
    )


def score_with_artifact(rows_df: pd.DataFrame, artifact: dict) -> pd.DataFrame:
    feature_columns = artifact["feature_columns"]
    X_df = rows_df.copy()
    for col in feature_columns:
        if col not in X_df.columns:
            X_df[col] = 0.0

    X_df = X_df[feature_columns].replace([np.inf, -np.inf], np.nan).fillna(0.0)
    X = X_df.astype(float).values
    X_scaled = artifact["scaler"].transform(X)
    X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=0.0, neginf=0.0)

    result = rows_df.copy()
    result["model_component"] = artifact["component"]

    # higher anomaly_score means more anomalous.
    result["iforest_anomaly_score"] = -artifact["iforest"].score_samples(X_scaled)
    result["iforest_is_anomaly"] = artifact["iforest"].predict(X_scaled) == -1

    result["lof_anomaly_score"] = -artifact["lof"].score_samples(X_scaled)
    result["lof_is_anomaly"] = artifact["lof"].predict(X_scaled) == -1

    result["ensemble_anomaly_score"] = (
        result["iforest_anomaly_score"] + result["lof_anomaly_score"]
    ) / 2.0
    result["is_anomaly"] = result["iforest_is_anomaly"] | result["lof_is_anomaly"]
    return result


def score_dataframe(df: pd.DataFrame, prefer_classifier: bool = True) -> pd.DataFrame:
    """
    Determine component with the classifier, then score each row using that component's model.
    """
    classifier = load_component_classifier(required=prefer_classifier)
    df = clean_features(df)
    df = infer_components(df, classifier=classifier, prefer_classifier=prefer_classifier)

    scored_parts = []
    for component, component_df in df.groupby("component", dropna=False):
        artifact = load_anomaly_artifact(component)
        scored_parts.append(score_with_artifact(component_df, artifact))

    return pd.concat(scored_parts, ignore_index=True) if scored_parts else pd.DataFrame()


def score_json(input_json: str):
    """
    Score one JSON row from the command line.
    Example:
      python train_anomaly_model.py --score-json '{"message":"...","total_logs":10,"error_logs":1}'
    """
    row = json.loads(input_json)
    scored = score_dataframe(pd.DataFrame([row]))
    print(scored.to_json(orient="records", date_format="iso", indent=2))


def main():
    parser = argparse.ArgumentParser(description="Train and score component-specific log anomaly models")
    parser.add_argument("--train", action="store_true", help="Train global and component-specific anomaly models")
    parser.add_argument("--score-json", metavar="JSON", help="Score one feature row represented as JSON")
    parser.add_argument(
        "--use-existing-component",
        action="store_true",
        help="Do not use the classifier; use the existing component column instead",
    )
    args = parser.parse_args()

    prefer_classifier = not args.use_existing_component

    if args.train:
        train_models(prefer_classifier=prefer_classifier)
    elif args.score_json:
        score_json(args.score_json)
    else:
        parser.error("Provide --train or --score-json")


if __name__ == "__main__":
    main()
