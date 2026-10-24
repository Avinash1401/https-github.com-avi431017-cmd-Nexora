import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Star, Search, Trash2, TrendingUp, ArrowRight, ExternalLink } from 'lucide-react';

export const WatchlistPage: React.FC = () => {
  const { coins, watchlist, toggleWatchlist, setActiveTab } = useApp();
  const [search, setSearch] = useState('');

  const watchlistedCoins = coins.filter(c => watchlist.includes(c.id));
  const filtered = watchlistedCoins.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/20">
        <div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-[#ECC86A] fill-[#ECC86A]" />
            <span>Persistent Watchlist</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pin and track your favorite crypto assets with automatic browser persistence.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('market')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#141724] hover:bg-[#1E2338] text-[#F3E5AB] border border-[#D4AF37]/35 text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          <span>Explore All Markets</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Search & Counter */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pinned coins..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0D0F18] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {watchlistedCoins.length} Coins Pinned
        </span>
      </div>

      {/* 3. Watchlist Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#0C0E17] border border-slate-800 text-center space-y-3">
          <Star className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="font-cinzel text-base font-bold text-white">Your Watchlist is Empty</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Pin coins from the Markets page by clicking their star icon to track price changes here.
          </p>
          <button
            onClick={() => setActiveTab('market')}
            className="px-5 py-2 rounded-xl bg-[#D4AF37] text-black font-semibold text-xs mt-2"
          >
            Browse Cryptocurrencies
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(coin => (
            <div
              key={coin.id}
              className="p-5 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 space-y-3 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{coin.icon}</span>
                  <div>
                    <h4 className="font-bold text-white text-sm">{coin.name}</h4>
                    <span className="text-[11px] text-[#ECC86A] font-mono">{coin.symbol}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleWatchlist(coin.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Remove from Watchlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-baseline justify-between pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 block font-mono">CURRENT PRICE</span>
                  <span className="font-mono text-base sm:text-lg font-bold text-white">
                    {coin.priceUsd !== null && coin.priceUsd !== undefined ? (
                      `$${coin.priceUsd.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: coin.priceUsd < 1 ? 4 : 2,
                      })}`
                    ) : (
                      <span className="text-xs text-[#ECC86A] font-sans">Virtual Simulation</span>
                    )}
                  </span>
                </div>
                {coin.change24h !== null && coin.change24h !== undefined ? (
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
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
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1">
                <div>
                  <span>24h Vol:</span>
                  <span className="text-slate-200 block">
                    {coin.volume24hUsd !== null && coin.volume24hUsd !== undefined ? `$${(coin.volume24hUsd / 1e6).toFixed(1)}M` : '—'}
                  </span>
                </div>
                <div>
                  <span>Market Cap:</span>
                  <span className="text-slate-200 block">
                    {coin.marketCapUsd !== null && coin.marketCapUsd !== undefined ? `$${(coin.marketCapUsd / 1e6).toFixed(1)}M` : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
