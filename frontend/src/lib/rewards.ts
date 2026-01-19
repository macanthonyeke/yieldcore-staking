import { SECONDS_PER_DAY, MAX_REWARD_TIME, DIVISOR, GRACE_PERIOD } from "./contracts";

/**
 * Calculate rewards with exact on-chain logic
 * Rewards cap at 24 hours, already-claimed amounts are excluded
 */
export function calculateClaimableReward(
  amount: bigint,
  dailyRate: bigint,
  elapsedSeconds: bigint,
  rewardsClaimed: bigint
): bigint {
  // Cap elapsed time at MAX_REWARD_TIME (24 hours)
  const effectiveElapsed = elapsedSeconds > MAX_REWARD_TIME ? MAX_REWARD_TIME : elapsedSeconds;
  
  // totalEarned = amount × dailyRate × effectiveElapsed ÷ (100 × 86400)
  const totalEarned = (amount * dailyRate * effectiveElapsed) / (DIVISOR * SECONDS_PER_DAY);
  
  // claimable = max(totalEarned − claimed, 0)
  if (totalEarned <= rewardsClaimed) {
    return 0n;
  }
  
  return totalEarned - rewardsClaimed;
}

/**
 * Calculate maximum possible reward (after full 24h accrual)
 */
export function calculateMaxReward(amount: bigint, dailyRate: bigint): bigint {
  return (amount * dailyRate) / DIVISOR;
}

/**
 * Check if stake is expired (past grace period)
 */
export function isStakeExpired(
  startTime: bigint,
  lockPeriod: bigint,
  currentTime: bigint
): boolean {
  return currentTime > startTime + lockPeriod + GRACE_PERIOD;
}

/**
 * Check if stake is unlocked (past lock period)
 */
export function isStakeUnlocked(
  startTime: bigint,
  lockPeriod: bigint,
  currentTime: bigint
): boolean {
  return currentTime >= startTime + lockPeriod;
}

/**
 * Check if max reward has been reached (24h elapsed)
 */
export function hasReachedMaxReward(startTime: bigint, currentTime: bigint): boolean {
  return currentTime >= startTime + MAX_REWARD_TIME;
}

/**
 * Format bigint to display string with decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  // Pad fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  
  // Show 4 decimal places
  const displayDecimals = fractionalStr.slice(0, 4);
  
  return `${integerPart.toString()}.${displayDecimals}`;
}

/**
 * Parse user input to bigint with decimals
 */
export function parseTokenAmount(value: string, decimals: number = 18): bigint {
  if (!value || value === "") return 0n;
  
  const parts = value.split(".");
  const integerPart = parts[0] || "0";
  let fractionalPart = parts[1] || "";
  
  // Pad or truncate fractional part
  fractionalPart = fractionalPart.padEnd(decimals, "0").slice(0, decimals);
  
  return BigInt(integerPart + fractionalPart);
}

/**
 * Format seconds to human readable time
 */
export function formatTimeRemaining(seconds: bigint): string {
  if (seconds <= 0n) return "0s";
  
  const secs = Number(seconds);
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const remainingSecs = secs % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${remainingSecs}s`;
  }
  return `${remainingSecs}s`;
}
