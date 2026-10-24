import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { DatabaseSchemaModal } from './components/DatabaseSchemaModal';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { MiningPage } from './pages/MiningPage';
import { MarketPage } from './pages/MarketPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { WalletPage } from './pages/WalletPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Ultra-mode requirement: support ?autostart=1 to skip straight to the main dashboard
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        setActiveTab('dashboard');
      }
    }
  }, [setActiveTab]);

  return (
    <div className="min-h-screen flex flex-col bg-[#07080B] text-slate-100 selection:bg-[#D4AF37]/30 selection:text-[#F3E5AB]">
      {/* Top Navigation */}
      <Navbar onOpenDbModal={() => setIsDbModalOpen(true)} />

      {/* Main View Area */}
      <main className="flex-1 pb-16 lg:pb-0" id="main-content">
        {activeTab === 'home' && <LandingPage onOpenDbModal={() => setIsDbModalOpen(true)} />}
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'mining' && <MiningPage />}
        {activeTab === 'market' && <MarketPage />}
        {activeTab === 'portfolio' && <PortfolioPage />}
        {activeTab === 'wallet' && <WalletPage />}
        {activeTab === 'watchlist' && <WatchlistPage />}
        {activeTab === 'admin' && <AdminPage onOpenDbModal={() => setIsDbModalOpen(true)} />}
        {activeTab === 'auth' && <AuthPage />}
      </main>

      {/* Global PostgreSQL Schema Viewer Modal */}
      <DatabaseSchemaModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />

      {/* Mobile Fixed Bottom Navigation */}
      <MobileBottomNav />

      {/* Global Footer */}
      <Footer onOpenDbModal={() => setIsDbModalOpen(true)} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
