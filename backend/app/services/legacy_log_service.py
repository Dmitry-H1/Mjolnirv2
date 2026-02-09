import json
import csv
import re
from datetime import datetime
from typing import List, Dict, Any
from ai.legacy_log_ai_service import LegacyLogAiService
from schemas.raw_log import RawLogSchema
import hashlib
from core.constants import LEGACY_LOG_SCHEMA_CONVERSION_SAMPLE_SIZE


class LegacyLogService:

    def __init__(self, ai_service: LegacyLogAiService):
        self.ai_service = ai_service

        # pattern_hash -> regex mapping
        self.pattern_cache: Dict[str, Dict[str, str]] = {}

        # temporary samples for unseen pattern
        self.sample_buffer: List[str] = []



    # parse files into valid schema json
    def parse_file(self, content: bytes, filename: str) -> List[Dict[str, Any]]:

        ext = filename.split(".")[-1].lower()
        decoded = content.decode("utf-8", errors="ignore")
        lines: List[str] = []

        if ext == "csv":
            # Treat CSV as raw logs in all columns
            reader = csv.DictReader(decoded.splitlines())
            for row in reader:
                lines.append(self._flatten_dict(row))

        elif ext in ["txt", "log"]:
            # For plain text, read each line as a log
            lines = [line for line in decoded.splitlines() if line.strip()]

        elif ext == "json":
            data = json.loads(decoded)
            if isinstance(data, list):
                for obj in data:
                    if isinstance(obj, dict):
                        lines.append(self._flatten_dict(obj))
                    elif isinstance(obj, str):
                        lines.append(obj)
            elif isinstance(data, dict):
                lines.append(self._flatten_dict(data))

        elif ext in ["ndjson", "jsonl"]:
            for line in decoded.splitlines():
                line = line.strip()
                if not line:
                    continue

                obj = json.loads(line)
                if isinstance(obj, dict):
                    lines.append(self._flatten_dict(obj))
                else:
                    lines.append(obj)

        else:
            raise ValueError(f"Unsupported legacy file type: {ext}")

        return self._parse_lines_with_sampling(lines)
    

    # convert json to RawLogSchema
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



    def _parse_lines_with_sampling(self, lines: List[str]) -> List[Dict[str, Any]]:
        
        parsed_logs: List[Dict[str, Any]] = []
        pending: List[str] = []

        for line in lines:
            print("INCOMING LINE")
            print(line)
            parsed = self._try_parse_with_cache(line)
            if parsed:
                parsed_logs.append(parsed)
                print("PARSED LOGS")
                print(parsed_logs)
            else:
                pending.append(line)
                print("PENDING")
                print(pending)

                if len(self.sample_buffer) >= LEGACY_LOG_SCHEMA_CONVERSION_SAMPLE_SIZE:
                    print("SAMPLE_BUFFER")
                    print(self.sample_buffer)
                    self._learn_new_pattern()

                    # retry buffered lines
                    still_pending = []
                    for p in pending:
                        parsed = self._try_parse_with_cache(p)
                        if parsed:
                            parsed_logs.append(parsed)
                            print("PARSED 2ND")
                            print(parsed_logs)
                        else:
                            still_pending.append(p)
                    pending = still_pending

        return parsed_logs
    



    def _try_parse_with_cache(self, line: str) -> Dict[str, Any] | None:
        for regex_map in self.pattern_cache.values():
            parsed = self._apply_regex(regex_map, line)
            if parsed:
                return parsed

        self.sample_buffer.append(line)
        return None
    


    def _apply_regex(self, regex_map: Dict[str, str], line: str) -> Dict[str, Any] | None:

        data: Dict[str, Any] = {}

        for field, regex in regex_map.items():
            match = re.search(regex, line)
            if not match:
                return None

            if field in match.groupdict():
                value = match.group(field)
            else:
                value = match.group(0)

            if field == "latency_ms":
                value = int(value) if value else None
            elif field == "timestamp":
                value = self._normalize_timestamp(value)

            data[field] = value

        data["raw_payload"] = line
        return data
    
    
    def _normalize_timestamp(self, value: str | None) -> datetime | None:
        if not value:
            return None

        for fmt in (
            "%Y-%m-%dT%H:%M:%S",   # ISO
            "%Y/%m/%d %H:%M:%S",   # legacy slash format
        ):
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue

        return None
        



    def _learn_new_pattern(self):
        samples = self.sample_buffer[:LEGACY_LOG_SCHEMA_CONVERSION_SAMPLE_SIZE]
        self.sample_buffer.clear()

        ai_structure = self.ai_service.extract_structure(samples)

        pattern_hash = self._hash_structure(ai_structure)
        self.pattern_cache[pattern_hash] = ai_structure["regex"]




    def _hash_structure(self, ai_structure: Dict[str, Any]) -> str:
        canonical = json.dumps(
            {
                "fields": ai_structure["fields"],
                "regex": ai_structure["regex"]
            },
            sort_keys=True
        )
        return hashlib.md5(canonical.encode()).hexdigest()
    

    
    def _flatten_dict(self, d: Dict[str, Any]) -> str:

        parts = []
        for k, v in d.items():
            if v is None:
                continue
            # For nested dicts/lists, convert to JSON string
            if isinstance(v, (dict, list)):
                value = json.dumps(v)
            else:
                value = str(v)
            parts.append(f"{k}={value}")
        return " ".join(parts)





