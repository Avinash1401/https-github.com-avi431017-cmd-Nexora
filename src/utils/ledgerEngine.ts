/**
 * Pure Ledger and Security Engine for NEXORA COIN
 * Provides atomic calculations, reconciliation, and RBAC validations
 * Used by backend server.ts and unit testing suite
 */

export interface LedgerEntry {
  id: string;
  entryType: 'mining_reward' | 'transfer_send' | 'transfer_receive' | 'admin_adjustment' | 'referral_reward';
  userId: string;
  walletAddress: string;
  amountNXR: number;
  balanceAfterNXR: number;
  referenceId: string;
  timestamp: number;
  idempotencyKey?: string;
  note?: string;
}

export interface WalletRecord {
  userId: string;
  walletAddress: string;
  balanceNXR: number;
  status: 'active' | 'suspended';
  role: 'admin' | 'miner' | 'user';
  email: string;
  displayName: string;
  registeredAt: number;
  referralCode?: string;
  referredBy?: string;
}

export interface ReconciliationReport {
  isConsistent: boolean;
  totalWalletsChecked: number;
  totalLedgerEntries: number;
  discrepancies: Array<{
    userId: string;
    walletAddress: string;
    walletBalance: number;
    ledgerSum: number;
    difference: number;
  }>;
  totalCirculationNXR: number;
  reconciledAt: number;
}

export const HOURLY_MINING_RATE_NXR = 0.00001;
export const MAX_CYCLE_REWARD_NXR = 0.00024;
export const MAX_SESSION_DURATION_HOURS = 24;

// Base unit arithmetic constants (1 NXR = 100,000 base units, 0.00001 NXR = 1 unit)
export const NXR_DECIMALS = 5;
export const BASE_UNITS_PER_NXR = 100_000n;
export const REFERRAL_REWARD_NXR = 0.00005; // 5 base units
export const MAX_REFERRAL_COUNT_PER_USER = 10; // Max 10 referrals (0.00050 NXR total cap)

export function nxrToBaseUnits(amount: number): bigint {
  const rounded = Math.round((Number(amount) || 0) * 100_000);
  return BigInt(rounded);
}

export function baseUnitsToNxr(units: bigint): number {
  return Number(units) / 100_000;
}

export function addNxrBaseUnits(a: number, b: number): number {
  const sum = nxrToBaseUnits(a) + nxrToBaseUnits(b);
  return baseUnitsToNxr(sum);
}

export function subtractNxrBaseUnits(a: number, b: number): number {
  const diff = nxrToBaseUnits(a) - nxrToBaseUnits(b);
  return baseUnitsToNxr(diff);
}

/**
 * Reconcile a single wallet's balance against its ledger entries
 */
export function reconcileWallet(
  wallet: WalletRecord,
  entries: LedgerEntry[]
): { isReconciled: boolean; calculatedBalance: number; discrepancy: number } {
  const walletEntries = entries.filter(
    e => e.walletAddress === wallet.walletAddress || e.userId === wallet.userId
  );

  const calculatedBalance = walletEntries.reduce((sum, entry) => {
    return Number((sum + entry.amountNXR).toFixed(5));
  }, 0.0);

  const discrepancy = Number((wallet.balanceNXR - calculatedBalance).toFixed(5));
  const isReconciled = Math.abs(discrepancy) < 0.000001;

  return {
    isReconciled,
    calculatedBalance,
    discrepancy,
  };
}

/**
 * Reconcile the entire virtual ledger against all wallet records
 */
export function reconcileAllWallets(
  wallets: WalletRecord[],
  entries: LedgerEntry[]
): ReconciliationReport {
  const discrepancies: ReconciliationReport['discrepancies'] = [];
  let totalCirculation = 0.0;

  for (const wallet of wallets) {
    totalCirculation = Number((totalCirculation + wallet.balanceNXR).toFixed(5));
    const result = reconcileWallet(wallet, entries);
    if (!result.isReconciled) {
      discrepancies.push({
        userId: wallet.userId,
        walletAddress: wallet.walletAddress,
        walletBalance: wallet.balanceNXR,
        ledgerSum: result.calculatedBalance,
        difference: result.discrepancy,
      });
    }
  }

  return {
    isConsistent: discrepancies.length === 0,
    totalWalletsChecked: wallets.length,
    totalLedgerEntries: entries.length,
    discrepancies,
    totalCirculationNXR: totalCirculation,
    reconciledAt: Date.now(),
  };
}

/**
 * Validates whether a user can perform an administrative action
 */
export function verifyAdminAccess(actorRole: string | undefined): {
  authorized: boolean;
  status: 200 | 403;
  error?: string;
} {
  if (!actorRole || actorRole !== 'admin') {
    return {
      authorized: false,
      status: 403,
      error: 'Access denied: Requires verified administrator privileges.',
    };
  }
  return { authorized: true, status: 200 };
}

/**
 * Validates role escalation attempts: ordinary users cannot assign themselves admin role
 */
export function validateRoleAssignment(
  requestorRole: string,
  targetUserId: string,
  requestorUserId: string,
  newRole: string
): { allowed: boolean; error?: string } {
  if (requestorRole !== 'admin') {
    return {
      allowed: false,
      error: 'Security violation: Only administrators can update account roles.',
    };
  }

  if (targetUserId === requestorUserId && newRole !== 'admin') {
    return {
      allowed: false,
      error: 'Safety check: Administrators cannot demote their own account.',
    };
  }

  return { allowed: true };
}

/**
 * Validates a virtual transfer before execution
 */
export function validateVirtualTransfer(
  sender: WalletRecord | undefined,
  recipientAddress: string,
  amount: number,
  processedKeys: Set<string>,
  idempotencyKey?: string
): { valid: boolean; error?: string; roundedAmount?: number } {
  if (!sender) {
    return { valid: false, error: 'Sender wallet not found.' };
  }

  if (sender.status === 'suspended') {
    return { valid: false, error: 'Account is suspended. Transfers are restricted.' };
  }

  if (idempotencyKey && processedKeys.has(idempotencyKey)) {
    return {
      valid: false,
      error: 'Duplicate transfer detected: This idempotency key has already been executed.',
    };
  }

  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Transfer amount must be greater than 0.00000 NXR.' };
  }

  const roundedAmount = Number(amount.toFixed(5));
  if (roundedAmount <= 0) {
    return { valid: false, error: 'Minimum transfer amount is 0.00001 NXR.' };
  }

  if (!recipientAddress || recipientAddress.trim().length < 5) {
    return { valid: false, error: 'Please enter a valid recipient address or user ID.' };
  }

  if (
    recipientAddress.trim().toLowerCase() === sender.walletAddress.toLowerCase() ||
    recipientAddress.trim().toLowerCase() === sender.userId.toLowerCase()
  ) {
    return { valid: false, error: 'Self-transfers are not permitted.' };
  }

  if (sender.balanceNXR < roundedAmount) {
    return {
      valid: false,
      error: `Insufficient virtual balance. Available: ${sender.balanceNXR.toFixed(5)} NXR, Requested: ${roundedAmount.toFixed(5)} NXR.`,
    };
  }

  return { valid: true, roundedAmount };
}

export interface ClientMiningReport {
  clientTimestamp?: number;
  clientElapsedSeconds?: number;
  claimedRewardNXR?: number;
}

export interface MiningVerificationResult {
  valid: boolean;
  rewardNXR: number;
  rewardBaseUnits: bigint;
  elapsedSeconds: number;
  clampedSeconds: number;
  isCapped: boolean;
  clockManipulationDetected: boolean;
  manipulationDetails?: string;
  error?: string;
}

/**
 * Validates mining claim parameters based on elapsed time and server DB start timestamp.
 * Strictly prevents client-side clock manipulation and enforces a maximum cap of 0.00024 NXR.
 */
export function validateMiningClaimCalculation(
  startedAt: number,
  now: number,
  alreadyClaimed: boolean,
  clientReport?: ClientMiningReport
): MiningVerificationResult {
  if (alreadyClaimed) {
    return {
      valid: false,
      rewardNXR: 0,
      rewardBaseUnits: 0n,
      elapsedSeconds: 0,
      clampedSeconds: 0,
      isCapped: false,
      clockManipulationDetected: false,
      error: 'Rewards for this session have already been claimed.',
    };
  }

  // Prevent server clock rollback or invalid future start timestamps
  if (now < startedAt) {
    return {
      valid: false,
      rewardNXR: 0,
      rewardBaseUnits: 0n,
      elapsedSeconds: 0,
      clampedSeconds: 0,
      isCapped: false,
      clockManipulationDetected: true,
      manipulationDetails: `Server clock skew anomaly: current time (${now}) is earlier than session start (${startedAt})`,
      error: 'Invalid session timing: Server current time precedes session start timestamp.',
    };
  }

  const rawElapsed = (now - startedAt) / 1000;
  const clampedElapsed = Math.min(86400, Math.max(0, rawElapsed));
  const hours = clampedElapsed / 3600;

  // Accrue at exactly 0.00001 NXR per hour, strictly capped at 0.00024 NXR (24 base units)
  const rawReward = Number((hours * HOURLY_MINING_RATE_NXR).toFixed(5));
  const rewardNXR = Math.min(MAX_CYCLE_REWARD_NXR, rawReward);
  const rewardBaseUnits = nxrToBaseUnits(rewardNXR);

  // Client-side clock manipulation inspection
  let clockManipulationDetected = false;
  let manipulationDetails: string | undefined;
  const anomalies: string[] = [];

  if (clientReport) {
    const { clientTimestamp, clientElapsedSeconds, claimedRewardNXR } = clientReport;

    // 1. Client clock ahead of server by more than 60 seconds
    if (typeof clientTimestamp === 'number' && clientTimestamp > now + 60000) {
      clockManipulationDetected = true;
      anomalies.push(`Client local clock is ${Math.round((clientTimestamp - now) / 1000)}s ahead of server clock.`);
    }

    // 2. Client claimed elapsed seconds exceeds server-verified database elapsed seconds by >30 seconds
    if (typeof clientElapsedSeconds === 'number' && clientElapsedSeconds > rawElapsed + 30) {
      clockManipulationDetected = true;
      anomalies.push(`Client reported ${clientElapsedSeconds}s elapsed, but server database verified only ${Math.floor(rawElapsed)}s.`);
    }

    // 3. Client claimed reward exceeds server-calculated reward
    if (typeof claimedRewardNXR === 'number' && claimedRewardNXR > rewardNXR) {
      clockManipulationDetected = true;
      anomalies.push(`Client claimed ${claimedRewardNXR} NXR exceeding server verified reward of ${rewardNXR} NXR.`);
    }
  }

  if (anomalies.length > 0) {
    manipulationDetails = anomalies.join(' ');
  }

  if (rewardNXR <= 0) {
    return {
      valid: false,
      rewardNXR: 0,
      rewardBaseUnits: 0n,
      elapsedSeconds: Math.floor(rawElapsed),
      clampedSeconds: Math.floor(clampedElapsed),
      isCapped: false,
      clockManipulationDetected,
      manipulationDetails,
      error: 'Zero mining reward accumulated. Please let the session run longer.',
    };
  }

  return {
    valid: true,
    rewardNXR,
    rewardBaseUnits,
    elapsedSeconds: Math.floor(rawElapsed),
    clampedSeconds: Math.floor(clampedElapsed),
    isCapped: rawElapsed >= 86400,
    clockManipulationDetected,
    manipulationDetails,
  };
}

/**
 * Validates a referral reward claim
 */
export function validateReferralClaim(
  referrer: WalletRecord | undefined,
  newUserId: string,
  existingReferralsCount: number
): { valid: boolean; error?: string; rewardNXR: number } {
  if (!referrer) {
    return { valid: false, error: 'Referrer not found in registered accounts.', rewardNXR: 0 };
  }
  if (referrer.userId === newUserId) {
    return { valid: false, error: 'Self-referral is strictly prohibited.', rewardNXR: 0 };
  }
  if (referrer.status === 'suspended') {
    return { valid: false, error: 'Referrer account is suspended. Rewards cannot be credited.', rewardNXR: 0 };
  }
  if (existingReferralsCount >= MAX_REFERRAL_COUNT_PER_USER) {
    return {
      valid: false,
      error: `Referrer has reached the maximum cap of ${MAX_REFERRAL_COUNT_PER_USER} referrals.`,
      rewardNXR: 0,
    };
  }
  return { valid: true, rewardNXR: REFERRAL_REWARD_NXR };
}

/**
 * Validates an administrative balance adjustment.
 * Security rule: Admins cannot silently rewrite balances; all adjustments must:
 * 1. Require verified admin role
 * 2. Target an existing user wallet
 * 3. Specify a non-zero delta
 * 4. Never leave the target user with a negative balance
 * 5. Provide an auditable reason (at least 8 characters)
 */
export function validateAdminBalanceAdjustment(
  actorRole: string | undefined,
  targetWallet: WalletRecord | undefined,
  deltaNXR: number,
  reason: string
): { valid: boolean; error?: string; roundedDelta?: number; newBalanceNXR?: number } {
  if (!actorRole || actorRole.toLowerCase() !== 'admin') {
    return {
      valid: false,
      error: 'Security violation: Only administrators can execute ledger balance adjustments.',
    };
  }

  if (!targetWallet) {
    return {
      valid: false,
      error: 'Target user wallet not found in authoritative database.',
    };
  }

  if (typeof deltaNXR !== 'number' || isNaN(deltaNXR) || deltaNXR === 0) {
    return {
      valid: false,
      error: 'Adjustment delta must be a non-zero numerical value.',
    };
  }

  const roundedDelta = Number(deltaNXR.toFixed(5));
  if (roundedDelta === 0) {
    return {
      valid: false,
      error: 'Adjustment delta precision must be at least 0.00001 NXR.',
    };
  }

  const cleanReason = (reason || '').trim();
  if (cleanReason.length < 8) {
    return {
      valid: false,
      error: 'An auditable reason with at least 8 characters is strictly required for balance adjustments.',
    };
  }

  // Calculate new balance via integer base units
  let newBalance: number;
  if (roundedDelta > 0) {
    newBalance = addNxrBaseUnits(targetWallet.balanceNXR, roundedDelta);
  } else {
    const absDelta = Math.abs(roundedDelta);
    if (targetWallet.balanceNXR < absDelta) {
      return {
        valid: false,
        error: `Adjustment would cause negative balance. User has ${targetWallet.balanceNXR.toFixed(5)} NXR, attempted reduction of ${absDelta.toFixed(5)} NXR.`,
      };
    }
    newBalance = subtractNxrBaseUnits(targetWallet.balanceNXR, absDelta);
  }

  return {
    valid: true,
    roundedDelta,
    newBalanceNXR: newBalance,
  };
}
