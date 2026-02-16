import joblib
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


def train():

    df = pd.read_csv("training_logs.csv")

    # columns:
    # normalized_message, category

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(max_features=5000, ngram_range=(1,2))),
        ("clf", LogisticRegression(max_iter=1000))
    ])
    
    pipeline.fit(
        df["normalized_message"],
        df["category"]
    )

    joblib.dump(
        pipeline,
        "ai/ml/category_model.pkl"
    )

    print("Category model trained")


if __name__ == "__main__":
    train()
