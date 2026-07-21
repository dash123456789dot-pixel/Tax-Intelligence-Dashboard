-- ════════════════════════════════════════════════════════════════════════════
-- WISING — Router + Identity Schema (Simplified for Testing)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. IDENTITY ROOT
-- Simplified table containing only user_id for testing with a single user.
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROUTER SESSIONS
-- Maps exactly to the XState RouterContext. Column names preserved 1:1 with the
-- context keys. Composite primary key (user_id, financial_year).
CREATE TABLE IF NOT EXISTS router_sessions (
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

CREATE INDEX IF NOT EXISTS idx_router_sessions_jurisdiction ON router_sessions(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_router_sessions_updated ON router_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_router_sessions_user ON router_sessions(user_id);

-- 3. updated_at AUTO-TOUCH TRIGGER
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_touch ON users;
CREATE TRIGGER trg_users_touch
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_router_sessions_touch ON router_sessions;
CREATE TRIGGER trg_router_sessions_touch
    BEFORE UPDATE ON router_sessions
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 4. LAYER 1 INDIA QUARTER ENTRIES
CREATE TABLE IF NOT EXISTS quarter_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    financial_year VARCHAR(9) NOT NULL,
    quarter_type VARCHAR(10) NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4'
    status VARCHAR(20) DEFAULT 'DRAFT',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (user_id, financial_year) REFERENCES router_sessions(user_id, financial_year) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS trg_quarter_entries_touch ON quarter_entries;
CREATE TRIGGER trg_quarter_entries_touch
    BEFORE UPDATE ON quarter_entries
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 5. LAYER 1 INDIA FORM DATA TABLES
CREATE TABLE IF NOT EXISTS residency_data (
    quarter_id UUID PRIMARY KEY REFERENCES quarter_entries(id) ON DELETE CASCADE,
    live_tracking_active BOOLEAN DEFAULT FALSE,
    manual_days INTEGER,
    final_india_residency_status VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS salary_data (
    quarter_id UUID PRIMARY KEY REFERENCES quarter_entries(id) ON DELETE CASCADE,
    has_salary_income BOOLEAN DEFAULT FALSE,
    gross_salary_inr NUMERIC(15,2),
    basic_da_inr NUMERIC(15,2),
    perquisites_inr NUMERIC(15,2),
    esop_perquisite_inr NUMERIC(15,2),
    professional_tax_inr NUMERIC(15,2),
    employer_nps_contribution_inr NUMERIC(15,2),
    lta_claimed_inr NUMERIC(15,2),
    hra_received_inr NUMERIC(15,2),
    rent_paid_inr NUMERIC(15,2),
    is_metro_city BOOLEAN
);

CREATE TABLE IF NOT EXISTS business_data (
    quarter_id UUID PRIMARY KEY REFERENCES quarter_entries(id) ON DELETE CASCADE,
    has_business_income BOOLEAN DEFAULT FALSE,
    is_section_8 BOOLEAN,
    amt_credit_bf_inr NUMERIC(15,2),
    amt_credit_bf_origin_ay VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS business_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quarter_id UUID REFERENCES quarter_entries(id) ON DELETE CASCADE,
    presumptive_scheme VARCHAR(50),
    business_code VARCHAR(20),
    profession_type VARCHAR(50),
    turnover_inr NUMERIC(15,2),
    net_profit_inr NUMERIC(15,2)
);

CREATE TABLE IF NOT EXISTS capital_gains_data (
    quarter_id UUID PRIMARY KEY REFERENCES quarter_entries(id) ON DELETE CASCADE,
    has_capital_gains BOOLEAN DEFAULT FALSE,
    cg_section_gate_open BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS cg_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quarter_id UUID REFERENCES quarter_entries(id) ON DELETE CASCADE,
    status VARCHAR(20),
    is_joint_property BOOLEAN,
    ownership_percentage NUMERIC(5,2),
    purchase_value NUMERIC(15,2),
    sale_value NUMERIC(15,2)
);

-- BROKER ADAPTER TABLES
CREATE TABLE IF NOT EXISTS broker_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    broker_name VARCHAR(100),
    status VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS broker_raw_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES broker_connections(id) ON DELETE CASCADE,
    raw_payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS cg_financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quarter_id UUID REFERENCES quarter_entries(id) ON DELETE CASCADE,
    source VARCHAR(20) DEFAULT 'MANUAL', -- 'MANUAL' or 'BROKER'
    connection_id UUID REFERENCES broker_connections(id) ON DELETE CASCADE, -- NULL if MANUAL
    asset_type VARCHAR(50), 
    ticker VARCHAR(50),
    buy_value NUMERIC(15,2),
    sell_value NUMERIC(15,2)
);
