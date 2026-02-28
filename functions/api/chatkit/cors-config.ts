/**
 * CORS Configuration - Strict Origin Whitelist
 * SECURITY FIX: Replaces wildcard (*) CORS with explicit origin validation
 * 
 * Priority: CRITICAL
 * Issue: Prevents API abuse and unauthorized access
 */

// process.env.NODE_ENV is not available in Cloudflare Workers; include localhost
// origins unconditionally — browsers on production never send localhost as Origin.
export const ALLOWED_ORIGINS = [
  'https://fleetcore.ai',
  'https://www.fleetcore.ai',
  'https://seacore.ai',
  'https://www.seacore.ai',
  // Local development origins (harmless in production CORS context)
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:5173',
];

/**
 * Get CORS headers with strict origin validation.
 * Only returns Access-Control-Allow-Origin for whitelisted origins.
 * Unauthorized origins receive no ACAO header so browsers block them.
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');

  const isAllowed = origin !== null && ALLOWED_ORIGINS.includes(origin);

  if (origin && !isAllowed) {
    console.warn(`[SECURITY] Rejected CORS request from unauthorized origin: ${origin}`);
  }

  const baseHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };

  if (isAllowed) {
    baseHeaders['Access-Control-Allow-Origin'] = origin!;
  }

  return baseHeaders;
}

/**
 * Validate if origin is allowed
 * Used in middleware for early rejection
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

