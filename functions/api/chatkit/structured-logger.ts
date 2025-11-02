/**
 * PHASE 4B: Structured Logging with Trace IDs
 * 
 * Problem: Current logging is unstructured console.log
 *   console.log(`   ✅ Found ${sources.length} sources`);
 *   - Hard to query
 *   - No correlation between requests
 *   - No performance metrics
 *   - Can't aggregate or alert
 * 
 * Solution: JSON-formatted logs with trace IDs and metadata
 * 
 * Benefits:
 * - Queryable logs (Grafana, Datadog, CloudWatch)
 * - Distributed tracing (follow request across services)
 * - Performance dashboards
 * - Automated alerting on anomalies
 * 
 * Research Source:
 * - "Building AI Agent Architecture" (2025)
 * - OpenTelemetry standards
 * - 12-Factor App logging principles
 */

import { createHash, randomBytes } from 'crypto';

// =====================
// TYPES
// =====================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  traceId: string; // Unique ID for entire request flow
  spanId?: string; // Unique ID for this operation
  parentSpanId?: string; // Parent operation ID
  sessionId?: string; // User session
  userId?: string; // User ID (if authenticated)
  requestId?: string; // HTTP request ID
}

export interface LogMetadata {
  // Agent-specific
  mode?: 'verification' | 'research' | 'none';
  query?: string;
  sources?: number;
  confidence?: number;
  
  // Performance
  latencyMs?: number;
  cacheHit?: boolean;
  apiCalls?: number;
  
  // Resource usage
  tokensUsed?: number;
  costUsd?: number;
  
  // Results
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
  
  // Additional custom fields
  [key: string]: any;
}

export interface StructuredLogEntry {
  timestamp: string; // ISO 8601
  level: LogLevel;
  message: string;
  context: LogContext;
  metadata?: LogMetadata;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// =====================
// TRACE ID GENERATION
// =====================

/**
 * Generate a unique trace ID
 * Format: 32-char hex string (128 bits of randomness)
 * Compatible with OpenTelemetry
 */
export function generateTraceId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a unique span ID
 * Format: 16-char hex string (64 bits)
 */
export function generateSpanId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Generate a deterministic trace ID from session ID
 * Useful for correlating logs from same session
 */
export function generateTraceIdFromSession(sessionId: string): string {
  return createHash('sha256').update(sessionId).digest('hex').substring(0, 32);
}

// =====================
// LOGGER CLASS
// =====================

export class StructuredLogger {
  private context: LogContext;
  private defaultMetadata: LogMetadata;
  private minLevel: LogLevel;
  private output: (entry: StructuredLogEntry) => void;
  
  constructor(
    context: LogContext,
    options?: {
      minLevel?: LogLevel;
      defaultMetadata?: LogMetadata;
      output?: (entry: StructuredLogEntry) => void;
    }
  ) {
    this.context = context;
    this.defaultMetadata = options?.defaultMetadata || {};
    this.minLevel = options?.minLevel || 'info';
    this.output = options?.output || this.defaultOutput;
  }
  
  /**
   * Default output: JSON to console
   * In production, send to logging service
   */
  private defaultOutput(entry: StructuredLogEntry): void {
    const json = JSON.stringify(entry);
    
    switch (entry.level) {
      case 'fatal':
      case 'error':
        console.error(json);
        break;
      case 'warn':
        console.warn(json);
        break;
      case 'debug':
        console.debug(json);
        break;
      default:
        console.log(json);
    }
  }
  
  /**
   * Check if log level should be emitted
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const minIndex = levels.indexOf(this.minLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
  }
  
  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;
    
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      metadata: { ...this.defaultMetadata, ...metadata },
    };
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    
    this.output(entry);
  }
  
  // Convenience methods
  
  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, metadata);
  }
  
  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }
  
  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }
  
  error(message: string, error?: Error, metadata?: LogMetadata): void {
    this.log('error', message, metadata, error);
  }
  
  fatal(message: string, error?: Error, metadata?: LogMetadata): void {
    this.log('fatal', message, metadata, error);
  }
  
  /**
   * Create a child logger for a sub-operation (span)
   */
  child(spanName: string, metadata?: LogMetadata): StructuredLogger {
    const spanId = generateSpanId();
    
    return new StructuredLogger(
      {
        ...this.context,
        spanId,
        parentSpanId: this.context.spanId,
      },
      {
        minLevel: this.minLevel,
        defaultMetadata: {
          ...this.defaultMetadata,
          ...metadata,
          spanName,
        },
        output: this.output,
      }
    );
  }
  
  /**
   * Start a timed span
   * Returns a function to end the span and log duration
   */
  startSpan(spanName: string, metadata?: LogMetadata): () => void {
    const startTime = Date.now();
    const childLogger = this.child(spanName, metadata);
    
    childLogger.info(`${spanName} started`, metadata);
    
    return () => {
      const latencyMs = Date.now() - startTime;
      childLogger.info(`${spanName} completed`, {
        ...metadata,
        latencyMs,
      });
    };
  }
}

// =====================
// FACTORY FUNCTIONS
// =====================

/**
 * Create a logger for a new request
 */
export function createRequestLogger(
  sessionId: string,
  requestId?: string,
  options?: {
    minLevel?: LogLevel;
    metadata?: LogMetadata;
  }
): StructuredLogger {
  const traceId = requestId || generateTraceId();
  
  return new StructuredLogger(
    {
      traceId,
      sessionId,
      requestId,
    },
    {
      minLevel: options?.minLevel || 'info',
      defaultMetadata: options?.metadata,
    }
  );
}

/**
 * Create a logger with existing trace context
 */
export function createLoggerWithContext(
  context: LogContext,
  options?: {
    minLevel?: LogLevel;
    metadata?: LogMetadata;
  }
): StructuredLogger {
  return new StructuredLogger(context, options);
}

// =====================
// PERFORMANCE HELPERS
// =====================

/**
 * Create a performance timer
 * Returns a function to end the timer and get duration
 */
export function createTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

/**
 * Measure async operation duration
 */
export async function measureAsync<T>(
  operation: () => Promise<T>,
  logger: StructuredLogger,
  operationName: string,
  metadata?: LogMetadata
): Promise<{ result: T; latencyMs: number }> {
  const timer = createTimer();
  
  try {
    logger.info(`${operationName} started`, metadata);
    const result = await operation();
    const latencyMs = timer();
    
    logger.info(`${operationName} completed`, {
      ...metadata,
      latencyMs,
      success: true,
    });
    
    return { result, latencyMs };
  } catch (error: any) {
    const latencyMs = timer();
    
    logger.error(`${operationName} failed`, error, {
      ...metadata,
      latencyMs,
      success: false,
      errorMessage: error.message,
    });
    
    throw error;
  }
}

// =====================
// MIGRATION HELPERS
// =====================

/**
 * Wrapper to gradually migrate from console.log to structured logging
 * Can be used as a drop-in replacement
 */
export function createLegacyWrapper(logger: StructuredLogger) {
  return {
    log: (...args: any[]) => {
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      logger.info(message);
    },
    info: (...args: any[]) => {
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      logger.info(message);
    },
    warn: (...args: any[]) => {
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      logger.warn(message);
    },
    error: (...args: any[]) => {
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      const error = args.find(a => a instanceof Error);
      logger.error(message, error);
    },
  };
}

// =====================
// EXAMPLE USAGE
// =====================

/**
 * Example: Using structured logger in agent orchestrator
 * 
 * const logger = createRequestLogger(sessionId, requestId);
 * 
 * logger.info('Agent started', {
 *   mode: 'verification',
 *   query: userQuery,
 * });
 * 
 * const endSpan = logger.startSpan('source_aggregation');
 * const sources = await aggregateAndRank(allSources);
 * endSpan(); // Automatically logs duration
 * 
 * logger.info('Sources ranked', {
 *   sources: sources.length,
 *   tier1: sources.filter(s => s.tier === 'T1').length,
 * });
 * 
 * // For operations that might fail
 * const { result, latencyMs } = await measureAsync(
 *   () => executeParallelQueries(...),
 *   logger,
 *   'parallel_queries',
 *   { queryCount: 6 }
 * );
 */

