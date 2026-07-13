import uuid
from db.connection import get_cursor

# ── Router input + derived + nav columns, in insert order ──────────────────────
ROUTER_COLUMNS = [
    "base_tax_year", "full_name", "date_of_birth",
    "is_indian_citizen", "is_pio_or_oci", "india_days",
    "has_india_source_income_or_assets", "is_us_citizen", "has_green_card",
    "was_in_us_this_year", "us_days", "has_us_source_income_or_assets",
    "liable_to_tax_in_another_country", "left_india_for_employment_this_year",
    "india_flag", "us_flag", "jurisdiction", "is_complete",
]

# ── IDENTITY ───────────────────────────────────────────────────────────────────

def get_or_create_single_user() -> str:
    """
    Returns the users.id for the single user, creating it if the table is empty.
    Since we are testing on a single user only with user management deferred.
    """
    with get_cursor() as cur:
        cur.execute("SELECT id FROM users LIMIT 1")
        row = cur.fetchone()
        if row:
            return str(row["id"])

        cur.execute("INSERT INTO users DEFAULT VALUES RETURNING id")
        return str(cur.fetchone()["id"])


# ── ROUTER ─────────────────────────────────────────────────────────────────────

def upsert_router_session(user_id: str, financial_year: str, ctx: dict) -> None:
    """
    INSERT ON CONFLICT UPDATE for one router session.
    `ctx` is the XState context dict. Keys must match ROUTER_COLUMNS.
    isComplete in context maps to is_complete column.
    """
    values = {col: ctx.get(col) for col in ROUTER_COLUMNS}
    values["is_complete"] = ctx.get("isComplete", ctx.get("is_complete", False))

    # Clean the date_of_birth if it's empty string
    if values["date_of_birth"] == "":
        values["date_of_birth"] = None

    cols = ["user_id", "financial_year"] + ROUTER_COLUMNS
    placeholders = ", ".join(["%s"] * len(cols))
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in ROUTER_COLUMNS)

    sql = f"""
        INSERT INTO router_sessions ({", ".join(cols)})
        VALUES ({placeholders})
        ON CONFLICT (user_id, financial_year)
        DO UPDATE SET {updates}, updated_at = NOW()
    """
    params = [user_id, financial_year] + [values[c] for c in ROUTER_COLUMNS]

    with get_cursor() as cur:
        cur.execute(sql, params)


def get_router_session(user_id: str, financial_year: str = "FY2025-26") -> dict | None:
    """SELECT one router session by (user_id, financial_year)."""
    with get_cursor() as cur:
        cur.execute(
            "SELECT * FROM router_sessions WHERE user_id = %s AND financial_year = %s",
            (user_id, financial_year),
        )
        return cur.fetchone()


def delete_router_session(user_id: str, financial_year: str = "FY2025-26") -> None:
    """DELETE one router session (admin only)."""
    with get_cursor() as cur:
        cur.execute(
            "DELETE FROM router_sessions WHERE user_id = %s AND financial_year = %s",
            (user_id, financial_year),
        )
