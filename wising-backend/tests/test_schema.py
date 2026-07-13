import os
import psycopg2
import pytest
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv(".env.test")
DB_URL = os.environ["DATABASE_URL_TEST"]

# ── Expected schema, derived from router_schema_implementation.md ──────────────

EXPECTED_ROUTER_COLUMNS = {
    "user_id": "uuid",
    "financial_year": "character varying",
    "created_at": "timestamp with time zone",
    "updated_at": "timestamp with time zone",
    "base_tax_year": "character varying",
    "full_name": "character varying",
    "date_of_birth": "date",
    "is_indian_citizen": "boolean",
    "is_pio_or_oci": "boolean",
    "india_days": "integer",
    "has_india_source_income_or_assets": "boolean",
    "is_us_citizen": "boolean",
    "has_green_card": "boolean",
    "was_in_us_this_year": "boolean",
    "us_days": "integer",
    "has_us_source_income_or_assets": "boolean",
    "liable_to_tax_in_another_country": "boolean",
    "left_india_for_employment_this_year": "boolean",
    "india_flag": "boolean",
    "us_flag": "boolean",
    "jurisdiction": "character varying",
    "is_complete": "boolean",
}

EXPECTED_USERS_COLUMNS = {
    "id": "uuid",
    "wising_uid": "character varying",
    "email": "character varying",
    "created_at": "timestamp with time zone",
    "updated_at": "timestamp with time zone",
    "last_seen_at": "timestamp with time zone",
}

# Columns that must NOT exist (removed in the corrected schema)
FORBIDDEN_ROUTER_COLUMNS = {
    "tb_permanent_home", "tb_vital_interests", "tb_habitual_abode",
    "tb_nationality", "is_statutory_dual_resident", "tie_breaker_winner",
}


@pytest.fixture(scope="module")
def cur():
    conn = psycopg2.connect(DB_URL, sslmode="require")
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    yield cursor
    cursor.close()
    conn.close()


def _columns(cur, table):
    cur.execute(
        """SELECT column_name, data_type FROM information_schema.columns
           WHERE table_name = %s""", (table,))
    return {r["column_name"]: r["data_type"] for r in cur.fetchall()}


# ── Table existence ─────────────────────────────────────────────────────────────

def test_users_table_exists(cur):
    cur.execute("SELECT to_regclass('public.users') AS t")
    assert cur.fetchone()["t"] is not None, "users table missing"


def test_router_sessions_table_exists(cur):
    cur.execute("SELECT to_regclass('public.router_sessions') AS t")
    assert cur.fetchone()["t"] is not None, "router_sessions table missing"


# ── Column completeness ─────────────────────────────────────────────────────────

def test_users_columns(cur):
    actual = _columns(cur, "users")
    for col, dtype in EXPECTED_USERS_COLUMNS.items():
        assert col in actual, f"users missing column: {col}"
        assert actual[col] == dtype, f"users.{col} is {actual[col]}, expected {dtype}"


def test_router_sessions_columns(cur):
    actual = _columns(cur, "router_sessions")
    for col, dtype in EXPECTED_ROUTER_COLUMNS.items():
        assert col in actual, f"router_sessions missing column: {col}"
        assert actual[col] == dtype, f"router_sessions.{col} is {actual[col]}, expected {dtype}"


def test_forbidden_columns_absent(cur):
    actual = _columns(cur, "router_sessions")
    for col in FORBIDDEN_ROUTER_COLUMNS:
        assert col not in actual, (
            f"FORBIDDEN column {col} found in router_sessions. "
            f"Tie-breaker fields belong in Layer 1, not the router."
        )


# ── Primary key is composite (user_id, financial_year) ──────────────────────────

def test_router_composite_primary_key(cur):
    cur.execute("""
        SELECT a.attname AS col
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'router_sessions'::regclass AND i.indisprimary
        ORDER BY a.attname
    """)
    pk_cols = sorted(r["col"] for r in cur.fetchall())
    assert pk_cols == ["financial_year", "user_id"], (
        f"PK must be (user_id, financial_year), got {pk_cols}"
    )


# ── Foreign key router_sessions.user_id → users.id ──────────────────────────────

def test_router_user_fk(cur):
    cur.execute("""
        SELECT confrelid::regclass AS ref_table
        FROM pg_constraint
        WHERE conrelid = 'router_sessions'::regclass AND contype = 'f'
    """)
    refs = [r["ref_table"] for r in cur.fetchall()]
    assert "users" in [str(x) for x in refs], "router_sessions.user_id must FK to users"


# ── jurisdiction CHECK constraint ───────────────────────────────────────────────

def test_jurisdiction_check_constraint(cur):
    cur.execute("""
        SELECT pg_get_constraintdef(oid) AS def
        FROM pg_constraint
        WHERE conrelid = 'router_sessions'::regclass AND contype = 'c'
    """)
    defs = " ".join(r["def"] for r in cur.fetchall())
    for val in ["dual", "india_only", "us_only", "none"]:
        assert val in defs, f"jurisdiction CHECK missing value: {val}"


# ── updated_at trigger fires ────────────────────────────────────────────────────

def test_updated_at_trigger(cur):
    cur.execute("""
        SELECT tgname FROM pg_trigger
        WHERE tgrelid = 'router_sessions'::regclass AND NOT tgisinternal
    """)
    triggers = [r["tgname"] for r in cur.fetchall()]
    assert any("touch" in t for t in triggers), "updated_at trigger missing on router_sessions"


# ── Indexes exist ───────────────────────────────────────────────────────────────

def test_indexes_exist(cur):
    cur.execute("""
        SELECT indexname FROM pg_indexes WHERE tablename = 'router_sessions'
    """)
    idx = " ".join(r["indexname"] for r in cur.fetchall())
    for expected in ["jurisdiction", "updated", "user"]:
        assert expected in idx, f"Expected index containing '{expected}' on router_sessions"