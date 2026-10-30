"""Headcount API."""
import asyncio
import json
import os
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from headcount import runs
from headcount.agents import resolve_metro
from headcount.metro import METROS
from headcount.models import Offer
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


@app.get("/metros")
async def metros():
    return sorted(METROS)


@app.post("/runs")
async def create_run(offer: Offer):
    try:
        resolve_metro(offer.city)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return runs.start(offer).view()


def _get(run_id: str) -> runs.Run:
    if run_id not in runs.RUNS:
        raise HTTPException(404, "unknown run")
    return runs.RUNS[run_id]


@app.get("/runs/{run_id}")
async def get_run(run_id: str):
    return _get(run_id).view()


class Decision(BaseModel):
    decision: Literal["approve", "reject"]
    note: str = ""
    by: str = "buyer"


@app.post("/runs/{run_id}/decision")
async def decide(run_id: str, d: Decision):
    _get(run_id)
    try:
        return runs.decide(run_id, d.decision, d.note, d.by).view()
    except ValueError as e:
        raise HTTPException(409, str(e))


@app.get("/runs/{run_id}/stream")
async def stream(run_id: str):
    """SSE: one full snapshot per change, until the run is done or errors."""
    run = _get(run_id)

    async def gen():
        while True:
            yield {"event": "run", "data": json.dumps(run.view(), default=str)}
            if run.status in ("done", "error"):
                return
            try:
                await asyncio.wait_for(run.changed.wait(), timeout=15)
            except asyncio.TimeoutError:
                pass  # resend snapshot as a keep-alive

    return EventSourceResponse(gen())
