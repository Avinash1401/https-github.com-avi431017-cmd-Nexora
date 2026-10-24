import {
  CryptoCoin,
  PortfolioAsset,
  UserProfile,
  VirtualTransaction,
  NotificationItem,
  AdminAuditLog,
  SystemSettings,
  MiningSessionState,
} from '../types/crypto';

/**
 * INITIAL SUPPORTED COINS
 * NXR is an internal virtual demonstration asset with NO established market price.
 * External crypto assets (BTC, ETH, SOL, XRP, etc.) populate from real live CoinGecko API responses.
 */
export const INITIAL_COINS: CryptoCoin[] = [
  {
    id: 'nexora',
    symbol: 'NXR',
    name: 'NEXORA COIN',
    priceUsd: null, // Strictly null: no fabricated market price
    change24h: null,
    marketCapUsd: null,
    volume24hUsd: null,
    high24h: null,
    low24h: null,
    circulatingSupply: null,
    sparkline: [],
    icon: '✨',
    isNexora: true,
    statusNotice: 'Internal Virtual Coin • No established market price',
  },
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    priceUsd: null, // Populated via live CoinGecko API
    change24h: null,
    marketCapUsd: null,
    volume24hUsd: null,
    sparkline: [],
    icon: '₿',
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    priceUsd: null,
    change24h: null,
    marketCapUsd: null,
    volume24hUsd: null,
    sparkline: [],
    icon: 'Ξ',
  },
  {
    id: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    priceUsd: null,
    change24h: null,
    marketCapUsd: null,
    volume24hUsd: null,
    sparkline: [],
    icon: '◎',
  },
  {
    id: 'ripple',
    symbol: 'XRP',
    name: 'XRP',
    priceUsd: null,
    change24h: null,
    marketCapUsd: null,
    volume24hUsd: null,
    sparkline: [],
    icon: '✕',
  },
  {
    id: 'cardano',
    symbol: 'ADA',
    name: 'Cardano',
    priceUsd: null,
    change24h: null,
    marketCapUsd: null,
    volume24hUsd: null,
    sparkline: [],
    icon: '₳',
  },
  {
    id: 'avalanche-2',
    symbol: 'AVAX',
    name: 'Avalanche',
    priceUsd: null,
    change24h: null,
    marketCapUsd: null,
    volume24hUsd: null,
    sparkline: [],
    icon: '▲',
  },
  {
    id: 'dogecoin',
    symbol: 'DOGE',
    name: 'Dogecoin',
    priceUsd: null,
    change24h: null,
    marketCapUsd: null,
    volume24hUsd: null,
    sparkline: [],
    icon: 'Ð',
  },
  {
    id: 'chainlink',
    symbol: 'LINK',
    name: 'Chainlink',
    priceUsd: null,
    change24h: null,
    marketCapUsd: null,
    volume24hUsd: null,
    sparkline: [],
    icon: '⬡',
  },
];

/**
 * INITIAL NEW USER PROFILE
 * New users strictly start with 0.00000 NXR.
 * No preloaded rewards, no fake transactions.
 */
export const INITIAL_USER: UserProfile = {
  id: 'usr_init_001',
  email: 'newuser@nexora.vip',
  displayName: 'Registered Node',
  role: 'user',
  avatarSeed: 'nexora_seed',
  registeredAt: Date.now(),
  twoFactorEnabled: false,
  virtualWalletAddress: 'NXR-0000-0000-0000-NEW1',
  virtualBalanceNXR: 0.00000, // Strictly 0.00000 NXR
};

/**
 * GENUINE ZERO-BALANCE PORTFOLIO
 * No fabricated balances or fake valuations.
 */
export const INITIAL_PORTFOLIO: PortfolioAsset[] = [
  {
    coinId: 'nexora',
    symbol: 'NXR',
    name: 'NEXORA COIN',
    balance: 0.00000, // Strictly 0.00000 NXR
    currentPrice: null, // No market price
    isVirtualOnly: true,
  },
];

/**
 * GENUINE ZERO TRANSACTIONS
 * Fresh accounts have no fabricated transactions.
 */
export const INITIAL_TRANSACTIONS: VirtualTransaction[] = [];

/**
 * INITIAL NOTIFICATIONS (System Transparency)
 */
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_welcome',
    title: 'Welcome to NEXORA COIN',
    message: 'Your virtual testnet account is active with 0.00000 NXR. Start a 24-hour mining session to earn verified virtual NXR.',
    type: 'info',
    timestamp: Date.now(),
    read: false,
  },
];

/**
 * INITIAL MINING SESSION STATE (Idle 24-Hour Session)
 */
export const INITIAL_MINING_SESSION: MiningSessionState = {
  isActive: false,
  isPaused: false,
  startedAt: null,
  lastTickAt: null,
  elapsedSeconds: 0,
  remainingSeconds: 24 * 3600, // 86,400s
  accumulatedRewardNXR: 0.00000,
  totalNxrEarnedAllTime: 0.00000,
  currentHashRate: 0.0,
  currentNonce: 0,
  claimed: false,
};

/**
 * SYSTEM SETTINGS
 */
export const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
  maxSessionHours: 24,
  hourlyRewardNXR: 0.00001,
  maxSessionRewardNXR: 0.00024,
  enableServerValidation: true,
  marketDataSource: 'live_coingecko',
  enableAudioBriefings: true,
};

export const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [];
