import httpx
import pytest

from headcount import qloo


@pytest.fixture(autouse=True)
def fresh(monkeypatch):
    monkeypatch.setattr(qloo, "_cache", {})
    monkeypatch.setattr(qloo, "_gate", None)
    monkeypatch.setattr(qloo.asyncio, "sleep", _nosleep)


async def _nosleep(_):
    return None


def _client(handler):
    q = qloo.Qloo(api_key="test")
    q._http = httpx.AsyncClient(base_url="https://x", transport=httpx.MockTransport(handler))
    return q


async def test_retries_through_rate_limit_then_caches():
    hits = []

    def handler(req):
        hits.append(1)
        return httpx.Response(429 if len(hits) < 3 else 200, json={"results": {"entities": [1]}})

    q = _client(handler)
    assert (await q.insights("urn:entity:brand"))["entities"] == [1]
    assert q.calls[-1].retries == 2 and len(hits) == 3
    await q.insights("urn:entity:brand")                 # identical request → cache, no HTTP
    assert len(hits) == 3 and q.calls[-1].cached


async def test_gives_up_with_error_after_retries():
    q = _client(lambda req: httpx.Response(429, text="Rate limit exceeded"))
    with pytest.raises(qloo.QlooError, match="429"):
        await q.search("x")
    assert q.calls[-1].retries == qloo.RETRIES
