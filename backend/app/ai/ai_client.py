from pyexpat import model
from google.genai import Client
from typing import Optional

class AiClient:

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.client = Client(api_key=api_key)
        self.model = model

    def generate(self, prompt: str, temperature: Optional[float] = None, max_output_tokens: Optional[int] = None) -> str:
        # Build config only if parameters are not None
        config = {}
        if temperature is not None:
            config["temperature"] = temperature
        if max_output_tokens is not None:
            config["max_output_tokens"] = max_output_tokens

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            **({"config": config} if config else {})  # only pass config if not empty
        )
        return response.text
