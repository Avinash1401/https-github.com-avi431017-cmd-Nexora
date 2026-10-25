import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatNXR } from '../utils/miningRules';
import {
  Trophy,
  Activity,
  Users,
  Pickaxe,
  ArrowRightLeft,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Layers,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface LeaderboardUser {
  userId: string;
  maskedEmail: string;
  displayName: string;
  maskedAddress: string;
  balanceNXR: number;
  role: string;
  status: string;
  registeredAt: number;
  completedMiningCycles: number;
}

interface ActivityItem {
  id: string;
  type: 'mining_claim' | 'transfer' | 'referral';
  title: string;
  description: string;
  amountNXR: number;
  timestamp: number;
  txHash?: string;
}

interface ReferralSummary {
  referralCode: string;
  totalReferrals: number;
  maxReferrals: number;
  rewardPerReferralNXR: number;
  totalRewardNXR: number;
  referrals: Array<{
    id: string;
    referredUserId: string;
    maskedEmail: string;
    timestamp: number;
    rewardNXR: number;
    status: string;
  }>;
}

export const LeaderboardPage: React.FC = () => {
  const { user, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'activity' | 'referrals'>('leaderboard');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [referralData, setReferralData] = useState<ReferralSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leadRes, actRes] = await Promise.all([
        fetch('/api/leaderboard'),
        fetch('/api/activity/stream'),
      ]);

      if (leadRes.ok) {
        const leadJson = await leadRes.json();
        if (leadJson.success) setUsers(leadJson.leaderboard || []);
      }

      if (actRes.ok) {
        const actJson = await actRes.json();
        if (actJson.success) setActivities(actJson.activity || []);
      }

      if (user?.id) {
        const refRes = await fetch(`/api/referrals/my`, {
          headers: { 'x-user-id': user.id },
        });
        if (refRes.ok) {
          const refJson = await refRes.json();
          if (refJson.success) setReferralData(refJson);
        }
      }
    } catch (err) {
      console.warn('Failed to load leaderboard/activity data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const handleCopyReferral = () => {
    const code = referralData?.referralCode || user?.referralCode || `NXR-REF-${user?.id.substring(4, 9).toUpperCase()}`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    addNotification('Referral Code Copied', `Copied ${code} to clipboard. Share with new operators.`, 'info');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/20">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#ECC86A]" />
            <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white">
              Platform Leaderboard & Activity
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Genuine registered nodes and verified platform events. Zero bots or fabricated statistics.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141724] hover:bg-[#1E2338] text-[#F3E5AB] border border-[#D4AF37]/35 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* 2. Referral Rewards Hub Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#151824] via-[#0E1018] to-[#12141F] border border-[#D4AF37]/30 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-[#ECC86A]">
            <Sparkles className="w-4 h-4 text-[#ECC86A]" />
            <span className="font-cinzel text-sm font-bold uppercase tracking-wider">
              Node Referral Program
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Earn <span className="font-mono text-[#F3E5AB] font-bold">0.00005 NXR</span> per verified node that registers using your unique invitation code. Strictly capped at 10 referrals (<span className="font-mono text-[#F3E5AB] font-bold">0.00050 NXR max</span>). Self-referrals are prevented.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-black/60 border border-slate-700 text-xs font-mono flex items-center gap-3">
            <span className="text-slate-400">Your Code:</span>
            <span className="text-[#F3E5AB] font-bold">
              {referralData?.referralCode || user?.referralCode || (user ? `NXR-REF-${user.id.substring(4, 9).toUpperCase()}` : 'SIGN IN')}
            </span>
            {user && (
              <button
                onClick={handleCopyReferral}
                className="p-1 text-[#ECC86A] hover:text-[#FFF3D6] transition-colors"
                title="Copy Referral Code"
                aria-label="Copy Referral Code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>

          <div className="px-3 py-2 rounded-xl bg-[#090A0F] border border-[#D4AF37]/25 text-[11px] font-mono text-right">
            <div className="text-slate-400">Total Referrals</div>
            <div className="text-emerald-400 font-bold">
              {referralData?.totalReferrals ?? 0} / 10 Confirmed
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tab Filter Buttons */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
              : 'bg-[#0E1018] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Top Verified Nodes ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
              : 'bg-[#0E1018] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Platform Activity Stream ({activities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
            activeTab === 'referrals'
              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
              : 'bg-[#0E1018] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>My Referral Tree ({referralData?.totalReferrals ?? 0})</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: LEADERBOARD TABLE
      ===================================================================== */}
      {activeTab === 'leaderboard' && (
        <div className="rounded-2xl bg-[#0C0E17] border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-[#090B10]">
                  <th className="py-3 px-4 w-16">Rank</th>
                  <th className="py-3 px-4 font-sans">Node Operator</th>
                  <th className="py-3 px-4">Virtual Address</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-center">Cycles Claimed</th>
                  <th className="py-3 px-4 text-right">Virtual Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                      <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <div>No registered nodes in database.</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Rankings automatically populate as authentic users register.
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr key={u.userId} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-bold">
                        {idx === 0 && <span className="text-[#D4AF37]">#1</span>}
                        {idx === 1 && <span className="text-slate-300">#2</span>}
                        {idx === 2 && <span className="text-amber-600">#3</span>}
                        {idx > 2 && <span className="text-slate-500">#{idx + 1}</span>}
                      </td>
                      <td className="py-3.5 px-4 font-sans font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#181B28] border border-slate-700 flex items-center justify-center text-[10px] text-[#ECC86A] font-bold">
                            {u.displayName.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div>{u.displayName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{u.maskedEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {u.maskedAddress}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#141724] text-[#ECC86A] border border-[#D4AF37]/30">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-300">
                        {u.completedMiningCycles}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#F3E5AB]">
                        {formatNXR(u.balanceNXR)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: PLATFORM ACTIVITY STREAM
      ===================================================================== */}
      {activeTab === 'activity' && (
        <div className="rounded-2xl bg-[#0C0E17] border border-slate-800 p-4 space-y-3">
          {activities.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-sans">
              <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div>No recent platform activity recorded.</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Completed mining claims and virtual transfers will appear here in real time.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map(act => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl bg-[#08090F] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#141724] border border-slate-700">
                      {act.type === 'mining_claim' && <Pickaxe className="w-4 h-4 text-[#ECC86A]" />}
                      {act.type === 'transfer' && <ArrowRightLeft className="w-4 h-4 text-blue-400" />}
                      {act.type === 'referral' && <Sparkles className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{act.title}</div>
                      <div className="text-[11px] text-slate-400">{act.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right shrink-0">
                    <div>
                      <div className="font-mono font-bold text-[#F3E5AB]">
                        +{act.amountNXR.toFixed(5)} NXR
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 justify-end font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: MY REFERRAL TREE
      ===================================================================== */}
      {activeTab === 'referrals' && (
        <div className="rounded-2xl bg-[#0C0E17] border border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800 text-xs">
            <div>
              <h3 className="font-cinzel text-base font-bold text-white">Your Referred Operators</h3>
              <p className="text-slate-400">Genuine invited node accounts that registered using your code.</p>
            </div>
            <span className="font-mono text-emerald-400 text-xs">
              Earned: {referralData?.totalRewardNXR ? referralData.totalRewardNXR.toFixed(5) : '0.00000'} NXR
            </span>
          </div>

          {(!referralData || referralData.referrals.length === 0) ? (
            <div className="py-10 text-center text-slate-400 font-sans text-xs">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div>No referred nodes registered yet.</div>
              <div className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                Share your referral code <span className="text-[#F3E5AB] font-mono">{referralData?.referralCode || 'above'}</span> with new operators to earn +0.00005 NXR per registration.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {referralData.referrals.map(r => (
                <div
                  key={r.id}
                  className="p-3 rounded-xl bg-[#08090F] border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-white font-medium">{r.maskedEmail}</span>
                    <span className="text-slate-500 text-[10px]">({r.referredUserId})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#F3E5AB] font-bold">+{r.rewardNXR.toFixed(5)} NXR</span>
                    <span className="text-[10px] text-emerald-400 uppercase ml-2">{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
