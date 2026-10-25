import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { fetchMyTransactions } from '../services/userService';
import { VirtualTransaction } from '../types/crypto';
import { formatNXR } from '../utils/miningRules';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pickaxe,
  Gift,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  SlidersHorizontal,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { user, setActiveTab } = useApp();

  const [transactions, setTransactions] = useState<VirtualTransaction[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<VirtualTransaction | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await fetchMyTransactions(user.id, {
      type: filterType !== 'all' ? filterType : undefined,
      search: searchTerm.trim() || undefined,
      page: currentPage,
      limit: 10,
    });

    setIsLoading(false);
    if (res.success && res.transactions) {
      setTransactions(res.transactions);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } else {
      setErrorMessage(res.error || 'Failed to retrieve authoritative ledger records.');
    }
  }, [user?.id, filterType, searchTerm, currentPage]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const getTxTypeBadge = (type: VirtualTransaction['type']) => {
    switch (type) {
      case 'mining_reward':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/15 text-[#ECC86A] border border-[#D4AF37]/35">
            <Pickaxe className="w-3 h-3 text-[#ECC86A]" />
            Mining Reward
          </span>
        );
      case 'send':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rose-500/15 text-rose-300 border border-rose-500/35">
            <ArrowUpRight className="w-3 h-3 text-rose-400" />
            Sent Transfer
          </span>
        );
      case 'receive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
            <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
            Received Transfer
          </span>
        );
      case 'referral_reward':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-purple-500/15 text-purple-300 border border-purple-500/35">
            <Gift className="w-3 h-3 text-purple-400" />
            Referral Bonus
          </span>
        );
      case 'admin_adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-blue-500/15 text-blue-300 border border-blue-500/35">
            <ShieldCheck className="w-3 h-3 text-blue-400" />
            Audited Adjustment
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Transfer
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* 1. Page Header & Transparency Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/20">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-transparent border border-[#D4AF37]/40 text-[#ECC86A]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white tracking-wide">
                Transaction Center
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative virtual ledger entries synchronized with server database • Read-only record
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadTransactions()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#12141D] text-slate-200 border border-slate-700 hover:border-[#D4AF37]/45 text-xs font-medium transition-all"
            title="Refresh Ledger Records"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#ECC86A] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-semibold text-xs shadow-md hover:scale-[1.02] transition-transform"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Send NXR</span>
          </button>
        </div>
      </div>

      {/* Mandatory Virtual Simulation Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-[#0F111A] border border-[#D4AF37]/35 text-xs text-slate-300 space-y-1.5 shadow-lg">
        <div className="flex items-center gap-2 text-[#ECC86A] font-semibold text-xs">
          <Info className="w-4 h-4 text-[#ECC86A] shrink-0" />
          <span className="font-cinzel tracking-wider uppercase">Authoritative Ledger Disclaimer</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          NEXORA COIN is currently a virtual simulation. NXR balances and transfers are internal database records, not blockchain assets. No real-money value is guaranteed. Transaction history displayed below is cryptographically isolated and matches server database state directly.
        </p>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="p-4 rounded-2xl bg-[#0C0E16] border border-[#D4AF37]/30 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Transaction Filters">
            {[
              { id: 'all', label: 'All Operations' },
              { id: 'mining_reward', label: 'Mining Rewards' },
              { id: 'send', label: 'Sent' },
              { id: 'receive', label: 'Received' },
              { id: 'referral_reward', label: 'Referral Rewards' },
              { id: 'admin_adjustment', label: 'Adjustments' },
            ].map(f => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filterType === f.id}
                onClick={() => {
                  setFilterType(f.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  filterType === f.id
                    ? 'bg-[#1C2030] text-[#FFF3D6] border border-[#D4AF37]/50 shadow-sm'
                    : 'bg-[#08090E] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by hash, counterparty, note..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#08090E] border border-slate-800 focus:border-[#D4AF37]/50 text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Transaction Records Table */}
      <div className="rounded-3xl bg-[#0C0E16] border border-[#D4AF37]/30 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#ECC86A] animate-spin mx-auto opacity-75" />
            <p className="text-xs text-slate-400 font-mono">Synchronizing authoritative ledger records...</p>
          </div>
        ) : errorMessage ? (
          <div className="py-16 text-center space-y-3 px-4">
            <p className="text-sm text-rose-300 font-medium">{errorMessage}</p>
            <button
              onClick={() => loadTransactions()}
              className="px-4 py-2 rounded-xl bg-[#1C2030] text-[#ECC86A] border border-[#D4AF37]/40 text-xs font-medium hover:bg-[#25293D]"
            >
              Retry Connection
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-20 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-2xl bg-[#12141D] border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-cinzel font-semibold text-white">No Ledger Transactions Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {filterType !== 'all' || searchTerm
                ? 'No transactions matched your current filter criteria. Try clearing search filters.'
                : 'All new simulated accounts strictly start at 0.00000 NXR. Start a 24-hour mining session or apply a referral invitation to populate genuine ledger activity.'}
            </p>
            {(filterType !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setFilterType('all');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="mt-2 text-xs text-[#ECC86A] hover:underline font-medium"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#08090E] text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Operation</th>
                  <th className="py-3 px-4">Transaction Reference</th>
                  <th className="py-3 px-4">Amount (NXR)</th>
                  <th className="py-3 px-4">Counterparty / Pool</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {transactions.map(tx => {
                  const isPositive =
                    tx.type === 'mining_reward' ||
                    tx.type === 'receive' ||
                    tx.type === 'referral_reward' ||
                    (tx.type === 'admin_adjustment' && tx.amount > 0);

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-sans">
                        {getTxTypeBadge(tx.type)}
                      </td>
                      <td className="py-3.5 px-4 text-[#ECC86A] font-mono truncate max-w-[150px]">
                        {tx.txHash ? `${tx.txHash.slice(0, 10)}...${tx.txHash.slice(-4)}` : tx.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold font-mono text-sm ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : '-'}
                          {formatNXR(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300 truncate max-w-[160px]">
                        {tx.type === 'send' ? tx.toAddress : tx.fromAddress}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-sans text-[11px]">
                        {new Date(tx.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        •{' '}
                        {new Date(tx.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmed
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedTx(tx);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#141724] hover:bg-[#1D2133] text-slate-300 hover:text-white border border-slate-700 text-[11px] font-sans transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-[#08090E] text-xs text-slate-400">
            <span className="font-sans">
              Showing page <span className="text-white font-bold">{pagination.page}</span> of{' '}
              <span className="text-white font-bold">{pagination.totalPages}</span> (
              {pagination.total} authoritative records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#12141D] border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#12141D] border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-slate-200 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Read-Only Transaction Detail Inspector Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-[#0D0F18] border border-[#D4AF37]/45 p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Close Inspector"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 text-[#ECC86A]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-cinzel text-lg font-bold text-white">
                  Transaction Metadata
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Read-only authoritative database verification record
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#08090E] border border-slate-800/80">
                <span className="text-slate-400 font-sans">Operation:</span>
                <div>{getTxTypeBadge(selectedTx.type)}</div>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#08090E] border border-slate-800/80">
                <span className="text-slate-400 font-sans">Amount:</span>
                <span className="text-base font-bold text-white">
                  {formatNXR(selectedTx.amount)}
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#08090E] border border-slate-800/80">
                <span className="text-slate-400 font-sans">Transaction Fee:</span>
                <span className="text-emerald-400 font-bold">0.00000 NXR (Zero Fee)</span>
              </div>

              <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[#08090E] border border-slate-800/80">
                <span className="text-slate-400 font-sans">Hash Reference:</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#ECC86A] truncate select-all">{selectedTx.txHash}</span>
                  <button
                    onClick={() => handleCopyHash(selectedTx.txHash)}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white shrink-0"
                    title="Copy Hash"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-[#08090E] border border-slate-800/80 font-sans">
                <span className="text-slate-400">Ledger Note / Scope:</span>
                <span className="text-slate-200 text-[11px]">{selectedTx.note || 'Internal ledger verification.'}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#08090E] border border-slate-800/80 font-sans">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-200 font-mono text-[11px]">
                  {new Date(selectedTx.timestamp).toISOString()}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedTx(null)}
                className="w-full py-2.5 rounded-xl bg-[#171A27] hover:bg-[#202538] text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
