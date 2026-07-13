-- ════════════════════════════════════════════════════════════════════════════
-- WISING — Router + Identity Schema (Simplified for Testing)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. IDENTITY ROOT
-- Simplified table containing only user_id for testing with a single user.
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROUTER SESSIONS
-- Maps exactly to the XState RouterContext. Column names preserved 1:1 with the
-- context keys. Composite primary key (user_id, financial_year).
CREATE TABLE router_sessions (
    -- Identity (references the identity root)
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    financial_year  VARCHAR(9) NOT NULL DEFAULT 'FY2025-26',  -- e.g. 'FY2025-26'

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    -- ── Router Inputs (matching RouterInputs type exactly) ──────────────────
    base_tax_year                       VARCHAR(4),
    full_name                           VARCHAR(255),
    date_of_birth                       DATE,
    is_indian_citizen                   BOOLEAN,
    is_pio_or_oci                       BOOLEAN,
    india_days                          INTEGER,
    has_india_source_income_or_assets   BOOLEAN,
    is_us_citizen                       BOOLEAN,
    has_green_card                      BOOLEAN,
    was_in_us_this_year                 BOOLEAN,
    us_days                             INTEGER,
    has_us_source_income_or_assets      BOOLEAN,
    liable_to_tax_in_another_country    BOOLEAN,
    left_india_for_employment_this_year BOOLEAN,

    -- ── Derived Router Outputs (matching RouterDerived type exactly) ────────
    india_flag                  BOOLEAN DEFAULT FALSE,
    us_flag                     BOOLEAN DEFAULT FALSE,
    jurisdiction                VARCHAR(20) DEFAULT 'none'
                                CHECK (jurisdiction IN ('dual', 'india_only', 'us_only', 'none')),

    -- ── Navigation State ────────────────────────────────────────────────────
    is_complete                 BOOLEAN DEFAULT FALSE,

    PRIMARY KEY (user_id, financial_year)
);

CREATE INDEX idx_router_sessions_jurisdiction ON router_sessions(jurisdiction);
CREATE INDEX idx_router_sessions_updated ON router_sessions(updated_at);
CREATE INDEX idx_router_sessions_user ON router_sessions(user_id);

-- 3. updated_at AUTO-TOUCH TRIGGER
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_touch
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_router_sessions_touch
    BEFORE UPDATE ON router_sessions
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
