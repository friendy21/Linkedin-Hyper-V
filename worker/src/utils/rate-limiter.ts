/*
 * Rate limiter for LinkedIn actions
 * Tracks daily limits per account with trust score adjustments
 */

import IORedis from 'ioredis';
import type { LinkedInAccount } from '../types/index.js';
import logger from '../utils/logger.js';

const redis = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export interface RateLimitResult {
  canProceed: boolean;
  remaining: number;
  limit: number;
  resetTime: Date;
  reason?: string;
}

export type ActionType = 'message' | 'connection' | 'profile_view';

/**
 * Gets the daily limit for an action based on trust score
 * Higher trust = higher limits
 * 
 * @param baseLimit - Base daily limit
 * @param trustScore - Account trust score (0-100)
 * @returns Adjusted limit
 */
function getAdjustedLimit(baseLimit: number, trustScore: number): number {
  // Trust score multiplier: 0.5x at 0 trust, 1.5x at 100 trust
  const multiplier = 0.5 + (trustScore / 100);
  return Math.floor(baseLimit * multiplier);
}

/**
 * Gets Redis key for rate limit counter
 */
function getRateLimitKey(accountId: string, action: ActionType, date: string): string {
  return `ratelimit:${accountId}:${action}:${date}`;
}

/**
 * Gets current date string in YYYY-MM-DD format
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Gets reset time (midnight of next day)
 */
function getResetTime(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Checks if an action can be performed
 * 
 * @param account - LinkedIn account
 * @param action - Action type
 * @returns Rate limit result
 */
export async function checkRateLimit(
  account: LinkedInAccount,
  action: ActionType
): Promise<RateLimitResult> {
  const date = getCurrentDate();
  const key = getRateLimitKey(account.id, action, date);

  // Get base limit
  let baseLimit: number;
  switch (action) {
    case 'message':
      baseLimit = account.dailyMessageLimit;
      break;
    case 'connection':
      baseLimit = account.dailyConnectLimit;
      break;
    case 'profile_view':
      baseLimit = account.dailyProfileLimit;
      break;
    default:
      baseLimit = 10;
  }

  // Adjust limit based on trust score
  const adjustedLimit = getAdjustedLimit(baseLimit, account.trustScore);

  // Get current count
  const count = parseInt(await redis.get(key) || '0', 10);
  const remaining = Math.max(0, adjustedLimit - count);
  const canProceed = count < adjustedLimit;

  if (!canProceed) {
    logger.warn(`Rate limit exceeded for ${account.id} - ${action}: ${count}/${adjustedLimit}`);
  }

  return {
    canProceed,
    remaining,
    limit: adjustedLimit,
    resetTime: getResetTime(),
    reason: canProceed ? undefined : `Daily ${action} limit reached (${adjustedLimit})`,
  };
}

/**
 * Increments the counter for an action
 * 
 * @param accountId - LinkedIn account ID
 * @param action - Action type
 */
export async function incrementRateLimit(
  accountId: string,
  action: ActionType
): Promise<void> {
  const date = getCurrentDate();
  const key = getRateLimitKey(accountId, action, date);

  // Increment counter with 24h expiry
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, 86400);
  await pipeline.exec();
}

/**
 * Gets current usage for an account
 * 
 * @param accountId - LinkedIn account ID
 * @returns Usage statistics
 */
export async function getRateLimitStatus(
  accountId: string
): Promise<{
  messages: { used: number; limit: number };
  connections: { used: number; limit: number };
  profileViews: { used: number; limit: number };
}> {
  const date = getCurrentDate();

  const [messagesUsed, connectionsUsed, profileViewsUsed] = await Promise.all([
    redis.get(getRateLimitKey(accountId, 'message', date)),
    redis.get(getRateLimitKey(accountId, 'connection', date)),
    redis.get(getRateLimitKey(accountId, 'profile_view', date)),
  ]);

  return {
    messages: {
      used: parseInt(messagesUsed || '0', 10),
      limit: 25, // Default base limit
    },
    connections: {
      used: parseInt(connectionsUsed || '0', 10),
      limit: 15,
    },
    profileViews: {
      used: parseInt(profileViewsUsed || '0', 10),
      limit: 50,
    },
  };
}

/**
 * Resets rate limit counters for an account
 * Use with caution - only for testing or manual overrides
 * 
 * @param accountId - LinkedIn account ID
 */
export async function resetRateLimits(accountId: string): Promise<void> {
  const date = getCurrentDate();
  const keys = [
    getRateLimitKey(accountId, 'message', date),
    getRateLimitKey(accountId, 'connection', date),
    getRateLimitKey(accountId, 'profile_view', date),
  ];

  await redis.del(...keys);
  logger.info(`Reset rate limits for ${accountId}`);
}
