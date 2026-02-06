import json
import csv
import re
from datetime import datetime
from typing import List, Dict, Any, Union
from app.schemas.raw_log import RawLogSchema

class LegacyLogService:
    """
    Parse messy legacy logs from text, CSV, JSON, or NDJSON and normalize to RawLogSchema.
    """

    TIMESTAMP_REGEX = r"\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b"
    SERVICE_REGEX = r"(?:service[:=]\s*([\w\-\_]+)|\[(\w+)\])"
    TRACE_ID_REGEX = r"(?:trace_id[:=]\s*([\w\.\-]+)|TRACE[:=]\s*([\w\.\-]+))"
    LATENCY_REGEX = r"latency[:=]?\s*(\d+(?:\.\d+)?)\s*(ms|s)?"


    def parse_line(self, line: str) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        result["raw_payload"] = line

        # Timestamp
        ts_match = re.search(self.TIMESTAMP_REGEX, line)
        if ts_match:
            try:
                result["timestamp"] = datetime.fromisoformat(ts_match.group(0))
            except Exception:
                pass

        # Service
        service_match = re.search(self.SERVICE_REGEX, line)
        if service_match:
            # Either service=NAME or [NAME]
            result["service"] = service_match.group(1) or service_match.group(2)

        # Trace ID
        trace_match = re.search(self.TRACE_ID_REGEX, line)
        if trace_match:
            result["trace_id"] = trace_match.group(1) or trace_match.group(2)

        # Latency
        latency_match = re.search(self.LATENCY_REGEX, line)
        if latency_match:
            try:
                result["latency_ms"] = int(float(latency_match.group(1)))
            except Exception:
                pass

        # Build message by removing structured parts
        message = line
        for m in [ts_match, service_match, trace_match, latency_match]:
            if m:
                message = message.replace(m.group(0), "")
        result["message"] = message.strip()

        return result

    def parse_file(self, content: bytes, filename: str) -> List[Dict[str, Any]]:

        ext = filename.split(".")[-1].lower()
        decoded = content.decode("utf-8", errors="ignore")
        lines: List[str] = []

        if ext == "csv":
            # Treat CSV as raw logs in all columns
            reader = csv.DictReader(decoded.splitlines())
            for row in reader:
                lines.append(" ".join(str(v) for v in row.values()))

        elif ext == "txt":
            # For plain text, read each line as a log
            lines = [line for line in decoded.splitlines() if line.strip()]

        elif ext == "json":
            data = json.loads(decoded)
            if isinstance(data, list):
                for obj in data:
                    if isinstance(obj, dict):
                        lines.append(" ".join(str(v) for v in obj.values()))
                    elif isinstance(obj, str):
                        lines.append(obj)
            elif isinstance(data, dict):
                lines.append(" ".join(str(v) for v in data.values()))

        elif ext in ["ndjson", "jsonl"]:
            lines = [line for line in decoded.splitlines() if line.strip()]

        else:
            raise ValueError(f"Unsupported legacy file type: {ext}")

        # Parse each line with regex
        return [self.parse_line(line) for line in lines]

    def to_raw_schema(self, logs: List[Dict[str, Any]]) -> List[RawLogSchema]:
        """
        Convert parsed dictionaries into validated RawLogSchema objects.
        """
        result = []
        for log in logs:
            try:
                result.append(RawLogSchema(**log))
            except Exception as e:
                print(f"Skipping invalid log: {log} -> {e}")
        return result