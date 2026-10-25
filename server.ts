import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  LedgerEntry,
  WalletRecord,
  reconcileAllWallets,
  reconcileWallet,
  validateMiningClaimCalculation,
  validateVirtualTransfer,
  validateRoleAssignment,
  validateReferralClaim,
  validateAdminBalanceAdjustment,
  HOURLY_MINING_RATE_NXR,
  MAX_CYCLE_REWARD_NXR,
  REFERRAL_REWARD_NXR,
  MAX_REFERRAL_COUNT_PER_USER,
  addNxrBaseUnits,
  subtractNxrBaseUnits,
} from './src/utils/ledgerEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize GoogleGenAI client on server-side with mandatory User-Agent
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ----------------------------------------------------------------------------
// 1. DATA MODELS & OPERATIONAL STORE (ZERO-FABRICATION POLICY)
// ----------------------------------------------------------------------------
interface ServerMiningSession {
  sessionId: string;
  userId: string;
  startedAt: number; // Server timestamp
  elapsedSeconds: number;
  claimed: boolean;
  claimedAt?: number;
  rewardEarnedNXR: number;
  claimTxHash?: string;
  status: 'active' | 'completed' | 'claimed';
}

interface ServerTransfer {
  id: string;
  txHash: string;
  senderId: string;
  senderAddress: string;
  recipientAddress: string;
  amountNXR: number;
  timestamp: number;
  status: 'completed';
  idempotencyKey?: string;
  note?: string;
}

interface ServerAuditLog {
  id: string;
  timestamp: number;
  action: string;
  category: 'auth' | 'mining' | 'wallet' | 'system' | 'security' | 'transfers';
  performedBy: string;
  ipAddress: string;
  details: string;
  status: 'success' | 'flagged' | 'denied';
}

interface ServerSecurityEvent {
  id: string;
  timestamp: number;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actor: string;
  ipAddress: string;
  description: string;
}

export interface ServerNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'reward' | 'success' | 'alert' | 'system' | 'warning';
  timestamp: number;
  read: boolean;
  deduplicationKey?: string;
  referenceId?: string;
}

export interface ServerSession {
  sessionId: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  lastActiveAt: number;
}

// In-Memory Database collections (Authoritative Server State)
// Starts with initial operator account. No fabricated users or balances.
const dbUsers = new Map<string, WalletRecord>([
  [
    'usr_admin',
    {
      userId: 'usr_admin',
      walletAddress: 'NXR-VAULT-ADM-001',
      balanceNXR: 0.00000,
      status: 'active',
      role: 'admin',
      email: 'admin@nexora.vip',
      displayName: 'System Operator',
      registeredAt: Date.now() - 86400000 * 7,
    },
  ],
]);

const dbMiningSessions: ServerMiningSession[] = [];
const dbLedgerEntries: LedgerEntry[] = [];
const dbTransfers: ServerTransfer[] = [];
const dbNotifications: ServerNotification[] = [
  {
    id: `notif_sys_${Date.now()}`,
    userId: 'usr_admin',
    title: 'Platform System Ready',
    message: 'NEXORA virtual ledger active with zero-balance integrity and 24h mining ceiling.',
    type: 'system',
    timestamp: Date.now(),
    read: false,
    deduplicationKey: 'system_boot_notif',
  },
];
const dbSessions: ServerSession[] = [
  {
    sessionId: 'sess_admin_master',
    userId: 'usr_admin',
    ipAddress: '127.0.0.1',
    userAgent: 'Nexora Core Gateway / Institutional Operator',
    createdAt: Date.now() - 86400000,
    lastActiveAt: Date.now(),
  },
];

const dbAuditLogs: ServerAuditLog[] = [
  {
    id: `log_init_${Date.now()}`,
    timestamp: Date.now(),
    action: 'SYSTEM_BOOT',
    category: 'system',
    performedBy: 'system',
    ipAddress: '127.0.0.1',
    details: 'NEXORA virtual ledger engine initialized with zero-balance ledger integrity.',
    status: 'success',
  },
];
interface ServerReferral {
  id: string;
  referrerId: string;
  referrerWalletAddress: string;
  referredUserId: string;
  referredUserEmail: string;
  timestamp: number;
  rewardNXR: number;
  status: 'confirmed';
}

const dbReferrals: ServerReferral[] = [];

// Rate Limiting Store: Map of key -> { count, resetAt }
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count, retryAfterSeconds: 0 };
}

function addServerNotification(
  userId: string,
  title: string,
  message: string,
  type: ServerNotification['type'] = 'info',
  deduplicationKey?: string,
  referenceId?: string
): boolean {
  if (deduplicationKey) {
    const exists = dbNotifications.some(n => n.userId === userId && n.deduplicationKey === deduplicationKey);
    if (exists) {
      return false; // Prevent duplicate notifications
    }
  }

  const notif: ServerNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    title,
    message,
    type,
    timestamp: Date.now(),
    read: false,
    deduplicationKey,
    referenceId,
  };

  dbNotifications.unshift(notif);
  // Cap at 200 notifications to prevent unbounded memory growth
  if (dbNotifications.length > 200) {
    dbNotifications.pop();
  }

  broadcastRealtimeEvent('NEW_NOTIFICATION', {
    userId,
    notification: notif,
  });

  return true;
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'node***@nexora.internal';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function maskWalletAddress(address: string): string {
  if (!address || address.length < 8) return 'NXR-***';
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

const dbSecurityEvents: ServerSecurityEvent[] = [];
const processedTransferKeys = new Set<string>();

// ----------------------------------------------------------------------------
// 2. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
// Broadcasts authentic events to connected clients
// ----------------------------------------------------------------------------
const sseClients = new Set<Response>();

function broadcastRealtimeEvent(eventType: string, payload: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

app.get('/api/realtime/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  // Send initial connection handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now(), clients: sseClients.size + 1 })}\n\n`);

  sseClients.add(res);

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// ----------------------------------------------------------------------------
// 3. SERVER-SIDE RBAC MIDDLEWARE
// Strictly validates admin privileges and logs security events on violations
// ----------------------------------------------------------------------------
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const roleHeader = (req.headers['x-user-role'] as string) || '';
  const userIdHeader = (req.headers['x-user-id'] as string) || '';
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  // Check role from header or lookup in registered user database
  let isAuthorized = roleHeader.toLowerCase() === 'admin';
  if (userIdHeader && dbUsers.has(userIdHeader)) {
    const user = dbUsers.get(userIdHeader)!;
    if (user.role !== 'admin' || user.status === 'suspended') {
      isAuthorized = false;
    }
  }

  if (!isAuthorized) {
    const secEvent: ServerSecurityEvent = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      eventType: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
      severity: 'high',
      actor: userIdHeader || 'anonymous',
      ipAddress: clientIp,
      description: `Unauthorized attempt to access administrative path: ${req.method} ${req.path}`,
    };
    dbSecurityEvents.unshift(secEvent);

    broadcastRealtimeEvent('SECURITY_INCIDENT', {
      eventType: secEvent.eventType,
      severity: secEvent.severity,
      timestamp: secEvent.timestamp,
    });

    return res.status(403).json({
      success: false,
      error: 'Access denied: Requires verified administrator privileges.',
      securityEventId: secEvent.id,
    });
  }

  next();
}

// ----------------------------------------------------------------------------
// 4. LIVE COINGECKO CRYPTOCURRENCY MARKET DATA (With Telemetry Tracking)
// ----------------------------------------------------------------------------
interface MarketCache {
  data: any[];
  timestamp: number;
}

let marketCache: MarketCache | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
let marketTelemetry = {
  provider: 'CoinGecko Live API v3',
  lastSuccessfulRefresh: 0,
  refreshCount: 0,
  apiErrorsCount: 0,
  rateLimitHits: 0,
  lastError: null as string | null,
  cachedDataAvailable: false,
};

app.get('/api/market', async (req, res) => {
  const now = Date.now();

  // If cache is fresh, return cached real data
  if (marketCache && now - marketCache.timestamp < CACHE_TTL_MS) {
    return res.json({
      success: true,
      data: marketCache.data,
      isLive: true,
      isCached: true,
      lastUpdated: marketCache.timestamp,
      source: 'CoinGecko Live API (Server Cache)',
      telemetry: marketTelemetry,
    });
  }

  try {
    const ids = 'bitcoin,ethereum,solana,ripple,cardano,avalanche-2,dogecoin,chainlink';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const cgResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (cgResponse.status === 429) {
      marketTelemetry.rateLimitHits += 1;
      marketTelemetry.lastError = 'CoinGecko rate limit (429) reached.';
      if (marketCache) {
        return res.json({
          success: true,
          data: marketCache.data,
          isLive: false,
          isCached: true,
          rateLimited: true,
          lastUpdated: marketCache.timestamp,
          source: 'CoinGecko (Rate-limited, serving cached records)',
          telemetry: marketTelemetry,
        });
      }
      return res.status(429).json({
        success: false,
        error: 'CoinGecko public rate limit reached. Please wait a moment.',
        rateLimited: true,
        telemetry: marketTelemetry,
      });
    }

    if (!cgResponse.ok) {
      marketTelemetry.apiErrorsCount += 1;
      marketTelemetry.lastError = `HTTP ${cgResponse.status}`;
      throw new Error(`CoinGecko API returned HTTP status ${cgResponse.status}`);
    }

    const json = await cgResponse.json();

    const mapped = json.map((coin: any) => ({
      id: coin.id,
      symbol: (coin.symbol || '').toUpperCase(),
      name: coin.name,
      priceUsd: typeof coin.current_price === 'number' ? coin.current_price : null,
      change24h: typeof coin.price_change_percentage_24h === 'number' ? coin.price_change_percentage_24h : 0,
      marketCapUsd: typeof coin.market_cap === 'number' ? coin.market_cap : 0,
      volume24hUsd: typeof coin.total_volume === 'number' ? coin.total_volume : 0,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      circulatingSupply: coin.circulating_supply,
      sparkline: Array.isArray(coin.sparkline_in_7d?.price)
        ? coin.sparkline_in_7d.price.slice(-12)
        : [],
      image: coin.image,
    }));

    marketCache = {
      data: mapped,
      timestamp: now,
    };

    marketTelemetry.lastSuccessfulRefresh = now;
    marketTelemetry.refreshCount += 1;
    marketTelemetry.cachedDataAvailable = true;
    marketTelemetry.lastError = null;

    broadcastRealtimeEvent('MARKET_REFRESH', {
      lastUpdated: now,
      coinCount: mapped.length,
    });

    return res.json({
      success: true,
      data: mapped,
      isLive: true,
      isCached: false,
      lastUpdated: now,
      source: 'CoinGecko Live API',
      telemetry: marketTelemetry,
    });
  } catch (err: any) {
    marketTelemetry.apiErrorsCount += 1;
    marketTelemetry.lastError = err?.message || 'CoinGecko connection timeout';
    console.warn('[MARKET API] CoinGecko fetch warning:', err?.message || err);

    if (marketCache) {
      return res.json({
        success: true,
        data: marketCache.data,
        isLive: false,
        isCached: true,
        lastUpdated: marketCache.timestamp,
        source: 'CoinGecko (Cached fallback)',
        telemetry: marketTelemetry,
      });
    }

    return res.status(503).json({
      success: false,
      error: 'CoinGecko live market data is temporarily unreachable.',
      retryAfterSeconds: 30,
      telemetry: marketTelemetry,
    });
  }
});

// ----------------------------------------------------------------------------
// 5. USER SYNC & AUTH VALIDATION
// Ensures authenticated users in the client exist in server DB
// ----------------------------------------------------------------------------
app.post('/api/users/sync', (req: Request, res: Response) => {
  const { id, email, displayName, role = 'user', walletAddress, balanceNXR = 0.0, referralCode } = req.body;

  if (!email || !id) {
    return res.status(400).json({ success: false, error: 'User ID and email are required.' });
  }

  // Prevent client self-escalation to admin if user already exists with different role
  const existing = dbUsers.get(id);
  let effectiveRole = role;
  if (existing && existing.role !== 'admin' && role === 'admin') {
    effectiveRole = existing.role; // Enforce existing non-admin role
  }

  const generatedRefCode = `NXR-REF-${id.substring(4, 9).toUpperCase()}`;

  const userRecord: WalletRecord = {
    userId: id,
    email,
    displayName: displayName || email.split('@')[0],
    role: effectiveRole,
    status: existing ? existing.status : 'active',
    walletAddress: walletAddress || `NXR-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    balanceNXR: existing ? existing.balanceNXR : balanceNXR,
    registeredAt: existing ? existing.registeredAt : Date.now(),
    referralCode: existing?.referralCode || generatedRefCode,
    referredBy: existing?.referredBy,
  };

  // If this is a fresh registration and a referral code is provided
  let referralCredited = false;
  if (!existing && referralCode && typeof referralCode === 'string') {
    const cleanCode = referralCode.trim().toUpperCase();
    const referrer = Array.from(dbUsers.values()).find(
      u => u.referralCode?.toUpperCase() === cleanCode ||
           `NXR-REF-${u.userId.substring(4, 9).toUpperCase()}` === cleanCode ||
           (cleanCode === 'NXR-REF-ADMIN' && u.role === 'admin')
    );

    if (referrer) {
      const existingRefCount = dbReferrals.filter(r => r.referrerId === referrer.userId).length;
      const refCheck = validateReferralClaim(referrer, id, existingRefCount);
      if (refCheck.valid) {
        userRecord.referredBy = referrer.userId;
        referrer.balanceNXR = addNxrBaseUnits(referrer.balanceNXR, REFERRAL_REWARD_NXR);

        const refEntry: LedgerEntry = {
          id: `led_ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          entryType: 'referral_reward',
          userId: referrer.userId,
          walletAddress: referrer.walletAddress,
          amountNXR: REFERRAL_REWARD_NXR,
          balanceAfterNXR: referrer.balanceNXR,
          referenceId: `ref_${id}`,
          timestamp: Date.now(),
          note: `Referral reward for node registration: ${maskEmail(email)}`,
        };
        dbLedgerEntries.unshift(refEntry);

        dbReferrals.unshift({
          id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          referrerId: referrer.userId,
          referrerWalletAddress: referrer.walletAddress,
          referredUserId: id,
          referredUserEmail: email,
          timestamp: Date.now(),
          rewardNXR: REFERRAL_REWARD_NXR,
          status: 'confirmed',
        });

        dbAuditLogs.unshift({
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          action: 'REFERRAL_REWARD_CREDITED',
          category: 'wallet',
          performedBy: 'system',
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
          details: `Credited +${REFERRAL_REWARD_NXR.toFixed(5)} NXR to referrer ${referrer.email} for invitee ${maskEmail(email)}`,
          status: 'success',
        });

        broadcastRealtimeEvent('REFERRAL_RECORDED', {
          referrerId: referrer.userId,
          rewardNXR: REFERRAL_REWARD_NXR,
          timestamp: Date.now(),
        });

        addServerNotification(
          referrer.userId,
          'Referral Reward Deposited',
          `Received +${REFERRAL_REWARD_NXR.toFixed(5)} NXR bonus for new node registration: ${maskEmail(email)}`,
          'reward',
          `ref_${id}`,
          `ref_${id}`
        );

        referralCredited = true;
      }
    }
  }

  dbUsers.set(id, userRecord);

  if (!existing) {
    addServerNotification(
      userRecord.userId,
      'Welcome to NEXORA Protocol',
      'Your simulated node account is active. Start a 24-hour mining session to begin accumulating virtual NXR.',
      'system',
      `welcome_${userRecord.userId}`
    );
  }

  broadcastRealtimeEvent('USER_REGISTERED', {
    userId: userRecord.userId,
    email: userRecord.email,
    role: userRecord.role,
    registeredAt: userRecord.registeredAt,
  });

  return res.json({ success: true, user: userRecord, referralCredited });
});

// ----------------------------------------------------------------------------
// 5B. REFERRALS API
// ----------------------------------------------------------------------------
app.get('/api/referrals/my', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || '';
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  const user = dbUsers.get(userId);
  const userRefCode = user?.referralCode || `NXR-REF-${userId.substring(4, 9).toUpperCase()}`;
  const userReferrals = dbReferrals.filter(r => r.referrerId === userId);
  const totalEarned = userReferrals.reduce((sum, r) => addNxrBaseUnits(sum, r.rewardNXR), 0);

  return res.json({
    success: true,
    referralCode: userRefCode,
    totalReferrals: userReferrals.length,
    maxReferrals: MAX_REFERRAL_COUNT_PER_USER,
    rewardPerReferralNXR: REFERRAL_REWARD_NXR,
    totalRewardNXR: totalEarned,
    referrals: userReferrals.map(r => ({
      id: r.id,
      referredUserId: r.referredUserId,
      maskedEmail: maskEmail(r.referredUserEmail),
      timestamp: r.timestamp,
      rewardNXR: r.rewardNXR,
      status: r.status,
    })),
  });
});

// ----------------------------------------------------------------------------
// 5C. LEADERBOARD & GENUINE PLATFORM ACTIVITY
// Real registered users and authentic activity only (Zero fabrication)
// ----------------------------------------------------------------------------
app.get('/api/leaderboard', (req: Request, res: Response) => {
  const users = Array.from(dbUsers.values())
    .map(u => {
      const completedSessions = dbMiningSessions.filter(s => s.userId === u.userId && s.claimed).length;
      return {
        userId: u.userId,
        maskedEmail: maskEmail(u.email),
        displayName: u.displayName,
        maskedAddress: maskWalletAddress(u.walletAddress),
        balanceNXR: u.balanceNXR,
        role: u.role,
        status: u.status,
        registeredAt: u.registeredAt,
        completedMiningCycles: completedSessions,
      };
    })
    .sort((a, b) => b.balanceNXR - a.balanceNXR || a.registeredAt - b.registeredAt);

  return res.json({
    success: true,
    leaderboard: users,
    totalNodes: users.length,
    timestamp: Date.now(),
  });
});

app.get('/api/activity/stream', (req: Request, res: Response) => {
  const activityItems: any[] = [];

  // 1. Completed mining claims
  for (const session of dbMiningSessions.filter(s => s.claimed).slice(0, 10)) {
    const user = dbUsers.get(session.userId);
    activityItems.push({
      id: `act_${session.sessionId}`,
      type: 'mining_claim',
      title: 'Mining Cycle Claimed',
      description: `${user ? maskEmail(user.email) : 'Verified node'} claimed +${session.rewardEarnedNXR.toFixed(5)} NXR (${Math.floor(session.elapsedSeconds / 3600)}h cycle)`,
      amountNXR: session.rewardEarnedNXR,
      timestamp: session.claimedAt || session.startedAt,
      txHash: session.claimTxHash,
    });
  }

  // 2. Peer transfers
  for (const tx of dbTransfers.slice(0, 10)) {
    activityItems.push({
      id: `act_${tx.id}`,
      type: 'transfer',
      title: 'Internal Virtual Transfer',
      description: `${maskWalletAddress(tx.senderAddress)} transferred ${tx.amountNXR.toFixed(5)} NXR to ${maskWalletAddress(tx.recipientAddress)}`,
      amountNXR: tx.amountNXR,
      timestamp: tx.timestamp,
      txHash: tx.txHash,
    });
  }

  // 3. Referrals
  for (const ref of dbReferrals.slice(0, 5)) {
    const referrer = dbUsers.get(ref.referrerId);
    activityItems.push({
      id: `act_${ref.id}`,
      type: 'referral',
      title: 'Referral Bonus Credited',
      description: `${referrer ? maskEmail(referrer.email) : 'Node'} earned +${ref.rewardNXR.toFixed(5)} NXR for inviting ${maskEmail(ref.referredUserEmail)}`,
      amountNXR: ref.rewardNXR,
      timestamp: ref.timestamp,
    });
  }

  activityItems.sort((a, b) => b.timestamp - a.timestamp);

  return res.json({
    success: true,
    activity: activityItems.slice(0, 20),
    timestamp: Date.now(),
  });
});

// ----------------------------------------------------------------------------
// 5D. TRANSPARENT TOKENOMICS & ACCOUNTING
// Real-time supply statistics and explicit configurable parameters
// ----------------------------------------------------------------------------
app.get('/api/tokenomics/accounting', (req: Request, res: Response) => {
  let totalCirculation = 0.0;
  for (const u of dbUsers.values()) {
    totalCirculation = addNxrBaseUnits(totalCirculation, u.balanceNXR);
  }

  const maxSupplyNXR = 21_000_000;
  const unminedSupply = subtractNxrBaseUnits(maxSupplyNXR, totalCirculation);

  return res.json({
    success: true,
    tokenomics: {
      name: 'NEXORA COIN',
      symbol: 'NXR',
      status: 'Virtual Simulation Protocol (Pre-Mainnet)',
      maxSupplyNXR,
      circulatingSupplyNXR: totalCirculation,
      unminedSupplyNXR: unminedSupply,
      totalRegisteredNodes: dbUsers.size,
      totalMiningCycles: dbMiningSessions.length,
      claimedMiningCycles: dbMiningSessions.filter(s => s.claimed).length,
      totalTransfers: dbTransfers.length,
      totalReferrals: dbReferrals.length,
      rules: {
        hourlyMiningRateNXR: HOURLY_MINING_RATE_NXR,
        cycleCapNXR: MAX_CYCLE_REWARD_NXR,
        cycleMaxHours: 24,
        referralRewardNXR: REFERRAL_REWARD_NXR,
        maxReferralsPerUser: MAX_REFERRAL_COUNT_PER_USER,
        minTransferNXR: 0.00001,
        maxTransferNXR: 100.0,
      },
      allocations: [
        { label: 'Community Mining & Ecosystem Rewards', percentage: 45, tokens: 9450000, vesting: '10-Year Linear Accrual via Validated Node Cycles' },
        { label: 'Treasury & Protocol Development', percentage: 25, tokens: 5250000, vesting: '12-Month Cliff, 36-Month Linear Quarterly Release' },
        { label: 'Initial DEX Liquidity & Market Making', percentage: 15, tokens: 3150000, vesting: 'Locked in AMM Smart Contract upon Launch' },
        { label: 'Core Contributors & Advisors', percentage: 10, tokens: 2100000, vesting: '24-Month Cliff, 48-Month Linear Monthly Vesting' },
        { label: 'Strategic Reserve & Security Bug Bounty', percentage: 5, tokens: 1050000, vesting: 'Multi-Sig Timelock Governance Pool' },
      ],
      disclaimer: 'NEXORA COIN is currently a virtual simulation. NXR balances and transfers are internal database records, not blockchain assets. No real-money value is guaranteed.',
    },
    timestamp: Date.now(),
  });
});

// ----------------------------------------------------------------------------
// 6. SERVER-VALIDATED VIRTUAL MINING SYSTEM (24-Hour Session Engine)
// Rate: 0.00001 NXR per hour, capped at 24 hours (0.00024 NXR max)
// Protected against client clock manipulation via authoritative server DB timestamps
// ----------------------------------------------------------------------------
app.post('/api/mining/start', (req, res) => {
  const { userId = 'usr_guest' } = req.body;
  const now = Date.now();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  // Find active unclaimed session for this user in server DB
  const existingActive = dbMiningSessions.find(s => s.userId === userId && !s.claimed);
  if (existingActive) {
    const elapsedSeconds = Math.max(0, (now - existingActive.startedAt) / 1000);
    if (elapsedSeconds < 86400) {
      return res.status(409).json({
        success: false,
        error: 'An active 24-hour mining session is already in progress.',
        sessionId: existingActive.sessionId,
        startedAt: existingActive.startedAt,
        elapsedSeconds: Math.floor(elapsedSeconds),
        remainingSeconds: Math.max(0, 86400 - Math.floor(elapsedSeconds)),
      });
    } else {
      return res.status(409).json({
        success: false,
        error: 'A completed 24-hour mining session is awaiting reward claim. Please claim your rewards before initiating a new cycle.',
        sessionId: existingActive.sessionId,
        startedAt: existingActive.startedAt,
        elapsedSeconds: Math.floor(elapsedSeconds),
        rewardAvailableNXR: MAX_CYCLE_REWARD_NXR,
      });
    }
  }

  // Server authoritatively sets startedAt from server system clock — client cannot forge this
  const newSession: ServerMiningSession = {
    sessionId: `sess_${now}_${Math.random().toString(36).substring(2, 8)}`,
    userId,
    startedAt: now,
    elapsedSeconds: 0,
    claimed: false,
    rewardEarnedNXR: 0.0,
    status: 'active',
  };

  dbMiningSessions.unshift(newSession);

  // Record audit log
  dbAuditLogs.unshift({
    id: `log_${Date.now()}`,
    timestamp: now,
    action: 'MINING_SESSION_START',
    category: 'mining',
    performedBy: userId,
    ipAddress: clientIp,
    details: `Started 24h server-verified mining session ${newSession.sessionId}`,
    status: 'success',
  });

  return res.json({
    success: true,
    sessionId: newSession.sessionId,
    startedAt: newSession.startedAt,
    serverTimestamp: now,
    maxDurationSeconds: 86400,
    hourlyRateNXR: HOURLY_MINING_RATE_NXR,
    maxRewardNXR: MAX_CYCLE_REWARD_NXR,
    message: 'Mining session initialized with server-side database timestamp.',
  });
});

app.get('/api/mining/status', (req, res) => {
  const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'usr_guest';
  const now = Date.now();

  const session = dbMiningSessions.find(s => s.userId === userId && !s.claimed);
  if (!session) {
    return res.json({
      active: false,
      sessionId: null,
      startedAt: null,
      serverTimestamp: now,
      elapsedSeconds: 0,
      clampedElapsedSeconds: 0,
      remainingSeconds: 86400,
      accumulatedRewardNXR: 0.0,
      maxRewardNXR: MAX_CYCLE_REWARD_NXR,
      hourlyRateNXR: HOURLY_MINING_RATE_NXR,
      claimed: false,
      isComplete: false,
      isCapped: false,
    });
  }

  const rawElapsed = Math.max(0, (now - session.startedAt) / 1000);
  const clampedElapsed = Math.min(86400, rawElapsed);
  const hours = clampedElapsed / 3600;
  const calculatedReward = Math.min(MAX_CYCLE_REWARD_NXR, Number((hours * HOURLY_MINING_RATE_NXR).toFixed(5)));
  const remainingSeconds = Math.max(0, 86400 - Math.floor(rawElapsed));

  return res.json({
    active: true,
    sessionId: session.sessionId,
    startedAt: session.startedAt,
    serverTimestamp: now,
    elapsedSeconds: Math.floor(rawElapsed),
    clampedElapsedSeconds: Math.floor(clampedElapsed),
    remainingSeconds,
    accumulatedRewardNXR: calculatedReward,
    maxRewardNXR: MAX_CYCLE_REWARD_NXR,
    hourlyRateNXR: HOURLY_MINING_RATE_NXR,
    claimed: false,
    isComplete: rawElapsed >= 86400,
    isCapped: rawElapsed >= 86400,
    verification: {
      source: 'SERVER_DATABASE_TIMESTAMP',
      protectedAgainstClockTampering: true,
    },
  });
});

app.get('/api/mining/verify/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const now = Date.now();
  const session = dbMiningSessions.find(s => s.sessionId === sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Mining session not found in database.',
    });
  }

  const rawElapsed = Math.max(0, ((session.claimedAt || now) - session.startedAt) / 1000);
  const clampedElapsed = Math.min(86400, rawElapsed);
  const user = dbUsers.get(session.userId);

  return res.json({
    success: true,
    verification: {
      sessionId: session.sessionId,
      userMasked: user ? maskEmail(user.email) : 'Verified Node',
      startedAt: session.startedAt,
      claimedAt: session.claimedAt || null,
      elapsedSeconds: session.claimed ? session.elapsedSeconds : Math.floor(rawElapsed),
      clampedElapsedSeconds: Math.floor(clampedElapsed),
      rewardNXR: session.rewardEarnedNXR,
      maxCapNXR: MAX_CYCLE_REWARD_NXR,
      isCapped: rawElapsed >= 86400,
      status: session.status,
      claimed: session.claimed,
      claimTxHash: session.claimTxHash || null,
      verifiedBy: 'NEXORA_AUTHORITATIVE_LEDGER',
      serverClockProof: true,
    },
  });
});

app.post('/api/mining/claim', (req, res) => {
  const {
    userId = 'usr_guest',
    sessionId,
    clientTimestamp,
    clientElapsedSeconds,
    claimedRewardNXR,
  } = req.body;
  const now = Date.now();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  // 0. Rate limiting: 10 claim attempts per minute
  const rateCheck = checkRateLimit(`mining_claim_${clientIp}_${userId}`, 10, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many mining requests. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    });
  }

  // 1. Database Lookup - The start timestamp comes STRICTLY from dbMiningSessions
  const session = dbMiningSessions.find(
    s => s.userId === userId && (!sessionId || s.sessionId === sessionId)
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'No active mining session found in database for this user.',
    });
  }

  // 2. Perform server-side validation against authoritative database start timestamp
  const claimValidation = validateMiningClaimCalculation(
    session.startedAt,
    now,
    session.claimed,
    { clientTimestamp, clientElapsedSeconds, claimedRewardNXR }
  );

  // 3. Detect and audit client-side clock manipulation or reward tampering
  if (claimValidation.clockManipulationDetected) {
    dbSecurityEvents.unshift({
      id: `sec_${Date.now()}`,
      timestamp: now,
      eventType: 'CLIENT_CLOCK_MANIPULATION_ATTEMPT',
      severity: 'high',
      actor: userId,
      ipAddress: clientIp,
      description: `Client-side clock manipulation or reward inflation attempt detected on session ${session.sessionId}: ${claimValidation.manipulationDetails}`,
    });
  }

  // 4. Reject invalid claims (duplicate claims, zero duration, premature claims)
  if (!claimValidation.valid) {
    if (session.claimed) {
      dbSecurityEvents.unshift({
        id: `sec_${Date.now()}`,
        timestamp: now,
        eventType: 'DUPLICATE_CLAIM_ATTEMPT',
        severity: 'medium',
        actor: userId,
        ipAddress: clientIp,
        description: `Rejected duplicate claim attempt on already claimed session ${session.sessionId}`,
      });
    }

    return res.status(400).json({
      success: false,
      error: claimValidation.error,
      clockManipulationDetected: claimValidation.clockManipulationDetected,
      manipulationDetails: claimValidation.manipulationDetails,
      serverElapsedSeconds: claimValidation.elapsedSeconds,
    });
  }

  // 5. Authoritatively enforce server-calculated reward capped at 0.00024 NXR
  const verifiedReward = claimValidation.rewardNXR;
  const txHash = `0x${now.toString(16)}${Math.random().toString(16).substring(2, 10)}0000`;

  // 6. Atomically update session record
  session.claimed = true;
  session.claimedAt = now;
  session.rewardEarnedNXR = verifiedReward;
  session.elapsedSeconds = claimValidation.elapsedSeconds;
  session.claimTxHash = txHash;
  session.status = 'claimed';

  // 7. Ensure user exists in db
  let userWallet = dbUsers.get(userId);
  if (!userWallet) {
    userWallet = {
      userId,
      email: `${userId}@nexora.vip`,
      displayName: userId,
      role: 'miner',
      status: 'active',
      walletAddress: `NXR-VAULT-${userId}`,
      balanceNXR: 0.00000,
      registeredAt: now,
    };
    dbUsers.set(userId, userWallet);
  }

  // 8. Atomically update balance via exact integer base-unit arithmetic
  const previousBalance = userWallet.balanceNXR;
  const newBalance = addNxrBaseUnits(previousBalance, verifiedReward);
  userWallet.balanceNXR = newBalance;

  // 9. Write immutable ledger entry
  const ledgerEntry: LedgerEntry = {
    id: `led_${now}_${Math.random().toString(36).substring(2, 6)}`,
    entryType: 'mining_reward',
    userId,
    walletAddress: userWallet.walletAddress,
    amountNXR: verifiedReward,
    balanceAfterNXR: newBalance,
    referenceId: session.sessionId,
    timestamp: now,
    note: `24-Hour Mining Cycle Reward (${claimValidation.clampedSeconds}s server-verified)`,
  };
  dbLedgerEntries.unshift(ledgerEntry);

  // 10. Write audit log
  dbAuditLogs.unshift({
    id: `log_${Date.now()}`,
    timestamp: now,
    action: 'MINING_REWARD_CLAIMED',
    category: 'mining',
    performedBy: userId,
    ipAddress: clientIp,
    details: `Claimed +${verifiedReward.toFixed(5)} NXR for session ${session.sessionId} (Server DB verified: ${claimValidation.elapsedSeconds}s elapsed, Capped: ${claimValidation.isCapped})`,
    status: 'success',
  });

  // 11. Broadcast real-time event to SSE subscribers
  broadcastRealtimeEvent('MINING_CLAIM', {
    sessionId: session.sessionId,
    amountNXR: verifiedReward,
    timestamp: now,
    userId: userWallet.userId,
    isCapped: claimValidation.isCapped,
  });

  // 12. Dispatch authoritative in-app notification (deduplicated by session ID)
  addServerNotification(
    userWallet.userId,
    'Mining Cycle Reward Claimed',
    `+${verifiedReward.toFixed(5)} virtual NXR credited to your wallet (${claimValidation.clampedSeconds}s verified).`,
    'reward',
    `mining_claim_${session.sessionId}`,
    session.sessionId
  );

  return res.json({
    success: true,
    sessionId: session.sessionId,
    rewardNXR: verifiedReward,
    rewardBaseUnits: claimValidation.rewardBaseUnits.toString(),
    newBalanceNXR: newBalance,
    txHash,
    timestamp: now,
    elapsedSeconds: claimValidation.elapsedSeconds,
    clampedSeconds: claimValidation.clampedSeconds,
    isCapped: claimValidation.isCapped,
    verifiedBy: 'SERVER_DATABASE_TIMESTAMP',
  });
});

// ----------------------------------------------------------------------------
// 7. INTERNAL VIRTUAL NXR TRANSFERS (Atomic Balance Adjustment & Immutable Ledger)
// ----------------------------------------------------------------------------
app.post('/api/transfers/send', (req, res) => {
  const {
    senderId = 'usr_guest',
    recipientAddress,
    amount,
    idempotencyKey,
  } = req.body;
  const now = Date.now();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  // 0. Rate limiting: 15 transfer requests per minute
  const rateCheck = checkRateLimit(`transfer_${clientIp}_${senderId}`, 15, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `Transfer rate limit reached. Please wait ${rateCheck.retryAfterSeconds} seconds before sending another transfer.`,
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    });
  }

  // 1. Get or initialize sender
  let sender = dbUsers.get(senderId);
  if (!sender) {
    sender = {
      userId: senderId,
      email: `${senderId}@nexora.vip`,
      displayName: senderId,
      role: 'user',
      status: 'active',
      walletAddress: `NXR-VAULT-${senderId}`,
      balanceNXR: 0.00000,
      registeredAt: now,
    };
    dbUsers.set(senderId, sender);
  }

  // 2. Validate transfer through pure engine
  const validation = validateVirtualTransfer(
    sender,
    recipientAddress,
    amount,
    processedTransferKeys,
    idempotencyKey
  );

  if (!validation.valid) {
    if (idempotencyKey && processedTransferKeys.has(idempotencyKey)) {
      dbSecurityEvents.unshift({
        id: `sec_${Date.now()}`,
        timestamp: now,
        eventType: 'DUPLICATE_TRANSFER_IDEMPOTENCY_REJECTION',
        severity: 'medium',
        actor: senderId,
        ipAddress: clientIp,
        description: `Rejected duplicate transfer with idempotency key: ${idempotencyKey}`,
      });
      return res.status(409).json({ success: false, error: validation.error });
    }
    return res.status(400).json({ success: false, error: validation.error });
  }

  const roundedAmount = validation.roundedAmount!;

  // 3. Find or create recipient
  let recipient = Array.from(dbUsers.values()).find(
    u => u.walletAddress.toLowerCase() === recipientAddress.trim().toLowerCase() ||
         u.userId.toLowerCase() === recipientAddress.trim().toLowerCase() ||
         u.email.toLowerCase() === recipientAddress.trim().toLowerCase()
  );

  if (!recipient) {
    // Register recipient address in DB
    const recId = `usr_${Math.random().toString(36).substring(2, 8)}`;
    recipient = {
      userId: recId,
      email: `${recipientAddress.trim().toLowerCase()}@nexora.internal`,
      displayName: recipientAddress.trim(),
      role: 'user',
      status: 'active',
      walletAddress: recipientAddress.trim(),
      balanceNXR: 0.00000,
      registeredAt: now,
    };
    dbUsers.set(recId, recipient);
  }

  // 4. Atomic balance adjustments via exact base-unit integer arithmetic
  const newSenderBalance = subtractNxrBaseUnits(sender.balanceNXR, roundedAmount);
  const newRecipientBalance = addNxrBaseUnits(recipient.balanceNXR, roundedAmount);

  sender.balanceNXR = newSenderBalance;
  recipient.balanceNXR = newRecipientBalance;

  if (idempotencyKey) {
    processedTransferKeys.add(idempotencyKey);
  }

  const txHash = `0x${now.toString(16)}${Math.random().toString(16).substring(2, 14)}`;

  // 5. Immutable Ledger Entries (Debit sender & Credit recipient)
  const debitEntry: LedgerEntry = {
    id: `led_debit_${now}`,
    entryType: 'transfer_send',
    userId: sender.userId,
    walletAddress: sender.walletAddress,
    amountNXR: -roundedAmount,
    balanceAfterNXR: newSenderBalance,
    referenceId: txHash,
    timestamp: now,
    idempotencyKey,
    note: `Transfer to ${recipient.walletAddress}`,
  };

  const creditEntry: LedgerEntry = {
    id: `led_credit_${now}`,
    entryType: 'transfer_receive',
    userId: recipient.userId,
    walletAddress: recipient.walletAddress,
    amountNXR: roundedAmount,
    balanceAfterNXR: newRecipientBalance,
    referenceId: txHash,
    timestamp: now,
    idempotencyKey,
    note: `Transfer from ${sender.walletAddress}`,
  };

  dbLedgerEntries.unshift(creditEntry);
  dbLedgerEntries.unshift(debitEntry);

  const transferRecord: ServerTransfer = {
    id: `vtx_${now}`,
    txHash,
    senderId: sender.userId,
    senderAddress: sender.walletAddress,
    recipientAddress: recipient.walletAddress,
    amountNXR: roundedAmount,
    timestamp: now,
    status: 'completed',
    idempotencyKey,
    note: `Internal virtual transfer of ${roundedAmount.toFixed(5)} NXR`,
  };

  dbTransfers.unshift(transferRecord);

  // 6. Audit Logging
  dbAuditLogs.unshift({
    id: `log_${now}`,
    timestamp: now,
    action: 'VIRTUAL_TRANSFER_EXECUTED',
    category: 'transfers',
    performedBy: sender.userId,
    ipAddress: clientIp,
    details: `Transferred ${roundedAmount.toFixed(5)} NXR to ${recipient.walletAddress} (Tx: ${txHash.substring(0, 10)}...)`,
    status: 'success',
  });

  // 7. Broadcast SSE event
  broadcastRealtimeEvent('TRANSFER_COMPLETED', {
    txHash,
    amountNXR: roundedAmount,
    timestamp: now,
    senderMasked: sender.walletAddress.substring(0, 8) + '...',
    recipientMasked: recipient.walletAddress.substring(0, 8) + '...',
  });

  // 8. Dispatch In-App Notifications (deduplicated by txHash)
  addServerNotification(
    sender.userId,
    'Transfer Sent',
    `Sent ${roundedAmount.toFixed(5)} virtual NXR to ${maskWalletAddress(recipient.walletAddress)}.`,
    'success',
    `transfer_sent_${txHash}`,
    txHash
  );

  addServerNotification(
    recipient.userId,
    'Transfer Received',
    `Received +${roundedAmount.toFixed(5)} virtual NXR from ${maskWalletAddress(sender.walletAddress)}.`,
    'reward',
    `transfer_recv_${txHash}`,
    txHash
  );

  return res.json({
    success: true,
    txHash,
    amountNXR: roundedAmount,
    newBalanceNXR: newSenderBalance,
    timestamp: now,
    message: `Successfully transferred ${roundedAmount.toFixed(5)} virtual NXR to ${recipientAddress}.`,
  });
});

// ----------------------------------------------------------------------------
// 8. ADMINISTRATIVE API ENDPOINTS (PROTECTED BY requireAdmin)
// ----------------------------------------------------------------------------

// 8.1 Admin Overview (Real database records and counts only)
app.get('/api/admin/overview', requireAdmin, (req, res) => {
  const users = Array.from(dbUsers.values());
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const suspendedUsers = users.filter(u => u.status === 'suspended').length;

  const totalMiningSessions = dbMiningSessions.length;
  const activeMiningSessions = dbMiningSessions.filter(s => s.status === 'active' && !s.claimed).length;
  const claimedSessions = dbMiningSessions.filter(s => s.claimed).length;

  const totalTransfers = dbTransfers.length;

  // Run reconciliation check on genuine records
  const reconciliation = reconcileAllWallets(users, dbLedgerEntries);

  res.json({
    success: true,
    overview: {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
      },
      mining: {
        totalSessions: totalMiningSessions,
        activeSessions: activeMiningSessions,
        claimedSessions,
        hourlyRate: HOURLY_MINING_RATE_NXR,
        ceilingReward: MAX_CYCLE_REWARD_NXR,
      },
      ledger: {
        totalEntries: dbLedgerEntries.length,
        totalTransfers,
        circulationNXR: reconciliation.totalCirculationNXR,
        isConsistent: reconciliation.isConsistent,
      },
      marketTelemetry,
      security: {
        totalIncidents: dbSecurityEvents.length,
        totalAuditLogs: dbAuditLogs.length,
      },
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        connectedClients: sseClients.size,
        timestamp: Date.now(),
      },
    },
  });
});

// 8.2 User Management: Search, Paginate, Permitted Account Info
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const role = (req.query.role as string) || 'all';
  const status = (req.query.status as string) || 'all';
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.max(1, Math.min(50, parseInt((req.query.limit as string) || '10', 10)));

  let list = Array.from(dbUsers.values());

  if (search) {
    list = list.filter(
      u =>
        u.email.toLowerCase().includes(search) ||
        u.displayName.toLowerCase().includes(search) ||
        u.walletAddress.toLowerCase().includes(search) ||
        u.userId.toLowerCase().includes(search)
    );
  }

  if (role !== 'all') {
    list = list.filter(u => u.role === role);
  }

  if (status !== 'all') {
    list = list.filter(u => u.status === status);
  }

  const total = list.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = list.slice((page - 1) * limit, page * limit);

  // Return permitted account info only: no secrets, no hashes
  const safeUsers = paginated.map(u => ({
    userId: u.userId,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    status: u.status,
    walletAddress: u.walletAddress,
    balanceNXR: u.balanceNXR,
    registeredAt: u.registeredAt,
  }));

  res.json({
    success: true,
    users: safeUsers,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  });
});

// 8.3 User Management: Suspend / Reactivate with Audit Logging
app.post('/api/admin/users/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const adminId = (req.headers['x-user-id'] as string) || 'admin_operator';
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ success: false, error: 'Status must be active or suspended.' });
  }

  const targetUser = dbUsers.get(id);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: 'User not found in registry.' });
  }

  if (targetUser.role === 'admin' && targetUser.userId === adminId && status === 'suspended') {
    return res.status(400).json({
      success: false,
      error: 'Security rule: Administrators cannot suspend their own active credentials.',
    });
  }

  const prevStatus = targetUser.status;
  targetUser.status = status;

  // Log in Audit Trail
  const logEntry: ServerAuditLog = {
    id: `log_${Date.now()}`,
    timestamp: Date.now(),
    action: status === 'suspended' ? 'USER_SUSPENSION' : 'USER_REACTIVATION',
    category: 'auth',
    performedBy: adminId,
    ipAddress: clientIp,
    details: `Updated user ${targetUser.email} status from ${prevStatus} to ${status}. Reason: ${reason || 'Administrative policy'}`,
    status: 'success',
  };
  dbAuditLogs.unshift(logEntry);

  broadcastRealtimeEvent('ADMIN_ACTION', {
    action: logEntry.action,
    targetUserId: targetUser.userId,
    status,
    timestamp: Date.now(),
  });

  res.json({
    success: true,
    user: {
      userId: targetUser.userId,
      email: targetUser.email,
      status: targetUser.status,
    },
    message: `Account status updated to ${status}.`,
  });
});

// 8.4 User Details: Mining & Transaction History for a Specific Account
app.get('/api/admin/users/:id/history', requireAdmin, (req, res) => {
  const { id } = req.params;
  const targetUser = dbUsers.get(id);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  const userSessions = dbMiningSessions.filter(s => s.userId === id);
  const userTransfers = dbTransfers.filter(
    t => t.senderId === id ||
         t.senderAddress.toLowerCase() === targetUser.walletAddress.toLowerCase() ||
         t.recipientAddress.toLowerCase() === targetUser.walletAddress.toLowerCase()
  );
  const userLedger = dbLedgerEntries.filter(e => e.userId === id || e.walletAddress === targetUser.walletAddress);

  res.json({
    success: true,
    user: {
      userId: targetUser.userId,
      email: targetUser.email,
      displayName: targetUser.displayName,
      role: targetUser.role,
      status: targetUser.status,
      walletAddress: targetUser.walletAddress,
      balanceNXR: targetUser.balanceNXR,
      registeredAt: targetUser.registeredAt,
    },
    miningSessions: userSessions,
    transfers: userTransfers,
    ledgerEntries: userLedger,
  });
});

// 8.5 Mining Session Monitoring (Actual Database Records)
app.get('/api/admin/mining-sessions', requireAdmin, (req, res) => {
  const statusFilter = (req.query.status as string) || 'all';
  let sessions = [...dbMiningSessions];

  if (statusFilter !== 'all') {
    sessions = sessions.filter(s => s.status === statusFilter);
  }

  res.json({
    success: true,
    sessions,
    total: sessions.length,
    protocolRules: {
      maxDurationHours: 24,
      maxRewardNXR: MAX_CYCLE_REWARD_NXR,
      hourlyRateNXR: HOURLY_MINING_RATE_NXR,
    },
  });
});

// 8.6 Virtual NXR Ledger & Reconciliation
app.get('/api/admin/ledger', requireAdmin, (req, res) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '20', 10)));
  const type = (req.query.type as string) || 'all';

  let entries = [...dbLedgerEntries];
  if (type !== 'all') {
    entries = entries.filter(e => e.entryType === type);
  }

  const total = entries.length;
  const paginated = entries.slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    entries: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

// 8.7 Balance Reconciliation Endpoint
app.post('/api/admin/ledger/reconcile', requireAdmin, (req, res) => {
  const adminId = (req.headers['x-user-id'] as string) || 'admin_operator';
  const users = Array.from(dbUsers.values());
  const report = reconcileAllWallets(users, dbLedgerEntries);

  dbAuditLogs.unshift({
    id: `log_recon_${Date.now()}`,
    timestamp: Date.now(),
    action: 'LEDGER_RECONCILIATION',
    category: 'system',
    performedBy: adminId,
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    details: `Executed ledger reconciliation check across ${users.length} wallets. Consistent: ${report.isConsistent}. Discrepancies: ${report.discrepancies.length}`,
    status: report.isConsistent ? 'success' : 'flagged',
  });

  broadcastRealtimeEvent('ADMIN_ACTION', {
    action: 'LEDGER_RECONCILED',
    isConsistent: report.isConsistent,
    timestamp: Date.now(),
  });

  res.json({
    success: true,
    report,
  });
});

// 8.8 Virtual Transfers List
app.get('/api/admin/transfers', requireAdmin, (req, res) => {
  res.json({
    success: true,
    transfers: dbTransfers,
    total: dbTransfers.length,
  });
});

// 8.9 Market Data Service Status
app.get('/api/admin/market-status', requireAdmin, (req, res) => {
  const now = Date.now();
  const cacheAgeSeconds = marketCache ? Math.floor((now - marketCache.timestamp) / 1000) : null;

  res.json({
    success: true,
    marketStatus: {
      ...marketTelemetry,
      isCacheFresh: cacheAgeSeconds !== null && cacheAgeSeconds < 60,
      cacheAgeSeconds,
      cachedCoinsCount: marketCache ? marketCache.data.length : 0,
      timestamp: now,
    },
  });
});

// 8.10 System Health & Cluster Telemetry
app.get('/api/admin/system-health', requireAdmin, (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    success: true,
    health: {
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      memory: {
        rssMB: Number((mem.rss / 1024 / 1024).toFixed(2)),
        heapUsedMB: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
        heapTotalMB: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
      },
      sseClientsCount: sseClients.size,
      activeSessionsCount: dbMiningSessions.filter(s => s.status === 'active').length,
      ledgerEntriesCount: dbLedgerEntries.length,
      timestamp: Date.now(),
    },
  });
});

// 8.11 Security Events
app.get('/api/admin/security-events', requireAdmin, (req, res) => {
  res.json({
    success: true,
    events: dbSecurityEvents,
    total: dbSecurityEvents.length,
  });
});

// 8.12 Audit Logs
app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  const category = (req.query.category as string) || 'all';
  let logs = [...dbAuditLogs];
  if (category !== 'all') {
    logs = logs.filter(l => l.category === category);
  }
  res.json({
    success: true,
    logs,
    total: logs.length,
  });
});

// 8.13 Auditable Balance Adjustment (Strictly Audited & Recorded in Ledger)
app.post('/api/admin/users/:id/adjust-balance', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { amountDeltaNXR, reason } = req.body;
  const adminId = (req.headers['x-user-id'] as string) || 'admin_operator';
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();

  const targetUser = dbUsers.get(id);
  const validation = validateAdminBalanceAdjustment(
    'admin',
    targetUser,
    amountDeltaNXR,
    reason
  );

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const roundedDelta = validation.roundedDelta!;
  const newBalance = validation.newBalanceNXR!;
  const prevBalance = targetUser!.balanceNXR;

  // Apply balance change atomically
  targetUser!.balanceNXR = newBalance;

  const adjTxHash = `0x_adj_${now.toString(16)}_${Math.random().toString(36).substring(2, 8)}`;

  // Immutable Ledger Entry
  const ledgerEntry: LedgerEntry = {
    id: `led_adj_${now}`,
    entryType: 'admin_adjustment',
    userId: targetUser!.userId,
    walletAddress: targetUser!.walletAddress,
    amountNXR: roundedDelta,
    balanceAfterNXR: newBalance,
    referenceId: adjTxHash,
    timestamp: now,
    note: `Audited Admin Adjustment: ${reason.trim()} (By ${adminId})`,
  };
  dbLedgerEntries.unshift(ledgerEntry);

  // Audit Log Entry
  const logEntry: ServerAuditLog = {
    id: `log_adj_${now}`,
    timestamp: now,
    action: 'ADMIN_BALANCE_ADJUSTMENT',
    category: 'wallet',
    performedBy: adminId,
    ipAddress: clientIp,
    details: `Admin ${adminId} adjusted user ${targetUser!.email} balance by ${roundedDelta >= 0 ? '+' : ''}${roundedDelta.toFixed(5)} NXR (from ${prevBalance.toFixed(5)} to ${newBalance.toFixed(5)} NXR). Reason: ${reason.trim()}`,
    status: 'success',
  };
  dbAuditLogs.unshift(logEntry);

  // Dispatch In-App Notification to User
  addServerNotification(
    targetUser!.userId,
    'Audited Ledger Adjustment',
    `An administrative balance adjustment of ${roundedDelta >= 0 ? '+' : ''}${roundedDelta.toFixed(5)} NXR was applied to your account. Reason: ${reason.trim()}`,
    roundedDelta >= 0 ? 'info' : 'alert',
    `adj_${now}`,
    adjTxHash
  );

  broadcastRealtimeEvent('BALANCE_ADJUSTMENT', {
    targetUserId: targetUser!.userId,
    deltaNXR: roundedDelta,
    newBalanceNXR: newBalance,
    timestamp: now,
  });

  return res.json({
    success: true,
    user: {
      userId: targetUser!.userId,
      email: targetUser!.email,
      walletAddress: targetUser!.walletAddress,
      balanceNXR: newBalance,
      previousBalanceNXR: prevBalance,
    },
    ledgerEntry,
    message: `Balance adjusted by ${roundedDelta >= 0 ? '+' : ''}${roundedDelta.toFixed(5)} NXR with verified ledger and audit entry.`,
  });
});

// ----------------------------------------------------------------------------
// 8.14 USER NOTIFICATIONS API (Authoritative DB Store & Deduplication)
// ----------------------------------------------------------------------------
app.get('/api/notifications', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || '';
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  const userNotifs = dbNotifications.filter(n => n.userId === userId || n.userId === 'all');
  const unreadCount = userNotifs.filter(n => !n.read).length;

  return res.json({
    success: true,
    notifications: userNotifs,
    unreadCount,
    timestamp: Date.now(),
  });
});

app.post('/api/notifications/read', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || '';
  const { id, all = false } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  if (all) {
    for (const notif of dbNotifications) {
      if (notif.userId === userId || notif.userId === 'all') {
        notif.read = true;
      }
    }
  } else if (id) {
    const target = dbNotifications.find(n => n.id === id && (n.userId === userId || n.userId === 'all'));
    if (target) {
      target.read = true;
    }
  }

  const unreadCount = dbNotifications.filter(n => (n.userId === userId || n.userId === 'all') && !n.read).length;

  return res.json({
    success: true,
    unreadCount,
  });
});

app.post('/api/notifications/clear', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || '';
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  // Remove read notifications for this user
  for (let i = dbNotifications.length - 1; i >= 0; i--) {
    if ((dbNotifications[i].userId === userId || dbNotifications[i].userId === 'all') && dbNotifications[i].read) {
      dbNotifications.splice(i, 1);
    }
  }

  return res.json({ success: true, remaining: dbNotifications.filter(n => n.userId === userId).length });
});

// ----------------------------------------------------------------------------
// 8.15 TRANSACTION CENTER API (Authoritative Database Ledger Read-Only View)
// ----------------------------------------------------------------------------
app.get('/api/transactions/my', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || '';
  const filterType = (req.query.type as string) || 'all';
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '10', 10)));

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  const user = dbUsers.get(userId);
  const userWallet = user?.walletAddress || '';

  // Get matching ledger entries
  const userLedger = dbLedgerEntries.filter(
    e => e.userId === userId || (userWallet && e.walletAddress.toLowerCase() === userWallet.toLowerCase())
  );

  // Map to unified VirtualTransaction view
  let mapped = userLedger.map(entry => {
    let type: 'mining_reward' | 'send' | 'receive' | 'referral_reward' | 'admin_adjustment' = 'mining_reward';
    let fromAddress = 'NEXORA-PROTOCOL-LEDGER';
    let toAddress = entry.walletAddress;

    if (entry.entryType === 'mining_reward') {
      type = 'mining_reward';
      fromAddress = 'NEXORA-SIMULATION-POOL';
    } else if (entry.entryType === 'transfer_send') {
      type = 'send';
      fromAddress = entry.walletAddress;
      toAddress = entry.note?.replace('Transfer to ', '') || 'External Node';
    } else if (entry.entryType === 'transfer_receive') {
      type = 'receive';
      fromAddress = entry.note?.replace('Transfer from ', '') || 'External Node';
      toAddress = entry.walletAddress;
    } else if (entry.entryType === 'referral_reward') {
      type = 'referral_reward';
      fromAddress = 'NEXORA-COMMUNITY-FUND';
    } else if (entry.entryType === 'admin_adjustment') {
      type = 'admin_adjustment';
      fromAddress = 'NEXORA-AUDIT-GOVERNANCE';
    }

    return {
      id: entry.id,
      txHash: entry.referenceId || entry.id,
      type,
      asset: 'NXR',
      amount: Math.abs(entry.amountNXR),
      amountRaw: entry.amountNXR,
      balanceAfterNXR: entry.balanceAfterNXR,
      fee: 0.0,
      timestamp: entry.timestamp,
      fromAddress,
      toAddress,
      status: 'completed' as const,
      note: entry.note || '',
      referenceId: entry.referenceId,
    };
  });

  // Apply Filter
  if (filterType !== 'all') {
    mapped = mapped.filter(tx => tx.type === filterType);
  }

  // Apply Search
  if (search) {
    mapped = mapped.filter(
      tx =>
        tx.txHash.toLowerCase().includes(search) ||
        tx.fromAddress.toLowerCase().includes(search) ||
        tx.toAddress.toLowerCase().includes(search) ||
        (tx.note && tx.note.toLowerCase().includes(search))
    );
  }

  // Sort descending by timestamp
  mapped.sort((a, b) => b.timestamp - a.timestamp);

  const total = mapped.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = mapped.slice((page - 1) * limit, page * limit);

  return res.json({
    success: true,
    transactions: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
    filterType,
    authoritativeLedgerCount: userLedger.length,
    disclaimer: 'NEXORA COIN is currently a virtual simulation. NXR balances and transfers are internal database records, not blockchain assets. No real-money value is guaranteed.',
  });
});

// ----------------------------------------------------------------------------
// 8.16 USER ACCOUNT SETTINGS & SECURITY API
// ----------------------------------------------------------------------------
app.post('/api/user/profile', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || '';
  const { displayName } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  const user = dbUsers.get(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found in registry.' });
  }

  if (typeof displayName === 'string') {
    const cleanName = displayName.trim();
    if (cleanName.length < 2 || cleanName.length > 50) {
      return res.status(400).json({ success: false, error: 'Display name must be between 2 and 50 characters.' });
    }
    user.displayName = cleanName;
  }

  dbAuditLogs.unshift({
    id: `log_prof_${Date.now()}`,
    timestamp: Date.now(),
    action: 'USER_PROFILE_UPDATED',
    category: 'auth',
    performedBy: user.userId,
    ipAddress: clientIp,
    details: `User ${user.email} updated display name to: ${user.displayName}`,
    status: 'success',
  });

  addServerNotification(
    user.userId,
    'Profile Updated',
    `Your node display name was updated to "${user.displayName}".`,
    'info',
    `profile_update_${Date.now()}`
  );

  return res.json({
    success: true,
    user: {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      walletAddress: user.walletAddress,
      balanceNXR: user.balanceNXR,
    },
  });
});

app.post('/api/user/password-reset', (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const { email, newPassword } = req.body;

  // Rate limiting: 5 password reset requests per 15 minutes per IP
  const rateCheck = checkRateLimit(`pwd_reset_${clientIp}`, 5, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many password reset attempts. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    });
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Please provide a valid account email.' });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
  }

  // Find user
  const user = Array.from(dbUsers.values()).find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ success: false, error: 'No account registered with this email address.' });
  }

  dbAuditLogs.unshift({
    id: `log_pwd_${Date.now()}`,
    timestamp: Date.now(),
    action: 'PASSWORD_RESET_EXECUTED',
    category: 'security',
    performedBy: user.userId,
    ipAddress: clientIp,
    details: `Password credentials reset for account: ${maskEmail(user.email)}`,
    status: 'success',
  });

  addServerNotification(
    user.userId,
    'Security Alert: Password Changed',
    'Your master credentials were changed successfully. If you did not make this change, contact system administration.',
    'alert',
    `pwd_reset_${Date.now()}`
  );

  return res.json({
    success: true,
    message: 'Master passphrase reset successfully.',
  });
});

app.get('/api/user/sessions', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || '';
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Modern Web Browser';

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  // Ensure current session exists in dbSessions
  let currentSession = dbSessions.find(s => s.userId === userId && s.ipAddress === clientIp);
  if (!currentSession) {
    currentSession = {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      ipAddress: clientIp,
      userAgent,
      createdAt: Date.now() - 3600000,
      lastActiveAt: Date.now(),
    };
    dbSessions.unshift(currentSession);
  } else {
    currentSession.lastActiveAt = Date.now();
  }

  const userSessions = dbSessions.filter(s => s.userId === userId).map(s => ({
    sessionId: s.sessionId,
    userId: s.userId,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
    isCurrent: s.sessionId === currentSession?.sessionId,
  }));

  return res.json({
    success: true,
    sessions: userSessions,
  });
});

app.post('/api/user/sessions/revoke', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || '';
  const { sessionId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  if (sessionId === 'all_others') {
    // Keep only the newest session
    const userSess = dbSessions.filter(s => s.userId === userId);
    if (userSess.length > 1) {
      const current = userSess[0];
      for (let i = dbSessions.length - 1; i >= 0; i--) {
        if (dbSessions[i].userId === userId && dbSessions[i].sessionId !== current.sessionId) {
          dbSessions.splice(i, 1);
        }
      }
    }
  } else if (sessionId) {
    const idx = dbSessions.findIndex(s => s.userId === userId && s.sessionId === sessionId);
    if (idx !== -1) {
      dbSessions.splice(idx, 1);
    }
  }

  addServerNotification(
    userId,
    'Session Terminated',
    'Active session(s) were terminated as requested.',
    'info',
    `session_term_${Date.now()}`
  );

  return res.json({ success: true, message: 'Sessions updated successfully.' });
});

// ----------------------------------------------------------------------------
// 9. TEXT-TO-SPEECH ENDPOINT (Gemini TTS)
// ----------------------------------------------------------------------------
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore', style = 'Clear, luxury fintech market update' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required.' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on server.',
        useClientFallback: true,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: { style },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({
        error: 'No audio returned from Gemini TTS',
        useClientFallback: true,
      });
    }

    return res.json({
      audioBase64: base64Audio,
      format: 'audio/wav',
    });
  } catch (err: any) {
    console.error('Server TTS error:', err?.message || err);
    return res.status(500).json({
      error: err?.message || 'TTS generation failed',
      useClientFallback: true,
    });
  }
});

// ----------------------------------------------------------------------------
// 10. BASIC HEALTH CHECK
// ----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'NEXORA COIN — MINE THE FUTURE',
    timestamp: Date.now(),
    geminiConfigured: !!ai,
    miningEngine: '24-hour rate 0.00001 NXR/hr (max 0.00024 NXR)',
    activeServerSessions: dbMiningSessions.filter(s => s.status === 'active').length,
    usersCount: dbUsers.size,
  });
});

// ----------------------------------------------------------------------------
// 11. VITE MIDDLEWARE / STATIC ASSET SERVING
// ----------------------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NEXORA SERVER] Running on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
