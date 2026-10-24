import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NexoraCoinLogo } from '../components/NexoraCoinLogo';
import {
  formatNXR,
  formatCountdown,
  MINING_CONSTANTS,
} from '../utils/miningRules';
import {
  Pickaxe,
  Clock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Volume2,
  RotateCcw,
  Layers,
  Award,
  CheckCircle2,
  Flame,
  ArrowRight,
  TrendingUp,
  Cpu,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const MiningPage: React.FC = () => {
  const {
    user,
    miningSession,
    startMining,
    stopMining,
    claimMiningReward,
    resetMiningSession,
    miningHistory,
    speakBriefing,
    isSpeaking,
  } = useApp();

  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const countdown = formatCountdown(miningSession.remainingSeconds);
  const progressPercent = Math.min(100, (miningSession.elapsedSeconds / MINING_CONSTANTS.SESSION_DURATION_SECONDS) * 100);
  const accruedNXR = miningSession.sessionAccruedNXR ?? miningSession.accumulatedRewardNXR ?? 0;
  const isSessionCompleted = Boolean(miningSession.isCompleted || miningSession.elapsedSeconds >= 86400);

  // Milestones data for visualization
  const milestones = [
    { hour: 0, nxr: '0.00000', label: '0h (Start)' },
    { hour: 6, nxr: '0.00006', label: '6h' },
    { hour: 12, nxr: '0.00012', label: '12h (Halfway)' },
    { hour: 18, nxr: '0.00018', label: '18h' },
    { hour: 24, nxr: '0.00024', label: '24h (Max Cap)' },
  ];

  // Chart curve comparing theoretical linear accumulation against user's actual progress
  const chartData = [
    { hour: '0h', rate: 0.00000, current: miningSession.elapsedSeconds >= 0 ? 0.00000 : null },
    { hour: '4h', rate: 0.00004, current: miningSession.elapsedSeconds >= 14400 ? 0.00004 : null },
    { hour: '8h', rate: 0.00008, current: miningSession.elapsedSeconds >= 28800 ? 0.00008 : null },
    { hour: '12h', rate: 0.00012, current: miningSession.elapsedSeconds >= 43200 ? 0.00012 : null },
    { hour: '16h', rate: 0.00016, current: miningSession.elapsedSeconds >= 57600 ? 0.00016 : null },
    { hour: '20h', rate: 0.00020, current: miningSession.elapsedSeconds >= 72000 ? 0.00020 : null },
    { hour: '24h', rate: 0.00024, current: isSessionCompleted ? 0.00024 : null },
  ];

  const handleClaim = async () => {
    if (accruedNXR <= 0) return;
    setIsSubmitting(true);
    setClaimStatus(null);
    try {
      const result = await claimMiningReward();
      if (result.success) {
        setClaimStatus(`Successfully claimed +${formatNXR(result.rewardNXR || 0)} NXR to your virtual wallet!`);
      } else {
        setClaimStatus(result.error || 'Failed to claim reward.');
      }
    } catch {
      setClaimStatus('An unexpected error occurred while claiming.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setClaimStatus(null), 5000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Header Banner & Mandatory Virtual Simulation Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0F111A] border border-amber-500/40 shadow-xl space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-amber-300 uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                VIRTUAL MINING SIMULATION — NO FIAT VALUE
              </span>
              <p className="text-xs text-slate-300 mt-1">
                Virtual NXR has no monetary value and is not redeemable for cash or real assets. All mining is simulated with server-verified timestamps at a rate of 0.00001 NXR/hour. No physical device resources are consumed.
              </p>
            </div>
          </div>

          <button
            onClick={() => speakBriefing('mining')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1D2B] text-[#ECC86A] border border-[#D4AF37]/35 hover:bg-[#252A3D] text-xs font-medium self-start sm:self-auto shrink-0 transition-colors cursor-pointer"
          >
            <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
            <span>Voice Protocol</span>
          </button>
        </div>
      </div>

      {/* 2. Top Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <NexoraCoinLogo size="md" showText={false} animated={miningSession.isActive} />
            <div>
              <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                24-Hour Mining Engine
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Target rate: <span className="text-[#ECC86A] font-mono font-bold">0.00001 NXR / hr</span> • Max 24h cap: <span className="text-[#F3E5AB] font-mono font-bold">0.00024 NXR</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetMiningSession}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141622] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 text-xs transition-colors cursor-pointer"
            title="Reset active mining cycle to 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Cycle</span>
          </button>
        </div>
      </div>

      {/* Claim Status Notification */}
      {claimStatus && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{claimStatus}</span>
        </div>
      )}

      {/* 3. Main Stage: Active 24-Hour Cycle Controller */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Big Interactive Mining Station */}
        <div className="lg:col-span-8 p-6 sm:p-8 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/35 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Session Header Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    miningSession.isActive ? 'bg-emerald-400 animate-ping absolute inset-0 opacity-75' : 'hidden'
                  }`}
                />
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    miningSession.isActive ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
              </div>
              <div>
                <span className="text-sm font-bold text-white font-cinzel">
                  {miningSession.isActive
                    ? 'Session Active • Accumulating NXR'
                    : isSessionCompleted
                    ? '24-Hour Cycle Complete • Ready to Claim'
                    : 'Mining Node Standby'}
                </span>
                <p className="text-[11px] text-slate-400 font-mono">
                  Target: 0.00024000 NXR / 24-hour cycle
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-[11px] text-slate-400 flex items-center gap-1 sm:justify-end font-mono">
                <Clock className="w-3.5 h-3.5 text-[#ECC86A]" />
                <span>24h Countdown Remaining:</span>
              </div>
              <div className="font-mono text-2xl font-extrabold text-[#F3E5AB] tracking-wider">
                {countdown.formatted}
              </div>
            </div>
          </div>

          {/* Reward Display Big Badge */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#121420] via-[#0E101A] to-[#0A0B12] border border-[#D4AF37]/30 text-center relative overflow-hidden">
            <span className="text-xs uppercase font-mono tracking-widest text-[#ECC86A] block mb-1">
              CURRENT SESSION REWARD ACCRUED
            </span>
            <div className="font-mono text-4xl sm:text-5xl font-extrabold text-[#F3E5AB] tracking-tight my-2">
              {formatNXR(accruedNXR)}
            </div>
            <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-400 mt-2">
              <span>Elapsed: {Math.floor(miningSession.elapsedSeconds / 3600)}h {Math.floor((miningSession.elapsedSeconds % 3600) / 60)}m</span>
              <span>•</span>
              <span>Rate: 0.00001 NXR / hr</span>
              <span>•</span>
              <span>Cap: 0.00024 NXR</span>
            </div>
          </div>

          {/* Linear Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#ECC86A]" />
                <span>24-Hour Cycle Progress</span>
              </span>
              <span className="text-[#F3E5AB] font-bold">
                {progressPercent.toFixed(1)}% Complete
              </span>
            </div>
            <div className="w-full h-4 rounded-full bg-[#151824] p-0.5 border border-slate-800 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8C6D23] via-[#ECC86A] to-[#FFF3D6] transition-all duration-300 relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>0h (0.00000 NXR)</span>
              <span>12h (0.00012 NXR)</span>
              <span>24h (0.00024 NXR)</span>
            </div>
          </div>

          {/* Milestones Stepper */}
          <div className="pt-2">
            <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
              Standard Milestone Thresholds
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {milestones.map((m) => {
                const isPassed = miningSession.elapsedSeconds >= m.hour * 3600;
                return (
                  <div
                    key={m.hour}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isPassed
                        ? 'bg-[#181B28] border-[#D4AF37]/60 shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                        : 'bg-[#090B12] border-slate-800/80'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 font-mono">{m.label}</div>
                    <div
                      className={`text-xs font-mono font-bold mt-1 ${
                        isPassed ? 'text-[#ECC86A]' : 'text-slate-500'
                      }`}
                    >
                      {m.nxr} NXR
                    </div>
                    <div className="mt-1 flex items-center justify-center">
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-700" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons: Start/Pause and Claim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {miningSession.isActive ? (
              <button
                onClick={stopMining}
                className="w-full py-3.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Pause Mining Session</span>
              </button>
            ) : (
              <button
                onClick={startMining}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#B38F26] text-black font-extrabold text-sm shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Pickaxe className="w-4 h-4 text-black" />
                <span>{miningSession.elapsedSeconds > 0 ? 'Resume 24h Session' : 'Start 24-Hour Mining Cycle'}</span>
              </button>
            )}

            <button
              onClick={handleClaim}
              disabled={isSubmitting || accruedNXR <= 0}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                accruedNXR > 0
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/40 cursor-pointer'
                  : 'bg-[#151824] text-slate-600 border border-slate-800 cursor-not-allowed'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Claim +{formatNXR(accruedNXR)} NXR</span>
            </button>
          </div>
        </div>

        {/* Right Column: Account Mining Ledger & System Rules */}
        <div className="lg:col-span-4 space-y-6">
          {/* User Mining Balance Card */}
          <div className="p-6 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/30 space-y-4">
            <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#ECC86A]" />
              <span>Personal Mining Yield</span>
            </h3>

            <div className="p-4 rounded-xl bg-[#07080D] border border-slate-800/80 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Virtual NXR Balance:</span>
                <span className="text-[#F3E5AB] font-bold text-sm">
                  {formatNXR(user?.virtualBalanceNXR || 0)} NXR
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Total Mined All-Time:</span>
                <span className="text-emerald-400 font-bold">
                  {formatNXR(miningSession.totalEarnedAllTimeNXR ?? miningSession.totalNxrEarnedAllTime ?? 0)} NXR
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Completed Cycles:</span>
                <span className="text-white font-bold">{miningSession.totalCompletedCycles ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-800">
                <span>Server Timestamp Validation:</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Active</span>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 space-y-1">
              <div className="font-bold flex items-center gap-1 text-amber-300">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Simulation Rule Enforcement</span>
              </div>
              <p>
                Virtual rewards are strictly non-monetary. Clock manipulation or client timestamp tampering is detected and clamped to verified elapsed server intervals.
              </p>
            </div>
          </div>

          {/* Theoretical Curve Chart */}
          <div className="p-5 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-3">
            <h4 className="font-cinzel text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#ECC86A]" />
              <span>24h Accumulation Trajectory</span>
            </h4>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ECC86A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ECC86A" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#64748B"
                    fontSize={9}
                    tickLine={false}
                    tickFormatter={(v) => `${(v * 100000).toFixed(0)}e-5`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0C0E17',
                      borderColor: '#D4AF37',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`${formatNXR(typeof val === 'number' ? val : 0)} NXR`, 'Target']}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#ECC86A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#rateGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Linear 0.00001 NXR/hr</span>
              <span>Strict 0.00024 NXR ceiling</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Solved Mining Session Ledger History */}
      <div className="p-6 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#ECC86A]" />
              <span>Simulated Mining Session History</span>
            </h3>
            <p className="text-xs text-slate-400">
              Verified 24-hour cycles completed and rewards claimed on the internal virtual ledger.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {miningHistory.length} Sessions Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="pb-3 font-normal">Session / Block</th>
                <th className="pb-3 font-normal">Simulated Hash</th>
                <th className="pb-3 font-normal">Duration</th>
                <th className="pb-3 font-normal">Reward Credited</th>
                <th className="pb-3 font-normal">Status</th>
                <th className="pb-3 font-normal text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {miningHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Pickaxe className="w-8 h-8 text-slate-600" />
                      <p className="text-sm text-slate-300">No mining sessions recorded yet.</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Start your first 24-hour virtual mining cycle above to accumulate up to 0.00024 NXR at 0.00001 NXR per hour.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                miningHistory.map((session, idx) => {
                  const durationSec = session.durationSeconds ?? session.elapsedSeconds ?? 0;
                  return (
                    <tr key={session.sessionId || session.id || idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 font-bold text-[#F3E5AB]">#{session.blockNumber ?? idx + 1}</td>
                      <td className="py-3 text-slate-300">
                        <span className="text-emerald-400 font-bold">{session.hash.slice(0, 8)}</span>
                        <span>...{session.hash.slice(-6)}</span>
                      </td>
                      <td className="py-3 text-slate-400">
                        {Math.floor(durationSec / 3600)}h {Math.floor((durationSec % 3600) / 60)}m
                      </td>
                      <td className="py-3 font-bold text-[#ECC86A]">
                        +{formatNXR(session.rewardNXR)} NXR
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {session.status || 'Claimed'}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-400 font-sans">
                        {new Date(session.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
