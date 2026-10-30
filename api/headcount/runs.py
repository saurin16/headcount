"""Run manager: executes the graph in the background, keeps events for streaming, audits to Firestore."""
import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field

from langgraph.types import Command

from headcount.graph import graph
from headcount.models import Offer

log = logging.getLogger("headcount.runs")


@dataclass
class Run:
    id: str
    offer: dict
    status: str = "running"          # running | awaiting_approval | done | error
    events: list[dict] = field(default_factory=list)
    state: dict = field(default_factory=dict)
    pending: dict | None = None      # interrupt payload while awaiting approval
    error: str | None = None
    started: float = field(default_factory=time.time)
    finished: float | None = None
    changed: asyncio.Event = field(default_factory=asyncio.Event)

    def view(self) -> dict:
        s = self.state
        return {"id": self.id, "status": self.status, "offer": self.offer, "events": self.events,
                "pending": self.pending, "error": self.error,
                "elapsed_s": round((self.finished or time.time()) - self.started, 1),
                **{k: s.get(k) for k in ("act", "metro", "demand", "comps", "baseline", "draft",
                                         "skeptic", "memo", "approval", "actions", "round")}}


RUNS: dict[str, Run] = {}


def start(offer: Offer) -> Run:
    run = Run(id=uuid.uuid4().hex[:12], offer=offer.model_dump())
    RUNS[run.id] = run
    asyncio.create_task(_drive(run, {"offer": run.offer, "trace": []}))
    return run


def decide(run_id: str, decision: str, note: str = "", by: str = "buyer") -> Run:
    run = RUNS[run_id]
    if run.status != "awaiting_approval":
        raise ValueError(f"run is {run.status}, not awaiting approval")
    run.status, run.pending = "running", None
    _touch(run)
    asyncio.create_task(_drive(run, Command(resume={"decision": decision, "note": note, "by": by})))
    return run


async def _drive(run: Run, inp):
    cfg = {"configurable": {"thread_id": run.id}}
    try:
        async for update in graph.astream(inp, cfg, stream_mode="updates"):
            if "__interrupt__" in update:
                run.status, run.pending = "awaiting_approval", update["__interrupt__"][0].value
                _touch(run)
                await _audit(run)
                return
            for node, delta in update.items():
                if not delta:
                    continue
                run.events.extend(delta.get("trace", []))
                run.state.update({k: v for k, v in delta.items() if k != "trace"})
                _touch(run)
        run.status, run.finished = "done", time.time()
    except Exception as e:  # surface agent/API failures to the UI instead of hanging
        log.exception("run %s failed", run.id)
        run.status, run.error, run.finished = "error", f"{type(e).__name__}: {e}", time.time()
    _touch(run)
    await _audit(run)


def _touch(run: Run):
    run.changed.set()
    run.changed = asyncio.Event()


_db = None


async def _audit(run: Run):
    """Best-effort audit write; a Firestore outage must not break a run."""
    global _db
    try:
        if _db is None:
            from google.cloud import firestore
            _db = firestore.AsyncClient(project="headcount-qloo")
        v = run.view()
        await _db.collection("runs").document(run.id).set({
            "status": v["status"], "offer": v["offer"], "memo": v["memo"], "approval": v["approval"],
            "actions": v["actions"], "pending": v["pending"], "error": v["error"],
            "elapsed_s": v["elapsed_s"], "started": run.started,
            # Audit keeps what each agent did and which Qloo endpoints it hit, not Qloo payloads.
            "events": [{"agent": e["agent"], "text": e["text"], "ms": e["ms"],
                        "qloo": [{"endpoint": c["endpoint"], "status": c["status"], "ms": c["ms"],
                                  "why": c["why"]} for c in e["qloo_calls"]]} for e in run.events],
        })
    except Exception:
        log.exception("audit write failed for %s", run.id)
