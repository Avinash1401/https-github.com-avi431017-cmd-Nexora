import React from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Pickaxe, TrendingUp, Wallet, Layers, User } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, miningSession } = useApp();

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'mining',
      label: 'Mine',
      icon: Pickaxe,
      badge: miningSession.isActive ? '●' : undefined,
    },
    { id: 'transactions', label: 'Ledger', icon: Layers },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0B11]/95 border-t border-[#D4AF37]/25 backdrop-blur-lg px-2 py-1.5 flex items-center justify-around safe-area-bottom"
      aria-label="Mobile Bottom Navigation"
    >
      {items.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
              isActive
                ? 'text-[#FFF3D6]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#ECC86A]' : 'text-slate-400'}`} />
              {item.badge && (
                <span className="absolute -top-1 -right-1.5 text-emerald-400 text-[10px] font-bold">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-[#ECC86A] font-semibold' : ''}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
