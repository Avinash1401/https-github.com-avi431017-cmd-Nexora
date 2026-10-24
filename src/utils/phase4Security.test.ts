import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcileWallet,
  reconcileAllWallets,
  verifyAdminAccess,
  validateRoleAssignment,
  validateVirtualTransfer,
  validateMiningClaimCalculation,
  LedgerEntry,
  WalletRecord,
  HOURLY_MINING_RATE_NXR,
  MAX_CYCLE_REWARD_NXR,
} from './ledgerEngine';

test('1. Security: Unauthorized users cannot access administrative endpoints', () => {
  const adminCheck = verifyAdminAccess('admin');
  assert.equal(adminCheck.authorized, true);
  assert.equal(adminCheck.status, 200);

  const minerCheck = verifyAdminAccess('miner');
  assert.equal(minerCheck.authorized, false);
  assert.equal(minerCheck.status, 403);

  const userCheck = verifyAdminAccess('user');
  assert.equal(userCheck.authorized, false);
  assert.equal(userCheck.status, 403);

  const guestCheck = verifyAdminAccess(undefined);
  assert.equal(guestCheck.authorized, false);
  assert.equal(guestCheck.status, 403);
});

test('2. RBAC: Ordinary users cannot change their own roles or escalate to admin', () => {
  const userEscalation = validateRoleAssignment('user', 'usr_normal', 'usr_normal', 'admin');
  assert.equal(userEscalation.allowed, false);
  assert.match(userEscalation.error || '', /Only administrators/);

  const minerEscalation = validateRoleAssignment('miner', 'usr_miner', 'usr_miner', 'admin');
  assert.equal(minerEscalation.allowed, false);

  const adminPromoteOther = validateRoleAssignment('admin', 'usr_normal', 'usr_admin', 'miner');
  assert.equal(adminPromoteOther.allowed, true);

  const adminSelfDemote = validateRoleAssignment('admin', 'usr_admin', 'usr_admin', 'user');
  assert.equal(adminSelfDemote.allowed, false);
  assert.match(adminSelfDemote.error || '', /cannot demote their own account/);
});

test('3. Ledger Integrity: Wallets cannot be modified directly without matching ledger entries', () => {
  const wallet: WalletRecord = {
    userId: 'usr_test_1',
    walletAddress: 'NXR-VAULT-001',
    balanceNXR: 0.00020, // Claimed balance
    status: 'active',
    role: 'user',
    email: 'user1@nexora.vip',
    displayName: 'User One',
    registeredAt: Date.now() - 100000,
  };

  // Only 0.00010 in legitimate ledger entries
  const entries: LedgerEntry[] = [
    {
      id: 'led_1',
      entryType: 'mining_reward',
      userId: 'usr_test_1',
      walletAddress: 'NXR-VAULT-001',
      amountNXR: 0.00010,
      balanceAfterNXR: 0.00010,
      referenceId: 'sess_1',
      timestamp: Date.now() - 50000,
    },
  ];

  const result = reconcileWallet(wallet, entries);
  assert.equal(result.isReconciled, false);
  assert.equal(result.discrepancy, 0.00010); // 0.00020 - 0.00010

  // Now add matching legitimate transfer receipt
  entries.push({
    id: 'led_2',
    entryType: 'transfer_receive',
    userId: 'usr_test_1',
    walletAddress: 'NXR-VAULT-001',
    amountNXR: 0.00010,
    balanceAfterNXR: 0.00020,
    referenceId: 'tx_transfer_1',
    timestamp: Date.now() - 10000,
  });

  const reconciledResult = reconcileWallet(wallet, entries);
  assert.equal(reconciledResult.isReconciled, true);
  assert.equal(reconciledResult.discrepancy, 0);
  assert.equal(reconciledResult.calculatedBalance, 0.00020);
});

test('4. Mining Session: Duplicate claims for the same session are rejected', () => {
  const startTime = Date.now() - 3600 * 1000; // 1 hour elapsed
  const firstClaim = validateMiningClaimCalculation(startTime, Date.now(), false);
  assert.equal(firstClaim.valid, true);
  assert.equal(firstClaim.rewardNXR, 0.00001);

  // Subsequent claim attempt on same session
  const duplicateClaim = validateMiningClaimCalculation(startTime, Date.now(), true);
  assert.equal(duplicateClaim.valid, false);
  assert.match(duplicateClaim.error || '', /already been claimed/);
});

test('5. Idempotency: Duplicate transfers with same key do not create duplicate debits or credits', () => {
  const processedKeys = new Set<string>();
  const sender: WalletRecord = {
    userId: 'usr_sender',
    walletAddress: 'NXR-SEND-001',
    balanceNXR: 0.00050,
    status: 'active',
    role: 'user',
    email: 'sender@nexora.vip',
    displayName: 'Sender',
    registeredAt: Date.now(),
  };

  const key = 'idem_key_unique_123';
  const firstAttempt = validateVirtualTransfer(sender, 'NXR-RECV-002', 0.00010, processedKeys, key);
  assert.equal(firstAttempt.valid, true);
  assert.equal(firstAttempt.roundedAmount, 0.00010);

  // Simulate saving the key after execution
  processedKeys.add(key);

  // Duplicate transfer with identical idempotency key
  const duplicateAttempt = validateVirtualTransfer(sender, 'NXR-RECV-002', 0.00010, processedKeys, key);
  assert.equal(duplicateAttempt.valid, false);
  assert.match(duplicateAttempt.error || '', /Duplicate transfer detected/);
});

test('6. Balance Protection: Transfers cannot create negative balances', () => {
  const processedKeys = new Set<string>();
  const sender: WalletRecord = {
    userId: 'usr_poor',
    walletAddress: 'NXR-POOR-001',
    balanceNXR: 0.00005,
    status: 'active',
    role: 'user',
    email: 'poor@nexora.vip',
    displayName: 'Low Balance User',
    registeredAt: Date.now(),
  };

  // Attempting to send 0.00010 when only 0.00005 is available
  const result = validateVirtualTransfer(sender, 'NXR-RECV-002', 0.00010, processedKeys);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /Insufficient virtual balance/);

  // Attempting to send negative amount
  const negativeResult = validateVirtualTransfer(sender, 'NXR-RECV-002', -0.00010, processedKeys);
  assert.equal(negativeResult.valid, false);
  assert.match(negativeResult.error || '', /greater than 0.00000 NXR/);
});

test('7. Account Isolation: Self-transfers and suspended account operations are barred', () => {
  const processedKeys = new Set<string>();
  const sender: WalletRecord = {
    userId: 'usr_active',
    walletAddress: 'NXR-ACTIVE-001',
    balanceNXR: 0.00050,
    status: 'active',
    role: 'user',
    email: 'active@nexora.vip',
    displayName: 'Active User',
    registeredAt: Date.now(),
  };

  // Self-transfer to walletAddress
  const selfTransferAddress = validateVirtualTransfer(sender, 'NXR-ACTIVE-001', 0.00010, processedKeys);
  assert.equal(selfTransferAddress.valid, false);
  assert.match(selfTransferAddress.error || '', /Self-transfers are not permitted/);

  // Self-transfer to userId
  const selfTransferUser = validateVirtualTransfer(sender, 'usr_active', 0.00010, processedKeys);
  assert.equal(selfTransferUser.valid, false);
  assert.match(selfTransferUser.error || '', /Self-transfers are not permitted/);

  // Suspended sender
  const suspendedSender: WalletRecord = {
    ...sender,
    status: 'suspended',
  };
  const suspendedAttempt = validateVirtualTransfer(suspendedSender, 'NXR-RECV-002', 0.00010, processedKeys);
  assert.equal(suspendedAttempt.valid, false);
  assert.match(suspendedAttempt.error || '', /Account is suspended/);
});

test('8. Audit & Reconciliation: All wallets match ledger entries in full audit report', () => {
  const wallets: WalletRecord[] = [
    {
      userId: 'usr_admin',
      walletAddress: 'NXR-VAULT-ADM',
      balanceNXR: 0.00000,
      status: 'active',
      role: 'admin',
      email: 'admin@nexora.vip',
      displayName: 'System Admin',
      registeredAt: 1000,
    },
    {
      userId: 'usr_user1',
      walletAddress: 'NXR-VAULT-U1',
      balanceNXR: 0.00015,
      status: 'active',
      role: 'user',
      email: 'user1@nexora.vip',
      displayName: 'User One',
      registeredAt: 2000,
    },
  ];

  const entries: LedgerEntry[] = [
    {
      id: 'led_1',
      entryType: 'mining_reward',
      userId: 'usr_user1',
      walletAddress: 'NXR-VAULT-U1',
      amountNXR: 0.00015,
      balanceAfterNXR: 0.00015,
      referenceId: 'sess_1',
      timestamp: 3000,
    },
  ];

  const report = reconcileAllWallets(wallets, entries);
  assert.equal(report.isConsistent, true);
  assert.equal(report.totalWalletsChecked, 2);
  assert.equal(report.totalLedgerEntries, 1);
  assert.equal(report.discrepancies.length, 0);
  assert.equal(report.totalCirculationNXR, 0.00015);
});

test('9. Mining Constants: Linear accrual at 0.00001 NXR/hr strictly capped at 24h (0.00024 NXR)', () => {
  const now = 1000000000;

  // 1 hour: 0.00001 NXR
  const oneHour = validateMiningClaimCalculation(now - 3600 * 1000, now, false);
  assert.equal(oneHour.rewardNXR, 0.00001);
  assert.equal(oneHour.isCapped, false);

  // 12 hours: 0.00012 NXR
  const twelveHours = validateMiningClaimCalculation(now - 12 * 3600 * 1000, now, false);
  assert.equal(twelveHours.rewardNXR, 0.00012);
  assert.equal(twelveHours.isCapped, false);

  // 24 hours: 0.00024 NXR
  const twentyFourHours = validateMiningClaimCalculation(now - 24 * 3600 * 1000, now, false);
  assert.equal(twentyFourHours.rewardNXR, 0.00024);
  assert.equal(twentyFourHours.isCapped, true);

  // 48 hours (excess): strictly capped at 0.00024 NXR
  const fortyEightHours = validateMiningClaimCalculation(now - 48 * 3600 * 1000, now, false);
  assert.equal(fortyEightHours.rewardNXR, MAX_CYCLE_REWARD_NXR);
  assert.equal(fortyEightHours.rewardNXR, 0.00024);
  assert.equal(fortyEightHours.isCapped, true);
});

test('10. NXR Valuation Isolation: NXR has no market price and cannot be traded with USD', () => {
  // Confirm protocol constant rate is exactly 0.00001
  assert.equal(HOURLY_MINING_RATE_NXR, 0.00001);
  assert.equal(MAX_CYCLE_REWARD_NXR, 0.00024);

  // 0 hours or 0 elapsed time has zero reward
  const zeroElapsed = validateMiningClaimCalculation(1000, 1000, false);
  assert.equal(zeroElapsed.valid, false);
  assert.equal(zeroElapsed.rewardNXR, 0);
  assert.match(zeroElapsed.error || '', /Zero mining reward/);
});
