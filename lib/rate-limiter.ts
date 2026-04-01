// FILE: lib/rate-limiter.ts
// Redis-backed rate limiting for API routes
import { Redis } from 'ioredis';

// Simple in-memory rate limiter for development (fallback)
// In production, use Redis
const memoryStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Simple sliding window rate limiter
 * In production, replace with @upstash/ratelimit or Redis-based solution
 */
export async function rateLimit(
  identifier: string,
  options: {
    windowMs?: number;
    maxRequests?: number;
  } = {}
): Promise<RateLimitResult> {
  const { windowMs = 15 * 60 * 1000, maxRequests = 5 } = options; // Default: 5 requests per 15 minutes
  
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Try to use Redis if available
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    });

    const key = `ratelimit:${identifier}`;
    
    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);
    
    // Count current entries in window
    const currentCount = await redis.zcard(key);
    
    if (currentCount >= maxRequests) {
      // Get the oldest timestamp to calculate reset time
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldest.length > 1 ? parseInt(oldest[1]) + windowMs : now + windowMs;
      
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: resetTime,
      };
    }
    
    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.pexpire(key, windowMs);
    
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - currentCount - 1,
      reset: now + windowMs,
    };
  } catch {
    // Fallback to memory store if Redis is unavailable
    const key = identifier;
    const record = memoryStore.get(key);
    
    if (!record || record.resetTime < now) {
      // New window
      memoryStore.set(key, { count: 1, resetTime: now + windowMs });
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: now + windowMs,
      };
    }
    
    if (record.count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: record.resetTime,
      };
    }
    
    record.count++;
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - record.count,
      reset: record.resetTime,
    };
  }
}

/**
 * Get client IP from request
 */
export function getClientIp(req: Request): string {
  // Try to get IP from headers (when behind proxy)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Fallback to a generic identifier
  return 'unknown';
}
