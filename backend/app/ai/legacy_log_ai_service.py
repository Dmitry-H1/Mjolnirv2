from ai.ai_client import AiClient
from typing import List, Dict, Any
import json

from ai.prompts.prompt_loader import load_prompt


class LegacyLogAiService:

    def __init__(self, client: AiClient):
        self.client = client

    def extract_structure(self, samples: List[str]) -> Dict[str, Any]:
        samples_block = "\n".join(samples)

        prompt = load_prompt("schema_regex_extraction.md")
        prompt_filled = prompt.replace("{{SAMPLES}}", samples_block)

        raw = self.client.generate(
            prompt_filled,
            temperature=0.4
        )


        # Make sure json is being returned
        start = raw.find("{")
        end = raw.rfind("}") + 1

        print(raw[start:end])

        try:
            return json.loads(raw[start:end])
        except json.JSONDecodeError:
            raise ValueError(f"AI returned invalid JSON:\n{raw[start:end]}")
        

        # TESTING
        '''
        cached_schema = {
        "fields": ["timestamp", "service", "message", "trace_id", "latency_ms"],
        "regex": {
            "timestamp": "^(?P<timestamp>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2})",
            "service": "^(?:\\S+\\s+)(?P<service>\\S+)",
            "message": "^(?:\\S+\\s+\\S+\\s+)(?P<message>.+?)(?=\\s+[a-zA-Z0-9]+\\s+\\d+|$)",
            "trace_id": "(?P<trace_id>[a-zA-Z0-9]+)?",
            "latency_ms": "(?P<latency_ms>\\d+)?$"
            }
        }

        return cached_schema'''



    