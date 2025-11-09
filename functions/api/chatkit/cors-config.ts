/**
 * CORS Configuration - Strict Origin Whitelist
 * SECURITY FIX: Replaces wildcard (*) CORS with explicit origin validation
 * 
 * Priority: CRITICAL
 * Issue: Prevents API abuse and unauthorized access
 */

export const ALLOWED_ORIGINS = [
  'https://fleetcore.ai',
  'https://www.fleetcore.ai',
  'https://seacore.ai',
  'https://www.seacore.ai',
  // Development origins (only in non-production)
  ...(process.env.NODE_ENV === 'development' 
    ? ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:5173']
    : []
  )
];

/**
 * Get CORS headers with strict origin validation
 * Only allows requests from whitelisted origins
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  
  // Validate origin is in whitelist
  const isAllowed = ALLOWED_ORIGINS.includes(origin || '');
  const allowedOrigin = isAllowed ? (origin || ALLOWED_ORIGINS[0]) : ALLOWED_ORIGINS[0];
  
  // Log rejected CORS requests for security monitoring
  if (origin && !isAllowed) {
    console.warn(`[SECURITY] Rejected CORS request from unauthorized origin: ${origin}`);
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours - reduces preflight requests
    'Vary': 'Origin', // Important for caching
  };
}

/**
 * Validate if origin is allowed
 * Used in middleware for early rejection
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

