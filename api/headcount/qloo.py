"""Thin async client for the Qloo hackathon API."""
import os
import time
from dataclasses import dataclass, field

import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

BASE_URL = os.environ.get("QLOO_BASE_URL", "https://hackathon.api.qloo.com")


class QlooError(Exception):
    pass


@dataclass
class QlooCall:
    """One API call, recorded for the audit trail."""
    endpoint: str
    params: dict
    status: int
    ms: int
    why: str = ""


@dataclass
class Qloo:
    api_key: str = field(default_factory=lambda: os.environ["QLOO_API_KEY"])
    timeout: float = 15.0
    calls: list[QlooCall] = field(default_factory=list)

    def __post_init__(self):
        self._http = httpx.AsyncClient(
            base_url=BASE_URL, headers={"X-Api-Key": self.api_key}, timeout=self.timeout
        )

    async def get(self, endpoint: str, params: dict, why: str = "") -> dict:
        t0 = time.perf_counter()
        for attempt in range(3):
            resp = await self._http.get(endpoint, params=params)
            if resp.status_code not in (429, 502, 503, 504):
                break
            await _sleep(0.5 * 2**attempt)
        self.calls.append(QlooCall(endpoint, params, resp.status_code,
                                   int((time.perf_counter() - t0) * 1000), why))
        if resp.status_code != 200:
            raise QlooError(f"{endpoint} {resp.status_code}: {resp.text[:200]}")
        return resp.json()

    async def search(self, query: str, types: str = "urn:entity:artist", take: int = 3, why: str = ""):
        data = await self.get("/search", {"query": query, "types": types, "take": take}, why)
        return data.get("results", [])

    async def insights(self, filter_type: str, why: str = "", **params) -> dict:
        # Qloo params are dotted (signal.interests.entities); callers pass them with "__".
        q = {"filter.type": filter_type}
        q.update({k.replace("__", "."): v for k, v in params.items()})
        return (await self.get("/v2/insights", q, why)).get("results", {})

    async def aclose(self):
        await self._http.aclose()


async def _sleep(s: float):
    import asyncio
    await asyncio.sleep(s)
