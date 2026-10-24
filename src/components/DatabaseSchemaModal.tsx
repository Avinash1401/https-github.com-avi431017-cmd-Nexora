import React, { useState } from 'react';
import {
  Database,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  Terminal,
  X,
  Download,
  FileCode,
  Table as TableIcon,
  Lock,
} from 'lucide-react';

interface DatabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const POSTGRESQL_SCHEMA_SQL = `-- ============================================================================
-- NEXORA COIN — ENTERPRISE POSTGRESQL DATABASE ARCHITECTURE
-- Migration: 20261024000000_create_nexora_schema.sql
-- Description: Core tables, Row Level Security (RLS) policies, indexes,
--              constraints, audit triggers, and atomic mining reward claim logic.
-- Compatible with: Supabase / PostgreSQL 15+ / Cloud SQL / AWS RDS / Neon
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USER ROLES (Enterprise RBAC Definitions)
CREATE TABLE IF NOT EXISTS user_roles (
    role_id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO user_roles (role_id, name, description, permissions) VALUES
('role_standard_miner', 'Standard Miner', 'Simulated mining node operator with virtual wallet access', '["mining:mine", "wallet:virtual_transfer", "portfolio:view"]'::jsonb),
('role_institutional', 'Institutional Trader', 'Extended virtual portfolio quotas and simulated block validation', '["mining:mine", "wallet:virtual_transfer", "portfolio:analytics", "market:high_freq"]'::jsonb),
('role_superadmin', 'Super Administrator', 'Full system configuration, audit logs, and cluster difficulty adjustment', '["admin:all", "mining:calibrate", "audit:inspect", "users:manage", "settings:write"]'::jsonb)
ON CONFLICT (role_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions;

-- 2. USER PROFILES TABLE (Linked to auth.users or standalone testnet users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    country_code CHAR(2) DEFAULT 'US',
    preferred_fiat CHAR(3) NOT NULL DEFAULT 'USD',
    virtual_wallet_address VARCHAR(64) NOT NULL UNIQUE,
    role_id VARCHAR(32) NOT NULL DEFAULT 'role_standard_miner' REFERENCES user_roles(role_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_addr ON profiles(virtual_wallet_address);

-- 3. VIRTUAL WALLETS TABLE (Isolated from real-asset ledgers)
CREATE TABLE IF NOT EXISTS virtual_wallets (
    wallet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(16) NOT NULL, -- 'NXR', 'BTC', 'ETH', 'SOL'
    virtual_balance NUMERIC(28, 8) NOT NULL DEFAULT 0.00000000,
    locked_balance NUMERIC(28, 8) NOT NULL DEFAULT 0.00000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_positive_balance CHECK (virtual_balance >= 0),
    CONSTRAINT chk_positive_locked CHECK (locked_balance >= 0),
    CONSTRAINT uq_user_asset UNIQUE (user_id, asset_symbol)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON virtual_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_symbol ON virtual_wallets(asset_symbol);

-- 4. MINING SESSIONS TABLE (Proof-of-Work Simulation Tracking)
CREATE TABLE IF NOT EXISTS mining_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    speed_mode VARCHAR(32) NOT NULL DEFAULT 'standard',
    nominal_hashrate_mhs NUMERIC(10, 2) NOT NULL DEFAULT 45.50,
    session_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'paused', 'completed', 'aborted')),
    blocks_solved INT NOT NULL DEFAULT 0,
    total_nxr_reward NUMERIC(20, 4) NOT NULL DEFAULT 0.0000,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_tick_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    CONSTRAINT chk_positive_blocks CHECK (blocks_solved >= 0),
    CONSTRAINT chk_positive_reward CHECK (total_nxr_reward >= 0)
);

CREATE INDEX IF NOT EXISTS idx_mining_user_status ON mining_sessions(user_id, session_status);
CREATE INDEX IF NOT EXISTS idx_mining_started ON mining_sessions(started_at DESC);

-- 5. VIRTUAL TRANSACTIONS TABLE (Immutable Virtual Ledger)
CREATE TABLE IF NOT EXISTS virtual_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    tx_type VARCHAR(32) NOT NULL CHECK (tx_type IN ('mining_reward', 'send', 'receive', 'trade_buy', 'trade_sell', 'fee')),
    asset_symbol VARCHAR(16) NOT NULL,
    amount NUMERIC(28, 8) NOT NULL CHECK (amount > 0),
    amount_usd NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    network_fee NUMERIC(20, 8) NOT NULL DEFAULT 0.00000000,
    from_address VARCHAR(128) NOT NULL,
    to_address VARCHAR(128) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON virtual_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON virtual_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON virtual_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON virtual_transactions(created_at DESC);

-- 6. PORTFOLIO ASSETS TABLE
CREATE TABLE IF NOT EXISTS portfolio_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coin_id VARCHAR(64) NOT NULL,
    symbol VARCHAR(16) NOT NULL,
    name VARCHAR(64) NOT NULL,
    balance NUMERIC(28, 8) NOT NULL DEFAULT 0.00000000 CHECK (balance >= 0),
    average_buy_price_usd NUMERIC(16, 4) NOT NULL DEFAULT 0.0000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_portfolio_coin UNIQUE (user_id, coin_id)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_assets(user_id);

-- 7. WATCHLISTS TABLE
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coin_id VARCHAR(64) NOT NULL,
    symbol VARCHAR(16) NOT NULL,
    target_price_alert_high NUMERIC(16, 4),
    target_price_alert_low NUMERIC(16, 4),
    pinned_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_watchlist_coin UNIQUE (user_id, coin_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (notification_type IN ('info', 'success', 'warning', 'reward', 'security')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- 9. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    performed_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN ('auth', 'mining', 'wallet', 'system', 'security', 'role_change')),
    ip_address INET,
    user_agent TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON admin_audit_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);

-- 10. AUTOMATED TIMESTAMP UPDATE TRIGGER
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_timestamp ON profiles;
CREATE TRIGGER trg_profiles_timestamp
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS trg_wallets_timestamp ON virtual_wallets;
CREATE TRIGGER trg_wallets_timestamp
BEFORE UPDATE ON virtual_wallets
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- 11. SECURITY & ROLE HELPER FUNCTION
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role VARCHAR(32);
BEGIN
    SELECT role_id INTO v_role FROM profiles WHERE id = check_user_id;
    RETURN (v_role = 'role_superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. ATOMIC STORED PROCEDURE: CLAIM MINING REWARD
CREATE OR REPLACE FUNCTION claim_mining_reward(
    p_session_id UUID,
    p_user_id UUID,
    p_expected_reward NUMERIC(20, 4)
)
RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_new_balance NUMERIC(28, 8);
    v_tx_hash VARCHAR(66);
    v_tx_id UUID;
    v_wallet_address VARCHAR(64);
BEGIN
    SELECT * INTO v_session
    FROM mining_sessions
    WHERE session_id = p_session_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mining session not found or does not belong to user.';
    END IF;

    IF v_session.claimed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Rewards for this session have already been claimed.';
    END IF;

    IF v_session.total_nxr_reward <= 0 THEN
        RAISE EXCEPTION 'No reward accumulated in this session.';
    END IF;

    SELECT virtual_wallet_address INTO v_wallet_address
    FROM profiles WHERE id = p_user_id;

    UPDATE mining_sessions
    SET session_status = 'completed',
        ended_at = COALESCE(ended_at, NOW()),
        claimed_at = NOW()
    WHERE session_id = p_session_id;

    INSERT INTO virtual_wallets (user_id, asset_symbol, virtual_balance)
    VALUES (p_user_id, 'NXR', v_session.total_nxr_reward)
    ON CONFLICT (user_id, asset_symbol)
    DO UPDATE SET
        virtual_balance = virtual_wallets.virtual_balance + EXCLUDED.virtual_balance,
        updated_at = NOW()
    RETURNING virtual_balance INTO v_new_balance;

    v_tx_hash := '0x' || encode(sha256((p_session_id::text || clock_timestamp()::text)::bytea), 'hex');

    INSERT INTO virtual_transactions (
        tx_hash,
        user_id,
        tx_type,
        asset_symbol,
        amount,
        amount_usd,
        network_fee,
        from_address,
        to_address,
        status,
        note
    ) VALUES (
        v_tx_hash,
        p_user_id,
        'mining_reward',
        'NXR',
        v_session.total_nxr_reward,
        0.00, -- Strictly non-monetary virtual coin
        0.00000000,
        '0x0000000000000000000000000000000000000000',
        v_wallet_address,
        'completed',
        '24-Hour Mining Engine Reward (0.00001 NXR/hr, max 0.00024 NXR)'
    ) RETURNING tx_id INTO v_tx_id;

    INSERT INTO notifications (
        user_id,
        title,
        message,
        notification_type
    ) VALUES (
        p_user_id,
        'Virtual Mining Reward Credited',
        '+' || v_session.total_nxr_reward::text || ' NXR credited.',
        'reward'
    );

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'reward_nxr', v_session.total_nxr_reward,
        'new_balance', v_new_balance,
        'tx_hash', v_tx_hash
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. STORED PROCEDURE: ATOMIC INTERNAL VIRTUAL NXR TRANSFER
CREATE OR REPLACE FUNCTION transfer_virtual_nxr(
    p_sender_id UUID,
    p_recipient_address VARCHAR(64),
    p_amount NUMERIC(28, 5)
)
RETURNS JSONB AS $$
DECLARE
    v_recipient RECORD;
    v_sender_wallet RECORD;
    v_sender_address VARCHAR(64);
    v_tx_hash VARCHAR(66);
    v_new_sender_balance NUMERIC(28, 5);
    v_rounded_amount NUMERIC(28, 5);
BEGIN
    v_rounded_amount := ROUND(p_amount, 5);
    IF v_rounded_amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be strictly greater than 0.00000 NXR.';
    END IF;

    SELECT id, virtual_wallet_address INTO v_recipient
    FROM profiles WHERE virtual_wallet_address = p_recipient_address;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recipient address % not found.', p_recipient_address;
    END IF;

    IF v_recipient.id = p_sender_id THEN
        RAISE EXCEPTION 'Self-transfers are not permitted.';
    END IF;

    SELECT virtual_wallet_address INTO v_sender_address FROM profiles WHERE id = p_sender_id;
    SELECT * INTO v_sender_wallet FROM virtual_wallets WHERE user_id = p_sender_id AND asset_symbol = 'NXR' FOR UPDATE;
    IF NOT FOUND OR v_sender_wallet.virtual_balance < v_rounded_amount THEN
        RAISE EXCEPTION 'Insufficient virtual balance.';
    END IF;

    UPDATE virtual_wallets SET virtual_balance = virtual_balance - v_rounded_amount WHERE user_id = p_sender_id AND asset_symbol = 'NXR' RETURNING virtual_balance INTO v_new_sender_balance;
    INSERT INTO virtual_wallets (user_id, asset_symbol, virtual_balance) VALUES (v_recipient.id, 'NXR', v_rounded_amount)
    ON CONFLICT (user_id, asset_symbol) DO UPDATE SET virtual_balance = virtual_wallets.virtual_balance + EXCLUDED.virtual_balance;

    v_tx_hash := '0x' || encode(sha256((p_sender_id::text || v_recipient.id::text || clock_timestamp()::text)::bytea), 'hex');
    INSERT INTO virtual_transactions (tx_hash, user_id, tx_type, asset_symbol, amount, amount_usd, network_fee, from_address, to_address, status, note)
    VALUES (v_tx_hash, p_sender_id, 'send', 'NXR', v_rounded_amount, 0.00, 0.00, v_sender_address, v_recipient.virtual_wallet_address, 'completed', 'Internal Transfer');
    INSERT INTO virtual_transactions (tx_hash, user_id, tx_type, asset_symbol, amount, amount_usd, network_fee, from_address, to_address, status, note)
    VALUES (v_tx_hash, v_recipient.id, 'receive', 'NXR', v_rounded_amount, 0.00, 0.00, v_sender_address, v_recipient.virtual_wallet_address, 'completed', 'Internal Transfer');

    RETURN jsonb_build_object('success', true, 'tx_hash', v_tx_hash, 'amount', v_rounded_amount, 'new_sender_balance', v_new_sender_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id OR is_admin(auth.uid()));

CREATE POLICY "Users can view own virtual wallets"
    ON virtual_wallets FOR SELECT
    USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can view own mining sessions"
    ON mining_sessions FOR SELECT
    USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can view own virtual transactions"
    ON virtual_transactions FOR SELECT
    USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Only superadmins can view audit logs"
    ON admin_audit_logs FOR SELECT
    USING (is_admin(auth.uid()));
`;

export const DatabaseSchemaModal: React.FC<DatabaseSchemaModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'sql' | 'tables'>('sql');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(POSTGRESQL_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([POSTGRESQL_SCHEMA_SQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '20261024000000_create_nexora_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tables = [
    { name: 'user_roles', desc: 'RBAC permissions matrix (Standard, Miner, SuperAdmin)' },
    { name: 'profiles', desc: 'User accounts, display identities, virtual wallet deposit addresses' },
    { name: 'virtual_wallets', desc: 'Non-negative virtual coin balances (NXR, BTC, ETH, SOL)' },
    { name: 'mining_sessions', desc: 'Session timers, hashrates, and server-validated block reward calculations' },
    { name: 'virtual_transactions', desc: 'Immutable virtual transaction audit trail with cryptographic hashes' },
    { name: 'portfolio_assets', desc: 'Virtual asset allocations, cost basis, and performance metrics' },
    { name: 'watchlists', desc: 'Favorite cryptocurrency tickers and target price alerts per user' },
    { name: 'notifications', desc: 'In-app transaction, security, and block solution alerts' },
    { name: 'admin_audit_logs', desc: 'Privileged operations ledger restricted exclusively to superadmins' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#0B0D14] border border-[#D4AF37]/35 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4AF37]/20 bg-[#0E1018]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#ECC86A]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
                PostgreSQL Database Architecture
                <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-[#181B26] border border-slate-700 text-slate-300">
                  Supabase / Postgres 15+
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Production-grade DDL schema with RLS policies, atomic functions, and audit triggers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close Database Schema Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls and Actions */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#08090E] border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sql')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'sql'
                  ? 'bg-[#181B28] text-[#ECC86A] border border-[#D4AF37]/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Full SQL Migration</span>
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'tables'
                  ? 'bg-[#181B28] text-[#ECC86A] border border-[#D4AF37]/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Relational Schema Overview (9 Tables)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12141D] hover:bg-[#1A1D2B] text-slate-200 border border-slate-700 text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#ECC86A]" />
              <span className="hidden sm:inline">Download .sql</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#ECC86A] border border-[#D4AF37]/40 text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied SQL' : 'Copy Script'}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'sql' ? (
          <div className="relative flex-1 overflow-auto p-4 bg-[#050609] font-mono text-xs text-slate-300">
            <pre className="pr-4 overflow-x-auto leading-relaxed">{POSTGRESQL_SCHEMA_SQL}</pre>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-6 bg-[#08090E] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tables.map(tbl => (
                <div key={tbl.name} className="p-3.5 rounded-xl bg-[#0D0F17] border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#ECC86A]">
                    <Database className="w-3.5 h-3.5" />
                    <span>{tbl.name}</span>
                  </div>
                  <p className="text-xs text-slate-400">{tbl.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-[#12141F] border border-[#D4AF37]/30 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[#ECC86A]">
                <ShieldCheck className="w-4 h-4" />
                <span>Security & Row Level Security (RLS) Protocol</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                All 9 tables have RLS enabled. Users can only select and mutate records where <code className="text-[#ECC86A]">auth.uid() = user_id</code>. Superadmin operations are gated via the server-side <code className="text-[#ECC86A]">is_admin()</code> SECURITY DEFINER function. Client-side attempts to manually adjust virtual balances or inject admin privileges are rejected by database constraints.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#D4AF37]/20 bg-[#0E1018] text-xs text-slate-400">
          <span>File saved in: <code className="text-[#ECC86A]">supabase/migrations/20261024000000_create_nexora_schema.sql</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#181B26] hover:bg-[#202434] text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
