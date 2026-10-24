import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NexoraCoinLogo } from '../components/NexoraCoinLogo';
import { formatNXR } from '../utils/miningRules';
import { formatUsd } from '../utils/portfolioCalculations';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  Send,
  QrCode,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Clock,
  Layers,
} from 'lucide-react';

export const WalletPage: React.FC = () => {
  const {
    user,
    portfolio,
    transactions,
    sendVirtualNXR,
    setActiveTab,
  } = useApp();

  const [activeModal, setActiveModal] = useState<'send' | 'receive' | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTx, setSearchTx] = useState('');

  // Send form states
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccessHash, setSendSuccessHash] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const virtualNXRBalance = user?.virtualBalanceNXR || 0.0;
  const walletAddress = user?.virtualWalletAddress || 'NXR-GENUINE-USER-LEDGER';

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleExecuteSend = (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setIsSubmitting(true);

    const amountNum = parseFloat(sendAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setSendError('Please enter a valid positive transfer amount.');
      setIsSubmitting(false);
      return;
    }

    if (virtualNXRBalance <= 0) {
      setSendError(
        'Insufficient virtual balance. Your balance is 0.00000 NXR. Start a 24-hour mining session to earn virtual NXR before transferring.'
      );
      setIsSubmitting(false);
      return;
    }

    if (amountNum > virtualNXRBalance) {
      setSendError(
        `Insufficient balance. You requested ${formatNXR(amountNum)} NXR, but only hold ${formatNXR(virtualNXRBalance)} NXR.`
      );
      setIsSubmitting(false);
      return;
    }

    const result = sendVirtualNXR(recipientAddress.trim(), amountNum);
    if (!result.success) {
      setSendError(result.error || 'Failed to complete internal virtual transfer.');
    } else {
      setSendSuccessHash(result.txHash || 'NXR-TX-CONFIRMED');
      setSendAmount('');
      setRecipientAddress('');
    }
    setIsSubmitting(false);
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filterType === 'all' || tx.type === filterType;
    const matchesSearch =
      tx.txHash.toLowerCase().includes(searchTx.toLowerCase()) ||
      tx.fromAddress.toLowerCase().includes(searchTx.toLowerCase()) ||
      tx.toAddress.toLowerCase().includes(searchTx.toLowerCase()) ||
      tx.asset.toLowerCase().includes(searchTx.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Wallet Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0F111A] border border-amber-500/35 space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
            <ShieldAlert className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold tracking-wider text-amber-300 uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              INTERNAL VIRTUAL LEDGER — STRICTLY NON-MONETARY
            </span>
            <p className="text-xs text-slate-300 mt-1">
              Virtual NXR balances are not real cryptocurrency, do not hold fiat currency value, and cannot be withdrawn or sold for real money. Internal transfers take place solely within the NEXORA virtual ledger between registered user addresses.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Wallet Card & Account Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Virtual Card Front */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-[#1A1D2B] via-[#0E1018] to-[#07080B] border border-[#D4AF37]/40 shadow-2xl relative overflow-hidden flex flex-col justify-between h-80">
          <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#D4AF37]/15 via-transparent to-transparent pointer-events-none rounded-full" />

          {/* Card Top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <NexoraCoinLogo size="xs" showText={false} animated={false} />
              <span className="font-cinzel text-sm font-bold text-white tracking-wider">
                NEXORA VAULT
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#181B28] text-[#ECC86A] border border-[#D4AF37]/30">
              Virtual Node
            </span>
          </div>

          {/* Balance */}
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono">Internal Virtual Balance</span>
            <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#F3E5AB]">
              {formatNXR(virtualNXRBalance)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Internal Virtual Coin • No market price established</span>
            </div>
          </div>

          {/* Card Bottom: Address & Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-black/50 p-2.5 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-slate-300 truncate max-w-[220px]" title={walletAddress}>
                {walletAddress}
              </span>
              <button
                onClick={handleCopyAddress}
                className="p-1 text-[#ECC86A] hover:text-[#FFF3D6] transition-colors ml-2"
                title="Copy Address"
              >
                {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveModal('send');
                  setSendError(null);
                  setSendSuccessHash(null);
                }}
                className="py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow hover:brightness-110 transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Send Virtual NXR</span>
              </button>
              <button
                onClick={() => setActiveModal('receive')}
                className="py-2.5 rounded-xl bg-[#161928] text-white hover:bg-[#1E2338] border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>Receive / Address</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Ledger Rules & Multi-Asset Market Reference */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-cinzel text-lg font-bold text-white">Wallet Overview & Rules</h3>
              <p className="text-xs text-slate-400">Strict non-monetary protocol compliance.</p>
            </div>
            <span className="text-xs text-[#ECC86A] font-mono px-2.5 py-1 rounded bg-[#181B26] border border-[#D4AF37]/30">
              5-Decimal Precision
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[#08090F] border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Zero Initial Balance</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                New accounts start with exactly 0.00000 NXR. No fake preloaded balances or pre-mined coins are generated.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#08090F] border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Clock className="w-4 h-4 text-[#ECC86A]" />
                <span>24h Mining Yield</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Mine up to 0.00024 NXR every 24 hours at 0.00001 NXR/hour via the Mining Engine.
              </p>
            </div>
          </div>

          {/* Quick Notice to mine */}
          {virtualNXRBalance === 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="text-xs text-amber-200">
                <span className="font-bold block text-amber-300">Your virtual NXR balance is currently 0.00000 NXR</span>
                Ready to mine your first reward? Start an automated 24-hour cycle.
              </div>
              <button
                onClick={() => setActiveTab('mining')}
                className="px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#ECC86A] text-black text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                Go to Mining
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Transaction History Table with Filters & Search */}
      <div className="p-6 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-cinzel text-lg font-bold text-white">Virtual Transaction Ledger</h3>
            <p className="text-xs text-slate-400">Searchable history of verified internal transfers and mining grants.</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTx}
              onChange={e => setSearchTx(e.target.value)}
              placeholder="Search by hash, address, coin..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141624] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#D4AF37]/60"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 text-xs">
          {[
            { id: 'all', label: 'All Transactions' },
            { id: 'mining_reward', label: 'Mining Rewards' },
            { id: 'send', label: 'Sent' },
            { id: 'receive', label: 'Received' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterType === f.id
                  ? 'bg-[#D4AF37] text-black font-semibold shadow'
                  : 'bg-[#12141D] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="pb-3">Type</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Transaction Hash</th>
                <th className="pb-3">Counterparty Address</th>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Layers className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-medium text-slate-300">No transactions yet.</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Start a 24-hour mining session or receive an internal virtual NXR transfer from another user to populate your ledger.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-1.5 font-sans">
                        {tx.type === 'mining_reward' && (
                          <span className="text-[#ECC86A] bg-[#ECC86A]/10 px-2 py-0.5 rounded text-[11px] font-semibold border border-[#D4AF37]/30">
                            Mining Reward
                          </span>
                        )}
                        {tx.type === 'send' && (
                          <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-500/30">
                            Sent
                          </span>
                        )}
                        {tx.type === 'receive' && (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-500/30">
                            Received
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="font-bold text-white font-mono">
                        {tx.type === 'send' ? '-' : '+'}
                        {formatNXR(tx.amount)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        Virtual Asset
                      </div>
                    </td>
                    <td className="py-3 text-slate-300">
                      <span title={tx.txHash}>{tx.txHash.slice(0, 16)}...</span>
                    </td>
                    <td className="py-3 text-slate-400">
                      {tx.type === 'send' ? tx.toAddress.slice(0, 18) : tx.fromAddress.slice(0, 18)}...
                    </td>
                    <td className="py-3 text-slate-400 font-sans">
                      {new Date(tx.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Internal Send Virtual NXR Modal */}
      {activeModal === 'send' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0D0F18] border border-[#D4AF37]/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-[#ECC86A]" />
              <span>Internal Virtual NXR Transfer</span>
            </h3>

            {sendSuccessHash ? (
              <div className="space-y-4 py-3 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Virtual Transfer Confirmed</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Internal transaction recorded on virtual ledger with 5-decimal precision.
                  </p>
                </div>
                <div className="p-3 bg-black/50 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 break-all">
                  Tx Hash: {sendSuccessHash}
                </div>
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setSendSuccessHash(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-semibold text-xs cursor-pointer"
                >
                  Close Receipt
                </button>
              </div>
            ) : (
              <form onSubmit={handleExecuteSend} className="space-y-4 text-xs">
                {sendError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{sendError}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-[#07080D] border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Available Virtual Balance</span>
                  <div className="font-mono text-base font-bold text-[#F3E5AB]">
                    {formatNXR(virtualNXRBalance)}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Recipient Virtual Address</label>
                  <input
                    type="text"
                    required
                    value={recipientAddress}
                    onChange={e => setRecipientAddress(e.target.value)}
                    placeholder="e.g. NXR-TEST-USER-NODE-01"
                    className="w-full p-2.5 rounded-xl bg-[#151824] border border-slate-800 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Self-transfers to your own address ({walletAddress.slice(0, 12)}...) are prevented.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400">Amount (NXR)</label>
                    <button
                      type="button"
                      onClick={() => setSendAmount(virtualNXRBalance.toFixed(5))}
                      className="text-[10px] text-[#ECC86A] hover:underline cursor-pointer"
                    >
                      Max: {formatNXR(virtualNXRBalance)}
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.00001"
                    min="0.00001"
                    required
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                    placeholder="0.00000"
                    className="w-full p-2.5 rounded-xl bg-[#151824] border border-slate-800 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                  <p className="mt-1 text-[10px] text-slate-500 font-mono">
                    Enforces 5-decimal precision (e.g. 0.00001 NXR).
                  </p>
                </div>

                <div className="p-2.5 bg-black/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Virtual Network Fee:</span>
                    <span className="text-emerald-400">0.00000 NXR (Free)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Settlement:</span>
                    <span className="text-white">Atomic Internal Transfer</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="w-1/2 py-2.5 rounded-xl bg-[#161926] text-slate-300 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || virtualNXRBalance <= 0}
                    className={`w-1/2 py-2.5 rounded-xl font-bold transition-all shadow ${
                      virtualNXRBalance > 0
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black cursor-pointer hover:brightness-110'
                        : 'bg-[#151824] text-slate-600 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    Execute Send
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. Receive Address Screen Modal */}
      {activeModal === 'receive' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0D0F18] border border-[#D4AF37]/40 rounded-2xl shadow-2xl p-6 space-y-5 text-center">
            <h3 className="font-cinzel text-lg font-bold text-white flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-[#ECC86A]" />
              <span>Receive Virtual NXR</span>
            </h3>

            {/* QR Pattern visual */}
            <div className="w-44 h-44 mx-auto p-3 rounded-2xl bg-white flex flex-col items-center justify-center shadow-lg relative">
              <div className="w-full h-full bg-[#111] p-2 flex flex-wrap gap-1 items-center justify-center">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-xs ${
                      (i * 7 + 3) % 2 === 0 ? 'bg-[#D4AF37]' : 'bg-white'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400">Your Unique Virtual Address</span>
              <div className="p-2.5 bg-black/50 rounded-xl border border-slate-800 text-xs font-mono text-white flex items-center justify-between">
                <span className="truncate pr-2">{walletAddress}</span>
                <button
                  onClick={handleCopyAddress}
                  className="p-1 text-[#ECC86A] hover:text-white cursor-pointer"
                >
                  {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#131622] rounded-xl border border-[#D4AF37]/25 text-left text-[11px] text-slate-300 space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5 text-xs text-[#ECC86A]">
                <Info className="w-3.5 h-3.5" />
                <span>Receiving Virtual Transfers</span>
              </div>
              <p>
                Provide this address to another registered user to receive internal virtual NXR. Virtual NXR balances have no real-world monetary value.
              </p>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#161926] text-slate-300 hover:text-white text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
