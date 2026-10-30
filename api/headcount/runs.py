"""Run manager: executes the graph in the background, keeps events for streaming, audits to Firestore."""
import asyncio
import json
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
    replay_of: str | None = None     # recording key when this run replays a recorded live run
    _tail: dict | None = None        # replay: what happens after the human decision

    def view(self) -> dict:
        s = self.state
        return {"id": self.id, "status": self.status, "offer": self.offer, "events": self.events,
                "replay_of": self.replay_of,
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
    pending = run.pending
    run.status, run.pending = "running", None
    _touch(run)
    if run.replay_of:
        asyncio.create_task(_replay_decision(run, pending, decision, note, by))
    else:
        asyncio.create_task(_drive(run, Command(resume={"decision": decision, "note": note, "by": by})))
    return run


# ---------- Recorded runs (demo-safe scenario cards) ----------
REPLAY_SPEED = 2.0   # play recorded agent timing back twice as fast; labelled in the UI


async def record(run_id: str, key: str):
    """Save a finished or paused live run as the recording for a scenario card (private Firestore)."""
    run = RUNS[run_id]
    await _store().collection("recordings").document(key).set(
        # Stored as a JSON string: Firestore rejects nested arrays like top_metros pairs.
        {"source_run": run.id, "recorded_at": run.started, "view_json": json.dumps(run.view(), default=str)})


async def start_replay(key: str) -> Run:
    doc = await _store().collection("recordings").document(key).get()
    if not doc.exists:
        raise KeyError(key)
    rec = json.loads(doc.to_dict()["view_json"])
    run = Run(id=uuid.uuid4().hex[:12], offer=rec["offer"], replay_of=key)
    RUNS[run.id] = run
    asyncio.create_task(_replay(run, rec))
    return run


STATE_KEYS = {"Scout": ("act", "metro"), "Demand Analyst": ("demand",), "Comps Agent": ("comps",),
              "Baseline (no Qloo)": ("baseline",), "Rubric": ("draft",), "Skeptic": ("skeptic", "round"),
              "Deal Agent": ("memo",)}


async def _replay(run: Run, rec: dict):
    human_at = next((i for i, e in enumerate(rec["events"]) if e["agent"] in ("Human", "Risk Gate")), None)
    head = rec["events"][:human_at] if human_at is not None else rec["events"]
    for ev in head:
        await asyncio.sleep(min(ev["ms"], 20_000) / 1000 / REPLAY_SPEED)
        run.events.append(ev)
        for k in STATE_KEYS.get(ev["agent"], ()):
            run.state[k] = rec.get(k)
        _touch(run)
    appr = rec.get("approval") or {}
    if appr.get("required"):
        run.status = "awaiting_approval"
        run.pending = {"reasons": appr["reasons"], "memo": rec["memo"],
                       "actions": [{k: v for k, v in a.items() if k != "status"} for a in rec["actions"] or []]}
        _touch(run)
        return
    if human_at is not None:
        run.events.append(rec["events"][human_at])
    run.state.update(approval=appr, actions=rec.get("actions"))
    run.status, run.finished = "done", time.time()
    _touch(run)


async def _replay_decision(run: Run, pending: dict, decision: str, note: str, by: str):
    approved = decision == "approve"
    acts = [dict(a, status="approved-drafted" if approved else "rejected") for a in pending["actions"]]
    run.events.append({"agent": "Human", "ms": 0, "qloo_calls": [], "data": {},
                       "text": f"{'Approved' if approved else 'Rejected'} by {by}" + (f": “{note}”" if note else "")})
    run.state.update(approval={"required": True, "reasons": pending["reasons"], "decision": decision,
                               "note": note, "by": by}, actions=acts)
    run.status, run.finished = "done", time.time()
    _touch(run)


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


def _store():
    global _db
    if _db is None:
        from google.cloud import firestore
        _db = firestore.AsyncClient(project="headcount-qloo")
    return _db


async def _audit(run: Run):
    """Best-effort audit write; a Firestore outage must not break a run."""
    try:
        v = run.view()
        await _store().collection("runs").document(run.id).set({
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
