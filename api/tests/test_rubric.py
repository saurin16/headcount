from headcount.models import MetroDemand, Offer
from headcount.rubric import draft

OFFER = Offer(act="X", city="Tulsa, OK", capacity=2800, guarantee=40000)


def _d(p, gap=0.0):
    return MetroDemand(metro="Tulsa, OK", percentile=p, rank=1, of=105, affinity_rank=0.9,
                       popularity=0.9, hype_gap=gap, top_metros=[], cells=1)


def test_strong_market_goes_at_proposed_terms():
    d = draft(OFFER, _d(90))
    assert d.verdict == "GO" and d.recommended_capacity == 2800 and d.guarantee_ceiling == 40000


def test_weak_market_resizes_room_and_guarantee():
    d = draft(OFFER, _d(17.3))
    assert d.verdict == "RESIZE"
    assert d.recommended_capacity == 700   # 2800 × 0.25 (floor factor)
    assert d.guarantee_ceiling == 10000


def test_bottom_decile_passes():
    assert draft(OFFER, _d(5)).verdict == "PASS"


def test_missing_data_never_invents_a_number():
    d = draft(OFFER, MetroDemand(metro="Tulsa, OK", percentile=None, rank=None, of=0, affinity_rank=None,
                                 popularity=None, hype_gap=None, top_metros=[], cells=0))
    assert d.verdict == "PASS" and d.flags[0].startswith("thin_data")


def test_hype_gap_flagged():
    assert any(f.startswith("hype_gap") for f in draft(OFFER, _d(50, gap=0.05)).flags)
