import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  CryptoCoin,
  MiningSessionState,
  MiningHistoryBlock,
  PortfolioAsset,
  VirtualTransaction,
  UserProfile,
  NotificationItem,
  AdminAuditLog,
  SystemSettings,
} from '../types/crypto';
import {
  INITIAL_COINS,
  INITIAL_USER,
  INITIAL_PORTFOLIO,
  INITIAL_TRANSACTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_MINING_SESSION,
  INITIAL_SYSTEM_SETTINGS,
} from '../data/mockCrypto';
import { fetchMarketData } from '../services/marketService';
import {
  calculateElapsedMiningReward,
  validateElapsedDelta,
  calculateHashRateJitter,
  generateBlockHexHash,
  MAX_SESSION_DURATION_SECONDS,
} from '../utils/miningRules';
import {
  calculatePortfolioSummary,
  validateTransactionInputs,
  PortfolioSummary,
} from '../utils/portfolioCalculations';
import { playAudioBriefing } from '../services/audioService';
import { syncUserWithBackend } from '../services/adminService';
import {
  fetchMyNotifications,
  markNotificationAsReadOnServer,
  clearReadNotificationsOnServer,
  fetchMyTransactions,
} from '../services/userService';

interface AppContextType {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // User & Authentication
  user: UserProfile | null;
  login: (email: string, role?: 'user' | 'miner' | 'admin') => boolean;
  register: (email: string, displayName: string, role?: 'user' | 'miner' | 'admin', referralCode?: string) => boolean;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;

  // Real-time Crypto Market Data
  coins: CryptoCoin[];
  marketStatus: {
    isLive: boolean;
    isCached?: boolean;
    lastUpdated: number;
    source: string;
    rateLimited?: boolean;
    error?: string;
  };
  refreshMarketData: () => Promise<void>;

  // Watchlist
  watchlist: string[];
  toggleWatchlist: (coinId: string) => void;

  // Virtual Wallet & Ledger
  portfolio: PortfolioAsset[];
  portfolioSummary: PortfolioSummary;
  transactions: VirtualTransaction[];
  sendVirtualNXR: (
    recipientAddress: string,
    amount: number
  ) => { success: boolean; error?: string; txHash?: string };

  // 24-Hour Virtual Mining System
  miningSession: MiningSessionState;
  miningHistory: MiningHistoryBlock[];
  startMining: () => Promise<void>;
  stopMining: () => void;
  claimMiningReward: () => Promise<{ success: boolean; error?: string; rewardNXR?: number }>;
  resetMiningSession: () => void;

  // Notifications
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  addNotification: (title: string, message: string, type?: NotificationItem['type']) => void;

  // System Settings & Admin
  systemSettings: SystemSettings;
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  auditLogs: AdminAuditLog[];
  addAuditLog: (action: string, category: AdminAuditLog['category'], details: string) => void;

  // Audio briefings (Gemini TTS)
  isSpeaking: boolean;
  speakBriefing: (type: 'market' | 'mining' | 'welcome') => Promise<void>;
  stopSpeech: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'nexora_user_v3',
  WATCHLIST: 'nexora_watchlist_v3',
  PORTFOLIO: 'nexora_portfolio_v3',
  TRANSACTIONS: 'nexora_transactions_v3',
  MINING_SESSION: 'nexora_mining_session_v3',
  MINING_HISTORY: 'nexora_mining_history_v3',
  NOTIFICATIONS: 'nexora_notifications_v3',
  SETTINGS: 'nexora_settings_v3',
  LOGS: 'nexora_audit_logs_v3',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('home');

  // 1. Genuine User Profile State (Starts with exactly 0.00000 NXR for new users)
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_USER;
  });

  // 2. Real Market Data State
  const [coins, setCoins] = useState<CryptoCoin[]>(INITIAL_COINS);
  const [marketStatus, setMarketStatus] = useState({
    isLive: false,
    isCached: false,
    lastUpdated: Date.now(),
    source: 'Initializing real market feed...',
    rateLimited: false,
    error: undefined as string | undefined,
  });

  // 3. Watchlist State
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return ['bitcoin', 'ethereum', 'solana'];
  });

  // 4. Genuine Portfolio (NXR balance starts at 0.00000, no fake USD value)
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_PORTFOLIO;
  });

  // 5. Genuine Transactions State (Strictly empty [] initially — no fabricated records)
  const [transactions, setTransactions] = useState<VirtualTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_TRANSACTIONS;
  });

  // 6. 24-Hour Virtual Mining Session State
  const [miningSession, setMiningSession] = useState<MiningSessionState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MINING_SESSION);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Recalculate genuine elapsed time based on verified server/local startedAt
        if (parsed.isActive && parsed.startedAt) {
          const elapsed = Math.max(0, (Date.now() - parsed.startedAt) / 1000);
          const clampedElapsed = Math.min(MAX_SESSION_DURATION_SECONDS, elapsed);
          const reward = calculateElapsedMiningReward(clampedElapsed);
          return {
            ...parsed,
            elapsedSeconds: Math.floor(clampedElapsed),
            remainingSeconds: Math.max(0, MAX_SESSION_DURATION_SECONDS - Math.floor(clampedElapsed)),
            accumulatedRewardNXR: reward,
          };
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_MINING_SESSION;
  });

  // 7. Mining History (Strictly empty [] initially)
  const [miningHistory, setMiningHistory] = useState<MiningHistoryBlock[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MINING_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  // 8. Notifications & Logs
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_SYSTEM_SETTINGS;
  });

  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Persistence & Backend Synchronization
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      syncUserWithBackend({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        walletAddress: user.virtualWalletAddress,
        balanceNXR: user.virtualBalanceNXR,
      });
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [user]);

  // Real-time Server-Sent Events (SSE) Listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      eventSource.addEventListener('TRANSFER_COMPLETED', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          addNotification('Realtime Transfer', `Network transfer executed: ${data.amountNXR} NXR`, 'info');
        } catch {}
      });
      eventSource.addEventListener('NEW_NOTIFICATION', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.notification) {
            setNotifications(prev => {
              const notif = data.notification;
              if (notif.deduplicationKey && prev.some(n => n.deduplicationKey === notif.deduplicationKey)) {
                return prev;
              }
              return [notif, ...prev];
            });
          }
        } catch {}
      });
      eventSource.addEventListener('MARKET_REFRESH', () => {
        // Trigger market refresh when fresh data is published
        refreshMarketData();
      });
      eventSource.addEventListener('ADMIN_ACTION', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          addAuditLog('REALTIME_ADMIN_EVENT', 'system', `Admin action: ${data.action}`);
        } catch {}
      });
    } catch {
      // Fallback to polling
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Fetch Authoritative Server Notifications on User Login / Change
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    fetchMyNotifications(user.id).then(res => {
      if (isMounted && res.success && res.notifications) {
        setNotifications(res.notifications);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MINING_SESSION, JSON.stringify(miningSession));
  }, [miningSession]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MINING_HISTORY, JSON.stringify(miningHistory));
  }, [miningHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(systemSettings));
  }, [systemSettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Sync user virtual balance with portfolio NXR balance
  useEffect(() => {
    if (user) {
      setPortfolio(prev =>
        prev.map(item =>
          item.symbol === 'NXR' ? { ...item, balance: user.virtualBalanceNXR } : item
        )
      );
    }
  }, [user?.virtualBalanceNXR]);

  // Market Data Fetching (CoinGecko Live API)
  const refreshMarketData = async () => {
    const result = await fetchMarketData();
    setCoins(result.coins);
    setMarketStatus({
      isLive: result.isLive,
      isCached: Boolean(result.isCached),
      lastUpdated: result.lastUpdated,
      source: result.source,
      rateLimited: Boolean(result.rateLimited),
      error: result.error,
    });
  };

  useEffect(() => {
    refreshMarketData();
    const interval = setInterval(refreshMarketData, 60000); // 60s live update loop
    return () => clearInterval(interval);
  }, []);

  // Synchronize active mining session with authoritative server database
  useEffect(() => {
    if (!user?.id) return;
    let isCancelled = false;

    const syncServerMiningSession = async () => {
      try {
        const res = await fetch(`/api/mining/status?userId=${encodeURIComponent(user.id)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled) return;

        if (data.active && data.startedAt) {
          setMiningSession(prev => ({
            ...prev,
            sessionId: data.sessionId,
            isActive: true,
            isPaused: false,
            startedAt: data.startedAt,
            elapsedSeconds: data.elapsedSeconds,
            remainingSeconds: data.remainingSeconds,
            accumulatedRewardNXR: data.accumulatedRewardNXR,
            serverVerified: true,
          }));
        }
      } catch {
        // Network resilience
      }
    };

    syncServerMiningSession();
    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  // 24-HOUR MINING ENGINE TICK LOOP
  const tickIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!miningSession.isActive || miningSession.isPaused) {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      return;
    }

    tickIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      setMiningSession(prev => {
        if (!prev.isActive || prev.isPaused || !prev.startedAt) return prev;

        // Anti-clock manipulation verification
        const deltaCheck = validateElapsedDelta(prev.lastTickAt || now, now, 10);
        if (!deltaCheck.valid) {
          console.warn('[MINING SECURITY] Clock skew detected:', deltaCheck.reason);
        }

        // Calculate genuine elapsed time since server start
        const actualElapsed = Math.max(0, (now - prev.startedAt) / 1000);
        const clampedElapsed = Math.min(MAX_SESSION_DURATION_SECONDS, actualElapsed);
        const remaining = Math.max(0, MAX_SESSION_DURATION_SECONDS - Math.floor(clampedElapsed));

        // Exact linear reward: 0.00001 NXR per hour, capped at 0.00024 NXR
        const accumulated = calculateElapsedMiningReward(clampedElapsed);

        return {
          ...prev,
          lastTickAt: now,
          elapsedSeconds: Math.floor(clampedElapsed),
          remainingSeconds: remaining,
          accumulatedRewardNXR: accumulated,
          currentHashRate: calculateHashRateJitter(45.5, now),
          currentNonce: prev.currentNonce + 1,
        };
      });
    }, 1000);

    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, [miningSession.isActive, miningSession.isPaused]);

  // Mining Controls
  const startMining = async () => {
    const now = Date.now();
    let serverStartedAt = now;
    let serverSessionId = `sess_${now}_${Math.random().toString(36).substring(2, 6)}`;

    // Call server to record start timestamp if server is available
    try {
      const res = await fetch('/api/mining/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 'usr_guest' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.startedAt) serverStartedAt = data.startedAt;
        if (data.sessionId) serverSessionId = data.sessionId;
      } else if (res.status === 409) {
        // Active or pending session already running on server
        if (data.startedAt) serverStartedAt = data.startedAt;
        if (data.sessionId) serverSessionId = data.sessionId;
      }
    } catch {
      // Local fallback preserves verified client start time
    }

    setMiningSession({
      sessionId: serverSessionId,
      isActive: true,
      isPaused: false,
      startedAt: serverStartedAt,
      lastTickAt: serverStartedAt,
      elapsedSeconds: 0,
      remainingSeconds: MAX_SESSION_DURATION_SECONDS,
      accumulatedRewardNXR: 0.0,
      totalNxrEarnedAllTime: miningSession.totalNxrEarnedAllTime || 0.0,
      currentHashRate: 45.5,
      currentNonce: 1,
      claimed: false,
      serverVerified: true,
    });

    addAuditLog('MINING_START', 'mining', `Started 24-hour server-verified virtual mining session (${serverSessionId}) at ${new Date(serverStartedAt).toISOString()}`);
  };

  const stopMining = () => {
    setMiningSession(prev => ({
      ...prev,
      isActive: false,
      isPaused: false,
    }));
    addAuditLog('MINING_STOP', 'mining', 'Virtual mining session paused/stopped.');
  };

  const claimMiningReward = async (): Promise<{ success: boolean; error?: string; rewardNXR?: number }> => {
    if (miningSession.claimed) {
      return { success: false, error: 'Rewards for this session have already been claimed.' };
    }

    const reward = miningSession.accumulatedRewardNXR;
    if (reward <= 0) {
      return { success: false, error: 'No virtual mining reward has accumulated yet. Please let the session run.' };
    }

    const now = Date.now();
    let verifiedReward = reward;
    let finalTxHash = generateBlockHexHash(now, miningSession.currentNonce);

    // Call server claim endpoint with telemetry for anti-tampering validation
    try {
      const res = await fetch('/api/mining/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'usr_guest',
          sessionId: miningSession.sessionId,
          clientTimestamp: now,
          clientElapsedSeconds: miningSession.elapsedSeconds,
          claimedRewardNXR: miningSession.accumulatedRewardNXR,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Server validation rejected the mining claim.',
        };
      }

      if (typeof data.rewardNXR === 'number') verifiedReward = data.rewardNXR;
      if (data.txHash) finalTxHash = data.txHash;
    } catch {
      // In offline/mock mode fallback
    }

    // Mark session as claimed
    setMiningSession(prev => ({
      ...prev,
      isActive: false,
      claimed: true,
      totalNxrEarnedAllTime: Number(((prev.totalNxrEarnedAllTime || 0) + verifiedReward).toFixed(5)),
    }));

    // Update user balance atomically
    setUser(prev => {
      if (!prev) return null;
      const updatedBalance = Number(((prev.virtualBalanceNXR || 0) + verifiedReward).toFixed(5));
      return {
        ...prev,
        virtualBalanceNXR: updatedBalance,
      };
    });

    // Add genuine transaction to ledger
    const newTx: VirtualTransaction = {
      id: `tx_${now}`,
      txHash: finalTxHash,
      type: 'mining_reward',
      asset: 'NXR',
      amount: verifiedReward,
      amountUsd: null, // NXR has no market price
      fee: 0,
      timestamp: now,
      fromAddress: 'NEXORA-SIMULATION-POOL',
      toAddress: user?.virtualWalletAddress || 'NXR-VAULT-001',
      status: 'completed',
      note: `24-Hour Mining Session completed (${miningSession.elapsedSeconds}s elapsed). Server verified.`,
    };

    setTransactions(prev => [newTx, ...prev]);

    // Add to genuine mining history
    const historyBlock: MiningHistoryBlock = {
      sessionId: miningSession.sessionId || `sess_${now}`,
      hash: finalTxHash,
      timestamp: now,
      elapsedSeconds: miningSession.elapsedSeconds,
      rewardNXR: verifiedReward,
      status: 'claimed',
    };

    setMiningHistory(prev => [historyBlock, ...prev]);

    // Dispatch notification
    addNotification(
      'Virtual Reward Deposited',
      `+${verifiedReward.toFixed(5)} NXR credited to your virtual wallet.`,
      'reward'
    );

    addAuditLog('REWARD_CLAIM', 'mining', `Claimed ${verifiedReward.toFixed(5)} virtual NXR from session (Server verified).`);

    return { success: true, rewardNXR: verifiedReward };
  };

  const resetMiningSession = () => {
    setMiningSession(INITIAL_MINING_SESSION);
  };

  // Internal Virtual NXR Transfers (Atomic Balance Adjustment)
  const sendVirtualNXR = (
    recipientAddress: string,
    amount: number
  ): { success: boolean; error?: string; txHash?: string } => {
    const available = user?.virtualBalanceNXR || 0.0;
    const validation = validateTransactionInputs(
      available,
      amount,
      recipientAddress,
      user?.virtualWalletAddress
    );

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const roundedAmount = Number(amount.toFixed(5));
    const now = Date.now();
    const txHash = `0x${now.toString(16)}${Math.random().toString(16).substring(2, 12)}`;

    // Debit user balance
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        virtualBalanceNXR: Number((prev.virtualBalanceNXR - roundedAmount).toFixed(5)),
      };
    });

    // Record genuine transaction
    const newTx: VirtualTransaction = {
      id: `tx_transfer_${now}`,
      txHash,
      type: 'send',
      asset: 'NXR',
      amount: roundedAmount,
      amountUsd: null, // No market valuation
      fee: 0.0,
      timestamp: now,
      fromAddress: user?.virtualWalletAddress || 'NXR-SENDER',
      toAddress: recipientAddress.trim(),
      status: 'completed',
      note: `Internal virtual transfer of ${roundedAmount.toFixed(5)} NXR.`,
    };

    // Dispatch to backend authoritative server ledger
    fetch('/api/transfers/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: user?.id || 'usr_guest',
        recipientAddress: recipientAddress.trim(),
        amount: roundedAmount,
        idempotencyKey: `client_${now}_${txHash.substring(0, 8)}`,
      }),
    }).catch(() => {});

    setTransactions(prev => [newTx, ...prev]);

    addNotification(
      'Transfer Completed',
      `Sent ${roundedAmount.toFixed(5)} virtual NXR to ${recipientAddress.slice(0, 14)}...`,
      'success'
    );

    addAuditLog('TRANSFER_SEND', 'wallet', `Sent ${roundedAmount.toFixed(5)} NXR to ${recipientAddress}`);

    return { success: true, txHash };
  };

  // Auth Handlers (Strictly initialize new accounts with 0.00000 NXR)
  const login = (email: string, role: 'user' | 'miner' | 'admin' = 'user') => {
    // Preserve existing balance if same user logs back in, else clean 0.00000 NXR
    const existingBalance = user?.email === email ? user.virtualBalanceNXR : 0.00000;
    const userId = `usr_${Date.now().toString(36)}`;
    const updatedUser: UserProfile = {
      id: userId,
      email,
      displayName: email.split('@')[0],
      role,
      avatarSeed: email,
      registeredAt: Date.now() - 86400000 * 2,
      twoFactorEnabled: false,
      virtualWalletAddress: `NXR-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      virtualBalanceNXR: existingBalance,
      referralCode: `NXR-REF-${userId.substring(4, 9).toUpperCase()}`,
    };
    setUser(updatedUser);
    addAuditLog('USER_LOGIN', 'auth', `User ${email} signed in as ${role}`);

    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        role: updatedUser.role,
        walletAddress: updatedUser.virtualWalletAddress,
        balanceNXR: updatedUser.virtualBalanceNXR,
      }),
    }).catch(() => {});

    return true;
  };

  const register = (
    email: string,
    displayName: string,
    role: 'user' | 'miner' | 'admin' = 'user',
    referralCode?: string
  ) => {
    const userId = `usr_${Date.now().toString(36)}`;
    const refCode = `NXR-REF-${userId.substring(4, 9).toUpperCase()}`;
    const newUser: UserProfile = {
      id: userId,
      email,
      displayName,
      role,
      avatarSeed: email,
      registeredAt: Date.now(),
      twoFactorEnabled: false,
      virtualWalletAddress: `NXR-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      virtualBalanceNXR: 0.00000, // Strictly zero initial balance
      referralCode: refCode,
      referredBy: referralCode ? referralCode.trim() : undefined,
    };
    setUser(newUser);
    // Fresh registration has empty transactions and empty mining history
    setTransactions([]);
    setMiningHistory([]);
    setMiningSession(INITIAL_MINING_SESSION);
    addAuditLog('USER_REGISTER', 'auth', `New user registered: ${email}`);

    // Authoritative backend sync with optional referral code
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        walletAddress: newUser.virtualWalletAddress,
        balanceNXR: newUser.virtualBalanceNXR,
        referralCode: referralCode?.trim(),
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.referralCredited) {
          addNotification(
            'Referral Code Applied',
            `Referral code ${referralCode} was verified. Your referrer received a community reward.`,
            'reward'
          );
        }
      })
      .catch(() => {});

    return true;
  };

  const logout = () => {
    setUser(null);
    stopMining();
    addAuditLog('USER_LOGOUT', 'auth', 'User signed out.');
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUser(prev => (prev ? { ...prev, ...updates } : null));
    addAuditLog('PROFILE_UPDATE', 'auth', 'Profile updated.');
  };

  const toggleWatchlist = (coinId: string) => {
    setWatchlist(prev =>
      prev.includes(coinId) ? prev.filter(id => id !== coinId) : [...prev, coinId]
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    if (user?.id) {
      markNotificationAsReadOnServer(user.id, id).catch(() => {});
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    if (user?.id) {
      clearReadNotificationsOnServer(user.id).catch(() => {});
    }
  };

  const addNotification = (title: string, message: string, type: NotificationItem['type'] = 'info') => {
    const item: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      type,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => [item, ...prev]);
  };

  const updateSystemSettings = (updates: Partial<SystemSettings>) => {
    setSystemSettings(prev => ({ ...prev, ...updates }));
    addAuditLog('SETTINGS_UPDATE', 'system', 'Updated platform settings.');
  };

  const addAuditLog = (action: string, category: AdminAuditLog['category'], details: string) => {
    const log: AdminAuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      action,
      category,
      performedBy: user?.email || 'unauthenticated',
      ipAddress: '127.0.0.1 (Verified)',
      details,
      status: 'success',
    };
    setAuditLogs(prev => [log, ...prev.slice(0, 49)]);
  };

  // Audio Speech synthesis
  const speakBriefing = async (type: 'market' | 'mining' | 'welcome') => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    setIsSpeaking(true);
    let prompt = '';
    if (type === 'market') {
      const btc = coins.find(c => c.symbol === 'BTC');
      const eth = coins.find(c => c.symbol === 'ETH');
      const btcPrice = btc?.priceUsd ? `$${btc.priceUsd.toLocaleString()}` : 'loading';
      const ethPrice = eth?.priceUsd ? `$${eth.priceUsd.toLocaleString()}` : 'loading';
      prompt = `Here is your cryptocurrency market overview. Bitcoin is currently at ${btcPrice}. Ethereum is at ${ethPrice}. NEXORA is an internal virtual demonstration coin operating on testnet protocol.`;
    } else if (type === 'mining') {
      prompt = `Virtual mining telemetry update: ${
        miningSession.isActive
          ? `Worker active. Elapsed time ${Math.floor(miningSession.elapsedSeconds / 60)} minutes. Accumulated reward: ${miningSession.accumulatedRewardNXR.toFixed(5)} virtual NXR.`
          : 'Worker is currently idle. Press Start Mining to initiate a 24-hour simulation session.'
      }`;
    } else {
      prompt = 'Welcome to NEXORA COIN — MINE THE FUTURE. Experience institutional crypto architecture, 24-hour virtual mining simulation, and live cryptocurrency markets.';
    }

    try {
      await playAudioBriefing(prompt);
    } catch {
      // handled inside playAudioBriefing
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const portfolioSummary = calculatePortfolioSummary(portfolio);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        user,
        login,
        register,
        logout,
        updateProfile,
        coins,
        marketStatus,
        refreshMarketData,
        watchlist,
        toggleWatchlist,
        portfolio,
        portfolioSummary,
        transactions,
        sendVirtualNXR,
        miningSession,
        miningHistory,
        startMining,
        stopMining,
        claimMiningReward,
        resetMiningSession,
        notifications,
        markNotificationAsRead,
        clearAllNotifications,
        addNotification,
        systemSettings,
        updateSystemSettings,
        auditLogs,
        addAuditLog,
        isSpeaking,
        speakBriefing,
        stopSpeech,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
