"""Deterministic deal rubric. The LLM agents argue around this; they don't replace it.

Assumption (shown to the user): the proposed room is sized for the act's typical
market. Local demand below the act's strong markets scales the room and guarantee down.
"""
from headcount.models import Draft, MetroDemand, Offer

STRONG_PCTL = 75      # at or above: room sized for a typical strong market is fine
PASS_PCTL = 10        # below: too little local taste signal to justify the date
MIN_FACTOR = 0.25
HYPE_GAP_FLAG = 0.03  # popularity exceeds affinity: known here, not loved here
ROOM_STEP = 50


def draft(offer: Offer, d: MetroDemand) -> Draft:
    flags: list[str] = []
    if d.percentile is None:
        return Draft(verdict="PASS", demand_factor=0.0, recommended_capacity=0,
                     guarantee_ceiling=0, projected_gross_at_rec=0,
                     flags=["thin_data: no Qloo heatmap cell for this metro"])

    p = d.percentile
    factor = max(MIN_FACTOR, min(1.0, p / STRONG_PCTL))
    rec_cap = max(ROOM_STEP, int(offer.capacity * factor) // ROOM_STEP * ROOM_STEP)
    ceiling = int(offer.guarantee * factor) // 500 * 500

    if p < PASS_PCTL:
        verdict = "PASS"
        flags.append(f"bottom_decile: {d.metro} ranks {d.rank}/{d.of}")
    elif p >= STRONG_PCTL:
        verdict = "GO"
    else:
        verdict = "RESIZE"
        flags.append(f"below_strong_markets: percentile {p:.0f} < {STRONG_PCTL}")

    if d.hype_gap is not None and d.hype_gap > HYPE_GAP_FLAG:
        flags.append(f"hype_gap: popularity exceeds affinity by {d.hype_gap:.3f}")
    gross = rec_cap * offer.ticket_price
    if verdict != "PASS" and ceiling > gross * 0.6:
        flags.append("guarantee_heavy: ceiling > 60% of projected gross at recommended room")

    return Draft(verdict=verdict, demand_factor=round(factor, 2),
                 recommended_capacity=offer.capacity if verdict == "GO" else rec_cap,
                 guarantee_ceiling=offer.guarantee if verdict == "GO" else ceiling,
                 projected_gross_at_rec=(offer.capacity if verdict == "GO" else rec_cap) * offer.ticket_price,
                 flags=flags)
