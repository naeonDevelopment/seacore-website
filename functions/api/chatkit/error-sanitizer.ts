/**
 * Error Sanitization - Phase 1 Security
 * Prevents sensitive information leakage in error responses
 */

interface SanitizedError {
  error: string;
  code: string;
  debug?: string;
}

const SAFE_ERROR_MAP: Record<string, string> = {
  'OPENAI_API_KEY not configured': 'Service temporarily unavailable',
  'TAVILY_API_KEY not configured': 'Service temporarily unavailable',
  'GEMINI_API_KEY not configured': 'Service temporarily unavailable',
  'LANGSMITH_API_KEY not configured': 'Service temporarily unavailable',
  'JWT_SECRET not configured': 'Authentication service unavailable',
  'CSRF_SECRET not configured': 'Security service unavailable',
  'Rate limit exceeded': 'Too many requests. Please try again later.',
  'Invalid token': 'Authentication failed',
  'Token expired': 'Authentication expired',
  'Unauthorized': 'Authentication required',
  'Forbidden': 'Access denied',
  'KV namespace not bound': 'Service temporarily unavailable',
  'D1 database not bound': 'Service temporarily unavailable',
};

/**
 * Sanitize error for client response
 * Logs full error server-side, returns safe message to client
 */
export function sanitizeError(error: any, context?: string): SanitizedError {
  // Log full error server-side (for debugging)
  console.error('[ERROR]', {
    context: context || 'unknown',
    message: error?.message,
    name: error?.name,
    timestamp: new Date().toISOString(),
    // Only log stack in development
    ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
  });
  
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  const safeMessage = SAFE_ERROR_MAP[errorMessage] || 'An error occurred while processing your request';
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    error: safeMessage,
    code: error?.code || 'INTERNAL_ERROR',
    // Only include debug info in development
    ...(isDevelopment && { debug: errorMessage })
  };
}

/**
 * Create error response with sanitized message
 */
export function createErrorResponse(
  error: any, 
  status: number = 500, 
  headers: Record<string, string> = {},
  context?: string
): Response {
  const sanitized = sanitizeError(error, context);
  
  return new Response(
    JSON.stringify(sanitized),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }
  );
}

