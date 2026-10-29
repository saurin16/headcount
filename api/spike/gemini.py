"""Phase 0a: Gemini via AI Studio API key (Vertex had no model access for a new project)."""
import json, os, time
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
for model in ["gemini-3.8-flash", "gemini-3.1-pro-preview"]:
    t0 = time.perf_counter()
    r = client.models.generate_content(
        model=model,
        contents="Tulsa metro demand percentile for Japanese Breakfast is 17 of 100. Proposed room 2800 seats. Verdict?",
        config=types.GenerateContentConfig(response_mime_type="application/json",
            response_schema={"type": "object", "properties": {"verdict": {"type": "string", "enum": ["GO", "RESIZE", "PASS"]}, "reason": {"type": "string"}}, "required": ["verdict", "reason"]}),
    )
    print(model, f"{time.perf_counter()-t0:.2f}s", json.loads(r.text))
