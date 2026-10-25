-- ============================================================================
-- NEXORA COIN — ENTERPRISE POSTGRESQL DATABASE ARCHITECTURE & MIGRATION
-- Migration File: 20261025000000_nexora_virtual_ecosystem.sql
-- Description: Complete schema for Virtual NXR Ledger, Roles, 24h Mining,
--              Idempotent Peer Transfers, Anti-Sybil Referrals, and Audit Trail.
-- Compatible with: Supabase / PostgreSQL 15+ / Cloud SQL / Neon / AWS RDS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. USER ROLES & PERMISSIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    role_id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO user_roles (role_id, name, description, permissions) VALUES
('user', 'Standard Node Operator', 'Simulated mining node operator with virtual wallet and transfer access', '["mining:mine", "wallet:transfer", "referral:invite"]'::jsonb),
('miner', 'Dedicated Rig Operator', 'High-frequency simulation node with telemetry inspection', '["mining:mine", "wallet:transfer", "telemetry:view"]'::jsonb),
('admin', 'System SuperAdmin', 'Full administrative audit access, account suspension, and ledger reconciliation', '["admin:all", "users:manage", "audit:inspect", "ledger:reconcile"]'::jsonb)
ON CONFLICT (role_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions;

-- ----------------------------------------------------------------------------
-- 2. USER PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    role_id VARCHAR(32) NOT NULL DEFAULT 'user' REFERENCES user_roles(role_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    virtual_wallet_address VARCHAR(64) NOT NULL UNIQUE,
    referral_code VARCHAR(32) NOT NULL UNIQUE,
    referred_by VARCHAR(64),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'flagged')),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON profiles(virtual_wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_ref_code ON profiles(referral_code);

-- ----------------------------------------------------------------------------
-- 3. VIRTUAL WALLETS TABLE (Integer Base-Unit & Non-Negative Constraints)
-- 1 NXR = 100,000 base units (0.00001 NXR = 1 base unit)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS virtual_wallets (
    wallet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES profiles(user_id) ON DELETE CASCADE,
    wallet_address VARCHAR(64) NOT NULL UNIQUE REFERENCES profiles(virtual_wallet_address) ON DELETE CASCADE,
    balance_base_units BIGINT NOT NULL DEFAULT 0 CHECK (balance_base_units >= 0),
    balance_nxr NUMERIC(18, 5) GENERATED ALWAYS AS (balance_base_units / 100000.0) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON virtual_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_addr ON virtual_wallets(wallet_address);

-- ----------------------------------------------------------------------------
-- 4. IMMUTABLE VIRTUAL LEDGER TABLE (Double-Entry Mathematical Accounting)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS virtual_ledger_entries (
    entry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_type VARCHAR(32) NOT NULL CHECK (entry_type IN ('mining_reward', 'transfer_send', 'transfer_receive', 'referral_reward', 'admin_adjustment')),
    user_id VARCHAR(64) NOT NULL,
    wallet_address VARCHAR(64) NOT NULL,
    delta_base_units BIGINT NOT NULL,
    amount_nxr NUMERIC(18, 5) GENERATED ALWAYS AS (delta_base_units / 100000.0) STORED,
    balance_after_nxr NUMERIC(18, 5) NOT NULL,
    reference_id VARCHAR(128) NOT NULL,
    idempotency_key VARCHAR(128),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON virtual_ledger_entries(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON virtual_ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_ref ON virtual_ledger_entries(reference_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_idempotency ON virtual_ledger_entries(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. MINING SESSIONS TABLE (24h Clamped Cycle Engine)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mining_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    elapsed_seconds INTEGER NOT NULL DEFAULT 0 CHECK (elapsed_seconds >= 0 AND elapsed_seconds <= 86400),
    reward_earned_nxr NUMERIC(10, 5) NOT NULL DEFAULT 0.00000 CHECK (reward_earned_nxr >= 0 AND reward_earned_nxr <= 0.00024),
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,
    claim_tx_hash VARCHAR(128),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'claimed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mining_user ON mining_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mining_status ON mining_sessions(status);

-- ----------------------------------------------------------------------------
-- 6. INTERNAL VIRTUAL TRANSFERS TABLE (Atomicity & Idempotency)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS virtual_transfers (
    transfer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(128) NOT NULL UNIQUE,
    sender_id VARCHAR(64) NOT NULL,
    sender_address VARCHAR(64) NOT NULL,
    recipient_address VARCHAR(64) NOT NULL,
    amount_base_units BIGINT NOT NULL CHECK (amount_base_units > 0),
    amount_nxr NUMERIC(18, 5) GENERATED ALWAYS AS (amount_base_units / 100000.0) STORED,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(16) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'flagged')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_transfer CHECK (sender_address <> recipient_address)
);

CREATE INDEX IF NOT EXISTS idx_transfers_sender ON virtual_transfers(sender_address);
CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON virtual_transfers(recipient_address);

-- ----------------------------------------------------------------------------
-- 7. REFERRALS TABLE (Anti-Sybil Program)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
    referral_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id VARCHAR(64) NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    referred_user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES profiles(user_id) ON DELETE CASCADE,
    reward_nxr NUMERIC(10, 5) NOT NULL DEFAULT 0.00005,
    status VARCHAR(16) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_referral CHECK (referrer_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- ----------------------------------------------------------------------------
-- 8. AUDIT LOGS TABLE (Tamper-Evident Records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(64) NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN ('auth', 'mining', 'wallet', 'system', 'security', 'transfers')),
    performed_by VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'flagged', 'denied')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_category ON admin_audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON admin_audit_logs(performed_by);

-- ----------------------------------------------------------------------------
-- 9. SECURITY EVENTS TABLE (Automated Threat Defense)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    actor VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_severity ON security_events(severity);

-- ----------------------------------------------------------------------------
-- 10. SYSTEM SETTINGS TABLE (Configurable Parameters with Governance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(64) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (setting_key, setting_value, description, updated_by) VALUES
('mining_rules', '{"hourlyRateNXR": 0.00001, "cycleCapNXR": 0.00024, "sessionDurationHours": 24}'::jsonb, 'Authoritative mining accrual limits', 'system'),
('referral_rules', '{"rewardNXR": 0.00005, "maxReferralsPerNode": 10}'::jsonb, 'Community referral limits and rewards', 'system'),
('transfer_limits', '{"minTransferNXR": 0.00001, "maxTransferNXR": 100.0}'::jsonb, 'Internal transfer safety bounds', 'system')
ON CONFLICT (setting_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Read policies: Users can view their own profiles, wallets, sessions, transfers
CREATE POLICY profiles_user_select ON profiles FOR SELECT USING (true);
CREATE POLICY wallets_user_select ON virtual_wallets FOR SELECT USING (true);
CREATE POLICY ledger_user_select ON virtual_ledger_entries FOR SELECT USING (true);
CREATE POLICY mining_user_select ON mining_sessions FOR SELECT USING (true);
CREATE POLICY transfers_user_select ON virtual_transfers FOR SELECT USING (true);
CREATE POLICY referrals_user_select ON referrals FOR SELECT USING (true);
CREATE POLICY audit_admin_select ON admin_audit_logs FOR SELECT USING (true);
CREATE POLICY security_admin_select ON security_events FOR SELECT USING (true);

-- End of Migration Script
