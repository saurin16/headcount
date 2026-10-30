import pytest

from headcount import agents
from headcount.models import DealMemo, Offer


def test_pick_artist_prefers_exact_name_then_popularity():
    res = [{"name": "Big Thief Tribute", "popularity": 0.99}, {"name": "Big Thief", "popularity": 0.9}]
    best, others = agents.pick_artist("big thief", res)
    assert best["name"] == "Big Thief" and others == ["Big Thief Tribute"]


def test_resolve_metro_accepts_bare_city():
    assert agents.resolve_metro("tulsa") == "Tulsa, OK"
    with pytest.raises(ValueError):
        agents.resolve_metro("Atlantis")


def test_hangout_filter_drops_schools_keeps_bars():
    assert agents._is_hangout({"name": "YBR Pub", "tags": [{"name": "Neighborhood pub"}]})
    assert not agents._is_hangout({"name": "Union High School", "tags": [{"name": "Afternoon"}]})


def _memo(**kw):
    base = dict(verdict="RESIZE", recommended_capacity=700, guarantee_ceiling=10000, headline="h",
                rationale="r", responds_to_skeptic="s", cobill=["Broncho", "Made Up Band"],
                sponsors=["Glossier"], promo_hangouts=["YBR Pub"])
    base.update(kw)
    return DealMemo(**base)


DRAFT = {"verdict": "RESIZE", "recommended_capacity": 700}
COMPS = {"local_cobills": ["Broncho"], "sponsors": ["Glossier"], "hangouts": ["YBR Pub"]}
OFFER = Offer(act="X", city="Tulsa, OK", capacity=2800, guarantee=40000)


def test_clamp_removes_invented_cobills():
    m, notes = agents.clamp(_memo(), DRAFT, OFFER, COMPS)
    assert m.cobill == ["Broncho"] and not notes


def test_clamp_blocks_two_step_jump_and_bad_numbers():
    m, notes = agents.clamp(_memo(verdict="PASS", guarantee_ceiling=99999),
                            {"verdict": "GO", "recommended_capacity": 2800}, OFFER, COMPS)
    assert m.verdict == "RESIZE" and m.guarantee_ceiling == 40000
    assert m.recommended_capacity == 2800 and len(notes) == 3  # 700 is below half the rubric room


def test_rebuttal_only_on_unadopted_high_severity():
    s = {"suggested_verdict": "PASS", "objections": [{"severity": "high"}]}
    assert agents.should_rebut({"round": 1, "skeptic": s, "memo": {"verdict": "RESIZE"}})
    assert not agents.should_rebut({"round": 2, "skeptic": s, "memo": {"verdict": "RESIZE"}})
    assert not agents.should_rebut({"round": 1, "skeptic": s, "memo": {"verdict": "PASS"}})
