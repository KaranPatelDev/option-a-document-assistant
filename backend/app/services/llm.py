"""Thin wrapper around Groq's OpenAI-compatible Chat Completions API.

Groq is reached through the standard `openai` Python package pointed at Groq's
base_url — the wire protocol is OpenAI-compatible. Strict `json_schema` response
mode support varies by model on Groq, so we use the guaranteed-valid `json_object`
mode and additionally embed the target JSON schema in the system prompt so the
model knows the exact shape to produce; the response is then validated (and will
raise) against the real Pydantic schema, which is what actually enforces
correctness.

Every call logs model, latency, and token usage via stdlib logging so the AI
workflow has an auditable trail, per the assignment's "structured application and
AI-workflow logs" requirement.
"""

import json
import logging
import time

from openai import OpenAI
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger("app.llm")

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.groq_api_key, base_url=settings.groq_base_url)
    return _client


def call_structured(
    *,
    system: str,
    user_content: str,
    schema_model: type[BaseModel],
    max_tokens: int = 4096,
) -> BaseModel:
    """Call the LLM constrained to JSON output matching schema_model, and return a
    validated model instance."""
    client = get_client()
    schema = schema_model.model_json_schema()

    system_with_schema = (
        f"{system}\n\n"
        "Respond with ONLY a single JSON object (no prose, no markdown fences) that "
        f"conforms exactly to this JSON Schema:\n{json.dumps(schema)}"
    )

    started = time.monotonic()
    response = client.chat.completions.create(
        model=settings.groq_model,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_with_schema},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
    )
    elapsed_ms = int((time.monotonic() - started) * 1000)

    text = response.choices[0].message.content or "{}"
    parsed = schema_model.model_validate(json.loads(text))

    usage = response.usage
    logger.info(
        "llm_call",
        extra={
            "model": settings.groq_model,
            "schema": schema_model.__name__,
            "elapsed_ms": elapsed_ms,
            "finish_reason": response.choices[0].finish_reason,
            "input_tokens": usage.prompt_tokens if usage else None,
            "output_tokens": usage.completion_tokens if usage else None,
        },
    )
    return parsed
