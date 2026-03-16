import joblib
import pandas as pd

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression


def train():

    df = pd.read_csv("training_logs.csv")

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(max_features=5000, ngram_range=(1,2))),
        ("clf", LogisticRegression(max_iter=1000))
    ])

    pipeline.fit(
        df["normalized_message"],
        df["severity"]
    )

    joblib.dump(
        pipeline,
        "ai/ml/severity_model.pkl"
    )

    print("Severity model trained")
