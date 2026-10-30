"""Agent nodes. Each returns a partial state update plus trace events for the UI."""
import asyncio
import json
import time
from dataclasses import asdict

from headcount import llm, rubric
from headcount.metro import METROS, score_metros
from headcount.models import (Act, BaselineView, Comps, DealMemo, MetroDemand,
                              Offer, SkepticView)
from headcount.qloo import Qloo

VERDICTS = ["GO", "RESIZE", "PASS"]
HANGOUT_WORDS = ("theater", "theatre", "venue", "live", "music", "bar", "pub", "cocktail",
                 "arena", "cinema", "entertainment", "dancing", "brewery", "lounge", "record")
NOT_HANGOUTS = ("school", "university", "college", "church", "administration", "adult",
                "hospital", "office")


def event(agent: str, text: str, t0: float, q: Qloo | None = None, **data) -> dict:
    return {"agent": agent, "text": text, "ms": int((time.perf_counter() - t0) * 1000),
            "qloo_calls": [asdict(c) for c in q.calls] if q else [], "data": data}


def resolve_metro(city: str) -> str:
    c = city.strip().lower()
    for name in METROS:
        if name.lower() == c or name.lower().split(",")[0] == c.split(",")[0].strip():
            return name
    raise ValueError(f"'{city}' isn't in the 105-metro list yet")


def pick_artist(query: str, results: list[dict]) -> tuple[dict, list[str]]:
    """Prefer an exact name match; break ties by popularity."""
    exact = [r for r in results if r["name"].lower() == query.strip().lower()]
    pool = exact or results
    best = max(pool, key=lambda r: r.get("popularity") or 0)
    others = [r["name"] for r in results if r is not best]
    return best, others


def genre_tags(entity: dict) -> tuple[list[str], list[str]]:
    tags = [t for t in entity.get("tags", []) if t.get("type") == "urn:tag:genre"][:3]
    return ([t["tag_id"].replace("urn:tag:genre:", "urn:tag:genre:music:") for t in tags],
            [t["name"] for t in tags])


# ---------- Scout ----------
async def scout(state: dict) -> dict:
    t0, offer = time.perf_counter(), Offer(**state["offer"])
    metro = resolve_metro(offer.city)
    q = Qloo()
    try:
        results = await q.search(offer.act, take=5, why="resolve the act to a Qloo artist entity")
    finally:
        await q.aclose()
    if not results:
        raise ValueError(f"Qloo has no artist named '{offer.act}'")
    best, others = pick_artist(offer.act, results)
    ids, names = genre_tags(best)
    act = Act(entity_id=best["entity_id"], name=best["name"], popularity=best.get("popularity") or 0,
              genres=ids, genre_names=names, alternatives=others[:4])
    note = f"Resolved “{offer.act}” → {act.name} ({', '.join(names) or 'no genre tags'}); metro → {metro}"
    if best["name"].lower() != offer.act.strip().lower():
        note += f" · ⚠ no exact match, closest was {best['name']}"
    return {"act": act.model_dump(), "metro": metro, "trace": [event("Scout", note, t0, q)]}


# ---------- Demand Analyst ----------
async def demand(state: dict) -> dict:
    t0, act, metro = time.perf_counter(), Act(**state["act"]), state["metro"]
    q = Qloo()
    try:
        heat = await q.insights("urn:heatmap", why="where in the US this act's taste is strongest",
                                signal__interests__entities=act.entity_id,
                                filter__location__query="United States")
    finally:
        await q.aclose()
    cells = heat.get("heatmap", [])
    scores = score_metros(cells)
    ranked = sorted((s for s in scores.values() if s.rank), key=lambda s: s.rank)
    m = scores[metro]
    d = MetroDemand(metro=metro, percentile=m.percentile, rank=m.rank, of=len(ranked),
                    affinity_rank=m.affinity_rank, popularity=m.popularity, hype_gap=m.hype_gap,
                    top_metros=[(s.metro, s.percentile) for s in ranked[:5]], cells=len(cells))
    text = (f"{metro}: {d.percentile:.0f}th percentile (rank {d.rank}/{d.of}) for {act.name}'s audience. "
            f"Strongest: {', '.join(n for n, _ in d.top_metros[:3])}"
            if d.percentile is not None else f"No heatmap cell for {metro}: thin data")
    return {"demand": d.model_dump(), "trace": [event("Demand Analyst", text, t0, q,
            cells=len(cells), map=[{"g": s.geohash, "p": s.percentile, "m": s.metro} for s in ranked])]}


# ---------- Comps Agent ----------
async def comps(state: dict) -> dict:
    t0, act, metro = time.perf_counter(), Act(**state["act"]), state["metro"]
    q = Qloo()
    try:
        adj, local, places, brands = await asyncio.gather(
            q.insights("urn:entity:artist", why="acts with the same audience",
                       signal__interests__entities=act.entity_id, take=10),
            q.insights("urn:entity:artist", why="acts in this genre that this metro loves (co-bill pool)",
                       filter__tags=",".join(act.genres), signal__location__query=metro, take=25)
            if act.genres else asyncio.sleep(0, {"entities": []}),
            q.insights("urn:entity:place", why="where this audience already goes locally",
                       signal__interests__entities=act.entity_id, filter__location__query=metro, take=25),
            q.insights("urn:entity:brand", why="brands this audience over-indexes on (sponsors)",
                       signal__interests__entities=act.entity_id, take=6),
        )
    finally:
        await q.aclose()
    cobills = [e["name"] for e in local.get("entities", [])
               if e["name"] != act.name and (e.get("popularity") or 0) < act.popularity][:5]
    hangouts = [e["name"] for e in places.get("entities", []) if _is_hangout(e)][:6]
    c = Comps(adjacent_acts=[e["name"] for e in adj.get("entities", [])][:8], local_cobills=cobills,
              hangouts=hangouts, sponsors=[e["name"] for e in brands.get("entities", [])][:5])
    text = (f"Co-bill pool: {', '.join(c.local_cobills[:3]) or 'none found'} · "
            f"Audience hangouts: {', '.join(c.hangouts[:3]) or 'none'} · "
            f"Sponsors: {', '.join(c.sponsors[:3])}")
    return {"comps": c.model_dump(), "trace": [event("Comps Agent", text, t0, q)]}


def _is_hangout(e: dict) -> bool:
    words = " ".join([e["name"]] + [t.get("name", "") for t in e.get("tags", [])]).lower()
    return any(w in words for w in HANGOUT_WORDS) and not any(w in words for w in NOT_HANGOUTS)


# ---------- LLM-only baseline ----------
BASELINE_SYS = ("You are an experienced concert talent buyer. You have no data tools: answer from "
                "general knowledge only. Be decisive.")


async def baseline(state: dict) -> dict:
    t0, offer = time.perf_counter(), Offer(**state["offer"])
    view, ms = await llm.ask(llm.FLASH, BASELINE_SYS,
                             f"Offer: {offer.act} at a {offer.capacity}-capacity room in {offer.city}, "
                             f"${offer.guarantee:,} guarantee, ${offer.ticket_price} tickets. "
                             "Verdict GO, RESIZE or PASS? Guess local demand and name 3 local openers.",
                             BaselineView)
    return {"baseline": view.model_dump(),
            "trace": [event("Baseline (no Qloo)", f"{view.verdict}: {view.reason}", t0, llm_ms=ms,
                            model=llm.FLASH)]}


# ---------- Rubric (deterministic) ----------
async def rubric_node(state: dict) -> dict:
    t0 = time.perf_counter()
    d = rubric.draft(Offer(**state["offer"]), MetroDemand(**state["demand"]))
    text = (f"Draft {d.verdict}: room {d.recommended_capacity:,}, guarantee ceiling ${d.guarantee_ceiling:,}"
            + (f" · flags: {'; '.join(d.flags)}" if d.flags else ""))
    return {"draft": d.model_dump(), "trace": [event("Rubric", text, t0)]}


# ---------- Skeptic ----------
SKEPTIC_SYS = (
    "You are the Skeptic on a concert booking committee. Your job is to attack the draft decision. "
    "Use ONLY the evidence given. Look for: thin or contradictory data, hype (known but not loved), "
    "room size vs demand, a guarantee the gross can't cover, and places where the no-data baseline "
    "disagrees with the evidence. If the draft is sound, say so, but still list the strongest risk."
)


def _evidence(state: dict) -> str:
    keep = ("offer", "act", "demand", "comps", "draft", "baseline")
    return json.dumps({k: state[k] for k in keep if k in state}, default=str)


async def skeptic(state: dict) -> dict:
    t0 = time.perf_counter()
    rnd = state.get("round", 0) + 1
    prompt = f"EVIDENCE:\n{_evidence(state)}"
    if state.get("memo"):
        prompt += f"\n\nTHE DEAL AGENT'S CURRENT MEMO (rebut it if you still disagree):\n{json.dumps(state['memo'])}"
    view, ms = await llm.ask(llm.PRO, SKEPTIC_SYS, prompt, SkepticView)
    top = max(view.objections, key=lambda o: ["low", "medium", "high"].index(o.severity), default=None)
    text = (f"Round {rnd}: {'agrees' if view.agrees else 'objects'} → suggests {view.suggested_verdict}"
            + (f" · strongest: {top.claim}" if top else ""))
    return {"skeptic": view.model_dump(), "round": rnd,
            "trace": [event("Skeptic", text, t0, llm_ms=ms, model=llm.PRO,
                            objections=[o.model_dump() for o in view.objections])]}


# ---------- Deal Agent (arbiter) ----------
DEAL_SYS = (
    "You are the Deal Agent. Decide the final offer from the rubric draft and the Skeptic's objections. "
    "Meanings: GO = sign at the proposed room and guarantee. RESIZE = counter-offer at the recommended "
    "room AND the reduced guarantee ceiling (the original guarantee is off the table, so judge RESIZE "
    "against the reduced ceiling, not the original). PASS = even the resized terms don't work. "
    "You may move the verdict at most one step from the draft (GO↔RESIZE↔PASS) and only if an objection "
    "is backed by the evidence. Guesses about what the artist or agent will accept are not evidence; "
    "the buyer handles that negotiation. Recommend a room and a guarantee ceiling. Answer each serious "
    "objection directly in responds_to_skeptic. Co-bills must come from the local_cobills list; sponsors "
    "from sponsors; promo_hangouts from hangouts. Never invent numbers that aren't in the evidence. "
    "Qloo measures taste affinity, not ticket sales: never promise a sell-out or use words like "
    "'guaranteed' or 'certain'."
)


async def deal(state: dict) -> dict:
    t0, offer = time.perf_counter(), Offer(**state["offer"])
    prompt = f"EVIDENCE:\n{_evidence(state)}\n\nSKEPTIC:\n{json.dumps(state['skeptic'])}"
    memo, ms = await llm.ask(llm.PRO, DEAL_SYS, prompt, DealMemo)
    memo, notes = clamp(memo, state["draft"], offer, state["comps"])
    text = f"{memo.verdict}: {memo.headline}" + (f" · arbiter: {'; '.join(notes)}" if notes else "")
    return {"memo": memo.model_dump(), "trace": [event("Deal Agent", text, t0, llm_ms=ms, model=llm.PRO,
                                                       clamps=notes)]}


def clamp(memo: DealMemo, draft: dict, offer: Offer, comps: dict) -> tuple[DealMemo, list[str]]:
    """Keep the LLM inside the rubric's guard rails."""
    notes = []
    dv, mv = VERDICTS.index(draft["verdict"]), VERDICTS.index(memo.verdict)
    if abs(dv - mv) > 1:
        memo.verdict = "RESIZE"
        notes.append(f"verdict moved two steps from draft {draft['verdict']}; held at RESIZE")
    lo = max(50, draft["recommended_capacity"] // 2)
    if memo.verdict != "PASS" and not lo <= memo.recommended_capacity <= offer.capacity:
        memo.recommended_capacity = draft["recommended_capacity"]
        notes.append("room outside rubric bounds; reset to rubric value")
    if memo.guarantee_ceiling > offer.guarantee:
        memo.guarantee_ceiling = offer.guarantee
        notes.append("guarantee ceiling above proposed guarantee; capped")
    memo.cobill = [c for c in memo.cobill if c in comps["local_cobills"]][:3]
    memo.sponsors = [s for s in memo.sponsors if s in comps["sponsors"]][:3]
    memo.promo_hangouts = [h for h in memo.promo_hangouts if h in comps["hangouts"]][:3]
    return memo, notes


def should_rebut(state: dict) -> bool:
    """One rebuttal round when the Skeptic had a high-severity objection the memo didn't adopt."""
    s, m = state["skeptic"], state["memo"]
    high = any(o["severity"] == "high" for o in s["objections"])
    return state.get("round", 1) < 2 and high and s["suggested_verdict"] != m["verdict"]
