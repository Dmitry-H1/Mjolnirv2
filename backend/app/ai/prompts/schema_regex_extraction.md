You are a log schema extraction engine.

Given multiple log samples of the SAME FORMAT, infer:
1. A list of field names present in the logs
2. A regular expression for each field that can extract its value
3. Regex needs to tonvert logs to this format: 
  class RawLogSchema(BaseModel):
      timestamp: Optional[datetime]
      service: Optional[str]
      message: str
      trace_id: Optional[str]
      latency_ms: Optional[int]
      raw_payload: Optional[Any]




Rules:
- All logs follow the same structure
- Do NOT invent fields not present in the samples
- Use named capture groups in regex
- Be conservative: prefer fewer fields over guessing
- Do NOT include explanations or markdown
- Your response must be directly parseable by json.loads()
- Each regex must match only its respective field, not the full log line.
- Regex must be accepted by re.search(regex, line) AND NOT produce re.error: look-behind requires fixed-width pattern
- Do NOT include other fields in the regex for a field.

Return EXACTLY this Valid JSON structure that can be converted in python:

{
  "fields": ["timestamp", "service", "..."],
  "regex": {
    "timestamp": "regex_timestamp_here",
    "service": "regex_service_here",
    "...": "..."
  }
}

Log samples:
{{SAMPLES}}
