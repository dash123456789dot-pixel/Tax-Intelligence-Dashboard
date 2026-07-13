import os
import requests
import pytest
from dotenv import load_dotenv

load_dotenv(".env.test")
BASE = os.environ.get("API_BASE_URL", "http://localhost:8000")


@pytest.fixture
def session():
    """A requests session that persists the wising_uid cookie across calls."""
    s = requests.Session()
    yield s
    s.close()


# ── Session init ──────────────────────────────────────────────────────────────

def test_session_init_returns_user_id(session):
    r = session.post(f"{BASE}/api/session/init")
    assert r.status_code == 200
    body = r.json()
    assert "user_id" in body
    assert "cookie_id" in body
    # Cookie must be set
    assert "wising_uid" in session.cookies


def test_session_init_is_stable(session):
    r1 = session.post(f"{BASE}/api/session/init")
    uid1 = r1.json()["user_id"]
    r2 = session.post(f"{BASE}/api/session/init")
    uid2 = r2.json()["user_id"]
    assert uid1 == uid2, "Same cookie must return the same user_id on repeat init"


def test_session_init_cookie_is_httponly(session):
    r = session.post(f"{BASE}/api/session/init")
    set_cookie = r.headers.get("set-cookie", "")
    assert "HttpOnly" in set_cookie, "wising_uid cookie must be HttpOnly"
    assert "Secure" in set_cookie, "wising_uid cookie must be Secure"


# ── Router cache (Redis) ──────────────────────────────────────────────────────

def test_router_cache_roundtrip(session):
    session.post(f"{BASE}/api/session/init")
    ctx = {"full_name": "Cache Test", "india_days": 150, "jurisdiction": "india_only"}
    post = session.post(f"{BASE}/api/router-cache", json={"context": ctx})
    assert post.status_code == 200

    get = session.get(f"{BASE}/api/router-cache")
    assert get.status_code == 200
    assert get.json()["context"]["india_days"] == 150


# ── Router persist (Postgres) ─────────────────────────────────────────────────

def test_router_persist_writes_to_postgres(session):
    session.post(f"{BASE}/api/session/init")
    ctx = {
        "full_name": "Persist Test", "india_days": 200,
        "is_indian_citizen": True, "jurisdiction": "india_only",
        "isComplete": True, "financial_year": "FY2025-26",
    }
    r = session.post(f"{BASE}/api/router-persist", json={"context": ctx})
    assert r.status_code in (200, 201)

    # Read it back
    uid = session.post(f"{BASE}/api/session/init").json()["user_id"]
    g = session.get(f"{BASE}/api/router-persist/{uid}")
    assert g.status_code == 200
    assert g.json()["full_name"] == "Persist Test"


# ── Logout clears Redis but not Postgres ──────────────────────────────────────

def test_logout_clears_cache_keeps_db(session):
    session.post(f"{BASE}/api/session/init")
    ctx = {"full_name": "Logout Test", "india_days": 175,
           "jurisdiction": "india_only", "isComplete": True}
    session.post(f"{BASE}/api/router-persist", json={"context": ctx})
    session.post(f"{BASE}/api/router-cache", json={"context": ctx})

    # Logout
    lo = session.post(f"{BASE}/api/session/logout")
    assert lo.status_code == 200

    # Cache should be empty now
    cache = session.get(f"{BASE}/api/router-cache")
    cache_body = cache.json()
    assert not cache_body.get("context"), "Redis cache must be cleared on logout"

    # But Postgres still has it
    uid = session.post(f"{BASE}/api/session/init").json()["user_id"]
    db = session.get(f"{BASE}/api/router-persist/{uid}")
    assert db.json()["full_name"] == "Logout Test", "Postgres must survive logout"