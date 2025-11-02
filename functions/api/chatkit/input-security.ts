/**
 * PHASE 4B: Input Validation & Security Layer
 * 
 * Based on 2025 Zero Trust Security Best Practices:
 * - Validate EVERY request (no implicit trust)
 * - Sanitize user inputs (XSS, prompt injection)
 * - Rate limiting per session
 * - Audit trail for security events
 * 
 * Research Sources:
 * - Natoma.id: "Securing LLM Infrastructure" (2025)
 * - OWASP Top 10 for LLMs
 * - NIST AI Risk Management Framework
 */

// =====================
// TYPES
// =====================

export interface ValidationResult {
  valid: boolean;
  sanitized?: string; // Cleaned version of input
  errors: string[];
  warnings: string[];
  risk: 'low' | 'medium' | 'high';
  detections: {
    promptInjection?: boolean;
    xss?: boolean;
    sqlInjection?: boolean;
    excessiveLength?: boolean;
    suspiciousPatterns?: boolean;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp
  reason?: string;
}

// =====================
// PROMPT INJECTION DETECTION
// =====================

/**
 * Detect potential prompt injection attempts
 * 
 * Common patterns:
 * - "Ignore previous instructions"
 * - "You are now a different assistant"
 * - "Disregard all prior context"
 * - System prompt manipulation attempts
 * - Role-play attacks
 */
function detectPromptInjection(input: string): { detected: boolean; patterns: string[] } {
  const lower = input.toLowerCase();
  const detected: string[] = [];
  
  // Pattern 1: Ignore/disregard instructions
  const ignorePatterns = [
    /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|commands?|rules?|prompts?)/i,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|context)/i,
    /forget\s+(everything|all)\s+(you|that)\s+(know|learned)/i,
  ];
  
  for (const pattern of ignorePatterns) {
    if (pattern.test(input)) {
      detected.push('ignore_instructions');
      break;
    }
  }
  
  // Pattern 2: Role manipulation
  const rolePatterns = [
    /you\s+are\s+now\s+(a|an)\s+/i,
    /from\s+now\s+on,?\s+you\s+(are|will\s+be)/i,
    /act\s+as\s+(if\s+you\s+are\s+)?(a|an)\s+/i,
    /pretend\s+(you\s+are|to\s+be)/i,
  ];
  
  for (const pattern of rolePatterns) {
    if (pattern.test(input)) {
      detected.push('role_manipulation');
      break;
    }
  }
  
  // Pattern 3: System prompt exposure attempts
  const systemPatterns = [
    /what\s+(is|are)\s+your\s+(system\s+)?(instructions?|prompts?|rules?)/i,
    /show\s+me\s+your\s+(system\s+)?(prompt|instructions)/i,
    /repeat\s+your\s+(initial|original|system)\s+(prompt|instructions)/i,
  ];
  
  for (const pattern of systemPatterns) {
    if (pattern.test(input)) {
      detected.push('system_exposure');
      break;
    }
  }
  
  // Pattern 4: Output format manipulation
  const outputPatterns = [
    /respond\s+with\s+only/i,
    /output\s+format:\s*\{/i,
    /return\s+json\s+with/i,
    /always\s+(respond|answer)\s+with/i,
  ];
  
  for (const pattern of outputPatterns) {
    if (pattern.test(input)) {
      detected.push('output_manipulation');
      break;
    }
  }
  
  // Pattern 5: Delimiter/escape attempts
  if (input.includes('"""') || input.includes("'''") || input.includes('```')) {
    if (lower.includes('end of') || lower.includes('start of')) {
      detected.push('delimiter_injection');
    }
  }
  
  return {
    detected: detected.length > 0,
    patterns: detected,
  };
}

// =====================
// XSS & SCRIPT INJECTION DETECTION
// =====================

/**
 * Detect XSS and script injection attempts
 * Maritime queries should never contain script tags or event handlers
 */
function detectXSS(input: string): { detected: boolean; patterns: string[] } {
  const detected: string[] = [];
  
  // Pattern 1: Script tags
  if (/<script[\s\S]*?>[\s\S]*?<\/script>/i.test(input)) {
    detected.push('script_tag');
  }
  
  // Pattern 2: Event handlers
  const eventHandlers = [
    'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus',
    'onblur', 'onchange', 'onsubmit', 'onkeydown', 'onkeyup'
  ];
  
  for (const handler of eventHandlers) {
    if (new RegExp(`${handler}\\s*=`, 'i').test(input)) {
      detected.push('event_handler');
      break;
    }
  }
  
  // Pattern 3: JavaScript protocol
  if (/javascript\s*:/i.test(input)) {
    detected.push('javascript_protocol');
  }
  
  // Pattern 4: Data URLs with scripts
  if (/data:text\/html/i.test(input) || /data:application\/x-javascript/i.test(input)) {
    detected.push('data_url_script');
  }
  
  return {
    detected: detected.length > 0,
    patterns: detected,
  };
}

// =====================
// SQL INJECTION DETECTION
// =====================

/**
 * Detect potential SQL injection attempts
 * While we don't use SQL directly, check for common patterns
 */
function detectSQLInjection(input: string): { detected: boolean; patterns: string[] } {
  const detected: string[] = [];
  
  // Common SQL injection patterns
  const sqlPatterns = [
    /'\s*OR\s+'1'\s*=\s*'1/i,
    /'\s*OR\s+1\s*=\s*1/i,
    /UNION\s+SELECT/i,
    /DROP\s+TABLE/i,
    /INSERT\s+INTO/i,
    /DELETE\s+FROM/i,
    /UPDATE\s+\w+\s+SET/i,
    /;\s*DROP/i,
    /--\s*$/,
    /\/\*.*\*\//,
  ];
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      detected.push('sql_pattern');
      break;
    }
  }
  
  return {
    detected: detected.length > 0,
    patterns: detected,
  };
}

// =====================
// INPUT SANITIZATION
// =====================

/**
 * Sanitize user input while preserving legitimate maritime queries
 * 
 * Approach:
 * - Remove script tags and event handlers
 * - Escape HTML entities
 * - Normalize whitespace
 * - Preserve legitimate technical terms (IMO, MMSI, vessel names)
 */
export function sanitizeInput(input: string): string {
  let sanitized = input;
  
  // Remove script tags
  sanitized = sanitized.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["']?[^"']*["']?/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  
  // Escape HTML entities (but allow common symbols)
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  // Normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  // Limit length to prevent DoS (10,000 chars max for maritime queries)
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  return sanitized;
}

// =====================
// COMPREHENSIVE VALIDATION
// =====================

/**
 * Main validation function - checks all security aspects
 */
export function validateInput(input: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const detections: ValidationResult['detections'] = {};
  let risk: 'low' | 'medium' | 'high' = 'low';
  
  // Check 1: Empty input
  if (!input || input.trim().length === 0) {
    errors.push('Input cannot be empty');
    return {
      valid: false,
      errors,
      warnings,
      risk: 'low',
      detections,
    };
  }
  
  // Check 2: Excessive length
  if (input.length > 10000) {
    warnings.push('Input exceeds recommended length (10,000 chars)');
    detections.excessiveLength = true;
    risk = 'medium';
  }
  
  // Check 3: Prompt injection
  const promptInjection = detectPromptInjection(input);
  if (promptInjection.detected) {
    errors.push(`Potential prompt injection detected: ${promptInjection.patterns.join(', ')}`);
    detections.promptInjection = true;
    risk = 'high';
  }
  
  // Check 4: XSS
  const xss = detectXSS(input);
  if (xss.detected) {
    errors.push(`Potential XSS detected: ${xss.patterns.join(', ')}`);
    detections.xss = true;
    risk = 'high';
  }
  
  // Check 5: SQL injection
  const sql = detectSQLInjection(input);
  if (sql.detected) {
    warnings.push(`SQL-like patterns detected: ${sql.patterns.join(', ')}`);
    detections.sqlInjection = true;
    if (risk === 'low') risk = 'medium';
  }
  
  // Check 6: Suspicious patterns (excessive special characters)
  const specialCharRatio = (input.match(/[^a-zA-Z0-9\s]/g) || []).length / input.length;
  if (specialCharRatio > 0.3) {
    warnings.push('High ratio of special characters');
    detections.suspiciousPatterns = true;
    if (risk === 'low') risk = 'medium';
  }
  
  // Sanitize input
  const sanitized = sanitizeInput(input);
  
  return {
    valid: errors.length === 0,
    sanitized,
    errors,
    warnings,
    risk,
    detections,
  };
}

// =====================
// RATE LIMITING
// =====================

/**
 * Rate limit tracker using in-memory Map
 * Production: Use Redis or Cloudflare KV
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for a session
 * Default: 10 requests per minute
 */
export function checkRateLimit(
  sessionId: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): RateLimitResult {
  const now = Date.now();
  const key = sessionId;
  
  // Get current rate limit state
  let state = rateLimitStore.get(key);
  
  // Reset if window expired
  if (!state || now >= state.resetAt) {
    state = {
      count: 0,
      resetAt: now + windowMs,
    };
  }
  
  // Check if limit exceeded
  if (state.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: state.resetAt,
      reason: `Rate limit exceeded (${maxRequests} requests per ${windowMs / 1000}s)`,
    };
  }
  
  // Increment count and store
  state.count++;
  rateLimitStore.set(key, state);
  
  return {
    allowed: true,
    remaining: maxRequests - state.count,
    resetAt: state.resetAt,
  };
}

// =====================
// AUDIT LOGGING
// =====================

export interface SecurityEvent {
  timestamp: number;
  sessionId: string;
  eventType: 'validation_failed' | 'rate_limit_exceeded' | 'suspicious_input';
  input: string;
  validation: ValidationResult;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log security events for audit trail
 * Production: Send to SIEM (Security Information and Event Management)
 */
export function logSecurityEvent(event: SecurityEvent): void {
  // In production, send to logging service (Datadog, Splunk, etc.)
  console.warn('🔒 SECURITY EVENT:', {
    type: event.eventType,
    risk: event.validation.risk,
    sessionId: event.sessionId,
    timestamp: new Date(event.timestamp).toISOString(),
    detections: event.validation.detections,
  });
  
  // Store in persistent log (implement based on infrastructure)
  // Examples:
  // - Cloudflare Workers KV
  // - Cloudflare D1 database
  // - External logging service (Datadog, LogDNA)
}

// =====================
// HIGH-LEVEL API
// =====================

/**
 * Complete security check: validation + rate limiting
 */
export function performSecurityCheck(
  input: string,
  sessionId: string,
  options?: {
    maxRequests?: number;
    windowMs?: number;
    strictMode?: boolean; // Block on warnings too
  }
): {
  allowed: boolean;
  validation: ValidationResult;
  rateLimit: RateLimitResult;
  reason?: string;
} {
  
  // Step 1: Rate limiting
  const rateLimit = checkRateLimit(sessionId, options?.maxRequests, options?.windowMs);
  
  if (!rateLimit.allowed) {
    return {
      allowed: false,
      validation: {
        valid: false,
        errors: [],
        warnings: [],
        risk: 'low',
        detections: {},
      },
      rateLimit,
      reason: rateLimit.reason,
    };
  }
  
  // Step 2: Input validation
  const validation = validateInput(input);
  
  // Step 3: Security event logging
  if (!validation.valid || validation.risk === 'high') {
    logSecurityEvent({
      timestamp: Date.now(),
      sessionId,
      eventType: validation.valid ? 'suspicious_input' : 'validation_failed',
      input: input.substring(0, 200), // Log first 200 chars only
      validation,
    });
  }
  
  // Step 4: Determine if request should be blocked
  const strictMode = options?.strictMode || false;
  const shouldBlock = 
    !validation.valid || 
    validation.risk === 'high' ||
    (strictMode && validation.warnings.length > 0);
  
  return {
    allowed: !shouldBlock,
    validation,
    rateLimit,
    reason: shouldBlock ? `Security check failed: ${validation.errors.join(', ') || validation.warnings.join(', ')}` : undefined,
  };
}

