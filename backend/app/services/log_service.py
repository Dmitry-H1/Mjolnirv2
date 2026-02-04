import csv
import json
from typing import List, Dict, Union
from datetime import datetime
from pydantic import ValidationError
from schemas.raw_log import RawLogSchema


class LogService:
    def __init__(self, allowed_types: List[str] = None):
        self.allowed_types = allowed_types or ["csv", "txt", "json", "ndjson"]

    # ---------------- Public method for API ----------------
    def parse_logs(self, logs: List[Union[RawLogSchema, Dict]]) -> List[RawLogSchema]:
        """
        Accepts a list of dicts or RawLogSchema objects.
        Returns a list of validated RawLogSchema objects.
        """
        result = []

        for log in logs:
            if isinstance(log, RawLogSchema):
                result.append(log)
            elif isinstance(log, dict):
                try:
                    result.append(RawLogSchema(**log))  
                except Exception as e:
                    print(f"Skipping invalid log: {log} -> {e}")

        return result

    def parse_logs_from_file(self, content: bytes, filename: str) -> List[RawLogSchema]:

        ext = filename.split(".")[-1].lower()
        if ext not in self.allowed_types:
            raise ValueError(f"Unsupported file type: {ext}")

        decoded = content.decode("utf-8", errors="ignore")
        log_dicts: List[Dict] = []

        # CSV / TXT: use csv.DictReader
        if ext in ["csv", "txt"]:
            reader = csv.DictReader(decoded.splitlines())
            log_dicts = [dict(row) for row in reader]

        # JSON: expect a list of objects
        elif ext == "json":
            data = json.loads(decoded)
            if isinstance(data, list):
                log_dicts = data
            else:
                raise ValueError("JSON must contain a list of log objects.")

        # NDJSON / JSONL: each line is a JSON object
        elif ext in ["ndjson", "jsonl"]:
            log_dicts = [json.loads(line) for line in decoded.splitlines() if line.strip()]

        return self.parse_logs(log_dicts)
