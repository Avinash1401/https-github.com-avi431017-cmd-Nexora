import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nxrToBaseUnits,
  baseUnitsToNxr,
  addNxrBaseUnits,
  subtractNxrBaseUnits,
  validateVirtualTransfer,
  validateMiningClaimCalculation,
  validateReferralClaim,
  reconcileAllWallets,
  reconcileWallet,
  verifyAdminAccess,
  validateRoleAssignment,
  WalletRecord,
  LedgerEntry,
  HOURLY_MINING_RATE_NXR,
  MAX_CYCLE_REWARD_NXR,
  REFERRAL_REWARD_NXR,
  MAX_REFERRAL_COUNT_PER_USER,
} from './ledgerEngine';

test('1. Integer Base-Unit Arithmetic: Eliminates floating-point drift', () => {
  // Float addition in JS produces 0.30000000000000004
  const floatA = 0.00001;
  const floatB = 0.00002;
  const floatSum = floatA + floatB;
  assert.equal(floatSum, 0.000030000000000000004);

  // Exact base-unit math produces exact 3 base units (0.00003 NXR)
  const baseUnitsA = nxrToBaseUnits(0.00001);
  const baseUnitsB = nxrToBaseUnits(0.00002);
  assert.equal(baseUnitsA, 1n);
  assert.equal(baseUnitsB, 2n);

  const exactSum = addNxrBaseUnits(0.00001, 0.00002);
  assert.equal(exactSum, 0.00003);

  const exactDiff = subtractNxrBaseUnits(0.00024, 0.00005);
  assert.equal(exactDiff, 0.00019);
});

test('2. Virtual NXR Wallet: New users strictly start at 0.00000 NXR', () => {
  const newWallet: WalletRecord = {
    userId: 'usr_new_testnet',
    walletAddress: 'NXR-1001-2002',
    balanceNXR: 0.0,
    status: 'active',
    role: 'user',
    email: 'newuser@test.vip',
    displayName: 'New User',
    registeredAt: Date.now(),
  };

  assert.equal(newWallet.balanceNXR, 0.00000);
  assert.equal(nxrToBaseUnits(newWallet.balanceNXR), 0n);

  // Reconciling an empty wallet with 0 entries succeeds
  const report = reconcileWallet(newWallet, []);
  assert.equal(report.isReconciled, true);
  assert.equal(report.calculatedBalance, 0.0);
  assert.equal(report.discrepancy, 0.0);
});

test('3. Server-Validated Mining: Linear hourly rate and 24h ceiling', () => {
  const now = 1700000000000;

  // 1 hour elapsed -> 0.00001 NXR
  const oneHourStart = now - 3600 * 1000;
  const res1h = validateMiningClaimCalculation(oneHourStart, now, false);
  assert.equal(res1h.valid, true);
  assert.equal(res1h.rewardNXR, 0.00001);
  assert.equal(res1h.isCapped, false);

  // 12 hours elapsed -> 0.00012 NXR
  const twelveHourStart = now - 12 * 3600 * 1000;
  const res12h = validateMiningClaimCalculation(twelveHourStart, now, false);
  assert.equal(res12h.valid, true);
  assert.equal(res12h.rewardNXR, 0.00012);

  // 24 hours elapsed -> 0.00024 NXR (max cap reached)
  const fullDayStart = now - 24 * 3600 * 1000;
  const res24h = validateMiningClaimCalculation(fullDayStart, now, false);
  assert.equal(res24h.valid, true);
  assert.equal(res24h.rewardNXR, 0.00024);
  assert.equal(res24h.isCapped, true);

  // 36 hours elapsed (exceeds cap) -> strictly clamped to 0.00024 NXR
  const overDurationStart = now - 36 * 3600 * 1000;
  const res36h = validateMiningClaimCalculation(overDurationStart, now, false);
  assert.equal(res36h.valid, true);
  assert.equal(res36h.rewardNXR, 0.00024);
  assert.equal(res36h.isCapped, true);

  // Duplicate claim rejection
  const dupClaim = validateMiningClaimCalculation(fullDayStart, now, true);
  assert.equal(dupClaim.valid, false);
  assert.match(dupClaim.error!, /already been claimed/i);
});

test('4. Internal Transfers: Rejects insufficient balance, negative, and self-transfers', () => {
  const processedKeys = new Set<string>();
  const sender: WalletRecord = {
    userId: 'usr_sender_01',
    walletAddress: 'NXR-SENDER-001',
    balanceNXR: 0.00010,
    status: 'active',
    role: 'user',
    email: 'sender@test.vip',
    displayName: 'Sender Node',
    registeredAt: Date.now(),
  };

  // Valid transfer within balance
  const validTx = validateVirtualTransfer(sender, 'NXR-RECIPIENT-002', 0.00005, processedKeys, 'key_1');
  assert.equal(validTx.valid, true);
  assert.equal(validTx.roundedAmount, 0.00005);

  // Rejects transfer exceeding available balance
  const excessiveTx = validateVirtualTransfer(sender, 'NXR-RECIPIENT-002', 0.00050, processedKeys, 'key_2');
  assert.equal(excessiveTx.valid, false);
  assert.match(excessiveTx.error!, /Insufficient virtual balance/i);

  // Rejects self-transfers
  const selfTx = validateVirtualTransfer(sender, sender.walletAddress, 0.00001, processedKeys, 'key_3');
  assert.equal(selfTx.valid, false);
  assert.match(selfTx.error!, /Self-transfers are not permitted/i);

  // Rejects zero or negative amounts
  const zeroTx = validateVirtualTransfer(sender, 'NXR-RECIPIENT-002', 0, processedKeys, 'key_4');
  assert.equal(zeroTx.valid, false);

  const negativeTx = validateVirtualTransfer(sender, 'NXR-RECIPIENT-002', -0.00005, processedKeys, 'key_5');
  assert.equal(negativeTx.valid, false);

  // Idempotency: duplicate key is rejected
  processedKeys.add('key_used');
  const duplicateTx = validateVirtualTransfer(sender, 'NXR-RECIPIENT-002', 0.00001, processedKeys, 'key_used');
  assert.equal(duplicateTx.valid, false);
  assert.match(duplicateTx.error!, /Duplicate transfer detected/i);
});

test('5. Referral System: Validates invitation claims and enforces maximum 10-node cap', () => {
  const referrer: WalletRecord = {
    userId: 'usr_referrer_01',
    walletAddress: 'NXR-REF-001',
    balanceNXR: 0.0,
    status: 'active',
    role: 'user',
    email: 'referrer@test.vip',
    displayName: 'Referrer Node',
    registeredAt: Date.now(),
  };

  // Valid first referral
  const ref1 = validateReferralClaim(referrer, 'usr_new_node_01', 0);
  assert.equal(ref1.valid, true);
  assert.equal(ref1.rewardNXR, REFERRAL_REWARD_NXR); // 0.00005 NXR

  // Self-referral prohibited
  const selfRef = validateReferralClaim(referrer, referrer.userId, 0);
  assert.equal(selfRef.valid, false);
  assert.match(selfRef.error!, /Self-referral is strictly prohibited/i);

  // Suspended referrer prohibited
  const suspendedReferrer: WalletRecord = { ...referrer, status: 'suspended' };
  const suspRef = validateReferralClaim(suspendedReferrer, 'usr_new_node_02', 2);
  assert.equal(suspRef.valid, false);
  assert.match(suspRef.error!, /Referrer account is suspended/i);

  // Maximum cap of 10 referrals enforced
  const maxRef = validateReferralClaim(referrer, 'usr_new_node_11', MAX_REFERRAL_COUNT_PER_USER);
  assert.equal(maxRef.valid, false);
  assert.match(maxRef.error!, /reached the maximum cap/i);
});

test('6. Security & RBAC: Prohibits non-admin access and self-elevation', () => {
  // Non-admin rejected from administrative routes
  const userAccess = verifyAdminAccess('user');
  assert.equal(userAccess.authorized, false);
  assert.equal(userAccess.status, 403);

  const minerAccess = verifyAdminAccess('miner');
  assert.equal(minerAccess.authorized, false);

  const adminAccess = verifyAdminAccess('admin');
  assert.equal(adminAccess.authorized, true);
  assert.equal(adminAccess.status, 200);

  // Ordinary user cannot assign themselves admin privileges
  const elevationAttempt = validateRoleAssignment('user', 'usr_user_1', 'usr_user_1', 'admin');
  assert.equal(elevationAttempt.allowed, false);
  assert.match(elevationAttempt.error!, /Only administrators can update account roles/i);
});

test('7. Ledger Reconciliation: Mathematical equality of balances and ledger entries', () => {
  const wallets: WalletRecord[] = [
    {
      userId: 'usr_alice',
      walletAddress: 'NXR-ALICE',
      balanceNXR: 0.00024,
      status: 'active',
      role: 'miner',
      email: 'alice@test.vip',
      displayName: 'Alice',
      registeredAt: Date.now(),
    },
    {
      userId: 'usr_bob',
      walletAddress: 'NXR-BOB',
      balanceNXR: 0.00005,
      status: 'active',
      role: 'user',
      email: 'bob@test.vip',
      displayName: 'Bob',
      registeredAt: Date.now(),
    },
  ];

  const entries: LedgerEntry[] = [
    {
      id: 'e1',
      entryType: 'mining_reward',
      userId: 'usr_alice',
      walletAddress: 'NXR-ALICE',
      amountNXR: 0.00024,
      balanceAfterNXR: 0.00024,
      referenceId: 'sess_1',
      timestamp: Date.now(),
    },
    {
      id: 'e2',
      entryType: 'referral_reward',
      userId: 'usr_bob',
      walletAddress: 'NXR-BOB',
      amountNXR: 0.00005,
      balanceAfterNXR: 0.00005,
      referenceId: 'ref_1',
      timestamp: Date.now(),
    },
  ];

  const auditReport = reconcileAllWallets(wallets, entries);
  assert.equal(auditReport.isConsistent, true);
  assert.equal(auditReport.discrepancies.length, 0);
  assert.equal(auditReport.totalWalletsChecked, 2);
  assert.equal(auditReport.totalCirculationNXR, 0.00029);
});
