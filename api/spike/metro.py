"""Phase 0b: metro demand percentile for several acts."""
import asyncio, sys
from headcount.qloo import Qloo
from headcount.metro import score_metros, METROS

async def main(acts):
    q = Qloo()
    for act in acts:
        r = await q.search(act, take=1)
        d = await q.insights("urn:heatmap", signal__interests__entities=r[0]["entity_id"],
                             filter__location__query="United States")
        s = score_metros(d.get("heatmap", []))
        found = [m for m in s.values() if m.percentile is not None]
        top = sorted(found, key=lambda m: m.rank)[:3]
        print(f"\n{act}: {len(d.get('heatmap', []))} cells, metros matched {len(found)}/{len(METROS)}")
        print("  top:", ", ".join(f"{m.metro} ({m.percentile})" for m in top))
        for c in ["Portland, OR", "Austin, TX", "Tulsa, OK", "Nashville, TN", "Boise, ID"]:
            m = s[c]; print(f"  {c:14} pctl={m.percentile} rank={m.rank} hype_gap={m.hype_gap}")
    await q.aclose()

asyncio.run(main(sys.argv[1:]))
