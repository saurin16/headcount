"""Full graph run with fake Qloo + fake LLM (synthetic data; no Qloo responses stored)."""
from headcount import agents, llm
from headcount.graph import build
from headcount.metro import METROS, geohash
from headcount.models import BaselineView, DealMemo, SkepticView


class FakeQloo:
    def __init__(self):
        self.calls = []

    async def search(self, query, **kw):
        return [{"entity_id": "A1", "name": query, "popularity": 0.98,
                 "tags": [{"type": "urn:tag:genre", "tag_id": "urn:tag:genre:indie", "name": "Indie"}]}]

    async def insights(self, filter_type, **kw):
        if filter_type == "urn:heatmap":
            ranks = {"Portland, OR": 0.99, "Austin, TX": 0.98, "Tulsa, OK": 0.90}
            return {"heatmap": [{"location": {"geohash": geohash(*METROS[m])},
                                 "query": {"affinity_rank": a, "popularity": a}} for m, a in ranks.items()]}
        if filter_type == "urn:entity:place":
            return {"entities": [{"name": "YBR Pub", "tags": [{"name": "Neighborhood pub"}]}]}
        if filter_type == "urn:entity:brand":
            return {"entities": [{"name": "Glossier"}]}
        return {"entities": [{"name": "Broncho", "popularity": 0.8}]}

    async def aclose(self):
        pass


async def fake_ask(model, system, prompt, schema):
    if schema is BaselineView:
        return BaselineView(verdict="GO", demand_guess="strong", reason="big act", suggested_openers=["?"]), 1
    if schema is SkepticView:
        return SkepticView(agrees=False, suggested_verdict="PASS",
                           objections=[{"claim": "weak", "evidence": "rank 3/3", "severity": "high"}]), 1
    return DealMemo(verdict="RESIZE", recommended_capacity=700, guarantee_ceiling=10000, headline="Resize",
                    rationale="r", responds_to_skeptic="s", cobill=["Broncho"], sponsors=["Glossier"],
                    promo_hangouts=["YBR Pub"]), 1


async def test_graph_runs_end_to_end_with_rebuttal(monkeypatch):
    monkeypatch.setattr(agents, "Qloo", FakeQloo)
    monkeypatch.setattr(llm, "ask", fake_ask)
    out = await build().ainvoke({"offer": {"act": "Japanese Breakfast", "city": "Tulsa, OK",
                                           "capacity": 2800, "guarantee": 40000}, "trace": []})
    assert out["draft"]["verdict"] == "PASS"          # Tulsa ranks last of 3 → percentile 0
    assert out["memo"]["verdict"] == "RESIZE"
    assert out["round"] == 2                           # high objection not adopted → one rebuttal
    agents_seen = [e["agent"] for e in out["trace"]]
    for a in ("Scout", "Demand Analyst", "Comps Agent", "Baseline (no Qloo)", "Rubric", "Skeptic", "Deal Agent"):
        assert a in agents_seen
