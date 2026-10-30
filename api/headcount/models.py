"""Shared data shapes for the offer pipeline."""
from typing import Literal

from pydantic import BaseModel, Field

Verdict = Literal["GO", "RESIZE", "PASS"]


class Offer(BaseModel):
    act: str
    city: str
    capacity: int = Field(gt=0)
    guarantee: int = Field(ge=0)
    ticket_price: int = Field(default=35, gt=0)


class Act(BaseModel):
    entity_id: str
    name: str
    popularity: float
    genres: list[str]          # Qloo genre tag ids, music form
    genre_names: list[str]
    alternatives: list[str] = []  # other same-query matches Scout rejected
    image: str | None = None


class MetroDemand(BaseModel):
    metro: str
    percentile: float | None
    rank: int | None
    of: int
    affinity_rank: float | None
    popularity: float | None
    hype_gap: float | None
    top_metros: list[tuple[str, float]]
    cells: int


class Comps(BaseModel):
    adjacent_acts: list[str]
    local_cobills: list[str]
    hangouts: list[str]   # places this audience already goes in the metro
    sponsors: list[str]
    # Index vs. average (−1…+1): which age bands / genders over-index in this act's audience.
    age_index: dict[str, float] = {}
    gender_index: dict[str, float] = {}


class BaselineView(BaseModel):
    """What an LLM says with no Qloo data."""
    verdict: Verdict
    demand_guess: Literal["strong", "moderate", "weak", "unknown"]
    reason: str
    suggested_openers: list[str]


class Draft(BaseModel):
    """Deterministic rubric output, before any LLM debate."""
    verdict: Verdict
    demand_factor: float
    recommended_capacity: int
    guarantee_ceiling: int
    projected_gross_at_rec: int
    flags: list[str]


class Objection(BaseModel):
    claim: str
    evidence: str
    severity: Literal["low", "medium", "high"]


class SkepticView(BaseModel):
    agrees: bool
    suggested_verdict: Verdict
    objections: list[Objection]


class DealMemo(BaseModel):
    verdict: Verdict
    recommended_capacity: int
    guarantee_ceiling: int
    headline: str
    rationale: str
    responds_to_skeptic: str
    cobill: list[str]
    sponsors: list[str]
    promo_hangouts: list[str]
