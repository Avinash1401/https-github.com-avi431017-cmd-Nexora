/**
 * Pure Ledger and Security Engine for NEXORA COIN
 * Provides atomic calculations, reconciliation, and RBAC validations
 * Used by backend server.ts and unit testing suite
 */

export interface LedgerEntry {
  id: string;
  entryType: 'mining_reward' | 'transfer_send' | 'transfer_receive' | 'admin_adjustment';
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

/**
 * Validates mining claim parameters based on elapsed time
 */
export function validateMiningClaimCalculation(
  startedAt: number,
  now: number,
  alreadyClaimed: boolean
): {
  valid: boolean;
  rewardNXR: number;
  elapsedSeconds: number;
  isCapped: boolean;
  error?: string;
} {
  if (alreadyClaimed) {
    return {
      valid: false,
      rewardNXR: 0,
      elapsedSeconds: 0,
      isCapped: false,
      error: 'Rewards for this session have already been claimed.',
    };
  }

  const rawElapsed = Math.max(0, (now - startedAt) / 1000);
  const clampedElapsed = Math.min(86400, rawElapsed);
  const hours = clampedElapsed / 3600;

  // Accrue at exactly 0.00001 NXR per hour, capped at 0.00024 NXR
  const rawReward = Number((hours * HOURLY_MINING_RATE_NXR).toFixed(5));
  const rewardNXR = Math.min(MAX_CYCLE_REWARD_NXR, rawReward);

  if (rewardNXR <= 0) {
    return {
      valid: false,
      rewardNXR: 0,
      elapsedSeconds: Math.floor(rawElapsed),
      isCapped: false,
      error: 'Zero mining reward accumulated. Please let the session run longer.',
    };
  }

  return {
    valid: true,
    rewardNXR,
    elapsedSeconds: Math.floor(rawElapsed),
    isCapped: rawElapsed >= 86400,
  };
}
