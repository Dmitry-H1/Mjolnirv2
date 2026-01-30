from opensearchpy import OpenSearch
import uuid
from app.core.config import OPENSEARCH_HOST
import os

"""
client = OpenSearch(
    hosts=[{"host": OPENSEARCH_HOST, "port": 9200}],
    http_compress=True,
)
"""

client = OpenSearch(
    hosts=[{"host": "localhost", "port": 9200}], 
    http_compress=True,
)

# This builds the path regardless of where you run the script from
base_path = r"C:\Users\Nick\OneDrive - La Salle University\381 Capstone\Mjolnir3\Mjolnirv2\backend\app\services"
log_file_path = os.path.join(base_path, "rawlogs", "raw_logs.txt")

"""
def index_log(log: dict):
    client.index(
        index="logs",
        id=str(uuid.uuid4()),
        body=log
    )
"""

def index_log(log_dict: dict):
    return client.index(
        index="logs",
        id=str(uuid.uuid4()),
        body=log_dict
    )

keys = ["timestamp", "service", "severity", "message", "trace_id", "latency_ms"]

if os.path.exists(log_file_path):
    with open(log_file_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:  # Skip empty lines
                continue
                
            values = [v.strip() for v in line.split(',')]
            
            if len(values) == len(keys):
                log_entry = dict(zip(keys, values))
                log_entry["latency_ms"] = int(log_entry["latency_ms"])
                
                # Send to OpenSearch
                try:
                    response = index_log(log_entry)
                    print(f"Indexed {log_entry['trace_id']}: {response['result']}")
                except Exception as e:
                    print(f"Failed to index {log_entry['trace_id']}: {e}")
else:
    print(f"Error: Could not find the file at {log_file_path}")