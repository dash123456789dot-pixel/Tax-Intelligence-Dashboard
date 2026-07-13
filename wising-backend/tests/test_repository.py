import os
import uuid
import pytest
from dotenv import load_dotenv

load_dotenv(".env.test")
os.environ["DATABASE_URL"] = os.environ["DATABASE_URL_TEST"]  # point repo at test DB

from db.repository import (
    get_or_create_single_user,
    upsert_router_session,
    get_router_session,
    delete_router_session,
)
from db.connection import get_cursor


SAMPLE_CTX = {
    "base_tax_year": "2025",
    "full_name": "Test User",
    "date_of_birth": "1990-01-15",
    "is_indian_citizen": True,
    "is_pio_or_oci": None,
    "india_days": 200,
    "has_india_source_income_or_assets": True,
    "is_us_citizen": False,
    "has_green_card": False,
    "was_in_us_this_year": True,
    "us_days": 100,
    "has_us_source_income_or_assets": False,
    "liable_to_tax_in_another_country": False,
    "left_india_for_employment_this_year": False,
    "india_flag": True,
    "us_flag": False,
    "jurisdiction": "india_only",
    "isComplete": True,
}


@pytest.fixture
def clean_cookie():
    cookie = f"test-cookie-{uuid.uuid4()}"
    yield cookie
    # Cleanup: delete the user and cascade
    with get_cursor() as cur:
        cur.execute("DELETE FROM users WHERE cookie_id = %s", (cookie,))


# ── Identity ─────────────────────────────────────────────────────────────────

def test_get_or_create_user_creates_once(clean_cookie):
    uid1 = get_or_create_single_user(clean_cookie)
    uid2 = get_or_create_single_user(clean_cookie)
    assert uid1 == uid2, "Same cookie must always resolve to the same user_id"
    # Confirm it's a valid UUID
    uuid.UUID(uid1)


def test_new_cookie_gives_new_user():
    c1 = f"test-cookie-{uuid.uuid4()}"
    c2 = f"test-cookie-{uuid.uuid4()}"
    uid1 = get_or_create_single_user(c1)
    uid2 = get_or_create_single_user(c2)
    assert uid1 != uid2, "Different cookies must give different user_ids"
    # cleanup
    with get_cursor() as cur:
        cur.execute("DELETE FROM users WHERE cookie_id IN (%s, %s)", (c1, c2))


# ── Router upsert + read ──────────────────────────────────────────────────────

def test_upsert_then_get(clean_cookie):
    uid = get_or_create_single_user(clean_cookie)
    upsert_router_session(uid, "FY2025-26", SAMPLE_CTX)
    row = get_router_session(uid, "FY2025-26")

    assert row is not None
    assert row["full_name"] == "Test User"
    assert row["india_days"] == 200
    assert row["jurisdiction"] == "india_only"
    assert row["is_complete"] is True
    assert row["is_indian_citizen"] is True
    assert row["is_pio_or_oci"] is None  # null preserved


def test_upsert_is_idempotent_update(clean_cookie):
    uid = get_or_create_single_user(clean_cookie)
    upsert_router_session(uid, "FY2025-26", SAMPLE_CTX)

    # Change one value and upsert again
    updated = {**SAMPLE_CTX, "india_days": 250, "jurisdiction": "dual", "us_flag": True}
    upsert_router_session(uid, "FY2025-26", updated)

    row = get_router_session(uid, "FY2025-26")
    assert row["india_days"] == 250, "UPSERT must update existing row"
    assert row["jurisdiction"] == "dual"

    # There must still be only ONE row for this (user_id, FY)
    with get_cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) AS c FROM router_sessions WHERE user_id = %s AND financial_year = %s",
            (uid, "FY2025-26"))
        assert cur.fetchone()["c"] == 1, "UPSERT created a duplicate row"


def test_multiple_financial_years_coexist(clean_cookie):
    uid = get_or_create_single_user(clean_cookie)
    upsert_router_session(uid, "FY2025-26", SAMPLE_CTX)
    upsert_router_session(uid, "FY2024-25", {**SAMPLE_CTX, "india_days": 90, "jurisdiction": "us_only"})

    row_2526 = get_router_session(uid, "FY2025-26")
    row_2425 = get_router_session(uid, "FY2024-25")

    assert row_2526["india_days"] == 200, "FY2025-26 untouched by FY2024-25 write"
    assert row_2425["india_days"] == 90
    assert row_2526["jurisdiction"] == "india_only"
    assert row_2425["jurisdiction"] == "us_only"

    # Both rows present
    with get_cursor() as cur:
        cur.execute("SELECT COUNT(*) AS c FROM router_sessions WHERE user_id = %s", (uid,))
        assert cur.fetchone()["c"] == 2, "Both financial years must coexist"


def test_updated_at_changes_on_update(clean_cookie):
    uid = get_or_create_single_user(clean_cookie)
    upsert_router_session(uid, "FY2025-26", SAMPLE_CTX)
    first = get_router_session(uid, "FY2025-26")["updated_at"]

    import time
    time.sleep(1)
    upsert_router_session(uid, "FY2025-26", {**SAMPLE_CTX, "india_days": 300})
    second = get_router_session(uid, "FY2025-26")["updated_at"]

    assert second > first, "updated_at trigger did not fire"


def test_delete_router_session(clean_cookie):
    uid = get_or_create_single_user(clean_cookie)
    upsert_router_session(uid, "FY2025-26", SAMPLE_CTX)
    delete_router_session(uid, "FY2025-26")
    assert get_router_session(uid, "FY2025-26") is None


def test_cascade_delete_user_removes_sessions(clean_cookie):
    uid = get_or_create_user_by_cookie(clean_cookie)
    upsert_router_session(uid, "FY2025-26", SAMPLE_CTX)

    with get_cursor() as cur:
        cur.execute("DELETE FROM users WHERE id = %s", (uid,))

    # Session must be gone via CASCADE
    assert get_router_session(uid, "FY2025-26") is None