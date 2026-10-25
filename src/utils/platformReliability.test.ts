import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAdminBalanceAdjustment,
  validateVirtualTransfer,
  validateMiningClaimCalculation,
  validateReferralClaim,
  reconcileWallet,
  reconcileAllWallets,
  WalletRecord,
  LedgerEntry,
  HOURLY_MINING_RATE_NXR,
  MAX_CYCLE_REWARD_NXR,
  REFERRAL_REWARD_NXR,
  addNxrBaseUnits,
  subtractNxrBaseUnits,
  nxrToBaseUnits,
} from './ledgerEngine';
import {
  evaluatePasswordStrength,
  validateRegistrationInputs,
  validateEmail,
  hasPermission,
} from './authValidation';

test('1. Admin Balance Adjustment - Validates positive and negative adjustments with auditable reason', () => {
  const targetWallet: WalletRecord = {
    userId: 'usr_test_1',
    walletAddress: 'NXR-TEST-1001',
    balanceNXR: 0.00050,
    status: 'active',
    role: 'user',
    email: 'node1@nexora.internal',
    displayName: 'Node 1',
    registeredAt: Date.now(),
  };

  // Positive adjustment
  const resPositive = validateAdminBalanceAdjustment(
    'admin',
    targetWallet,
    0.00010,
    'Reconciliation settlement for node maintenance'
  );
  assert.equal(resPositive.valid, true);
  assert.equal(resPositive.roundedDelta, 0.00010);
  assert.equal(resPositive.newBalanceNXR, 0.00060);

  // Negative adjustment within balance
  const resNegative = validateAdminBalanceAdjustment(
    'admin',
    targetWallet,
    -0.00020,
    'Adjustment deduction for duplicate credit'
  );
  assert.equal(resNegative.valid, true);
  assert.equal(resNegative.roundedDelta, -0.00020);
  assert.equal(resNegative.newBalanceNXR, 0.00030);
});

test('2. Admin Balance Adjustment - Strictly rejects attempts that would cause negative balance', () => {
  const targetWallet: WalletRecord = {
    userId: 'usr_test_2',
    walletAddress: 'NXR-TEST-1002',
    balanceNXR: 0.00010,
    status: 'active',
    role: 'user',
    email: 'node2@nexora.internal',
    displayName: 'Node 2',
    registeredAt: Date.now(),
  };

  // Attempt to deduct 0.00050 when only 0.00010 is available
  const result = validateAdminBalanceAdjustment(
    'admin',
    targetWallet,
    -0.00050,
    'Attempted excessive ledger reduction'
  );

  assert.equal(result.valid, false);
  assert.match(result.error || '', /Adjustment would cause negative balance/i);
});

test('3. Admin Balance Adjustment - Requires admin role and adequate audit explanation', () => {
  const targetWallet: WalletRecord = {
    userId: 'usr_test_3',
    walletAddress: 'NXR-TEST-1003',
    balanceNXR: 0.00050,
    status: 'active',
    role: 'user',
    email: 'node3@nexora.internal',
    displayName: 'Node 3',
    registeredAt: Date.now(),
  };

  // Non-admin attempt
  const nonAdminResult = validateAdminBalanceAdjustment(
    'user',
    targetWallet,
    0.00010,
    'Valid reason but unauthorized role'
  );
  assert.equal(nonAdminResult.valid, false);
  assert.match(nonAdminResult.error || '', /Requires verified administrator privileges|Only administrators/i);

  // Short/missing reason
  const shortReasonResult = validateAdminBalanceAdjustment(
    'admin',
    targetWallet,
    0.00010,
    'short'
  );
  assert.equal(shortReasonResult.valid, false);
  assert.match(shortReasonResult.error || '', /at least 8 characters/i);

  // Zero delta
  const zeroDeltaResult = validateAdminBalanceAdjustment(
    'admin',
    targetWallet,
    0,
    'Valid reason for zero adjustment'
  );
  assert.equal(zeroDeltaResult.valid, false);
  assert.match(zeroDeltaResult.error || '', /non-zero/i);
});

test('4. Internal Transfers - Rejects insufficient balance, negative amounts, and self-transfers', () => {
  const sender: WalletRecord = {
    userId: 'usr_sender',
    walletAddress: 'NXR-SENDER-001',
    balanceNXR: 0.00010,
    status: 'active',
    role: 'user',
    email: 'sender@nexora.vip',
    displayName: 'Sender Node',
    registeredAt: Date.now(),
  };
  const processedKeys = new Set<string>();

  // 1. Insufficient balance
  const resInsufficient = validateVirtualTransfer(
    sender,
    'NXR-RECV-001',
    0.00050,
    processedKeys
  );
  assert.equal(resInsufficient.valid, false);
  assert.match(resInsufficient.error || '', /Insufficient virtual balance/i);

  // 2. Self transfer
  const resSelf = validateVirtualTransfer(
    sender,
    'NXR-SENDER-001',
    0.00005,
    processedKeys
  );
  assert.equal(resSelf.valid, false);
  assert.match(resSelf.error || '', /Self-transfers are not permitted/i);

  // 3. Zero or negative amount
  const resNegative = validateVirtualTransfer(
    sender,
    'NXR-RECV-001',
    -0.00005,
    processedKeys
  );
  assert.equal(resNegative.valid, false);

  // 4. Idempotency duplicate key
  processedKeys.add('tx_key_alpha');
  const resDup = validateVirtualTransfer(
    sender,
    'NXR-RECV-001',
    0.00005,
    processedKeys,
    'tx_key_alpha'
  );
  assert.equal(resDup.valid, false);
  assert.match(resDup.error || '', /Duplicate transfer detected/i);

  // 5. Valid transfer within balance
  const resValid = validateVirtualTransfer(
    sender,
    'NXR-RECV-001',
    0.00005,
    processedKeys,
    'tx_key_beta'
  );
  assert.equal(resValid.valid, true);
  assert.equal(resValid.roundedAmount, 0.00005);
});

test('5. Mining Reward Engine - Linear accrual and strict 24-hour ceiling', () => {
  const now = 1000000000000;

  // 12 hours elapsed: 12 * 0.00001 = 0.00012 NXR
  const start12h = now - 12 * 3600 * 1000;
  const res12h = validateMiningClaimCalculation(start12h, now, false);
  assert.equal(res12h.valid, true);
  assert.equal(res12h.rewardNXR, 0.00012);
  assert.equal(res12h.isCapped, false);

  // 24 hours elapsed: 24 * 0.00001 = 0.00024 NXR
  const start24h = now - 24 * 3600 * 1000;
  const res24h = validateMiningClaimCalculation(start24h, now, false);
  assert.equal(res24h.valid, true);
  assert.equal(res24h.rewardNXR, 0.00024);
  assert.equal(res24h.isCapped, true);

  // 48 hours elapsed: strictly capped at 0.00024 NXR
  const start48h = now - 48 * 3600 * 1000;
  const res48h = validateMiningClaimCalculation(start48h, now, false);
  assert.equal(res48h.valid, true);
  assert.equal(res48h.rewardNXR, 0.00024);
  assert.equal(res48h.isCapped, true);

  // Duplicate claim rejection
  const resClaimed = validateMiningClaimCalculation(start24h, now, true);
  assert.equal(resClaimed.valid, false);
  assert.match(resClaimed.error || '', /already been claimed/i);
});

test('6. Referral System - Enforces non-self referrals and 10-node limit', () => {
  const referrer: WalletRecord = {
    userId: 'usr_ref_leader',
    walletAddress: 'NXR-REF-LEAD',
    balanceNXR: 0.00010,
    status: 'active',
    role: 'user',
    email: 'leader@nexora.vip',
    displayName: 'Leader Node',
    registeredAt: Date.now(),
  };

  // Valid referral (count < 10)
  const resValid = validateReferralClaim(referrer, 'usr_invitee_1', 3);
  assert.equal(resValid.valid, true);
  assert.equal(resValid.rewardNXR, REFERRAL_REWARD_NXR);

  // Self referral blocked
  const resSelf = validateReferralClaim(referrer, 'usr_ref_leader', 3);
  assert.equal(resSelf.valid, false);
  assert.match(resSelf.error || '', /Self-referral/i);

  // 10-node cap reached
  const resCap = validateReferralClaim(referrer, 'usr_invitee_11', 10);
  assert.equal(resCap.valid, false);
  assert.match(resCap.error || '', /maximum cap of 10/i);
});

test('7. Ledger Reconciliation - Discrepancy detection between wallet balances and ledger entries', () => {
  const wallets: WalletRecord[] = [
    {
      userId: 'usr_wallet_a',
      walletAddress: 'NXR-ADDR-A',
      balanceNXR: 0.00030,
      status: 'active',
      role: 'user',
      email: 'a@nexora.vip',
      displayName: 'Node A',
      registeredAt: Date.now(),
    },
    {
      userId: 'usr_wallet_b',
      walletAddress: 'NXR-ADDR-B',
      balanceNXR: 0.00010,
      status: 'active',
      role: 'user',
      email: 'b@nexora.vip',
      displayName: 'Node B',
      registeredAt: Date.now(),
    },
  ];

  const ledger: LedgerEntry[] = [
    {
      id: 'led_1',
      entryType: 'mining_reward',
      userId: 'usr_wallet_a',
      walletAddress: 'NXR-ADDR-A',
      amountNXR: 0.00020,
      balanceAfterNXR: 0.00020,
      referenceId: 'ref_1',
      timestamp: Date.now(),
    },
    {
      id: 'led_2',
      entryType: 'transfer_send',
      userId: 'usr_wallet_a',
      walletAddress: 'NXR-ADDR-A',
      amountNXR: 0.00010,
      balanceAfterNXR: 0.00030,
      referenceId: 'ref_2',
      timestamp: Date.now(),
    },
    {
      id: 'led_3',
      entryType: 'mining_reward',
      userId: 'usr_wallet_b',
      walletAddress: 'NXR-ADDR-B',
      amountNXR: 0.00010,
      balanceAfterNXR: 0.00010,
      referenceId: 'ref_3',
      timestamp: Date.now(),
    },
  ];

  const report = reconcileAllWallets(wallets, ledger);
  assert.equal(report.isConsistent, true);
  assert.equal(report.discrepancies.length, 0);

  // If a wallet balance is silently tampered without ledger entry:
  wallets[0].balanceNXR = 0.00999;
  const tamperedReport = reconcileAllWallets(wallets, ledger);
  assert.equal(tamperedReport.isConsistent, false);
  assert.equal(tamperedReport.discrepancies.length, 1);
  assert.equal(tamperedReport.discrepancies[0].userId, 'usr_wallet_a');
});

test('8. Authentication & Password Security - Complexity and input validation', () => {
  // Password complexity
  assert.equal(evaluatePasswordStrength('weak').score <= 1, true);
  assert.equal(evaluatePasswordStrength('MediumPassword1').score >= 2, true);
  assert.equal(evaluatePasswordStrength('Nexora2026!StrongPassword').score >= 3, true);

  // Email format validation
  assert.equal(validateEmail('valid.node@nexora.vip'), true);
  assert.equal(validateEmail('invalid-email'), false);

  // Registration input mismatch
  const mismatch = validateRegistrationInputs('user@nexora.vip', 'User', 'Pass12345!', 'DifferentPass!');
  assert.equal(mismatch.isValid, false);
  assert.match(mismatch.error || '', /match/i);

  // Valid registration inputs
  const validReg = validateRegistrationInputs('user@nexora.vip', 'User', 'Pass12345!', 'Pass12345!');
  assert.equal(validReg.isValid, true);
});
