import os
import requests
import pytest
from dotenv import load_dotenv

load_dotenv(".env.test")
BASE = os.environ.get("API_BASE_URL", "http://localhost:8000")


def test_full_router_to_layer1_journey():
    """
    1. Init session (get user_id)
    2. Answer questions → cache to Redis
    3. Complete → persist to Postgres
    4. Verify both Redis and Postgres have data
    5. Logout → Redis cleared, Postgres intact
    6. Reload Layer 1 → pre-fill comes from Postgres
    7. Verify pre-filled india_days matches what was entered
    """
    s = requests.Session()

    # 1. Init
    init = s.post(f"{BASE}/api/session/init").json()
    user_id = init["user_id"]
    assert user_id

    # 2. Answer questions (incremental cache writes)
    for days in [50, 120, 200]:
        s.post(f"{BASE}/api/router-cache", json={
            "context": {"india_days": days, "is_indian_citizen": True,
                        "jurisdiction": "india_only"}})

    # 3. Complete → persist
    final_ctx = {
        "full_name": "E2E User", "date_of_birth": "1985-06-20",
        "is_indian_citizen": True, "india_days": 200,
        "has_india_source_income_or_assets": True,
        "is_us_citizen": False, "was_in_us_this_year": False,
        "india_flag": True, "us_flag": False,
        "jurisdiction": "india_only", "isComplete": True,
        "financial_year": "FY2025-26",
    }
    persist = s.post(f"{BASE}/api/router-persist", json={"context": final_ctx})
    assert persist.status_code in (200, 201)

    # 4. Both stores have data
    assert s.get(f"{BASE}/api/router-cache").json().get("context")
    assert s.get(f"{BASE}/api/router-persist/{user_id}").json()["full_name"] == "E2E User"

    # 5. Logout
    s.post(f"{BASE}/api/session/logout")
    assert not s.get(f"{BASE}/api/router-cache").json().get("context"), "Redis not cleared"

    # 6 + 7. Re-init same cookie, reload Layer 1, verify pre-fill from Postgres
    s.post(f"{BASE}/api/session/init")
    layer1 = s.get(f"{BASE}/api/layer1/state?jurisdiction=india").json()
    assert layer1.get("india_days") == 200, "Pre-fill failed — Layer 1 did not get router data"
    assert layer1.get("is_indian_citizen") is True

    # cleanup
    with_cleanup(user_id)
    s.close()


def with_cleanup(user_id):
    import psycopg2
    conn = psycopg2.connect(os.environ["DATABASE_URL_TEST"], sslmode="require")
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
    conn.commit()
    cur.close()
    conn.close()