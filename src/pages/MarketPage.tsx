import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CryptoCoin } from '../types/crypto';
import { NexoraCoinLogo } from '../components/NexoraCoinLogo';
import { formatUsd } from '../utils/portfolioCalculations';
import {
  Search,
  ArrowUpDown,
  Star,
  RefreshCw,
  TrendingUp,
  Volume2,
  ExternalLink,
  X,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export const MarketPage: React.FC = () => {
  const {
    coins,
    marketStatus,
    refreshMarketData,
    watchlist,
    toggleWatchlist,
    speakBriefing,
    isSpeaking,
    setActiveTab,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'marketCap' | 'price' | 'change24h' | 'volume'>('marketCap');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedCoin, setSelectedCoin] = useState<CryptoCoin | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshMarketData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const filteredCoins = coins
    .filter(
      c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'marketCap') {
        valA = a.marketCapUsd ?? -1;
        valB = b.marketCapUsd ?? -1;
      } else if (sortBy === 'price') {
        valA = a.priceUsd ?? -1;
        valB = b.priceUsd ?? -1;
      } else if (sortBy === 'change24h') {
        valA = a.change24h ?? 0;
        valB = b.change24h ?? 0;
      } else if (sortBy === 'volume') {
        valA = a.volume24hUsd ?? -1;
        valB = b.volume24hUsd ?? -1;
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* 1. Header with Live Status & Audio Briefing */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/20">
        <div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            Cryptocurrency Markets
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time public market prices and transparent virtual asset isolation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live vs Simulated indicator badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border ${
              marketStatus.isLive
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
            title={`Source: ${marketStatus.source}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                marketStatus.isLive ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>
              {marketStatus.isLive
                ? marketStatus.isCached
                  ? 'Public Live Feed (Cached)'
                  : 'Live Public Feed'
                : 'Live Rate Limit Standby'}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-[#131622] text-slate-300 hover:text-white border border-slate-700 hover:border-[#D4AF37]/40 transition-colors cursor-pointer"
            title="Refresh public prices"
            aria-label="Refresh Market Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => speakBriefing('market')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#12141D] text-[#ECC86A] border border-[#D4AF37]/35 hover:bg-[#1A1E2B] text-xs font-medium transition-all cursor-pointer"
          >
            <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
            <span>Audio Market Briefing</span>
          </button>
        </div>
      </div>

      {/* 2. Controls: Search Bar & Sort Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search coin name or symbol (e.g. BTC, ETH)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0D0F18] border border-slate-800 focus:border-[#D4AF37]/60 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-400">
          <span>Sort by:</span>
          <button
            onClick={() => toggleSort('marketCap')}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
              sortBy === 'marketCap'
                ? 'bg-[#181B28] text-[#F3E5AB] border-[#D4AF37]/50 font-semibold'
                : 'border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Market Cap
          </button>
          <button
            onClick={() => toggleSort('price')}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
              sortBy === 'price'
                ? 'bg-[#181B28] text-[#F3E5AB] border-[#D4AF37]/50 font-semibold'
                : 'border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Price
          </button>
          <button
            onClick={() => toggleSort('change24h')}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
              sortBy === 'change24h'
                ? 'bg-[#181B28] text-[#F3E5AB] border-[#D4AF37]/50 font-semibold'
                : 'border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            24h Change
          </button>
        </div>
      </div>

      {/* 3. Comprehensive Crypto Market Table */}
      <div className="rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#08090F] text-slate-400 font-mono">
                <th className="py-3 px-4 w-10 text-center">
                  <Star className="w-3.5 h-3.5 mx-auto text-slate-500" />
                </th>
                <th className="py-3 px-4">Asset</th>
                <th
                  onClick={() => toggleSort('price')}
                  className="py-3 px-4 cursor-pointer hover:text-white text-right"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Price</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('change24h')}
                  className="py-3 px-4 cursor-pointer hover:text-white text-right"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>24h %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('volume')}
                  className="py-3 px-4 cursor-pointer hover:text-white text-right hidden sm:table-cell"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>24h Volume</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('marketCap')}
                  className="py-3 px-4 cursor-pointer hover:text-white text-right hidden md:table-cell"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Market Cap</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center hidden lg:table-cell">24h Trend</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredCoins.map(coin => {
                const isWatchlisted = watchlist.includes(coin.id);
                const isNexora = coin.isNexora || coin.symbol === 'NXR';

                return (
                  <tr
                    key={coin.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => setSelectedCoin(coin)}
                  >
                    {/* Watchlist Star Toggle */}
                    <td
                      className="py-3 px-4 text-center"
                      onClick={e => {
                        e.stopPropagation();
                        toggleWatchlist(coin.id);
                      }}
                    >
                      <button
                        className="p-1 text-slate-500 hover:text-[#ECC86A] transition-colors cursor-pointer"
                        title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isWatchlisted ? 'text-[#ECC86A] fill-[#ECC86A]' : ''
                          }`}
                        />
                      </button>
                    </td>

                    {/* Asset Name, Symbol, and Icon */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {isNexora ? (
                          <div className="shrink-0">
                            <NexoraCoinLogo size="xs" showText={false} animated={false} />
                          </div>
                        ) : (
                          <span className="text-xl shrink-0">{coin.icon}</span>
                        )}
                        <div>
                          <div className="font-semibold text-white group-hover:text-[#F3E5AB] transition-colors flex items-center gap-1.5 font-sans">
                            <span>{coin.name}</span>
                            {isNexora && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-[#D4AF37]/20 text-[#ECC86A] border border-[#D4AF37]/35 uppercase">
                                Virtual Simulation
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{coin.symbol}</div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {isNexora ? (
                        <span className="text-[#ECC86A] text-[11px] font-sans px-2 py-0.5 rounded bg-[#ECC86A]/10 border border-[#D4AF37]/30">
                          Internal Virtual Coin
                        </span>
                      ) : coin.priceUsd !== null ? (
                        <span>${formatUsd(coin.priceUsd).replace('$', '')}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* 24h Change */}
                    <td className="py-3 px-4 text-right">
                      {isNexora ? (
                        <span className="text-slate-500 font-sans text-xs">—</span>
                      ) : coin.change24h !== null && coin.change24h !== undefined ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            coin.change24h >= 0
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {coin.change24h >= 0 ? '+' : ''}
                          {coin.change24h}%
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>

                    {/* 24h Volume */}
                    <td className="py-3 px-4 text-right text-slate-300 hidden sm:table-cell">
                      {isNexora ? (
                        <span className="text-slate-500 text-xs">—</span>
                      ) : coin.volume24hUsd !== null && coin.volume24hUsd !== undefined && coin.volume24hUsd > 0 ? (
                        <span>${(coin.volume24hUsd / 1e6).toFixed(2)}M</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Market Cap */}
                    <td className="py-3 px-4 text-right text-slate-300 hidden md:table-cell">
                      {isNexora ? (
                        <span className="text-slate-500 text-xs">—</span>
                      ) : coin.marketCapUsd !== null && coin.marketCapUsd !== undefined && coin.marketCapUsd > 0 ? (
                        <span>${(coin.marketCapUsd / 1e6).toFixed(1)}M</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Mini Sparkline Line */}
                    <td className="py-3 px-4 text-center hidden lg:table-cell w-28">
                      {isNexora ? (
                        <span className="text-[10px] text-slate-500 font-sans">Simulated Ledger</span>
                      ) : coin.sparkline && coin.sparkline.length > 0 ? (
                        <div className="w-24 h-6 mx-auto">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={coin.sparkline.map((val, idx) => ({ idx, val }))}
                            >
                              <Line
                                type="monotone"
                                dataKey="val"
                                stroke={coin.change24h !== null && coin.change24h !== undefined && coin.change24h >= 0 ? '#10B981' : '#F43F5E'}
                                strokeWidth={1.8}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedCoin(coin);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#161926] hover:bg-[#202538] text-slate-200 hover:text-white border border-slate-700 text-xs transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Interactive Coin Detail Modal */}
      {selectedCoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#0D0F18] border border-[#D4AF37]/35 rounded-2xl shadow-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                {selectedCoin.isNexora || selectedCoin.symbol === 'NXR' ? (
                  <NexoraCoinLogo size="sm" showText={false} animated={false} />
                ) : (
                  <span className="text-3xl">{selectedCoin.icon}</span>
                )}
                <div>
                  <h3 className="font-cinzel text-xl font-bold text-white flex items-center gap-2">
                    {selectedCoin.name} ({selectedCoin.symbol})
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    {selectedCoin.isNexora || selectedCoin.symbol === 'NXR' ? (
                      <span className="font-mono text-sm font-bold text-[#ECC86A]">
                        Internal Virtual Coin • No market price established
                      </span>
                    ) : (
                      <>
                        <span className="font-mono text-lg font-bold text-[#F3E5AB]">
                          ${formatUsd(selectedCoin.priceUsd || 0).replace('$', '')}
                        </span>
                        <span
                          className={`font-mono text-xs ${
                            selectedCoin.change24h !== null && selectedCoin.change24h !== undefined && selectedCoin.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {selectedCoin.change24h !== null && selectedCoin.change24h !== undefined && selectedCoin.change24h >= 0 ? '+' : ''}
                          {selectedCoin.change24h ?? 0}% (24h)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCoin(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: If NXR, show Virtual Platform Rules */}
            {selectedCoin.isNexora || selectedCoin.symbol === 'NXR' ? (
              <div className="p-5 rounded-xl bg-[#08090E] border border-[#D4AF37]/30 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-[#ECC86A] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-cinzel text-sm font-bold text-white">
                      Virtual Simulation Coin Specifications
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      NEXORA COIN (NXR) is the native protocol simulation unit. It is strictly non-monetary, cannot be purchased with or exchanged for fiat currency or other real assets, and has no established secondary market price.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs pt-2 border-t border-slate-800">
                  <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">MINING RATE</span>
                    <span className="text-[#ECC86A] font-bold">0.00001 NXR / hr</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">24H CYCLE CAP</span>
                    <span className="text-[#F3E5AB] font-bold">0.00024 NXR</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-500 text-[10px] block">STARTING BALANCE</span>
                    <span className="text-emerald-400 font-bold">0.00000 NXR</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setSelectedCoin(null);
                      setActiveTab('mining');
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-bold text-xs cursor-pointer shadow hover:brightness-110"
                  >
                    Open Mining Station
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Real Coin Price Sparkline Chart */}
                <div className="w-full h-56 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={(selectedCoin.sparkline || []).map((val, idx) => ({
                        time: `T-${(selectedCoin.sparkline || []).length - idx}`,
                        price: val,
                      }))}
                    >
                      <XAxis dataKey="time" stroke="#52586B" fontSize={10} tickLine={false} />
                      <YAxis
                        stroke="#52586B"
                        fontSize={10}
                        tickLine={false}
                        domain={['auto', 'auto']}
                        tickFormatter={v => `$${v.toFixed(v < 1 ? 3 : 1)}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0D0F18',
                          borderColor: 'rgba(212,175,55,0.4)',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#D4AF37"
                        strokeWidth={2}
                        dot={{ fill: '#ECC86A', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Key Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#08090E] rounded-xl border border-slate-800/80 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block">24H HIGH</span>
                    <span className="text-white font-bold">${formatUsd(selectedCoin.high24h || 0).replace('$', '')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">24H LOW</span>
                    <span className="text-white font-bold">${formatUsd(selectedCoin.low24h || 0).replace('$', '')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">CIRCULATING</span>
                    <span className="text-slate-200">
                      {selectedCoin.circulatingSupply ? `${(selectedCoin.circulatingSupply / 1e6).toFixed(1)}M` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">VOLUME (24H)</span>
                    <span className="text-slate-200">
                      {selectedCoin.volume24hUsd ? `$${(selectedCoin.volume24hUsd / 1e6).toFixed(1)}M` : '—'}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => toggleWatchlist(selectedCoin.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#161926] border border-slate-700 text-xs text-slate-200 hover:text-white cursor-pointer"
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    watchlist.includes(selectedCoin.id) ? 'text-[#ECC86A] fill-[#ECC86A]' : ''
                  }`}
                />
                <span>
                  {watchlist.includes(selectedCoin.id) ? 'Remove Watchlist' : 'Add to Watchlist'}
                </span>
              </button>

              <button
                onClick={() => setSelectedCoin(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
