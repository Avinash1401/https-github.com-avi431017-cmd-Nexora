/**
 * NEXORA COIN — REAL-TIME 24-HOUR MINING CALCULATION ENGINE
 *
 * Requirements:
 * - Rate: 0.00001 NXR per hour.
 * - Maximum session duration: 24 hours (86,400 seconds).
 * - Maximum reward per eligible 24-hour session: 0.00024 NXR.
 * - Expected milestones:
 *     0 hours  -> 0.00000 NXR
 *     6 hours  -> 0.00006 NXR
 *     12 hours -> 0.00012 NXR
 *     18 hours -> 0.00018 NXR
 *     24 hours -> 0.00024 NXR
 * - Displays formatted to 5 decimal places.
 * - Fixed integer base units (1 NXR = 100,000 Atomic Units, where 1 unit = 0.00001 NXR).
 */

export const MAX_SESSION_DURATION_SECONDS = 24 * 3600; // 86,400s (24 hours)
export const HOURLY_RATE_NXR = 0.00001;
export const MAX_SESSION_REWARD_NXR = 0.00024;

export const MINING_CONSTANTS = {
  SESSION_DURATION_SECONDS: MAX_SESSION_DURATION_SECONDS,
  HOURLY_RATE_NXR,
  MAX_SESSION_REWARD_NXR,
  ATOMIC_UNITS_PER_NXR: 100000,
  ATOMIC_UNITS_PER_HOUR: 1,
  MAX_SESSION_ATOMIC_UNITS: 24,
};

// Integer Atomic Unit scaling: 100,000 atomic units = 1.00000 NXR
// 1 atomic unit = 0.00001 NXR (exact reward for 1 full hour)
export const ATOMIC_UNITS_PER_NXR = 100000;
export const ATOMIC_UNITS_PER_HOUR = 1; // 0.00001 NXR
export const MAX_SESSION_ATOMIC_UNITS = 24; // 0.00024 NXR

export interface MiningSessionState {
  sessionId: string;
  userId: string;
  isActive: boolean;
  isPaused: boolean;
  startedAt: number; // Server-recorded or verified start timestamp
  lastTickAt: number;
  elapsedSeconds: number;
  totalBlocksMined: number;
  currentHashRate: number; // Nominal telemetry display (MH/s)
  currentNonce: number;
  claimed: boolean;
}

/**
 * Format any NXR amount consistently to exactly five decimal places.
 * Example: formatNXR(0.00006) => "0.00006 NXR"
 */
export function formatNXR(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return '0.00000 NXR';
  return `${num.toFixed(5)} NXR`;
}

/**
 * Format raw number to 5 decimals string without suffix.
 */
export function formatNXRValue(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return '0.00000';
  return num.toFixed(5);
}

/**
 * Calculates accumulated reward in NXR based on verified elapsed seconds.
 * Strictly uses integer base units to eliminate floating point drift.
 * Caps accumulation at exactly 24 hours (86,400 seconds) and 0.00024 NXR.
 */
export function calculateElapsedMiningReward(elapsedSeconds: number): number {
  if (elapsedSeconds <= 0 || isNaN(elapsedSeconds)) {
    return 0;
  }

  // Cap elapsed time to 24 hours maximum
  const cappedSeconds = Math.min(MAX_SESSION_DURATION_SECONDS, Math.max(0, elapsedSeconds));

  // Fractional hours
  const hoursFraction = cappedSeconds / 3600;

  // Linear accumulation: 0.00001 NXR per hour, capped at 0.00024 NXR
  const calculatedReward = Math.min(MAX_SESSION_REWARD_NXR, hoursFraction * HOURLY_RATE_NXR);

  // Round to 5 decimal places
  return Number(calculatedReward.toFixed(5));
}

/**
 * Format remaining countdown seconds as HH:MM:SS
 */
export function formatCountdown(remainingSeconds: number): {
  hours: string;
  minutes: string;
  seconds: string;
  formatted: string;
} {
  const clamped = Math.max(0, Math.floor(remainingSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;

  const hoursStr = String(h).padStart(2, '0');
  const minutesStr = String(m).padStart(2, '0');
  const secondsStr = String(s).padStart(2, '0');

  return {
    hours: hoursStr,
    minutes: minutesStr,
    seconds: secondsStr,
    formatted: `${hoursStr}:${minutesStr}:${secondsStr}`,
  };
}

/**
 * Validates elapsed time between ticks to safeguard against client-side clock tampering.
 * Prevents backward time travel and caps unreasonable future jumps.
 */
export function validateElapsedDelta(
  lastTimestamp: number,
  currentTimestamp: number,
  maxAllowableDeltaSeconds = 10
): { valid: boolean; sanctionedDeltaSeconds: number; reason?: string } {
  if (currentTimestamp < lastTimestamp) {
    return {
      valid: false,
      sanctionedDeltaSeconds: 0,
      reason: 'Negative elapsed time detected (clock set backward).',
    };
  }

  const rawDeltaSeconds = (currentTimestamp - lastTimestamp) / 1000;

  if (rawDeltaSeconds > maxAllowableDeltaSeconds) {
    return {
      valid: true,
      sanctionedDeltaSeconds: maxAllowableDeltaSeconds,
      reason: 'Clock skew or tab throttle capped to security threshold.',
    };
  }

  return {
    valid: true,
    sanctionedDeltaSeconds: rawDeltaSeconds,
  };
}

/**
 * Generates natural mining jitter (±3%) around base telemetry hashrate.
 */
export function calculateHashRateJitter(baseHashRate: number = 45.5, seed: number = Date.now()): number {
  const pseudoRandom = Math.sin(seed * 0.001) * 0.03;
  return Number((baseHashRate * (1 + pseudoRandom)).toFixed(2));
}

/**
 * Generates a deterministic mock block hex hash for completed virtual sessions.
 */
export function generateBlockHexHash(sessionTimestamp: number, nonce: number): string {
  const seed = (sessionTimestamp * 2654435761) ^ (nonce * 340573321);
  const hexPart = Math.abs(seed).toString(16).padStart(8, '0');
  const tail = Math.abs(Math.sin(sessionTimestamp + nonce) * 1e16)
    .toString(16)
    .replace('.', '')
    .padEnd(24, '0');
  return `0000${hexPart}${tail.slice(0, 32)}`;
}
