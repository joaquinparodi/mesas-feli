import { NextRequest } from 'next/server';
import { errorResponse } from './api-response';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

// In-memory store for rate limiting
// In production, you would use Redis or a similar distributed store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval: remove expired entries every 60 seconds
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((entry, key) => {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    });
  }, 60_000);

  // Allow the Node.js process to exit even if the interval is active
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

startCleanup();

/**
 * Extract a client identifier from the request.
 * Uses X-Forwarded-For header (common behind proxies/load balancers),
 * falls back to X-Real-IP, then to a default identifier.
 */
function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain (the original client)
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback: use a hash of user-agent + accept-language as a rough identifier
  const ua = request.headers.get('user-agent') || 'unknown';
  const lang = request.headers.get('accept-language') || 'unknown';
  return `${ua}-${lang}`;
}

/**
 * Check if a request should be rate-limited.
 * Returns { limited: false } if the request is allowed,
 * or { limited: true, retryAfter } if the request should be blocked.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window has expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { limited: false, remaining: config.maxRequests - 1, retryAfter: 0 };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { limited: true, remaining: 0, retryAfter };
  }

  // Increment counter
  entry.count++;
  const remaining = config.maxRequests - entry.count;
  return { limited: false, remaining, retryAfter: 0 };
}

/**
 * Create a rate limiter middleware for API routes.
 * Returns a function that checks the rate limit for a given request.
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 });
 *
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = limiter(request);
 *   if (rateLimitResult) return rateLimitResult; // Returns 429 response
 *
 *   // ... handle request
 * }
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
  return function rateLimit(request: NextRequest, customIdentifier?: string) {
    const identifier = customIdentifier || getClientIdentifier(request);
    const prefixedIdentifier = `${request.nextUrl.pathname}:${identifier}`;

    const { limited, retryAfter } = checkRateLimit(prefixedIdentifier, config);

    if (limited) {
      const response = errorResponse('Too many requests. Please try again later.', 429);

      // Set standard rate limit headers
      response.headers.set('Retry-After', String(retryAfter));
      response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + retryAfter));

      return response;
    }

    // Not limited — return null to indicate the request can proceed
    return null;
  };
}

// Pre-configured rate limiters for common use cases

/** General API rate limiter: 60 requests per minute */
export const generalLimiter = createRateLimiter({
  maxRequests: 60,
  windowMs: 60_000,
});

/** Auth rate limiter: 10 attempts per 15 minutes */
export const authLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60_000,
});

/** Webhook rate limiter: 100 requests per minute */
export const webhookLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60_000,
});

/** Payment creation rate limiter: 5 requests per minute */
export const paymentLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60_000,
});

/** Search/listing rate limiter: 30 requests per minute */
export const searchLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60_000,
});
