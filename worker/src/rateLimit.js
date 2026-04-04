// FILE: worker/src/rateLimit.js
'use strict';

const { getRedis } = require('./redisClient');

// Conservative daily limits — well below LinkedIn detection thresholds
const LIMITS = {
  messagesSent:    25,
  connectRequests: 15,
  profileViews:    60,
  searchQueries:   40,
  inboxReads:      50,
};

// Hourly sub-limits to prevent burst detection
const HOURLY_LIMITS = {
  messagesSent:    5,
  connectRequests: 4,
  profileViews:    15,
  searchQueries:   12,
  inboxReads:      15,
};

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

function hourKey() {
  // Key format: YYYY-MM-DDTHH (UTC)
  return new Date().toISOString().slice(0, 13);
}

/**
 * Atomically increment daily and hourly counters, throw 429 if either limit exceeded.
 */
async function checkAndIncrement(accountId, action) {
  const redis = getRedis(); // Bug fix: was used before declaration
  const limit = LIMITS[action];
  if (limit === undefined) throw new Error(`Unknown rate-limit action: ${action}`);

  const hourlyLimit = HOURLY_LIMITS[action];

  // Keys
  const dayKey   = `ratelimit:${accountId}:${action}:${todayKey()}`;
  const hourlyKey = `ratelimit:${accountId}:${action}:hour:${hourKey()}`;

  const secondsUntilMidnight = 86400 - (Math.floor(Date.now() / 1000) % 86400);

  // ── Hourly check first ────────────────────────────────────────────────────
  if (hourlyLimit !== undefined) {
    const hourlyCurrent = await redis.eval(`
      local count = redis.call("INCR", KEYS[1])
      if count == 1 then
        redis.call("EXPIRE", KEYS[1], ARGV[1])
      end
      return count
    `, 1, hourlyKey, 3660);

    if (hourlyCurrent > hourlyLimit) {
      const err = new Error(
        `Hourly limit reached: ${action} (${hourlyCurrent}/${hourlyLimit}) for account ${accountId}`
      );
      err.code   = 'RATE_LIMIT_EXCEEDED';
      err.status = 429;
      throw err;
    }
  }

  // ── Daily check ───────────────────────────────────────────────────────────
  const current = await redis.eval(`
    local count = redis.call("INCR", KEYS[1])
    if count == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return count
  `, 1, dayKey, secondsUntilMidnight + 60);

  if (current > limit) {
    const err = new Error(
      `Daily limit reached: ${action} (${current}/${limit}) for account ${accountId}`
    );
    err.code   = 'RATE_LIMIT_EXCEEDED';
    err.status = 429;
    throw err;
  }

  return { current, limit, remaining: limit - current };
}

async function getLimits(accountId) {
  const redis   = getRedis();
  const today   = todayKey();
  const actions = Object.keys(LIMITS);
  const keys    = actions.map((a) => `ratelimit:${accountId}:${a}:${today}`);
  const values  = await redis.mget(...keys);
  return Object.fromEntries(
    actions.map((action, i) => {
      const current = parseInt(values[i] || '0', 10);
      const limit   = LIMITS[action];
      return [action, { current, limit, remaining: Math.max(0, limit - current) }];
    })
  );
}

module.exports = { checkAndIncrement, getLimits, LIMITS, HOURLY_LIMITS };
