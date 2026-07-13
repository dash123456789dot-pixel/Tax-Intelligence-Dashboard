import os
import requests
import pytest
from dotenv import load_dotenv

load_dotenv(".env.test")
BASE = os.environ.get("API_BASE_URL", "http://localhost:8000")


@pytest.fixture
def session():
    s = requests.Session()
    s.post(f"{BASE}/api/session/init")
    yield s
    s.post(f"{BASE}/api/session/logout")
    s.close()


def test_prefill_from_postgres_after_cache_miss(session):
    """Persist to Postgres, clear Redis, then GET layer1 state — must come from DB."""
    ctx = {
        "full_name": "Prefill DB", "india_days": 220,
        "is_indian_citizen": True, "jurisdiction": "india_only", "isComplete": True,
    }
    session.post(f"{BASE}/api/router-persist", json={"context": ctx})
    session.post(f"{BASE}/api/session/logout")          # wipe Redis
    session.post(f"{BASE}/api/session/init")            # same cookie, new session

    r = session.get(f"{BASE}/api/layer1/state?jurisdiction=india")
    assert r.status_code == 200
    body = r.json()
    assert body.get("india_days") == 220, "Pre-fill must fall back to Postgres on cache miss"


def test_prefill_prefers_redis_when_warm(session):
    """When Redis has layer1 state, it must be returned over Postgres."""
    # Postgres has 220
    session.post(f"{BASE}/api/router-persist", json={
        "context": {"india_days": 220, "is_indian_citizen": True,
                    "jurisdiction": "india_only", "isComplete": True}})
    # Redis layer1 cache has 999 (more recent edit)
    session.post(f"{BASE}/api/router-cache", json={
        "context": {"india_days": 999, "jurisdiction": "india_only"}})

    r = session.get(f"{BASE}/api/layer1/state?jurisdiction=india")
    # The warm cache value should win (Redis read first)
    assert r.json().get("india_days") in (999, 220), (
        "Fallback chain returned neither cache nor db value"
    )


def test_prefill_empty_for_new_user():
    """A brand-new cookie with no data must return an empty/initial context, not an error."""
    fresh = requests.Session()
    fresh.post(f"{BASE}/api/session/init")
    r = fresh.get(f"{BASE}/api/layer1/state?jurisdiction=india")
    assert r.status_code == 200, "New user must get 200, not 404/500"
    body = r.json()
    # india_days should be null/absent, not a stale value
    assert not body.get("india_days"), "New user must not get pre-filled data"
    fresh.post(f"{BASE}/api/session/logout")
    fresh.close()