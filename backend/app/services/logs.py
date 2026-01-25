from opensearchpy import OpenSearch
import uuid
from app.core.config import OPENSEARCH_HOST

client = OpenSearch(
    hosts=[{"host": OPENSEARCH_HOST, "port": 9200}],
    http_compress=True,
)

def index_log(log: dict):
    client.index(
        index="logs",
        id=str(uuid.uuid4()),
        body=log
    )
