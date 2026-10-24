# NEXORA COIN — MINE THE FUTURE

A next-generation luxury fintech cryptocurrency platform and virtual mining simulation demo featuring real-time market metrics, an interactive 3D WebGL coin, virtual portfolio management, automated voice briefings (via Gemini TTS), and enterprise PostgreSQL relational database architecture.

---

## 💎 Brand Identity & Visual Aesthetic

- **Brand Name**: NEXORA COIN
- **Tagline**: MINE THE FUTURE
- **Visual Style**: Premium deep obsidian black (`#07080B`) and champagne-gold (`#D4AF37`, `#F3E5AB`, `#ECC86A`) palette.
- **Logo**: Reusable animated metallic gold coin component (`NexoraLogo.tsx`) embossed with a futuristic geometric "N" emblem, specular sheen sweep, and responsive sizing.
- **Typography**: Cinzel (luxury fintech serif headings), Plus Jakarta Sans (clean high-legibility UI body), and JetBrains Mono (cryptographic hashes, balances, and numbers).
- **3D Graphics**: Procedural 3D NEXORA coin built with Three.js featuring 8-part composite geometries, studio PBR lighting (`ACESFilmicToneMapping` + `RoomEnvironment`), and a collapsible inspection dock.

---

## 🚀 Key Features

1. **Landing Page**:
   - Hero: "MINE THE FUTURE" with interactive 3D WebGL coin and animated logo.
   - Platform statistics clearly identified as demo data.
   - Features overview and 4-step simulation roadmap.
   - Live public market preview strip with mini sparklines.
   - Collapsible FAQ accordion and compliance disclosures.

2. **User Dashboard**:
   - Total virtual NXR balance, portfolio net worth in USD, and unrealized profit & loss.
   - Active mining worker status and real-time telemetry.
   - Recharts interactive price analytics with timeframe selectors (24h, 7d, 30d).
   - Recent demo transactions list with copyable hashes.
   - Quick action bar: Mine NXR, Send Demo NXR, Receive Demo NXR, Audio Briefing.

3. **Interactive Simulated Mining Terminal**:
   - 4 calibrated worker speed modes:
     - **Eco Green Node**: 28.5 MH/s (~0.15 NXR/min, 20s block target)
     - **Standard Rig**: 84.2 MH/s (~0.45 NXR/min, 15s block target)
     - **Turbo Overclock**: 195.0 MH/s (~1.10 NXR/min, 10s block target)
     - **Quantum Array Sim**: 520.0 MH/s (~3.25 NXR/min, 6s block target)
   - Real-time block progress bar with nonce scanning and thermal jitter simulation.
   - Anti-clock-tampering verification algorithm guarding against client clock backward and forward jumps.
   - Solved block ledger recording block number, 0000-prefixed simulated hex hash, difficulty, nonce, and NXR reward.
   - Persisted across page reloads in `localStorage`.
   - Prominently labeled: `SIMULATION — NOT REAL CRYPTOCURRENCY MINING`.

4. **Crypto Market**:
   - Quotes for Bitcoin (BTC), Ethereum (ETH), Solana (SOL), Ripple (XRP), Dogecoin (DOGE), Cardano (ADA), Avalanche (AVAX), Chainlink (LINK), and NEXORA (NXR).
   - Coin icons, prices, 24h percentage changes, market cap, and volume.
   - Search and column sorting.
   - Interactive coin chart modal with Recharts price line and high/low stats.
   - Real-time CoinGecko public API integration with seamless fallback to simulated market engine.
   - Badge indicating whether data is live or simulated fallback.

5. **Virtual Wallet**:
   - Virtual NXR balance and multi-asset wallet balances (BTC, ETH, SOL, NXR).
   - Demo Receive screen with copyable address, simulated QR code, and instant testnet faucet (+100 NXR).
   - Demo Send screen with address input validation, amount validator, and simulated network fee calculation.
   - Filterable transaction history (All, Sent, Received, Mining Rewards) with search.

6. **Virtual Portfolio**:
   - Total portfolio net worth and unrealized profit & loss calculations based on demo data.
   - Interactive Donut/Pie chart for asset allocation breakdown using Recharts.
   - Asset performance table with simulated buy/sell trade rebalancer.

7. **Persistent Watchlist**:
   - Pin and unpin favorite cryptocurrencies.
   - Live price updates and percentage changes.
   - Saved persistently in browser storage.

8. **Administrative Console**:
   - Prototype admin panel with role-based authorization architecture (SuperAdmin, Auditor, Miner).
   - Proof-of-Work difficulty calibration and base block reward adjustment.
   - User account status manager (active/suspended toggles).
   - Cluster-wide mining telemetry (global virtual hashrate, total mined tokens).
   - Immutable audit trail logging (Action, category, actor, IP, timestamp).
   - Direct inspector for PostgreSQL DDL schema.

9. **Voice Audio Briefings (Gemini TTS)**:
   - Automated market briefings and mining status audio broadcasts.
   - Server-side route `/api/tts` powered by `@google/genai` model `gemini-3.8-flash-tts` / `gemini-3.8-flash-lite-tts`.
   - Resilient client-side Web Speech fallback for offline and unconfigured environments.

10. **Authentication & Identity Flow**:
    - Full user authentication with registration, login, forgot-password, and password-reset interfaces.
    - Password strength evaluator with 4-level progress meter and complexity rules.
    - Role selector previewing permissions (Trader, Miner, SuperAdmin).
    - Quick testnet autofill personas for instant testing.
    - Seamless dual mode: Works out-of-the-box in isolated testnet simulation; seamlessly connects to Supabase Auth when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured.

11. **PostgreSQL Relational Database Schema**:
    - Production DDL migration located in `supabase/migrations/20261024000000_create_nexora_schema.sql` covering:
      - `user_roles`
      - `profiles`
      - `virtual_wallets` (isolated from real-asset ledgers)
      - `mining_sessions`
      - `virtual_transactions`
      - `portfolio_assets`
      - `watchlists`
      - `notifications`
      - `admin_audit_logs`
    - Row Level Security (RLS) policies on all tables.
    - Security Definer role check function `is_admin()`.
    - Idempotent and atomic stored procedure `claim_mining_reward()` preventing race conditions and duplicate claims.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, Three.js
- **Backend**: Express, `@google/genai` TypeScript SDK (server-side only)
- **Database & Auth**: PostgreSQL / Supabase with Row Level Security (RLS)
- **Testing**: Node.js built-in test runner (`node:test`, `node:assert/strict`) via `tsx`

---

## 📦 Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or yarn

### 1. Installation

```bash
git clone https://github.com/your-username/nexora-coin.git
cd nexora-coin
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
# Gemini TTS Briefings (Optional)
GEMINI_API_KEY="your-gemini-api-key"

# Server Port
PORT=3000

# Supabase Integration (Optional - enables real PostgreSQL & Auth)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

### 3. Run Unit Tests

```bash
npm test
```

### 4. Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🗄️ Database Setup (Supabase / PostgreSQL)

### Step 1: Run the Migration
In your Supabase Dashboard -> **SQL Editor**, open and execute:
`supabase/migrations/20261024000000_create_nexora_schema.sql`

This script will:
- Enable `uuid-ossp` and `pgcrypto`.
- Create all 9 relational tables with indexes and check constraints.
- Seed default roles (`role_standard_miner`, `role_institutional`, `role_superadmin`).
- Enable Row Level Security (RLS) on every table.
- Install the atomic `claim_mining_reward()` function.

### Step 2: Securely Creating the First Administrator
To ensure security, administrators must **never** be created through unrestricted client-side registration. Instead, promote an initial user via the Supabase SQL Editor:

```sql
-- 1. Identify the user ID from profiles or auth.users
SELECT id, email, display_name, role_id FROM profiles WHERE email = 'your-admin@domain.com';

-- 2. Promote the user to Super Administrator
UPDATE profiles
SET role_id = 'role_superadmin'
WHERE email = 'your-admin@domain.com';

-- 3. Verify promotion in audit logs
INSERT INTO admin_audit_logs (action, category, details, status)
VALUES ('BOOTSTRAP_ADMIN', 'security', '{"promoted_email": "your-admin@domain.com"}'::jsonb, 'success');
```

---

## 🚀 Deployment Instructions

### Vercel Deployment (Frontend)

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: complete Nexora Coin platform"
   git remote add origin https://github.com/YOUR_USERNAME/nexora-coin.git
   git push -u origin main
   ```
2. Import the repository into [Vercel](https://vercel.com).
3. Set the build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In Vercel Project Settings > Environment Variables, configure:
   - `VITE_SUPABASE_URL` (optional)
   - `VITE_SUPABASE_ANON_KEY` (optional)
   - `GEMINI_API_KEY` (optional)
5. Click **Deploy**.

---

## 🛡️ Transparency & Safety Disclaimer

**SIMULATION ONLY**: NEXORA COIN is an educational simulation, interface prototype, and architectural demonstration platform. All coins (NXR), virtual balances, addresses, transactions, and block solving are purely simulated within this isolated testbed. The platform does not perform actual hardware cryptocurrency mining, consume excessive device electricity, or provide real-world financial or investment services.
