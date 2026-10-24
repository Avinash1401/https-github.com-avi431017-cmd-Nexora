import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateElapsedMiningReward,
  formatNXR,
  formatNXRValue,
  formatCountdown,
  validateElapsedDelta,
  calculateHashRateJitter,
  generateBlockHexHash,
  MAX_SESSION_REWARD_NXR,
} from './miningRules.ts';

test('Mining Rules - 24-hour reward milestones match specification exactly', () => {
  // 0 hours (0 seconds)
  assert.equal(calculateElapsedMiningReward(0), 0.0);
  assert.equal(formatNXR(calculateElapsedMiningReward(0)), '0.00000 NXR');

  // 6 hours (6 * 3600 = 21600 seconds)
  assert.equal(calculateElapsedMiningReward(6 * 3600), 0.00006);
  assert.equal(formatNXR(calculateElapsedMiningReward(6 * 3600)), '0.00006 NXR');

  // 12 hours (12 * 3600 = 43200 seconds)
  assert.equal(calculateElapsedMiningReward(12 * 3600), 0.00012);
  assert.equal(formatNXR(calculateElapsedMiningReward(12 * 3600)), '0.00012 NXR');

  // 18 hours (18 * 3600 = 64800 seconds)
  assert.equal(calculateElapsedMiningReward(18 * 3600), 0.00018);
  assert.equal(formatNXR(calculateElapsedMiningReward(18 * 3600)), '0.00018 NXR');

  // 24 hours (24 * 3600 = 86400 seconds)
  assert.equal(calculateElapsedMiningReward(24 * 3600), 0.00024);
  assert.equal(formatNXR(calculateElapsedMiningReward(24 * 3600)), '0.00024 NXR');

  // Exceeding 24 hours caps at 0.00024 NXR
  assert.equal(calculateElapsedMiningReward(30 * 3600), 0.00024);
  assert.equal(calculateElapsedMiningReward(100 * 3600), MAX_SESSION_REWARD_NXR);
});

test('Mining Rules - formatNXR formats consistently to 5 decimal places', () => {
  assert.equal(formatNXR(0), '0.00000 NXR');
  assert.equal(formatNXR(0.00001), '0.00001 NXR');
  assert.equal(formatNXR(0.00024), '0.00024 NXR');
  assert.equal(formatNXR(1.234567), '1.23457 NXR');
  assert.equal(formatNXRValue(0.00012), '0.00012');
});

test('Mining Rules - formatCountdown calculates HH:MM:SS accurately', () => {
  // 24 hours
  const cd24 = formatCountdown(86400);
  assert.equal(cd24.formatted, '24:00:00');

  // 1 hour, 2 minutes, 3 seconds = 3600 + 120 + 3 = 3723
  const cdPartial = formatCountdown(3723);
  assert.equal(cdPartial.formatted, '01:02:03');

  // 0 seconds
  const cdZero = formatCountdown(0);
  assert.equal(cdZero.formatted, '00:00:00');
});

test('Mining Rules - validateElapsedDelta detects backward and forward jumps', () => {
  const t0 = 100000;
  // Clock backward
  const backward = validateElapsedDelta(t0, t0 - 5000);
  assert.equal(backward.valid, false);
  assert.equal(backward.sanctionedDeltaSeconds, 0);

  // Normal 1s tick
  const normal = validateElapsedDelta(t0, t0 + 1000);
  assert.equal(normal.valid, true);
  assert.equal(normal.sanctionedDeltaSeconds, 1);

  // Big forward jump (capped to 10s)
  const jump = validateElapsedDelta(t0, t0 + 60000, 10);
  assert.equal(jump.valid, true);
  assert.equal(jump.sanctionedDeltaSeconds, 10);
});

test('Mining Rules - generateBlockHexHash creates 0000 prefixed hash', () => {
  const hash = generateBlockHexHash(1700000000000, 42);
  assert.equal(hash.startsWith('0000'), true);
  assert.equal(hash.length >= 32, true);
});
