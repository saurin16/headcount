"""Graduated autonomy: decide what runs automatically and what waits for a human."""
from headcount.models import Offer

BIG_CHECK = 50_000        # any exposure above this needs a human
MID_CHECK = 25_000        # above this, only auto-run when demand is very strong
STRONG_FOR_MID = 90
MAJOR_ACT_POP = 0.97      # walking away from an act this popular needs a human


def exposure(memo: dict) -> int:
    """Guarantee the buyer would commit under the memo."""
    return 0 if memo["verdict"] == "PASS" else memo["guarantee_ceiling"]


def assess(offer: Offer, act: dict, demand: dict, skeptic: dict, memo: dict, clamps: list[str]) -> list[str]:
    """Reasons this memo needs approval. Empty list = low risk, auto-execute."""
    reasons = []
    x, p = exposure(memo), demand.get("percentile") or 0
    if x > BIG_CHECK:
        reasons.append(f"Guarantee ${x:,} is above the ${BIG_CHECK:,} auto-approve limit")
    elif x > MID_CHECK and p < STRONG_FOR_MID:
        reasons.append(f"Guarantee ${x:,} with demand at the {p:.0f}th percentile (auto-approve needs ≥{STRONG_FOR_MID})")
    if skeptic["suggested_verdict"] != memo["verdict"]:
        reasons.append(f"Agents still disagree: Skeptic says {skeptic['suggested_verdict']}, Deal says {memo['verdict']}")
    if memo["verdict"] == "PASS" and act["popularity"] >= MAJOR_ACT_POP:
        reasons.append(f"Passing on {act['name']} (popularity {act['popularity']:.2f})")
    if clamps:
        reasons.append("Arbiter overrode the Deal Agent: " + "; ".join(clamps))
    return reasons


def actions(offer: Offer, act: dict, metro: str, memo: dict) -> list[dict]:
    """Low-risk follow-ups. They are drafts: Headcount never sends anything itself."""
    if memo["verdict"] == "PASS":
        return [{"kind": "decline_note", "title": "Decline note to agent",
                 "body": f"Thanks for the {act['name']} avail. Our {metro} data doesn't support this date "
                         "right now, so we'll pass this cycle. Happy to revisit on the next routing."}]
    out = [{"kind": "hold_request", "title": f"Hold request: {act['name']} · {metro}",
            "body": (f"Hi, we'd like to put a hold on {act['name']} in {metro} at a "
                     f"{memo['recommended_capacity']:,}-cap room, guarantee up to "
                     f"${memo['guarantee_ceiling']:,} vs. a standard door split. "
                     + ("This is a counter to the original "
                        f"{offer.capacity:,}-cap / ${offer.guarantee:,} ask. " if memo["verdict"] == "RESIZE" else "")
                     + "Let us know open dates.")}]
    if memo["cobill"]:
        out.append({"kind": "opener_shortlist", "title": "Local opener shortlist", "body": ", ".join(memo["cobill"])})
    if memo["sponsors"]:
        out.append({"kind": "sponsor_list", "title": "Sponsor targets", "body": ", ".join(memo["sponsors"])})
    if memo["promo_hangouts"]:
        out.append({"kind": "promo_plan", "title": "Street-team / poster spots",
                    "body": ", ".join(memo["promo_hangouts"])})
    return out
