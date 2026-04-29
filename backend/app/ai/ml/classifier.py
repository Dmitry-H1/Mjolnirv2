import argparse
import joblib
import pandas as pd
from pathlib import Path
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
 

FILE_COMPONENT_MAP = {
    "logs/Android_2k.log": "Android",
    "logs/Apache_2k.log":  "Apache",
    "logs/Hadoop_2k.log":     "Hadoop",
    "logs/HDFS_2k.log":          "Hadoop Distributed File System",
    "logs/Linux_2k.log":     "OS",
    "logs/Mac_2k.log": "OS",
    "logs/OpenSSH_2k.log":  "OpenSSH",
    "logs/OpenStack_2k.log":  "OpenStack Infra",
    "logs/Spark_2k.log":  "Spark",
    "logs/Windows_2k.log":  "OS",
    "logs/Zookeeper_2k.log":  "Zookeeper",
}
 
MODEL_PATH = "log_classifier.pkl"
 
 

def load_dataset(file_map: dict) -> pd.DataFrame:
    samples = []
    for filepath, label in file_map.items():
        path = Path(filepath)
        if not path.exists():
            print(f"[WARN] File not found, skipping: {filepath}")
            continue
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line:
                    samples.append({"text": line, "label": label})
    if not samples:
        raise ValueError("No samples loaded. Check your FILE_COMPONENT_MAP paths.")
    df = pd.DataFrame(samples)
    print(f"[INFO] Loaded {len(df)} log lines across {df['label'].nunique()} components:")
    print(df["label"].value_counts().to_string())
    return df
 
 
def train(file_map: dict):
    df = load_dataset(file_map)
 
    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], df["label"],
        test_size=0.2,
        stratify=df["label"],
        random_state=42
    )
 
    model = Pipeline([
        # char_wb n-grams - structural log patterns 
        ("tfidf", TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(3, 6),
            max_features=100_000,
            sublinear_tf=True
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=5.0,
            class_weight="balanced"
        ))
    ])
 
    print("\n[INFO] Training model...")
    model.fit(X_train, y_train)
 
    print("\n[INFO] Evaluation on held-out test set:")
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred))
 
    joblib.dump(model, MODEL_PATH)
    print(f"[INFO] Model saved to: {MODEL_PATH}")
 
 

def load_model():
    if not Path(MODEL_PATH).exists():
        raise FileNotFoundError(
            f"No trained model found at '{MODEL_PATH}'. Run with --train first."
        )
    return joblib.load(MODEL_PATH)
 
 
def classify_file(filepath: str):
    model = load_model()
    path = Path(filepath)
    if not path.exists():
        print(f"[ERROR] File not found: {filepath}")
        return
 
    results = {}
    lines = []
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if line:
                lines.append(line)
 
    if not lines:
        print("[WARN] File is empty.")
        return
 
    predictions = model.predict(lines)
 
    # tally votes — majority component wins 
    vote_series = pd.Series(predictions)
    vote_counts = vote_series.value_counts()
    top_component = vote_counts.index[0]
    confidence = vote_counts.iloc[0] / len(predictions)
 
    print(f"\n[RESULT] File: {filepath}")
    print(f"  Detected component : {top_component}")
    print(f"  Confidence         : {confidence:.1%} of lines matched")
    print(f"\n  Full vote breakdown:")
    for component, count in vote_counts.items():
        print(f"    {component:<20} {count} lines ({count/len(predictions):.1%})")
 
    return top_component
 
 
def classify_line(log_line: str):
    model = load_model()
    prediction = model.predict([log_line])[0]
    proba = model.predict_proba([log_line])[0]
    classes = model.classes_
    print(f"\n[RESULT] Line: {log_line[:80]}...")
    print(f"  Detected component: {prediction}")
    print(f"  Probabilities:")
    for cls, prob in sorted(zip(classes, proba), key=lambda x: -x[1]):
        print(f"    {cls:<20} {prob:.1%}")
    return prediction
 
 

def main():
    parser = argparse.ArgumentParser(description="Log Component Classifier")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--train", action="store_true",
                       help="Train the model from FILE_COMPONENT_MAP")
    group.add_argument("--classify", metavar="FILE",
                       help="Classify all lines in a new log file")
    group.add_argument("--classify-line", metavar="LINE",
                       help="Classify a single log line string")
    args = parser.parse_args()
 
    if args.train:
        train(FILE_COMPONENT_MAP)
    elif args.classify:
        classify_file(args.classify)
    elif args.classify_line:
        classify_line(args.classify_line)
 
 
if __name__ == "__main__":
    main()
 