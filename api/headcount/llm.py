"""Gemini helper: structured JSON output into a Pydantic model."""
import os
import time
from functools import lru_cache
from typing import TypeVar

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

FLASH = os.environ.get("HEADCOUNT_FLASH_MODEL", "gemini-3.8-flash")
PRO = os.environ.get("HEADCOUNT_PRO_MODEL", "gemini-3.1-pro-preview")

T = TypeVar("T", bound=BaseModel)


@lru_cache
def _client() -> genai.Client:
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"],
                        http_options=types.HttpOptions(timeout=90_000))


async def ask(model: str, system: str, prompt: str, schema: type[T]) -> tuple[T, int]:
    """Returns (parsed object, latency ms)."""
    cfg = types.GenerateContentConfig(
        system_instruction=system,
        response_mime_type="application/json",
        response_schema=schema,
        temperature=0.2,
        # Flash runs agent steps, so keep it fast; Pro keeps its default reasoning.
        thinking_config=types.ThinkingConfig(thinking_budget=0) if model == FLASH else None,
    )
    t0 = time.perf_counter()
    r = await _client().aio.models.generate_content(model=model, contents=prompt, config=cfg)
    return schema.model_validate_json(r.text), int((time.perf_counter() - t0) * 1000)
