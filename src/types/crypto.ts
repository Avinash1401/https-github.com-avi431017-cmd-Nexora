export interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number | null; // null for internal NXR coin (no established market price)
  change24h: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  high24h?: number | null;
  low24h?: number | null;
  circulatingSupply?: number | null;
  sparkline?: number[];
  icon: string;
  isNexora?: boolean;
  statusNotice?: string;
  lastUpdated?: number;
}

export interface MiningSessionState {
  isActive: boolean;
  isPaused: boolean;
  startedAt: number | null; // Server-recorded start timestamp
  lastTickAt: number | null;
  elapsedSeconds: number; // 0 to 86,400 seconds
  remainingSeconds: number; // 86,400 to 0 seconds
  accumulatedRewardNXR: number; // 0.00000 to 0.00024 NXR
  totalNxrEarnedAllTime: number; // Genuine total earned from completed sessions
  currentHashRate: number; // Nominal telemetry display (MH/s)
  currentNonce: number;
  claimed: boolean;
  // Computed helpers for component convenience
  sessionAccruedNXR?: number;
  totalEarnedAllTimeNXR?: number;
  totalCompletedCycles?: number;
  isCompleted?: boolean;
}

export interface MiningHistoryBlock {
  sessionId: string;
  hash: string;
  timestamp: number;
  elapsedSeconds: number;
  rewardNXR: number;
  status: 'completed' | 'claimed' | 'in_progress';
  id?: string;
  blockNumber?: number;
  durationSeconds?: number;
}

export interface VirtualTransaction {
  id: string;
  txHash: string;
  type: 'mining_reward' | 'send' | 'receive' | 'virtual_transfer';
  asset: string;
  amount: number;
  amountUsd?: number | null;
  fee: number;
  timestamp: number;
  fromAddress: string;
  toAddress: string;
  status: 'completed' | 'pending' | 'failed';
  note?: string;
  idempotencyKey?: string;
}

export interface PortfolioAsset {
  coinId: string;
  symbol: string;
  name: string;
  balance: number;
  averageBuyPrice?: number | null;
  currentPrice?: number | null;
  isVirtualOnly?: boolean;
  allocationPercentage?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'miner' | 'admin';
  avatarSeed: string;
  registeredAt: number;
  twoFactorEnabled: boolean;
  virtualWalletAddress: string;
  virtualBalanceNXR: number; // Strictly 0.00000 for new users
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'reward';
  timestamp: number;
  read: boolean;
  link?: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: number;
  action: string;
  category: 'auth' | 'mining' | 'wallet' | 'system' | 'security' | 'transfers';
  performedBy: string;
  ipAddress: string;
  details: string;
  status: 'success' | 'flagged' | 'denied';
}

export interface SystemSettings {
  maxSessionHours: number; // 24
  hourlyRewardNXR: number; // 0.00001
  maxSessionRewardNXR: number; // 0.00024
  enableServerValidation: boolean;
  marketDataSource: 'live_coingecko' | 'api_cache';
  enableAudioBriefings: boolean;
  maintenanceMode?: boolean;
}
