/**
 * Authentication Middleware - JWT Validation
 * SECURITY FIX: Adds authentication to all API endpoints
 * 
 * Priority: CRITICAL
 * Issue: Prevents unauthorized API access and abuse
 * 
 * Installation Required:
 * npm install @tsndr/cloudflare-worker-jwt
 * 
 * Environment Variables Required:
 * - JWT_SECRET: Secret key for JWT signing (generate with: openssl rand -base64 32)
 */

import { verify } from '@tsndr/cloudflare-worker-jwt';

export interface AuthResult {
  valid: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

export interface JWTPayload {
  sub: string;      // User ID
  email?: string;   // User email (optional)
  iat: number;      // Issued at
  exp: number;      // Expiry
}

/**
 * Validate JWT token from Authorization header
 * Returns user identity if valid, error otherwise
 */
export async function validateAuth(request: Request, env: any): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  
  // Check for Authorization header
  if (!authHeader) {
    return { valid: false, error: 'Missing authorization header' };
  }
  
  // Check Bearer format
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Invalid authorization format. Use: Bearer <token>' };
  }
  
  const token = authHeader.substring(7);
  
  // Check JWT secret is configured
  if (!env.JWT_SECRET) {
    console.error('[AUTH] JWT_SECRET not configured in environment');
    return { valid: false, error: 'Authentication service unavailable' };
  }
  
  try {
    // Verify token signature and expiry
    const isValid = await verify(token, env.JWT_SECRET);
    
    if (!isValid) {
      return { valid: false, error: 'Invalid or expired token' };
    }
    
    // Decode payload
    const [, payloadB64] = token.split('.');
    const payload: JWTPayload = JSON.parse(atob(payloadB64));
    
    // Validate required claims
    if (!payload.sub) {
      return { valid: false, error: 'Invalid token: missing user ID' };
    }
    
    // Check expiry (additional validation)
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return { valid: false, error: 'Token expired' };
    }
    
    return {
      valid: true,
      userId: payload.sub,
      email: payload.email
    };
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error);
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Generate JWT token for user (for login endpoint)
 * Expires in 7 days by default
 */
export async function generateToken(
  userId: string, 
  email: string | undefined,
  secret: string,
  expiryDays: number = 7
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiryDays * 24 * 60 * 60);
  
  const payload: JWTPayload = {
    sub: userId,
    email,
    iat: now,
    exp
  };
  
  // Note: @tsndr/cloudflare-worker-jwt has sign() method
  // const token = await sign(payload, secret);
  // return token;
  
  // Placeholder - implement with your JWT library
  throw new Error('generateToken not yet implemented - use your JWT library');
}

/**
 * Optional: Rate limiting per authenticated user
 * More lenient than IP-based rate limiting
 */
export async function checkUserRateLimit(
  userId: string,
  kv: KVNamespace,
  maxRequests: number = 100,
  windowSeconds: number = 3600 // 1 hour
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:user:${userId}:${Math.floor(now / windowSeconds)}`;
  
  const current = await kv.get(windowKey);
  const count = current ? parseInt(current) : 0;
  
  if (count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: (Math.floor(now / windowSeconds) + 1) * windowSeconds
    };
  }
  
  await kv.put(windowKey, (count + 1).toString(), {
    expirationTtl: windowSeconds * 2
  });
  
  return {
    allowed: true,
    remaining: maxRequests - count - 1,
    resetAt: (Math.floor(now / windowSeconds) + 1) * windowSeconds
  };
}

/**
 * Middleware wrapper for authenticated endpoints
 * Usage: wrap your handler with this function
 */
export function withAuth(
  handler: (request: Request, env: any, auth: AuthResult) => Promise<Response>
) {
  return async (context: { request: Request; env: any }) => {
    const { request, env } = context;
    
    // Validate authentication
    const auth = await validateAuth(request, env);
    
    if (!auth.valid) {
      return new Response(
        JSON.stringify({ 
          error: auth.error,
          code: 'UNAUTHORIZED'
        }), 
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer'
          }
        }
      );
    }
    
    // Call handler with authenticated context
    return handler(request, env, auth);
  };
}

