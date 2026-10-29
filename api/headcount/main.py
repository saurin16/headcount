"""Headcount API."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from headcount.qloo import Qloo

app = FastAPI(title="Headcount")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"ok": True, "service": "headcount-api"}


@app.get("/qloo/ping")
async def qloo_ping():
    """One live Qloo search, to prove the deployed key and base URL work."""
    q = Qloo()
    try:
        r = await q.search("Zach Bryan", take=1, why="deploy smoke test")
        return {"ok": True, "entity": r[0]["name"], "ms": q.calls[-1].ms}
    finally:
        await q.aclose()
