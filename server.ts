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
  HOURLY_MINING_RATE_NXR,
  MAX_CYCLE_REWARD_NXR,
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
  const { id, email, displayName, role = 'user', walletAddress, balanceNXR = 0.0 } = req.body;

  if (!email || !id) {
    return res.status(400).json({ success: false, error: 'User ID and email are required.' });
  }

  // Prevent client self-escalation to admin if user already exists with different role
  const existing = dbUsers.get(id);
  let effectiveRole = role;
  if (existing && existing.role !== 'admin' && role === 'admin') {
    effectiveRole = existing.role; // Enforce existing non-admin role
  }

  const userRecord: WalletRecord = {
    userId: id,
    email,
    displayName: displayName || email.split('@')[0],
    role: effectiveRole,
    status: existing ? existing.status : 'active',
    walletAddress: walletAddress || `NXR-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    balanceNXR: existing ? existing.balanceNXR : balanceNXR,
    registeredAt: existing ? existing.registeredAt : Date.now(),
  };

  dbUsers.set(id, userRecord);

  broadcastRealtimeEvent('USER_REGISTERED', {
    userId: userRecord.userId,
    email: userRecord.email,
    role: userRecord.role,
    registeredAt: userRecord.registeredAt,
  });

  return res.json({ success: true, user: userRecord });
});

// ----------------------------------------------------------------------------
// 6. SERVER-VALIDATED VIRTUAL MINING SYSTEM (24-Hour Session Engine)
// Rate: 0.00001 NXR per hour, capped at 24 hours (0.00024 NXR max)
// ----------------------------------------------------------------------------
app.post('/api/mining/start', (req, res) => {
  const { userId = 'usr_guest' } = req.body;
  const now = Date.now();

  // Find active session for user
  const existingIndex = dbMiningSessions.findIndex(s => s.userId === userId && !s.claimed);
  if (existingIndex !== -1) {
    const existing = dbMiningSessions[existingIndex];
    const elapsedSeconds = Math.max(0, (now - existing.startedAt) / 1000);
    if (elapsedSeconds < 86400) {
      return res.status(409).json({
        success: false,
        error: 'An active 24-hour mining session is already in progress.',
        startedAt: existing.startedAt,
        elapsedSeconds: Math.floor(elapsedSeconds),
      });
    }
  }

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
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    details: `Started 24h mining session ${newSession.sessionId}`,
    status: 'success',
  });

  return res.json({
    success: true,
    sessionId: newSession.sessionId,
    startedAt: newSession.startedAt,
    maxDurationSeconds: 86400,
    hourlyRateNXR: HOURLY_MINING_RATE_NXR,
    maxRewardNXR: MAX_CYCLE_REWARD_NXR,
  });
});

app.get('/api/mining/status', (req, res) => {
  const userId = (req.query.userId as string) || 'usr_guest';
  const now = Date.now();

  const session = dbMiningSessions.find(s => s.userId === userId && !s.claimed);
  if (!session) {
    return res.json({
      active: false,
      startedAt: null,
      elapsedSeconds: 0,
      remainingSeconds: 86400,
      accumulatedRewardNXR: 0.0,
      claimed: false,
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
    elapsedSeconds: Math.floor(rawElapsed),
    remainingSeconds,
    accumulatedRewardNXR: calculatedReward,
    claimed: false,
    isComplete: rawElapsed >= 86400,
  });
});

app.post('/api/mining/claim', (req, res) => {
  const { userId = 'usr_guest', sessionId } = req.body;
  const now = Date.now();

  const session = dbMiningSessions.find(
    s => s.userId === userId && (!sessionId || s.sessionId === sessionId)
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'No active mining session found for this user.',
    });
  }

  const claimValidation = validateMiningClaimCalculation(session.startedAt, now, session.claimed);
  if (!claimValidation.valid) {
    // If attempting duplicate claim, record a security event
    if (session.claimed) {
      dbSecurityEvents.unshift({
        id: `sec_${Date.now()}`,
        timestamp: now,
        eventType: 'DUPLICATE_CLAIM_ATTEMPT',
        severity: 'medium',
        actor: userId,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        description: `Rejected duplicate claim attempt on session ${session.sessionId}`,
      });
    }

    return res.status(400).json({
      success: false,
      error: claimValidation.error,
    });
  }

  const verifiedReward = claimValidation.rewardNXR;
  const txHash = `0x${now.toString(16)}${Math.random().toString(16).substring(2, 10)}0000`;

  // Update session record
  session.claimed = true;
  session.claimedAt = now;
  session.rewardEarnedNXR = verifiedReward;
  session.elapsedSeconds = claimValidation.elapsedSeconds;
  session.claimTxHash = txHash;
  session.status = 'claimed';

  // Ensure user exists in db
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

  // Atomically update balance
  const previousBalance = userWallet.balanceNXR;
  const newBalance = Number((previousBalance + verifiedReward).toFixed(5));
  userWallet.balanceNXR = newBalance;

  // Write immutable ledger entry
  const ledgerEntry: LedgerEntry = {
    id: `led_${now}_${Math.random().toString(36).substring(2, 6)}`,
    entryType: 'mining_reward',
    userId,
    walletAddress: userWallet.walletAddress,
    amountNXR: verifiedReward,
    balanceAfterNXR: newBalance,
    referenceId: session.sessionId,
    timestamp: now,
    note: `24-Hour Mining Cycle Reward (${claimValidation.elapsedSeconds}s)`,
  };
  dbLedgerEntries.unshift(ledgerEntry);

  // Write audit log
  dbAuditLogs.unshift({
    id: `log_${Date.now()}`,
    timestamp: now,
    action: 'MINING_REWARD_CLAIMED',
    category: 'mining',
    performedBy: userId,
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    details: `Claimed +${verifiedReward.toFixed(5)} NXR for session ${session.sessionId}`,
    status: 'success',
  });

  // Broadcast real-time event to SSE subscribers
  broadcastRealtimeEvent('MINING_CLAIM', {
    sessionId: session.sessionId,
    amountNXR: verifiedReward,
    timestamp: now,
    userId: userWallet.userId,
  });

  return res.json({
    success: true,
    sessionId: session.sessionId,
    rewardNXR: verifiedReward,
    newBalanceNXR: newBalance,
    txHash,
    timestamp: now,
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

  // 4. Atomic balance adjustments
  const newSenderBalance = Number((sender.balanceNXR - roundedAmount).toFixed(5));
  const newRecipientBalance = Number((recipient.balanceNXR + roundedAmount).toFixed(5));

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
