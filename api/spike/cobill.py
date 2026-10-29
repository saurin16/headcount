"""Phase 0c: can we find local, taste-adjacent opening acts?"""
import asyncio, sys
from headcount.qloo import Qloo, QlooError

async def main(act, city):
    q = Qloo()
    aid = (await q.search(act, take=1))[0]["entity_id"]
    variants = {
      "① taste only": dict(signal__interests__entities=aid),
      "② taste + signal.location": dict(signal__interests__entities=aid, signal__location__query=city),
      "③ taste + location weight=high": dict(signal__interests__entities=aid, signal__location__query=city, signal__location__weight="high"),
      "④ taste + location radius 50km": dict(signal__interests__entities=aid, signal__location__query=city, signal__location__radius=50000),
      "⑤ location only": dict(signal__location__query=city),
      "⑥ taste + filter.location": dict(signal__interests__entities=aid, filter__location__query=city),
    }
    for name, p in variants.items():
        try:
            r = await q.insights("urn:entity:artist", take=8, **p)
            print(f"{name}: " + ", ".join(e["name"] for e in r.get("entities", [])))
        except QlooError as e:
            print(f"{name}: ERR {str(e)[:120]}")
    await q.aclose()

asyncio.run(main(sys.argv[1], sys.argv[2]))
