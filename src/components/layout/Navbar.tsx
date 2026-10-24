import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Pickaxe,
  TrendingUp,
  PieChart,
  Wallet,
  Star,
  Shield,
  LayoutDashboard,
  Volume2,
  VolumeX,
  Bell,
  Database,
  Menu,
  X,
  ChevronRight,
  User,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { NexoraLogo } from '../NexoraLogo';

interface NavbarProps {
  onOpenDbModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDbModal }) => {
  const {
    activeTab,
    setActiveTab,
    user,
    logout,
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    isSpeaking,
    speakBriefing,
    stopSpeech,
    miningSession,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { id: 'home', label: 'Home', icon: Sparkles },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'mining',
      label: 'Mine NXR',
      icon: Pickaxe,
      badge: miningSession.isActive ? 'Active' : undefined,
    },
    { id: 'market', label: 'Markets', icon: TrendingUp },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'watchlist', label: 'Watchlist', icon: Star },
    { id: 'admin', label: 'Admin', icon: Shield, badge: 'Prototype' },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#D4AF37]/20 bg-[#07080B]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo and Brand */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center cursor-pointer select-none"
          >
            <NexoraLogo
              size="md"
              showText={true}
              showTagline={true}
              showBadge={true}
              badgeText="Testnet"
              animated={true}
              interactive={true}
            />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-[#FFF3D6] bg-[#181B28] border border-[#D4AF37]/45 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#ECC86A]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono uppercase ${
                        item.badge === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#231E12] text-[#ECC86A] border border-[#D4AF37]/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls: TTS Audio Briefing, DB Schema, Notifications, User */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Market Briefing Button (Gemini TTS) */}
            <button
              onClick={() => {
                if (isSpeaking) {
                  stopSpeech();
                } else {
                  speakBriefing('market');
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isSpeaking
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 animate-pulse'
                  : 'bg-[#12141D] text-[#ECC86A] border-[#D4AF37]/30 hover:border-[#D4AF37]/60 hover:bg-[#1A1D2B]'
              }`}
              title={isSpeaking ? 'Stop Audio Briefing' : 'Listen to Market Briefing via Gemini TTS'}
              aria-label="Audio Briefing"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mute Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Audio Briefing</span>
                </>
              )}
            </button>

            {/* PostgreSQL Architecture Modal Trigger */}
            <button
              onClick={onOpenDbModal}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#12141D] text-slate-300 border border-slate-700 hover:border-[#D4AF37]/40 hover:text-white transition-all"
              title="View 10-table PostgreSQL Schema"
            >
              <Database className="w-3.5 h-3.5 text-[#ECC86A]" />
              <span className="hidden xl:inline">DB Schema</span>
            </button>

            {/* Notification Center */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded-lg bg-[#12141D] border border-slate-700 hover:border-[#D4AF37]/40 text-slate-300 hover:text-white transition-all"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D4AF37] text-black text-[10px] font-bold flex items-center justify-center font-mono">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0E1018] border border-[#D4AF37]/35 rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#ECC86A]" />
                      <span className="text-xs font-semibold text-white">Platform Notifications</span>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No notifications to display.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-3 text-xs cursor-pointer hover:bg-white/5 transition-colors ${
                            n.read ? 'opacity-60' : 'bg-[#D4AF37]/5'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white">{n.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(n.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Auth Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-[#12141D] border border-slate-700 hover:border-[#D4AF37]/40 text-slate-200 transition-all"
                aria-label="User Profile"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8C6D23] flex items-center justify-center text-black font-bold text-xs">
                  {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-slate-200 max-w-[100px] truncate">
                  {user?.displayName || 'Sign In'}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#0E1018] border border-[#D4AF37]/35 rounded-xl shadow-2xl p-3 z-50 animate-fadeIn">
                  {user ? (
                    <>
                      <div className="pb-3 border-b border-slate-800">
                        <p className="text-xs font-semibold text-white">{user.displayName}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181B26] text-[#ECC86A] border border-[#D4AF37]/30 uppercase">
                            Role: {user.role}
                          </span>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                            ● Demo Mode
                          </span>
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        <button
                          onClick={() => {
                            setActiveTab('admin');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-[#ECC86A]" />
                            <span>Admin Console</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('wallet');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5 text-[#ECC86A]" />
                            <span>Virtual Wallet</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-800">
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                            setActiveTab('auth');
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Switch / Logout Account</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-2 space-y-2">
                      <p className="text-xs text-slate-300">Access full mining and virtual wallet tools</p>
                      <button
                        onClick={() => {
                          setActiveTab('auth');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-semibold text-xs text-center shadow"
                      >
                        Sign In / Register
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-[#12141D] border border-slate-700 text-slate-300 hover:text-white"
              aria-label="Open Mobile Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-[#0B0D14] px-4 pt-3 pb-6 space-y-1 animate-fadeIn">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#181B28] text-[#FFF3D6] border border-[#D4AF37]/40'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#ECC86A]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[#1E2332] text-[#ECC86A] border border-[#D4AF37]/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-800/80 flex flex-col gap-2">
            <button
              onClick={() => {
                onOpenDbModal();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 bg-[#12141D] rounded-lg border border-slate-700"
            >
              <Database className="w-4 h-4 text-[#ECC86A]" />
              <span>Inspect PostgreSQL Database Architecture</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
