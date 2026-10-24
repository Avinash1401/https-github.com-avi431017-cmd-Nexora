import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Database, Terminal, Cpu, ArrowUpRight } from 'lucide-react';
import { NexoraLogo } from '../NexoraLogo';

interface FooterProps {
  onOpenDbModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenDbModal }) => {
  const { setActiveTab } = useApp();

  return (
    <footer className="w-full border-t border-[#D4AF37]/20 bg-[#06070B] text-slate-400 text-xs py-12 px-4 sm:px-6 lg:px-8 mb-16 lg:mb-0">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Mission */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center">
              <NexoraLogo size="sm" showText={true} showTagline={false} interactive={false} />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              MINE THE FUTURE. A next-generation virtual mining simulation and institutional crypto platform prototype engineered for high-availability fintech architectures.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#ECC86A] font-mono">
              <Cpu className="w-3.5 h-3.5" />
              <span>Three.js PBR • Gemini TTS • PostgreSQL Ready</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3 font-cinzel">
              Platform Features
            </h4>
            <ul className="space-y-2 text-[12px]">
              <li>
                <button
                  onClick={() => setActiveTab('mining')}
                  className="hover:text-[#F3E5AB] transition-colors flex items-center gap-1"
                >
                  <span>Simulated Mining Engine</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('market')}
                  className="hover:text-[#F3E5AB] transition-colors flex items-center gap-1"
                >
                  <span>Live & Fallback Market Data</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className="hover:text-[#F3E5AB] transition-colors flex items-center gap-1"
                >
                  <span>Virtual Asset Allocations</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className="hover:text-[#F3E5AB] transition-colors flex items-center gap-1"
                >
                  <span>Demo Wallet Transfers</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </button>
              </li>
            </ul>
          </div>

          {/* Architecture & Engineering */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3 font-cinzel">
              Engineering & Stack
            </h4>
            <ul className="space-y-2 text-[12px]">
              <li>
                <button
                  onClick={onOpenDbModal}
                  className="hover:text-[#F3E5AB] transition-colors flex items-center gap-1"
                >
                  <Database className="w-3 h-3 text-[#ECC86A]" />
                  <span>10-Table PostgreSQL Schema</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('admin')}
                  className="hover:text-[#F3E5AB] transition-colors flex items-center gap-1"
                >
                  <Terminal className="w-3 h-3 text-[#ECC86A]" />
                  <span>Role-Based Admin Console</span>
                </button>
              </li>
              <li>
                <span className="text-slate-400">Anti-Clock Manipulation Engine</span>
              </li>
              <li>
                <span className="text-slate-400">Node.js Built-in Test Suite</span>
              </li>
            </ul>
          </div>

          {/* Compliance & Disclaimers */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3 font-cinzel">
              Transparency & Notice
            </h4>
            <div className="p-3 rounded-xl bg-[#0D0F16] border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Simulation Only</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                All coins (NXR), virtual balances, blocks, transactions, and mining yields are simulated testbed assets for interface and architectural demonstration. No real cryptocurrency mining or fiat transfers take place.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright & status */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© 2026 NEXORA COIN. All Rights Reserved. Engineered with luxury fintech precision.</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Simulation Testnet v4.2 Online
            </span>
            <span>•</span>
            <span className="text-slate-400 font-mono">React 19 / Vite / Tailwind</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
