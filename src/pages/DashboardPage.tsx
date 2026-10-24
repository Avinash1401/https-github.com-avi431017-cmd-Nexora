import React from 'react';
import { useApp } from '../context/AppContext';
import { NexoraCoinLogo } from '../components/NexoraCoinLogo';
import {
  Pickaxe,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  Volume2,
  Clock,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatNXR, formatCountdown } from '../utils/miningRules';
import { formatUsd } from '../utils/portfolioCalculations';

export const DashboardPage: React.FC = () => {
  const {
    user,
    coins,
    miningSession,
    startMining,
    stopMining,
    claimMiningReward,
    transactions,
    setActiveTab,
    speakBriefing,
    isSpeaking,
    marketStatus,
  } = useApp();

  const countdown = formatCountdown(miningSession.remainingSeconds);
  const userNXRBalance = user?.virtualBalanceNXR || 0.0;
  const btcCoin = coins.find(c => c.symbol === 'BTC');

  // 24-Hour Accumulation Curve Data (0h: 0.00000 -> 24h: 0.00024 NXR)
  const accumulationChartData = [
    { hour: '0h', reward: 0.00000, target: 0.00000 },
    { hour: '4h', reward: 0.00004, target: 0.00004 },
    { hour: '8h', reward: 0.00008, target: 0.00008 },
    { hour: '12h', reward: 0.00012, target: 0.00012 },
    { hour: '16h', reward: 0.00016, target: 0.00016 },
    { hour: '20h', reward: 0.00020, target: 0.00020 },
    { hour: '24h', reward: 0.00024, target: 0.00024 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/20">
        <div>
          <div className="flex items-center gap-3">
            <NexoraCoinLogo size="sm" showText={false} animated={true} />
            <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white">
              Institutional Dashboard
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#181B26] text-[#ECC86A] border border-[#D4AF37]/35">
              Virtual Protocol
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Account: <span className="text-[#F3E5AB] font-mono font-medium">{user?.displayName || 'Registered Node'}</span> ({user?.email}) • Virtual ledger isolated from fiat currency.
          </p>
        </div>

        {/* Quick Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => speakBriefing('mining')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
              isSpeaking
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                : 'bg-[#12141D] text-[#ECC86A] border-[#D4AF37]/35 hover:bg-[#1A1E2B]'
            }`}
            title="Listen to audio briefing"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isSpeaking ? 'Audio Playing...' : 'Voice Briefing'}</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171A27] text-slate-200 border border-slate-700 hover:border-[#D4AF37]/40 text-xs font-medium transition-all"
          >
            <Send className="w-3.5 h-3.5 text-[#ECC86A]" />
            <span>Transfer NXR</span>
          </button>

          <button
            onClick={() => setActiveTab('mining')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-semibold text-xs shadow-md hover:scale-[1.02] transition-transform"
          >
            <Pickaxe className="w-3.5 h-3.5" />
            <span>Mining Terminal</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Metrics Cards (Strictly genuine balances) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Virtual NXR Balance */}
        <div className="p-5 rounded-2xl bg-[#0D0F18] border border-[#D4AF37]/25 hover:border-[#D4AF37]/45 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Virtual NXR Balance</span>
            <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#ECC86A]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-white tracking-tight">
            {formatNXR(userNXRBalance)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Internal Virtual Asset • No monetary value
          </p>
        </div>

        {/* Card 2: 24-Hour Mining Status */}
        <div className="p-5 rounded-2xl bg-[#0D0F18] border border-[#D4AF37]/25 hover:border-[#D4AF37]/45 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>24-Hour Mining Session</span>
            <div className={`p-1.5 rounded-lg ${miningSession.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-[#ECC86A] tracking-tight">
            {miningSession.isActive ? countdown.formatted : 'Idle'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {miningSession.isActive
              ? `Accumulating at 0.00001 NXR/hr`
              : 'Max 0.00024 NXR per 24h session'}
          </p>
        </div>

        {/* Card 3: Session Accumulated Reward */}
        <div className="p-5 rounded-2xl bg-[#0D0F18] border border-[#D4AF37]/25 hover:border-[#D4AF37]/45 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Session Yield</span>
            <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#ECC86A]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-white tracking-tight">
            {formatNXR(miningSession.accumulatedRewardNXR)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Server verified • Capped at 0.00024 NXR
          </p>
        </div>

        {/* Card 4: Total Verified Lifetime Earnings */}
        <div className="p-5 rounded-2xl bg-[#0D0F18] border border-[#D4AF37]/25 hover:border-[#D4AF37]/45 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Lifetime Mined Yield</span>
            <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#ECC86A]">
              <Pickaxe className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-[#F3E5AB] tracking-tight">
            {formatNXR(miningSession.totalNxrEarnedAllTime)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Genuine claimed rewards only
          </p>
        </div>
      </div>

      {/* 3. Middle Section: 24-Hour Mining Engine & Verified Rate Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: 24-Hour Mining Controller (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0C0E16] border border-[#D4AF37]/30 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
                <Pickaxe className="w-5 h-5 text-[#ECC86A]" />
                24-Hour Virtual Mining Engine
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Server-validated accumulation at exactly 0.00001 NXR per elapsed hour.
              </p>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium border ${
                miningSession.isActive
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {miningSession.isActive ? '● Worker Active' : '○ Standby'}
            </span>
          </div>

          {/* Session Countdown and Telemetry */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#08090E] border border-slate-800/80 font-mono text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Remaining</span>
              <span className="text-xl font-bold text-[#ECC86A]">{countdown.formatted}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Elapsed</span>
              <span className="text-xl font-bold text-white">
                {Math.floor(miningSession.elapsedSeconds / 3600)}h {Math.floor((miningSession.elapsedSeconds % 3600) / 60)}m
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Yield</span>
              <span className="text-xl font-bold text-emerald-400">
                {formatNXR(miningSession.accumulatedRewardNXR)}
              </span>
            </div>
          </div>

          {/* Mining Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {!miningSession.isActive ? (
              <button
                onClick={startMining}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#B38F26] text-black font-extrabold text-xs shadow-lg hover:scale-[1.01] transition-transform"
              >
                Start 24-Hour Session
              </button>
            ) : (
              <>
                <button
                  onClick={stopMining}
                  className="px-5 py-3 rounded-xl bg-[#1C1F2E] hover:bg-[#25293D] text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                >
                  Pause Session
                </button>
                <button
                  onClick={claimMiningReward}
                  disabled={miningSession.accumulatedRewardNXR <= 0 || miningSession.claimed}
                  className="px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#ECC86A] disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-xs shadow transition-colors"
                >
                  Claim Mined Reward
                </button>
              </>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#131622] border border-amber-500/25 text-[11px] text-slate-300 space-y-1">
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Time Security Rules
            </span>
            <p className="text-slate-400 leading-relaxed">
              Sessions accumulate 0.00001 NXR per hour, reaching 0.00006 at 6h, 0.00012 at 12h, 0.00018 at 18h, and 0.00024 NXR at 24h. Client-side clock manipulation is detected and rejected by trusted server timestamp logic.
            </p>
          </div>
        </div>

        {/* Right: Reward Accumulation Milestone Visualizer (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0C0E16] border border-[#D4AF37]/30 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-cinzel text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#ECC86A]" />
                24-Hour Target Accumulation Curve
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">0.00024 Max</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Linear virtual accumulation model without hardware CPU or electrical load.
            </p>
          </div>

          {/* Area Chart demonstrating the certified linear progression */}
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={accumulationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={v => `${(v * 10000).toFixed(0)}e-4`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E1018',
                    borderColor: 'rgba(212,175,55,0.4)',
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val: any) => [`${Number(val).toFixed(5)} NXR`, 'Reward Target']}
                />
                <Area type="monotone" dataKey="reward" stroke="#ECC86A" strokeWidth={2} fillOpacity={1} fill="url(#goldGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Milestone Reference Table */}
          <div className="grid grid-cols-5 gap-1 pt-2 border-t border-slate-800/80 text-center font-mono text-[10px]">
            <div>
              <span className="text-slate-500 block">0h</span>
              <span className="text-slate-300">0.00000</span>
            </div>
            <div>
              <span className="text-slate-500 block">6h</span>
              <span className="text-slate-300">0.00006</span>
            </div>
            <div>
              <span className="text-slate-500 block">12h</span>
              <span className="text-slate-300">0.00012</span>
            </div>
            <div>
              <span className="text-slate-500 block">18h</span>
              <span className="text-slate-300">0.00018</span>
            </div>
            <div>
              <span className="text-[#ECC86A] block">24h</span>
              <span className="text-[#ECC86A] font-bold">0.00024</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live Cryptocurrency Market Data (Real CoinGecko API) */}
      <div className="p-6 rounded-3xl bg-[#0C0E16] border border-[#D4AF37]/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#ECC86A]" />
              Cryptocurrency Market Overview
            </h3>
            <p className="text-xs text-slate-400">
              Verified live pricing from CoinGecko API • External crypto assets are distinct from internal virtual NXR.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${
                marketStatus.isLive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              {marketStatus.isLive ? '● Live CoinGecko Feed' : '○ Feed Connecting'}
            </span>
            <button
              onClick={() => setActiveTab('market')}
              className="text-xs text-[#ECC86A] hover:underline font-medium"
            >
              View Full Market →
            </button>
          </div>
        </div>

        {/* Market Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {coins
            .filter(c => !c.isNexora)
            .slice(0, 4)
            .map(coin => (
              <div
                key={coin.id}
                onClick={() => setActiveTab('market')}
                className="p-3.5 rounded-2xl bg-[#08090E] border border-slate-800 hover:border-[#D4AF37]/40 cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{coin.icon}</span>
                    <span className="font-semibold text-xs text-white">{coin.name}</span>
                  </div>
                  {coin.change24h !== null && (
                    <span
                      className={`text-[11px] font-mono font-medium ${
                        coin.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {coin.change24h >= 0 ? '+' : ''}
                      {coin.change24h}%
                    </span>
                  )}
                </div>
                <div className="font-mono text-base font-bold text-slate-100">
                  {coin.priceUsd !== null ? formatUsd(coin.priceUsd) : 'Fetching live price...'}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 5. Genuine Virtual Transaction History */}
      <div className="p-6 rounded-3xl bg-[#0C0E16] border border-[#D4AF37]/30 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#ECC86A]" />
              Virtual Transaction Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Genuine recorded demo transactions • No fabricated history.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('wallet')}
            className="text-xs text-[#ECC86A] hover:underline font-medium"
          >
            Open Wallet →
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm text-slate-300 font-medium">No transactions yet.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Newly registered accounts start with a clean zero balance. Complete a 24-hour virtual mining session or receive a transfer to view genuine ledger activity.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Hash</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {transactions.slice(0, 5).map(tx => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 capitalize font-sans text-slate-200">
                      {tx.type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3 text-[#ECC86A] truncate max-w-[140px]" title={tx.txHash}>
                      {tx.txHash.slice(0, 14)}...
                    </td>
                    <td className="py-3 px-3 text-white font-bold">
                      {formatNXR(tx.amount)}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
