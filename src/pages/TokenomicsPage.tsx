import React, { useState, useEffect } from 'react';
import {
  PieChart,
  ShieldCheck,
  Pickaxe,
  ArrowRightLeft,
  Users,
  Lock,
  Layers,
  Sparkles,
  Info,
  Clock,
  RefreshCw,
  AlertTriangle,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import { formatNXR } from '../utils/miningRules';
import { NexoraLogo } from '../components/NexoraLogo';

interface TokenomicsData {
  name: string;
  symbol: string;
  status: string;
  maxSupplyNXR: number;
  circulatingSupplyNXR: number;
  unminedSupplyNXR: number;
  totalRegisteredNodes: number;
  totalMiningCycles: number;
  claimedMiningCycles: number;
  totalTransfers: number;
  totalReferrals: number;
  rules: {
    hourlyMiningRateNXR: number;
    cycleCapNXR: number;
    cycleMaxHours: number;
    referralRewardNXR: number;
    maxReferralsPerUser: number;
    minTransferNXR: number;
    maxTransferNXR: number;
  };
  allocations: Array<{
    label: string;
    percentage: number;
    tokens: number;
    vesting: string;
  }>;
  disclaimer: string;
}

export const TokenomicsPage: React.FC = () => {
  const [data, setData] = useState<TokenomicsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  const fetchTokenomics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tokenomics/accounting');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.tokenomics) {
          setData(json.tokenomics);
          setLastRefreshed(Date.now());
        }
      }
    } catch (err) {
      console.warn('Failed to fetch tokenomics accounting:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenomics();
  }, []);

  const totalCirculation = data?.circulatingSupplyNXR ?? 0.0;
  const maxSupply = data?.maxSupplyNXR ?? 21_000_000;
  const circulationPercentage = ((totalCirculation / maxSupply) * 100).toFixed(6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Header & Mandatory Simulation Disclaimer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/20">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-[#ECC86A]" />
            <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white">
              NEXORA COIN Tokenomics
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative accounting, mathematical emission rules, and supply limits.
          </p>
        </div>

        <button
          onClick={fetchTokenomics}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141724] hover:bg-[#1E2338] text-[#F3E5AB] border border-[#D4AF37]/35 text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Accounting</span>
        </button>
      </div>

      {/* Prominent Legal & Simulation Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0F111A] border border-amber-500/40 text-xs text-slate-300 space-y-2 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-mono text-[11px] font-bold text-amber-300 uppercase px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
              VIRTUAL SIMULATION PROTOCOL NOTICE
            </span>
            <p className="leading-relaxed text-slate-300 pt-1">
              NEXORA COIN is currently a virtual simulation. NXR balances and transfers are internal database records, not blockchain assets. No real-money value is guaranteed. Blockchain wallet connections, on-chain token contracts, DEX listings, and hardware proof-of-work mining remain inactive until officially deployed to an EVM testnet and audited.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Core Supply Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-5 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-sans">
            <span className="uppercase tracking-wider">Maximum Virtual Cap</span>
            <Lock className="w-4 h-4 text-[#ECC86A]" />
          </div>
          <div className="text-2xl font-bold text-[#F3E5AB]">
            21,000,000.00000 NXR
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            Fixed hard ceiling (Scarcity Model)
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-sans">
            <span className="uppercase tracking-wider">Current Circulation</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatNXR(totalCirculation)}
          </div>
          <div className="text-[11px] text-slate-400 font-sans flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{circulationPercentage}% of max virtual supply</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-sans">
            <span className="uppercase tracking-wider">Unmined Reserve</span>
            <Pickaxe className="w-4 h-4 text-[#ECC86A]" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatNXR(data?.unminedSupplyNXR ?? maxSupply)}
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            Reserved for 10-year node emission
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-sans">
            <span className="uppercase tracking-wider">Registered Nodes</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {data?.totalRegisteredNodes ?? 1} Nodes
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            {data?.claimedMiningCycles ?? 0} cycles claimed
          </div>
        </div>
      </div>

      {/* 3. Token Allocation Distribution Table */}
      <div className="p-6 rounded-2xl bg-[#0C0E17] border border-slate-800 space-y-4">
        <div>
          <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#ECC86A]" />
            <span>Token Allocation & Vesting Framework</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Structured allocation designed for sustainable decentralized node participation.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-[#090B10]">
                <th className="py-3 px-4 font-sans">Tranche Label</th>
                <th className="py-3 px-4 text-right">Allocation</th>
                <th className="py-3 px-4 text-right">Tokens (NXR)</th>
                <th className="py-3 px-4 font-sans">Vesting & Release Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(data?.allocations || [
                { label: 'Community Mining & Ecosystem Rewards', percentage: 45, tokens: 9450000, vesting: '10-Year Linear Accrual via Validated Node Cycles' },
                { label: 'Treasury & Protocol Development', percentage: 25, tokens: 5250000, vesting: '12-Month Cliff, 36-Month Linear Quarterly Release' },
                { label: 'Initial DEX Liquidity & Market Making', percentage: 15, tokens: 3150000, vesting: 'Locked in AMM Smart Contract upon Launch' },
                { label: 'Core Contributors & Advisors', percentage: 10, tokens: 2100000, vesting: '24-Month Cliff, 48-Month Linear Monthly Vesting' },
                { label: 'Strategic Reserve & Security Bug Bounty', percentage: 5, tokens: 1050000, vesting: 'Multi-Sig Timelock Governance Pool' },
              ]).map((alloc, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 font-sans text-white font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                    <span>{alloc.label}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-[#F3E5AB]">
                    {alloc.percentage}%
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-300">
                    {alloc.tokens.toLocaleString()}.00000
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-400 text-[11px]">
                    {alloc.vesting}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Operational Rules & Technical Limits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        {/* Mining Economics */}
        <div className="p-5 rounded-2xl bg-[#0C0E17] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold font-cinzel text-sm border-b border-slate-800 pb-2">
            <Pickaxe className="w-4 h-4 text-[#ECC86A]" />
            <span>Virtual Mining Rules</span>
          </div>
          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Emission Rate:</span>
              <span className="font-mono text-[#F3E5AB]">0.00001 NXR / hr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cycle Cap (24h):</span>
              <span className="font-mono text-[#F3E5AB]">0.00024 NXR max</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Single Claim Rule:</span>
              <span className="text-emerald-400 font-semibold">Strictly Enforced</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Clock Protection:</span>
              <span className="text-emerald-400 font-semibold">Server Timestamps</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Simulated proof-of-work mathematical engine without GPU/CPU power consumption.
          </p>
        </div>

        {/* Referral Economy */}
        <div className="p-5 rounded-2xl bg-[#0C0E17] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold font-cinzel text-sm border-b border-slate-800 pb-2">
            <Sparkles className="w-4 h-4 text-[#ECC86A]" />
            <span>Referral Economy</span>
          </div>
          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Per-Node Reward:</span>
              <span className="font-mono text-[#F3E5AB]">0.00005 NXR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Referral Ceiling:</span>
              <span className="font-mono text-[#F3E5AB]">10 Referrals / Node</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Max Referral Yield:</span>
              <span className="font-mono text-[#F3E5AB]">0.00050 NXR max</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Anti-Sybil Policy:</span>
              <span className="text-rose-400 font-semibold">Self-Referrals Barred</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Referral rewards credit only upon verified database registration of genuine nodes.
          </p>
        </div>

        {/* Transfer & Ledger Protocol */}
        <div className="p-5 rounded-2xl bg-[#0C0E17] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold font-cinzel text-sm border-b border-slate-800 pb-2">
            <ArrowRightLeft className="w-4 h-4 text-[#ECC86A]" />
            <span>Transfer Protocols</span>
          </div>
          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Min Transfer:</span>
              <span className="font-mono text-[#F3E5AB]">0.00001 NXR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Max Transfer:</span>
              <span className="font-mono text-[#F3E5AB]">100.00000 NXR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Negative Balances:</span>
              <span className="text-rose-400 font-semibold">Zero Tolerance</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Idempotency Keys:</span>
              <span className="text-emerald-400 font-semibold">Active Deduplication</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Peer transfers execute atomically with immutable double-entry ledger records.
          </p>
        </div>
      </div>
    </div>
  );
};
