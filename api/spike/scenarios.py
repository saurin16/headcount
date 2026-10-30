"""Find offers where the no-Qloo LLM's verdict disagrees with Qloo-grounded demand."""
import asyncio, sys
from headcount import agents, rubric
from headcount.models import MetroDemand, Offer

CANDIDATES = [
    ("The Marías", "McAllen, TX"), ("The Marías", "Boise, ID"), ("Grupo Frontera", "Boise, ID"),
    ("Noah Kahan", "Portland, ME"), ("Noah Kahan", "Phoenix, AZ"), ("Sierra Ferrell", "Asheville, NC"),
    ("Sierra Ferrell", "Las Vegas, NV"), ("Khruangbin", "Omaha, NE"), ("Mt. Joy", "Tulsa, OK"),
    ("Magdalena Bay", "Tulsa, OK"), ("Charley Crockett", "Portland, OR"), ("Wyatt Flores", "Boise, ID"),
    ("Goose", "Hartford, CT"), ("Peso Pluma", "Salt Lake City, UT"), ("Hozier", "Omaha, NE"),
    ("Remi Wolf", "Nashville, TN"), ("Turnpike Troubadours", "Portland, OR"), ("Mitski", "El Paso, TX"),
]
sem = asyncio.Semaphore(4)

async def one(act, city):
    async with sem:
        st = {"offer": Offer(act=act, city=city, capacity=1500, guarantee=25000).model_dump()}
        try:
            st.update(await agents.scout(st))
            d, b = await asyncio.gather(agents.demand(st), agents.baseline(st))
            st.update(d); st.update(b)
            dr = rubric.draft(Offer(**st["offer"]), MetroDemand(**st["demand"]))
            bl = st["baseline"]
            p = st["demand"]["percentile"]
            flip = (bl["verdict"] == "GO" and p < 40) or (bl["verdict"] != "GO" and p >= 85)
            print(f"{'★' if flip else ' '} {act:22} {city:18} pctl={p:5} rubric={dr.verdict:6} baseline={bl['verdict']:6} ({bl['demand_guess']}) · {bl['reason'][:90]}", flush=True)
        except Exception as e:
            print(f"  {act} {city} ERR {e}", flush=True)

async def main():
    await asyncio.gather(*(one(a, c) for a, c in CANDIDATES))

asyncio.run(main())
