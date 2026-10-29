"""Phase 0d: full Qloo chain for one offer, with parallel fan-out."""
import asyncio, sys, time
from headcount.qloo import Qloo
from headcount.metro import score_metros

async def main(act, city):
    q = Qloo(); t0 = time.perf_counter()
    e = (await q.search(act, take=1, why="resolve act"))[0]
    aid = e["entity_id"]
    genres = ",".join(t["tag_id"].replace("urn:tag:genre:", "urn:tag:genre:music:")
                      for t in e.get("tags", []) if t.get("type") == "urn:tag:genre")[:3*60]
    heat, comps, local, places, brands = await asyncio.gather(
        q.insights("urn:heatmap", why="metro demand", signal__interests__entities=aid, filter__location__query="United States"),
        q.insights("urn:entity:artist", why="comparable acts", signal__interests__entities=aid, take=10),
        q.insights("urn:entity:artist", why="local co-bills", filter__tags=genres, signal__location__query=city, take=10),
        q.insights("urn:entity:place", why="local venues", signal__interests__entities=aid, filter__location__query=city, take=10),
        q.insights("urn:entity:brand", why="sponsors", signal__interests__entities=aid, take=5),
    )
    m = score_metros(heat["heatmap"])[city]
    dt = time.perf_counter() - t0
    print(f"{act} @ {city}: metro pctl={m.percentile} rank={m.rank}")
    print("  local co-bills:", ", ".join(x["name"] for x in local["entities"][:5]))
    print("  venues:", ", ".join(x["name"] for x in places["entities"][:4]))
    print("  sponsors:", ", ".join(x["name"] for x in brands["entities"][:3]))
    print(f"  calls={len(q.calls)}  per-call ms={[c.ms for c in q.calls]}  TOTAL {dt:.2f}s")
    await q.aclose()

asyncio.run(main(sys.argv[1], sys.argv[2]))
