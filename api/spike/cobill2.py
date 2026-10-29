import asyncio, sys
from headcount.qloo import Qloo, QlooError
async def main(act, city):
    q = Qloo()
    e = (await q.search(act, take=1))[0]
    tags = [t["tag_id"] for t in e.get("tags", []) if t.get("type") == "urn:tag:genre"][:3]
    gtags = ",".join(t.replace("urn:tag:genre:", "urn:tag:genre:music:") for t in tags)
    print("genre tags used:", gtags)
    for name, p in {
      "⑦ genre tags + signal.location": dict(filter__tags=gtags, signal__location__query=city),
      "⑧ genre tags + filter.location": dict(filter__tags=gtags, filter__location__query=city),
      "⑨ genre tags + taste + location": dict(filter__tags=gtags, signal__interests__entities=e["entity_id"], signal__location__query=city),
    }.items():
        try:
            r = await q.insights("urn:entity:artist", take=10, **p)
            print(f"{name}: " + ", ".join(x["name"] for x in r.get("entities", [])))
        except QlooError as err: print(name, "ERR", str(err)[:150])
    # intersection approach
    taste = {x["name"]: x for x in (await q.insights("urn:entity:artist", take=100, signal__interests__entities=e["entity_id"])).get("entities", [])}
    local = (await q.insights("urn:entity:artist", take=100, signal__location__query=city)).get("entities", [])
    print(f"⑩ intersect taste(100) ∩ local(100): " + ", ".join(x["name"] for x in local if x["name"] in taste))
    await q.aclose()
asyncio.run(main(sys.argv[1], sys.argv[2]))
