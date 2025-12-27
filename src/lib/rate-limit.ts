/**
 * Rate limiting utilities for API endpoints
 * Implements IP-based and token-bucket rate limiting
 */

import type { RateLimitInfo } from '@/types';

// In-memory store for rate limits
// In production, use Redis or similar for distributed systems
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Default limits
const DEFAULT_REQUESTS_PER_MINUTE = 10;
const DEFAULT_REQUESTS_PER_HOUR = 50;

interface RateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {}
): { allowed: boolean; info: RateLimitInfo } {
  const now = Date.now();
  const minuteKey = `${identifier}:minute`;
  const hourKey = `${identifier}:hour`;

  const requestsPerMinute = config.requestsPerMinute || DEFAULT_REQUESTS_PER_MINUTE;
  const requestsPerHour = config.requestsPerHour || DEFAULT_REQUESTS_PER_HOUR;

  // Check minute limit
  const minuteLimit = rateLimitStore.get(minuteKey);
  if (minuteLimit) {
    if (now < minuteLimit.resetTime) {
      if (minuteLimit.count >= requestsPerMinute) {
        return {
          allowed: false,
          info: {
            remaining: 0,
            resetTime: minuteLimit.resetTime,
            limit: requestsPerMinute,
          },
        };
      }
    } else {
      // Reset the minute counter
      rateLimitStore.delete(minuteKey);
    }
  }

  // Check hour limit
  const hourLimit = rateLimitStore.get(hourKey);
  if (hourLimit) {
    if (now < hourLimit.resetTime) {
      if (hourLimit.count >= requestsPerHour) {
        return {
          allowed: false,
          info: {
            remaining: 0,
            resetTime: hourLimit.resetTime,
            limit: requestsPerHour,
          },
        };
      }
    } else {
      // Reset the hour counter
      rateLimitStore.delete(hourKey);
    }
  }

  // Increment counters
  const currentMinute = rateLimitStore.get(minuteKey);
  if (currentMinute && now < currentMinute.resetTime) {
    currentMinute.count++;
  } else {
    rateLimitStore.set(minuteKey, {
      count: 1,
      resetTime: now + 60 * 1000, // 1 minute
    });
  }

  const currentHour = rateLimitStore.get(hourKey);
  if (currentHour && now < currentHour.resetTime) {
    currentHour.count++;
  } else {
    rateLimitStore.set(hourKey, {
      count: 1,
      resetTime: now + 60 * 60 * 1000, // 1 hour
    });
  }

  const newMinuteData = rateLimitStore.get(minuteKey)!;
  return {
    allowed: true,
    info: {
      remaining: requestsPerMinute - newMinuteData.count,
      resetTime: newMinuteData.resetTime,
      limit: requestsPerMinute,
    },
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers for the real IP (useful when behind a proxy)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP if there are multiple
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to a default for local development
  return 'localhost';
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(info.limit),
    'X-RateLimit-Remaining': String(info.remaining),
    'X-RateLimit-Reset': String(Math.ceil(info.resetTime / 1000)),
  };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupExpiredLimits(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now >= value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredLimits, 5 * 60 * 1000);
}

/**
 * Validate input size to prevent abuse
 */
export function validateInputSize(input: string, maxSize: number = 50000): boolean {
  return input.length <= maxSize;
}

/**
 * Create a rate-limited error response
 */
export function createRateLimitResponse(info: RateLimitInfo): Response {
  const retryAfter = Math.ceil((info.resetTime - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter,
      message: `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        ...createRateLimitHeaders(info),
      },
    }
  );
}
