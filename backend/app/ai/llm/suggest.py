from app.ai.llm.ai_client import AiClient
from app.ai.prompts.prompt_loader import load_prompt
import json

EXCLUDED_FIELDS = {
    "log_id", "ingestion_id", "user_id", "inserted_at",
    "event_time", "source_bucket", "source_object",
    "entities", "model_source",
}

class LogSuggestionService:

    def __init__(self, client: AiClient):
        self.client = client

    def suggest(self, log: dict) -> dict:
        filtered = {k: v for k, v in log.items() if k not in EXCLUDED_FIELDS and v is not None}

        prompt = load_prompt("log_suggestion.md")
        prompt_filled = prompt.replace("{{LOG}}", json.dumps(filtered, indent=2))

        raw = self.client.generate(
            prompt_filled,
            temperature=0.3,
            max_output_tokens=1000,
        )

        return {
            "suggestion": raw.strip(),
            "priority": "high" if (log.get("anomaly_score") or 0) > 0.7 else "normal",
        }