"""LangGraph wiring: Scout → [Demand ∥ Comps ∥ Baseline] → Rubric → Skeptic ⇄ Deal."""
import operator
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, START, StateGraph

from headcount import agents


class RunState(TypedDict, total=False):
    offer: dict
    act: dict
    metro: str
    demand: dict
    comps: dict
    baseline: dict
    draft: dict
    skeptic: dict
    memo: dict
    round: int
    trace: Annotated[list[dict[str, Any]], operator.add]


def build():
    g = StateGraph(RunState)
    g.add_node("scout", agents.scout)
    g.add_node("demand", agents.demand)
    g.add_node("comps", agents.comps)
    g.add_node("baseline", agents.baseline)
    g.add_node("rubric", agents.rubric_node)
    g.add_node("skeptic", agents.skeptic)
    g.add_node("deal", agents.deal)

    g.add_edge(START, "scout")
    for n in ("demand", "comps", "baseline"):
        g.add_edge("scout", n)
    g.add_edge(["demand", "comps", "baseline"], "rubric")
    g.add_edge("rubric", "skeptic")
    g.add_edge("skeptic", "deal")
    g.add_conditional_edges("deal", lambda s: "skeptic" if agents.should_rebut(s) else END,
                            {"skeptic": "skeptic", END: END})
    return g.compile()


graph = build()
