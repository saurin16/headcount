from headcount.gate import actions, assess
from headcount.models import Offer

OFFER = Offer(act="X", city="Tulsa, OK", capacity=2800, guarantee=40000)
ACT = {"name": "X", "popularity": 0.9}


def _memo(verdict="GO", ceiling=40000, cap=2800):
    return {"verdict": verdict, "guarantee_ceiling": ceiling, "recommended_capacity": cap,
            "cobill": ["Broncho"], "sponsors": [], "promo_hangouts": []}


def test_strong_demand_mid_check_auto_runs():
    assert assess(OFFER, ACT, {"percentile": 100}, {"suggested_verdict": "GO"}, _memo(), []) == []


def test_big_check_always_needs_a_human():
    r = assess(OFFER, ACT, {"percentile": 100}, {"suggested_verdict": "GO"}, _memo(ceiling=60000), [])
    assert len(r) == 1 and "auto-approve limit" in r[0]


def test_mid_check_with_soft_demand_needs_a_human():
    assert assess(OFFER, ACT, {"percentile": 60}, {"suggested_verdict": "GO"}, _memo(), [])


def test_unresolved_disagreement_and_arbiter_override_gate():
    r = assess(OFFER, ACT, {"percentile": 17}, {"suggested_verdict": "PASS"},
               _memo("RESIZE", 10000, 700), ["room outside rubric bounds"])
    assert any("disagree" in x for x in r) and any("Arbiter" in x for x in r)


def test_actions_are_drafts_and_resize_counters_original_ask():
    a = actions(OFFER, ACT, "Tulsa, OK", _memo("RESIZE", 10000, 700))
    hold = a[0]
    assert hold["kind"] == "hold_request" and "700-cap" in hold["body"] and "counter" in hold["body"]
    assert actions(OFFER, ACT, "Tulsa, OK", _memo("PASS"))[0]["kind"] == "decline_note"
