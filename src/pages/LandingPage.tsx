import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NexoraCoinLogo } from '../components/NexoraCoinLogo';
import { Nexora3DCoin } from '../components/three/Nexora3DCoin';
import { formatUsd } from '../utils/portfolioCalculations';
import { formatNXR, MINING_CONSTANTS } from '../utils/miningRules';
import {
  Pickaxe,
  TrendingUp,
  ShieldCheck,
  Cpu,
  Layers,
  Volume2,
  ChevronRight,
  Database,
  Lock,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';

interface LandingPageProps {
  onOpenDbModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenDbModal }) => {
  const { setActiveTab, coins, miningSession, speakBriefing, isSpeaking } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const nexoraCoin = coins.find(c => c.isNexora) || coins[0];
  const btc = coins.find(c => c.symbol === 'BTC');
  const eth = coins.find(c => c.symbol === 'ETH');
  const sol = coins.find(c => c.symbol === 'SOL');

  const faqs = [
    {
      q: 'Is NEXORA COIN performing actual cryptocurrency mining on my computer?',
      a: 'No. This application is an interactive mathematical simulation. No GPU/CPU hardware wear or real blockchain computation is executed. It is designed to demonstrate proof-of-work state machines, reward mechanisms, and fintech dashboard architectures without damaging hardware or consuming electricity.',
    },
    {
      q: 'Does virtual NXR hold monetary value, or can it be traded for fiat cash?',
      a: 'No. NEXORA (NXR) is strictly a virtual simulation coin. It has no monetary value, no fiat peg, and no established secondary market price. It cannot be purchased, sold, deposited, or withdrawn for real money.',
    },
    {
      q: 'How does the 24-hour virtual mining rate work?',
      a: 'The mining engine operates on a server-validated schedule accumulating 0.00001 NXR per hour, reaching a maximum cap of 0.00024 NXR per 24-hour cycle. Users can claim accrued virtual rewards at any time, crediting their virtual balance with 5-decimal precision.',
    },
    {
      q: 'What is the underlying technology stack of this platform?',
      a: 'The frontend is engineered with React 19, TypeScript, Tailwind CSS, Lucide icons, Three.js WebGL rendering, and Recharts. The backend architecture features an Express server with CoinGecko caching, Gemini TTS speech synthesis, and a 10-table relational PostgreSQL schema with row-level security and atomic internal transfers.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07080B] text-slate-100 flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-16 lg:pb-24 border-b border-[#D4AF37]/15">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Heading, Subtitle, CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141722] border border-[#D4AF37]/35 text-xs text-[#ECC86A] shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-[#ECC86A]" />
                <span className="font-medium tracking-wide">Next-Gen Virtual Mining Simulation Testnet</span>
              </div>

              <h1 className="font-cinzel text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
                <span className="block text-white">MINE THE</span>
                <span className="gold-gradient-text block">FUTURE</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
                Experience institutional-grade cryptocurrency architecture. Interact with our server-validated 24-hour mining engine, monitor live CoinGecko public market feeds, manage virtual ledgers, and inspect production PostgreSQL schemas.
              </p>

              {/* Simulation Disclaimer Banner */}
              <div className="inline-flex items-center gap-2 p-2.5 rounded-xl bg-[#0D0F16] border border-amber-500/30 text-amber-300/90 text-xs text-left">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Non-Monetary Virtual Platform — Virtual NXR has no cash value and cannot be withdrawn.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                <button
                  onClick={() => setActiveTab('mining')}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#B38F26] text-black font-bold text-sm shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:shadow-[0_0_28px_rgba(212,175,55,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Pickaxe className="w-4 h-4 text-black" />
                  <span>Launch Mining Engine</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </button>

                <button
                  onClick={() => setActiveTab('market')}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#131622] text-[#F3E5AB] border border-[#D4AF37]/35 hover:border-[#D4AF37]/70 hover:bg-[#1A1E2E] text-sm font-semibold transition-all shadow-md cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-[#ECC86A]" />
                  <span>Live Market Data</span>
                </button>

                <button
                  onClick={() => speakBriefing('welcome')}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-[#10121A] text-slate-300 border border-slate-700 hover:border-[#D4AF37]/40 hover:text-white text-sm transition-all cursor-pointer"
                  title="Listen to voice overview powered by Gemini TTS"
                >
                  <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-[#ECC86A] animate-pulse' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">Audio Intro</span>
                </button>
              </div>

              {/* Live Protocol Summary Ticker */}
              <div className="pt-4 grid grid-cols-3 gap-3 max-w-lg mx-auto lg:mx-0 border-t border-slate-800/80">
                <div className="p-2.5 rounded-lg bg-[#0C0E15] border border-slate-800">
                  <div className="text-[11px] text-slate-400">Mining Rate</div>
                  <div className="font-mono text-sm sm:text-base font-bold text-[#F3E5AB]">
                    0.00001 NXR/h
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">Max: 0.00024 NXR</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0C0E15] border border-slate-800">
                  <div className="text-[11px] text-slate-400">Starting Balance</div>
                  <div className="font-mono text-sm sm:text-base font-bold text-slate-200">
                    0.00000 NXR
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">Zero Preload</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0C0E15] border border-slate-800">
                  <div className="text-[11px] text-slate-400">Database Schema</div>
                  <div className="font-mono text-sm sm:text-base font-bold text-[#ECC86A]">10 Tables</div>
                  <div className="text-[10px] text-slate-400 font-mono">PostgreSQL DDL</div>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Interactive NEXORA Coin */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-md aspect-square rounded-3xl bg-radial from-[#151824] via-[#0E1017] to-[#07080B] border border-[#D4AF37]/25 shadow-2xl p-2 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

                {/* Three.js 3D WebGL Canvas Component */}
                <Nexora3DCoin className="w-full h-full" autoRotateSpeed={1.2} />

                {/* Subtitle tag */}
                <div className="absolute top-4 left-4 z-10 pointer-events-none">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#ECC86A]/80 px-2 py-0.5 rounded bg-black/60 border border-[#D4AF37]/30">
                    Interactive 3D WebGL Coin
                  </span>
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                <span>Drag to inspect 3D coin • Powered by Three.js PBR</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE MARKET PREVIEW STRIP */}
      <section className="py-8 bg-[#090A10] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white font-cinzel">Public Crypto Market Feed</h2>
              <p className="text-xs text-slate-400">Live prices sourced from CoinGecko API with transparent virtual token isolation.</p>
            </div>
            <button
              onClick={() => setActiveTab('market')}
              className="text-xs text-[#ECC86A] hover:text-[#FFF3D6] flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <span>View All Market Assets</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[nexoraCoin, btc, eth, sol].filter(Boolean).map(c => {
              const isNXR = c!.isNexora || c!.symbol === 'NXR';

              return (
                <div
                  key={c!.id}
                  onClick={() => setActiveTab('market')}
                  className="p-3.5 rounded-xl bg-[#0D0F17] border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isNXR ? (
                        <NexoraCoinLogo size="xs" showText={false} animated={false} />
                      ) : (
                        <span className="text-lg">{c!.icon}</span>
                      )}
                      <div>
                        <div className="font-semibold text-white text-xs group-hover:text-[#F3E5AB] transition-colors">
                          {c!.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{c!.symbol}</div>
                      </div>
                    </div>
                    {isNXR ? (
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#D4AF37]/15 text-[#ECC86A] border border-[#D4AF37]/30">
                        Virtual Coin
                      </span>
                    ) : c!.change24h !== null && c!.change24h !== undefined ? (
                      <span
                        className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded ${
                          c!.change24h >= 0
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {c!.change24h >= 0 ? '+' : ''}{c!.change24h}%
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-mono text-sm sm:text-base font-bold text-white">
                      {isNXR ? (
                        <span className="text-xs text-[#ECC86A] font-sans">No Market Price</span>
                      ) : c!.priceUsd !== null && c!.priceUsd !== undefined ? (
                        `$${formatUsd(c!.priceUsd).replace('$', '')}`
                      ) : (
                        '—'
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isNXR ? 'Simulation' : c!.volume24hUsd !== null && c!.volume24hUsd !== undefined ? `Vol: $${(c!.volume24hUsd / 1e6).toFixed(1)}M` : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. PLATFORM FEATURES */}
      <section className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181B26] border border-[#D4AF37]/30 text-xs text-[#ECC86A] font-mono">
            ENGINEERING PRINCIPLES
          </div>
          <h2 className="font-cinzel text-3xl sm:text-4xl font-bold text-white">
            Architecture Designed for Transparent Fintech Simulation
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            NEXORA COIN combines server-timestamp verification with institutional fintech patterns, real-time public market feeds, and database security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-[#0D0F18] border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#ECC86A]">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-white">Server-Validated 24h Mining</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Virtual rewards accumulate linearly at 0.00001 NXR per hour, capped at 0.00024 NXR every 24 hours. Zero CPU/GPU wear, zero hardware battery drain.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('mining')}
                className="text-xs text-[#ECC86A] font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Launch Mining Engine</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-[#0D0F18] border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#ECC86A]">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-white">10-Table PostgreSQL Architecture</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Complete relational architecture with atomic internal transfers, foreign keys, cascade safety, anti-negative check constraints, and immutable audit logs.
            </p>
            <div className="pt-2">
              <button
                onClick={onOpenDbModal}
                className="text-xs text-[#ECC86A] font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Inspect DDL Schema Script</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-[#0D0F18] border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#ECC86A]">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-white">Zero Fake Data Policy</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              New accounts start strictly at 0.00000 NXR. No fabricated transactions or inflated prices. Public cryptocurrencies use real CoinGecko data.
            </p>
            <div className="pt-2">
              <span className="text-xs text-emerald-400 font-mono">100% Tested with Node:test</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS 4-STEP TIMELINE */}
      <section className="py-16 bg-[#090A11] border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="font-cinzel text-3xl font-bold text-white">How the Platform Operates</h2>
            <p className="text-xs text-slate-400">Four straightforward steps from registration to virtual reward accumulation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {[
              {
                step: '01',
                title: 'Register Node',
                desc: 'Create an account starting with exactly 0.00000 NXR virtual balance and a unique virtual address.',
              },
              {
                step: '02',
                title: 'Start 24h Cycle',
                desc: 'Activate the mining engine to accumulate 0.00001 NXR per hour with server-validated timestamps.',
              },
              {
                step: '03',
                title: 'Claim Rewards',
                desc: 'Claim up to 0.00024 NXR per 24-hour cycle directly into your internal virtual ledger.',
              },
              {
                step: '04',
                title: 'Internal Transfers',
                desc: 'Send virtual NXR between registered accounts with 5-decimal precision and atomic verification.',
              },
            ].map(item => (
              <div
                key={item.step}
                className="p-5 rounded-2xl bg-[#0D0F18] border border-slate-800 relative hover:border-[#D4AF37]/40 transition-colors"
              >
                <div className="font-cinzel text-3xl font-extrabold text-[#D4AF37]/30 mb-2">
                  {item.step}
                </div>
                <h3 className="font-cinzel text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 space-y-2">
          <h2 className="font-cinzel text-3xl font-bold text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-400">Clear facts regarding our virtual simulation environment and platform architecture.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-[#0C0E16] border border-[#D4AF37]/20 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-medium text-sm text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="pr-4">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#ECC86A] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. CALL TO ACTION BAR */}
      <section className="py-12 bg-gradient-to-b from-[#0B0D15] to-[#07080B] border-t border-[#D4AF37]/20">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="font-cinzel text-3xl sm:text-4xl font-extrabold text-white">
            Ready to <span className="gold-gradient-text">Mine The Future</span>?
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Experience our simulated cryptocurrency ecosystem today. Launch your 24-hour mining cycle, view real market data, and test internal transfers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setActiveTab('mining')}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-bold text-sm shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-[1.02] transition-transform cursor-pointer"
            >
              Start 24-Hour Mining Engine
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-6 py-3.5 rounded-xl bg-[#12141D] text-white border border-slate-700 hover:border-[#D4AF37]/50 text-sm font-semibold transition-colors cursor-pointer"
            >
              Open Dashboard
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
