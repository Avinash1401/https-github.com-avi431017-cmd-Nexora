import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NexoraCoinLogo } from '../components/NexoraCoinLogo';
import { formatNXR } from '../utils/miningRules';
import {
  calculateAllocations,
  calculateAssetProfitLoss,
  formatUsd,
} from '../utils/portfolioCalculations';
import {
  PieChart as PieIcon,
  TrendingUp,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Layers,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Pickaxe,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

const COLORS = ['#D4AF37', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EC4899'];

export const PortfolioPage: React.FC = () => {
  const { user, portfolio, portfolioSummary, setActiveTab } = useApp();
  const [searchAsset, setSearchAsset] = useState('');

  const virtualNXR = user?.virtualBalanceNXR || 0.0;
  // Exclude virtual NXR from USD pie chart calculation since it has no USD price
  const nonVirtualAssets = portfolio.filter(a => a.symbol !== 'NXR' && a.currentPrice !== null);
  const allocatedAssets = calculateAllocations(nonVirtualAssets);

  const filteredAssets = allocatedAssets.filter(
    a =>
      a.name.toLowerCase().includes(searchAsset.toLowerCase()) ||
      a.symbol.toLowerCase().includes(searchAsset.toLowerCase())
  );

  const pieChartData = allocatedAssets.map(a => ({
    name: a.symbol,
    value: Number((a.balance * (a.currentPrice || 0)).toFixed(2)),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Header & Policy Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/20">
        <div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            Virtual Portfolio Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Separation of internal virtual protocol tokens from public asset simulations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('wallet')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-bold text-xs cursor-pointer shadow hover:brightness-110"
          >
            Manage Wallet
          </button>
        </div>
      </div>

      {/* 2. Top Banner: Dedicated Native Virtual NXR Position */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#141624] via-[#0E101A] to-[#0A0B12] border border-[#D4AF37]/35 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <NexoraCoinLogo size="md" showText={false} animated={true} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cinzel text-lg font-bold text-white">NEXORA COIN (NXR)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181B26] text-[#ECC86A] border border-[#D4AF37]/30 uppercase">
                  Native Virtual Protocol
                </span>
              </div>
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#F3E5AB] mt-1">
                {formatNXR(virtualNXR)}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Internal Virtual Coin • No market price established • Not fiat currency</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('mining')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow hover:brightness-110"
            >
              <Pickaxe className="w-4 h-4" />
              <span>Mine NXR (0.00001/hr)</span>
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className="px-4 py-2.5 rounded-xl bg-[#161928] text-white hover:bg-[#1E2338] border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-[#ECC86A]" />
              <span>Internal Transfer</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Top Summary KPI Cards for Market Tracked Assets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0D0F18] border border-[#D4AF37]/25">
          <span className="text-xs text-slate-400">Total Simulated Market Value</span>
          <div className="font-mono text-2xl font-bold text-white mt-1">
            {formatUsd(portfolioSummary.totalValueUsd)}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Excludes non-monetary NXR</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D0F18] border border-[#D4AF37]/25">
          <span className="text-xs text-slate-400">Unrealized Performance</span>
          <div
            className={`font-mono text-2xl font-bold mt-1 ${
              portfolioSummary.totalProfitLossUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {portfolioSummary.totalProfitLossUsd >= 0 ? '+' : ''}
            {formatUsd(portfolioSummary.totalProfitLossUsd)}
          </div>
          <span className="text-[11px] font-mono text-emerald-400">
            {portfolioSummary.totalProfitLossPercentage >= 0 ? '+' : ''}
            {portfolioSummary.totalProfitLossPercentage}% Overall Return
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D0F18] border border-[#D4AF37]/25">
          <span className="text-xs text-slate-400">Simulated Cost Basis</span>
          <div className="font-mono text-2xl font-bold text-slate-200 mt-1">
            {formatUsd(portfolioSummary.totalCostBasisUsd)}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Paper Portfolio Acquisition</span>
        </div>
      </div>

      {/* 4. Donut Chart & Holdings Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart Allocation */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-[#ECC86A]" />
              <span>Market Asset Allocation</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Live Public Assets</span>
          </div>

          <div className="w-full h-56">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D0F18',
                      borderColor: 'rgba(212,175,55,0.4)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No external assets in portfolio
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs font-mono">
            {allocatedAssets.map((asset, idx) => (
              <div key={asset.coinId} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-white">{asset.symbol}</span>
                </div>
                <span className="text-slate-400">{asset.allocationPercentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Individual Asset Performance Table */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-cinzel text-lg font-bold text-white">Holdings & Performance</h3>
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchAsset}
                onChange={e => setSearchAsset(e.target.value)}
                placeholder="Search asset..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141624] border border-slate-800 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="pb-3">Asset</th>
                  <th className="pb-3">Balance</th>
                  <th className="pb-3">Price / Avg Buy</th>
                  <th className="pb-3">Total Value</th>
                  <th className="pb-3">PnL</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      No tracked public assets found.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map(asset => {
                    const pnl = calculateAssetProfitLoss(asset);
                    return (
                      <tr key={asset.coinId} className="hover:bg-white/5 transition-colors">
                        <td className="py-3">
                          <div className="font-bold text-white font-sans">{asset.name}</div>
                          <div className="text-[10px] text-[#ECC86A]">{asset.symbol}</div>
                        </td>
                        <td className="py-3 text-white font-semibold">
                          {asset.balance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="py-3 text-slate-300">
                          <div>${(asset.currentPrice || 0).toFixed(2)}</div>
                          <div className="text-[10px] text-slate-400">
                            Avg: ${((asset.averageBuyPrice ?? asset.currentPrice) || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="py-3 text-white font-bold">
                          {formatUsd(pnl.currentValueUsd || 0)}
                        </td>
                        <td className="py-3">
                          {pnl.profitLossUsd !== null && pnl.profitLossUsd !== undefined ? (
                            <span
                              className={`font-semibold ${
                                pnl.profitLossUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {pnl.profitLossUsd >= 0 ? '+' : ''}
                              {pnl.profitLossPercentage}%
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setActiveTab('market')}
                            className="px-2.5 py-1 rounded bg-[#161926] hover:bg-[#202538] text-slate-300 text-[11px] border border-slate-700 cursor-pointer"
                          >
                            View Market
                          </button>
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
    </div>
  );
};
