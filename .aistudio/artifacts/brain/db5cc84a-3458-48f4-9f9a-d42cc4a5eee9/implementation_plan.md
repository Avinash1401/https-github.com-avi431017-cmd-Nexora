# Implementation Plan: NEXORA COIN Blockchain Architecture & Token Launch

This engineering plan details the transformation of **NEXORA COIN (NXR)** from an internal virtual credit prototype into a verified, production-grade cryptocurrency project on **Arbitrum Sepolia / Arbitrum One Layer 2**, backed by a 21,000,000 NXR hard-capped OpenZeppelin smart contract suite, an authorized EIP-712 community reward pool, Web3 wallet connectivity, and an institutional transparency portal.

---

## 1. Project Audit Baseline & Architectural Inventory

### Current State Assessment
- **Frontend**: React 19 SPA running on Vite with Tailwind CSS, Lucide icons, and Three.js luxury coin visualization.
- **Backend & API**: Express TypeScript server (`server.ts` via `tsx`) supporting REST routes, real-time Server-Sent Events (`/api/realtime/stream`), and live CoinGecko rate-limited proxy.
- **Ledger & Persistence**: In-memory authoritative double-entry virtual ledger (`src/utils/ledgerEngine.ts`) with mathematical reconciliation (`reconcileAllWallets`), transfer idempotency protection, and server-side RBAC middleware (`requireAdmin`).
- **Test Coverage**: 25 passing automated unit tests covering cryptographic ledger calculations, anti-negative balance guards, and RBAC security.

### Components to Preserve vs. Upgrade
- **Preserve**: The existing 10-tab institutional Admin Console, luxury black-and-champagne-gold aesthetic, anti-clock manipulation logic, and genuine CoinGecko market telemetry.
- **Upgrade**:
  1. Add an immutable OpenZeppelin ERC-20 contract (`NexoraToken.sol`) with a strictly capped supply of 21,000,000 NXR.
  2. Implement an on-chain Treasury-funded community reward contract (`NexoraRewardPool.sol`) with EIP-712 cryptographic signature authorization.
  3. Integrate non-custodial EVM wallet connectivity (MetaMask, injected Web3 providers) targeting Arbitrum Sepolia (`Chain ID: 421614`).
  4. Launch public transparency pages: Whitepaper, Tokenomics Visualizer, Smart Contract Verification, and Mainnet/DEX Launch Checklist.
  5. Strictly maintain zero-fabrication standards: clearly distinguish internal virtual balances from verified on-chain wallet holdings; never invent audit badges, fake transactions, or speculative NXR prices.

---

## 2. Approved Tokenomics Specification

### Core Token Parameters
- **Token Name**: NEXORA COIN
- **Proposed Ticker**: `NXR`
- **Standard**: ERC-20 (EVM Compatible, OpenZeppelin v5)
- **Decimals**: `18` (standard EVM precision)
- **Maximum Supply (Hard Cap)**: `21,000,000 NXR` (strictly immutable in contract bytecode, no minting can ever exceed this ceiling).
- **Initial Supply at Deployment**: `0 NXR` (minted strictly according to approved vesting and treasury tranches).

### Allocation Distribution (21,000,000 NXR Total)
| Allocation Tranche | Percentage | Tokens (NXR) | Vesting & Release Schedule |
| :--- | :--- | :--- | :--- |
| **Community Mining & Ecosystem Rewards** | 45.0% | 9,450,000 NXR | 10-year linear emission via authorized `NexoraRewardPool` contract. Capped daily emission per node. |
| **Treasury & Protocol Development** | 25.0% | 5,250,000 NXR | 12-month cliff, 36-month linear quarterly release. Multi-sig governance timelock. |
| **Initial DEX Liquidity & Market Making** | 15.0% | 3,150,000 NXR | 100% paired with ETH/USDC in decentralized liquidity pool on launch. Liquidity tokens locked. |
| **Core Contributors & Advisors** | 10.0% | 2,100,000 NXR | 24-month cliff, 48-month linear monthly vesting. Prevents team dumping. |
| **Strategic Reserve & Security Bug Bounty** | 5.0% | 1,050,000 NXR | Reserved for formal audit findings, penetration bounties, and emergency stabilization. |

### Reward & Emission Mechanics
- **Accrual Rate**: 0.00001 NXR per hour per active verified node.
- **Session Ceiling**: 0.00024 NXR per 24-hour cycle.
- **Anti-Sybil Proof**: Claims require server-signed EIP-712 cryptographic vouchers verifying node authentication and elapsed time before the smart contract releases tokens.

---

## 3. Blockchain & Smart Contract Architecture

### Network Selection: Arbitrum Sepolia (Testnet) / Arbitrum One (Mainnet)
- **Rationale**:
  - **Ethereum Security**: Inherits Layer 1 Ethereum consensus security via Nitro fraud proofs.
  - **Sub-Cent Fees**: Transaction gas costs typically under $0.01 USD, making micro-claims and ecosystem transfers economically viable.
  - **Tooling & Wallet Compatibility**: Full EVM compatibility with ethers.js, viem, MetaMask, Coinbase Wallet, and Arbiscan.

### Smart Contracts Suite (`contracts/`)
1. **`NexoraToken.sol`**:
   - Inherits `ERC20`, `ERC20Capped`, `ERC20Burnable`, `ERC20Pausable`, and `AccessControl`.
   - Constructor enforces `ERC20Capped(21_000_000 * 10**18)`.
   - Minting requires `MINTER_ROLE`, restricted strictly to the timelocked Treasury and Reward Pool contracts.
   - Pausing requires `PAUSER_ROLE`, strictly reserved for critical security emergencies.
2. **`NexoraRewardPool.sol`**:
   - Holds the 45% Community Rewards allocation.
   - Employs OpenZeppelin `EIP712` typed data verification to validate claim vouchers issued by the authorized backend prober.
   - Enforces per-wallet daily claim limits and single-use voucher nonces.

---

## 4. Proposed Changes & Implementation Phases

### Phase 1: Smart Contract Suite & Hardhat/Node Test Suite
- Create `contracts/NexoraToken.sol` and `contracts/NexoraRewardPool.sol`.
- Create `src/contracts/NexoraTokenABI.json` and deployment metadata.
- Create automated test suite `src/utils/tokenContract.test.ts` verifying:
  - Total supply cannot exceed 21,000,000 NXR under any circumstances.
  - Unauthorized accounts cannot invoke mint or pause.
  - Token transfers respect standard ERC-20 balances.
  - EIP-712 voucher replay attacks are rejected.

### Phase 2: Web3 Non-Custodial Wallet Integration
- Create `src/services/web3Wallet.ts`:
  - Browser wallet detection (`window.ethereum`).
  - Chain switching / network prompt for Arbitrum Sepolia (`421614`).
  - Read-only contract calls using standard RPC to fetch on-chain token balance, total supply, and claimable rewards.
  - Honest status handling: Connected, Disconnected, Wrong Network, Pending Signature, Rejected.
  - Zero private key exposure: never prompts or stores secret keys or seed phrases.

### Phase 3: Public Transparency, Whitepaper & Tokenomics Portal
- Create `src/pages/TransparencyPage.tsx` with dedicated tabs:
  1. **Whitepaper**: Institutional architecture document, consensus philosophy, network comparison, and mathematical proofs.
  2. **Tokenomics**: Interactive token allocation breakdown, vesting schedule visualizer, emission countdown, and treasury breakdown.
  3. **Contract & Explorer**: Verified contract source code, bytecode hash, testnet deployment guide, and official Arbiscan explorer links.
  4. **Security & Audits**: Honest security roadmap stating "Pre-Audit Testnet Release", bug bounty criteria, and smart contract audit requirements.
  5. **Exchange Readiness Checklist**: 10-point checklist detailing verifiable criteria required before any DEX/CEX listing or CoinGecko tracking.
- Update navigation header (`src/components/Navbar.tsx`) and routing in `src/App.tsx` to seamlessly integrate the Transparency Portal.

### Phase 4: Full-Stack Verification & Launch Readiness
- Run automated unit test suite verifying both virtual ledger logic and on-chain token specifications.
- Verify browser rendering, wallet connectivity prompt, and responsiveness using `playwright-cli`.
- Compile and build production bundle with zero warnings or errors.

---

## 5. Verification Plan

### Automated Test Suite (`npm test`)
- Run all 25 existing tests + new tokenomics/contract specification unit tests.
- Verify 21M supply cap, EIP-712 voucher validation, role permissions, and balance isolation.

### Browser Verification (`playwright-cli`)
- Verify navigation to new Whitepaper, Tokenomics, and Contract Transparency portals.
- Verify wallet connect button behavior (prompting Arbitrum Sepolia).
- Verify clear visual distinction between virtual testnet balances and on-chain Web3 wallet balances.
- Verify empty states and honest disclaimer badges across all screens.
