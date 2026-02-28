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
 * Sanitize error for client response.
 * Logs full error server-side; returns a safe generic message to the client.
 * Pass isDev=true (e.g. env.ENVIRONMENT === 'development') to include debug info.
 */
export function sanitizeError(error: unknown, context?: string, isDev = false): SanitizedError {
  const err = error as Record<string, unknown> | null | undefined;
  console.error('[ERROR]', {
    context: context || 'unknown',
    message: err?.message,
    name: err?.name,
    timestamp: new Date().toISOString(),
    ...(isDev && { stack: err?.stack }),
  });

  const errorMessage = (err?.message as string) || String(error) || 'Unknown error';
  const safeMessage = SAFE_ERROR_MAP[errorMessage] ?? 'An error occurred while processing your request';

  return {
    error: safeMessage,
    code: (err?.code as string) || 'INTERNAL_ERROR',
    ...(isDev && { debug: errorMessage }),
  };
}

/**
 * Create error response with sanitized message
 */
export function createErrorResponse(
  error: unknown,
  status: number = 500,
  headers: Record<string, string> = {},
  context?: string,
  isDev = false
): Response {
  const sanitized = sanitizeError(error, context, isDev);
  
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

