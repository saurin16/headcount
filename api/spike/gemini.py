"""Phase 0a: Gemini via Vertex AI using gcloud ADC (no API key)."""
import json, os, time
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
from google import genai
from google.genai import types

client = genai.Client()
for model in ["gemini-2.5-flash", "gemini-2.5-pro"]:
    t0 = time.perf_counter()
    r = client.models.generate_content(
        model=model,
        contents="Tulsa metro demand percentile for Japanese Breakfast is 17 of 100. Proposed room 2800 seats. Verdict?",
        config=types.GenerateContentConfig(response_mime_type="application/json",
            response_schema={"type": "object", "properties": {"verdict": {"type": "string", "enum": ["GO", "RESIZE", "PASS"]}, "reason": {"type": "string"}}, "required": ["verdict", "reason"]}),
    )
    print(model, f"{time.perf_counter()-t0:.2f}s", json.loads(r.text))
