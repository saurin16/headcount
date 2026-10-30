"""Run one offer from the terminal.

    uv run python -m headcount.cli "Japanese Breakfast" "Tulsa, OK" 2800 40000
"""
import asyncio
import sys
import time

from headcount.graph import graph
from headcount.models import Offer


async def main(act: str, city: str, capacity: int, guarantee: int):
    offer = Offer(act=act, city=city, capacity=capacity, guarantee=guarantee)
    t0 = time.perf_counter()
    final = {}
    async for update in graph.astream({"offer": offer.model_dump(), "trace": []}, stream_mode="updates"):
        for node, delta in update.items():
            for ev in delta.get("trace", []):
                calls = len(ev["qloo_calls"])
                print(f"[{ev['ms']:>6} ms] {ev['agent']:<19} {ev['text']}" + (f"  (Qloo×{calls})" if calls else ""))
            final.update(delta)
    m, b = final["memo"], final["baseline"]
    print("\n=== OFFER MEMO ===")
    terms = ("no offer" if m["verdict"] == "PASS"
             else f"room {m['recommended_capacity']:,}  ·  guarantee ceiling ${m['guarantee_ceiling']:,}")
    print(f"VERDICT: {m['verdict']}  ·  {terms}")
    print(f"{m['headline']}\n{m['rationale']}")
    print(f"To the Skeptic: {m['responds_to_skeptic']}")
    print(f"Co-bill: {', '.join(m['cobill']) or '-'} · Sponsors: {', '.join(m['sponsors']) or '-'} · "
          f"Promo at: {', '.join(m['promo_hangouts']) or '-'}")
    print(f"\nWithout Qloo the LLM said: {b['verdict']} (demand '{b['demand_guess']}'), openers {b['suggested_openers']}")
    print(f"Skeptic rounds: {final.get('round')} · total {time.perf_counter() - t0:.1f}s")


if __name__ == "__main__":
    a = sys.argv[1:]
    asyncio.run(main(a[0], a[1], int(a[2]), int(a[3])))
