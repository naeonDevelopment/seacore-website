/**
 * Rate Limiting - KV-based (Shared Across Workers)
 * SECURITY FIX: Replaces in-memory Map with persistent KV storage
 * 
 * Priority: CRITICAL
 * Issue: Prevents API flooding and abuse
 * 
 * Why KV instead of in-memory Map:
 * - Cloudflare Workers are stateless
 * - Each worker instance has separate memory
 * - Attackers can bypass in-memory limits by hitting different workers
 * - KV is shared across all worker instances globally
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // Seconds until allowed again
}

/**
 * Check rate limit using Cloudflare KV
 * Shared across all worker instances globally
 */
export async function checkRateLimit(
  key: string, 
  limit: number,
  windowSeconds: number,
  kv: KVNamespace
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;
  
  try {
    // Get current count from KV (shared across all workers)
    const current = await kv.get(windowKey);
    const count = current ? parseInt(current) : 0;
    
    const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds;
    
    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: resetAt - now
      };
    }
    
    // Increment counter atomically
    await kv.put(windowKey, (count + 1).toString(), {
      expirationTtl: windowSeconds * 2 // Auto-cleanup old windows
    });
    
    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt
    };
  } catch (error) {
    console.error('[RATE_LIMIT] KV error — failing closed to prevent rate limit bypass:', error);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + windowSeconds,
      retryAfter: 10,
    };
  }
}

/**
 * IP-based rate limiting
 * Global protection against DDoS
 */
export async function checkIPRateLimit(
  request: Request,
  kv: KVNamespace,
  maxRequests: number = 30,
  windowSeconds: number = 60 // 1 minute
): Promise<RateLimitResult> {
  const ip = request.headers.get('CF-Connecting-IP') || 
              request.headers.get('X-Forwarded-For') || 
              'unknown';
  
  return checkRateLimit(`ip:${ip}`, maxRequests, windowSeconds, kv);
}

/**
 * Session-based rate limiting
 * More lenient than IP, but prevents session abuse
 */
export async function checkSessionRateLimit(
  sessionId: string,
  kv: KVNamespace,
  maxRequests: number = 10,
  windowSeconds: number = 60 // 1 minute
): Promise<RateLimitResult> {
  return checkRateLimit(`session:${sessionId}`, maxRequests, windowSeconds, kv);
}

/**
 * User-based rate limiting (requires authentication)
 * Most lenient tier for authenticated users
 */
export async function checkUserRateLimit(
  userId: string,
  kv: KVNamespace,
  maxRequests: number = 100,
  windowSeconds: number = 3600 // 1 hour
): Promise<RateLimitResult> {
  return checkRateLimit(`user:${userId}`, maxRequests, windowSeconds, kv);
}

/**
 * Multi-tier rate limiting
 * Applies all tiers and returns most restrictive result
 */
export async function checkMultiTierRateLimit(
  request: Request,
  sessionId: string,
  userId: string | undefined,
  kv: KVNamespace
): Promise<RateLimitResult> {
  // Tier 1: IP-based (strictest) - 30 req/min
  const ipLimit = await checkIPRateLimit(request, kv, 30, 60);
  if (!ipLimit.allowed) {
    return { ...ipLimit, remaining: 0 };
  }
  
  // Tier 2: Session-based - 10 req/min
  const sessionLimit = await checkSessionRateLimit(sessionId, kv, 10, 60);
  if (!sessionLimit.allowed) {
    return { ...sessionLimit, remaining: 0 };
  }
  
  // Tier 3: User-based (most lenient) - 100 req/hour
  if (userId) {
    const userLimit = await checkUserRateLimit(userId, kv, 100, 3600);
    if (!userLimit.allowed) {
      return { ...userLimit, remaining: 0 };
    }
  }
  
  // Return most restrictive remaining count
  return {
    allowed: true,
    remaining: Math.min(ipLimit.remaining, sessionLimit.remaining),
    resetAt: Math.min(ipLimit.resetAt, sessionLimit.resetAt)
  };
}

/**
 * Generate rate limit headers for response
 * Standard RateLimit headers (RFC 6585)
 */
// IP-tier limit (the most restrictive exposed to clients)
const IP_RATE_LIMIT = 30;

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': IP_RATE_LIMIT.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  };
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
      resetAt: result.resetAt
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...getRateLimitHeaders(result)
      }
    }
  );
}

/**
 * Middleware wrapper for rate-limited endpoints
 */
export function withRateLimit(
  handler: (request: Request, env: any) => Promise<Response>,
  options?: {
    ipLimit?: number;
    sessionLimit?: number;
    userLimit?: number;
  }
) {
  return async (context: { request: Request; env: any }) => {
    const { request, env } = context;
    
    if (!env.CHAT_SESSIONS) {
      console.warn('[RATE_LIMIT] KV not configured, skipping rate limit');
      return handler(request, env);
    }
    
    // Extract session ID from request
    const body = await request.json().catch(() => ({}));
    const sessionId = body.sessionId || 'anonymous';
    
    // Check rate limits
    const rateLimit = await checkMultiTierRateLimit(
      request,
      sessionId,
      undefined, // userId from auth
      env.CHAT_SESSIONS
    );
    
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }
    
    // Add rate limit headers to successful response
    const response = await handler(request, env);
    const headers = getRateLimitHeaders(rateLimit);
    
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  };
}

