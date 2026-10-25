import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMiningClaimCalculation,
  nxrToBaseUnits,
  baseUnitsToNxr,
  HOURLY_MINING_RATE_NXR,
  MAX_CYCLE_REWARD_NXR,
} from './ledgerEngine';

test('Server Mining Verification - 1. Server DB timestamp determines elapsed time strictly', () => {
  const serverStartedAt = 1700000000000;
  // 6 hours later on server
  const serverNow = serverStartedAt + 6 * 3600 * 1000;

  const result = validateMiningClaimCalculation(serverStartedAt, serverNow, false);
  assert.equal(result.valid, true);
  assert.equal(result.elapsedSeconds, 21600);
  assert.equal(result.clampedSeconds, 21600);
  assert.equal(result.rewardNXR, 0.00006);
  assert.equal(result.rewardBaseUnits, 6n);
  assert.equal(result.isCapped, false);
  assert.equal(result.clockManipulationDetected, false);
});

test('Server Mining Verification - 2. Detects and flags client-side clock tampering / elapsed inflation', () => {
  const serverStartedAt = 1700000000000;
  // Only 5 minutes have elapsed on the server
  const serverNow = serverStartedAt + 300 * 1000;

  // Malicious client claims 24 hours have elapsed and attempts to claim full reward
  const maliciousClientReport = {
    clientTimestamp: serverStartedAt + 86400 * 1000, // 24 hours forward on client device
    clientElapsedSeconds: 86400,
    claimedRewardNXR: 0.00024,
  };

  const result = validateMiningClaimCalculation(
    serverStartedAt,
    serverNow,
    false,
    maliciousClientReport
  );

  // Clock tampering must be detected and flagged
  assert.equal(result.clockManipulationDetected, true);
  assert.match(result.manipulationDetails || '', /Client reported 86400s elapsed, but server database verified only 300s/);

  // Premature claim with insufficient server time must be rejected
  assert.equal(result.valid, false);
  assert.equal(result.rewardNXR, 0);
  assert.match(result.error || '', /Zero mining reward accumulated/);
});

test('Server Mining Verification - 3. Clock rollback protection (now < startedAt)', () => {
  const serverStartedAt = 1700000000000;
  // Anomaly: current clock is earlier than session start timestamp
  const serverNow = serverStartedAt - 5000;

  const result = validateMiningClaimCalculation(serverStartedAt, serverNow, false);
  assert.equal(result.valid, false);
  assert.equal(result.clockManipulationDetected, true);
  assert.match(result.error || '', /Server current time precedes session start timestamp/);
});

test('Server Mining Verification - 4. Strict 24-hour ceiling caps at exactly 0.00024 NXR', () => {
  const serverStartedAt = 1700000000000;

  // Exactly 24 hours
  const serverNow24h = serverStartedAt + 24 * 3600 * 1000;
  const res24h = validateMiningClaimCalculation(serverStartedAt, serverNow24h, false);
  assert.equal(res24h.valid, true);
  assert.equal(res24h.rewardNXR, 0.00024);
  assert.equal(res24h.rewardBaseUnits, 24n);
  assert.equal(res24h.clampedSeconds, 86400);
  assert.equal(res24h.isCapped, true);

  // 48 hours elapsed (2 days) -> MUST still be strictly 0.00024 NXR
  const serverNow48h = serverStartedAt + 48 * 3600 * 1000;
  const res48h = validateMiningClaimCalculation(serverStartedAt, serverNow48h, false);
  assert.equal(res48h.valid, true);
  assert.equal(res48h.rewardNXR, 0.00024);
  assert.equal(res48h.rewardBaseUnits, 24n);
  assert.equal(res48h.clampedSeconds, 86400);
  assert.equal(res48h.isCapped, true);

  // 30 days elapsed -> MUST still be strictly 0.00024 NXR
  const serverNow30d = serverStartedAt + 30 * 24 * 3600 * 1000;
  const res30d = validateMiningClaimCalculation(serverStartedAt, serverNow30d, false);
  assert.equal(res30d.valid, true);
  assert.equal(res30d.rewardNXR, 0.00024);
  assert.equal(res30d.rewardBaseUnits, 24n);
  assert.equal(res30d.clampedSeconds, 86400);
  assert.equal(res30d.isCapped, true);
});

test('Server Mining Verification - 5. Linear accrual at 0.00001 NXR per hour matches all milestones', () => {
  const start = 1700000000000;

  // 1 hour
  const res1h = validateMiningClaimCalculation(start, start + 3600 * 1000, false);
  assert.equal(res1h.rewardNXR, 0.00001);
  assert.equal(res1h.rewardBaseUnits, 1n);

  // 12 hours (halfway)
  const res12h = validateMiningClaimCalculation(start, start + 12 * 3600 * 1000, false);
  assert.equal(res12h.rewardNXR, 0.00012);
  assert.equal(res12h.rewardBaseUnits, 12n);

  // 18 hours
  const res18h = validateMiningClaimCalculation(start, start + 18 * 3600 * 1000, false);
  assert.equal(res18h.rewardNXR, 0.00018);
  assert.equal(res18h.rewardBaseUnits, 18n);

  // 24 hours
  const res24h = validateMiningClaimCalculation(start, start + 24 * 3600 * 1000, false);
  assert.equal(res24h.rewardNXR, 0.00024);
  assert.equal(res24h.rewardBaseUnits, 24n);
});

test('Server Mining Verification - 6. Rejects duplicate claims on already claimed sessions', () => {
  const start = 1700000000000;
  const now = start + 24 * 3600 * 1000;

  const firstClaim = validateMiningClaimCalculation(start, now, false);
  assert.equal(firstClaim.valid, true);

  // Duplicate claim attempt
  const dupClaim = validateMiningClaimCalculation(start, now, true);
  assert.equal(dupClaim.valid, false);
  assert.equal(dupClaim.rewardNXR, 0);
  assert.match(dupClaim.error || '', /already been claimed/);
});
