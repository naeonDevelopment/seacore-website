/**
 * PHASE 2: Cloudflare KV Cache for Gemini Results
 * 
 * Provides deterministic caching with TTL for Gemini grounding results
 * 
 * Benefits:
 * - Faster responses (cache hit = instant)
 * - Cost reduction (fewer Gemini API calls)
 * - Stable outputs (same query = same sources)
 * - Cloudflare KV global edge distribution
 * 
 * Key Format: gemini:v1:<hash(query+context)>
 * TTL: 15 minutes (configurable)
 */

import { createHash } from 'crypto';

// =====================
// TYPES
// =====================

export interface CachedGeminiResult {
  sources: Array<{
    url: string;
    title: string;
    content: string;
    score?: number;
    tier?: 'T1' | 'T2' | 'T3';
  }>;
  answer: string | null;
  diagnostics: {
    sourcesByTier: Record<string, number>;
    totalSources: number;
    hasAnswer: boolean;
    answerLength: number;
  };
  cachedAt: number;  // Timestamp
  expiresAt: number; // Timestamp
}

// =====================
// CONFIGURATION
// =====================

const CACHE_VERSION = 'v1';
const DEFAULT_TTL_SECONDS = 900;  // 15 minutes
const CACHE_KEY_PREFIX = 'gemini';

// =====================
// CACHE OPERATIONS
// =====================

/**
 * PHASE 3 FIX: Extract canonical entity identifiers from context
 * Only IMO/MMSI/name affect cache key, not conversation history
 */
function extractCanonicalIdentifiers(entityContext?: string): string {
  if (!entityContext) return '';
  
  const ctx = entityContext.toLowerCase();
  
  // Extract IMO (most stable identifier)
  const imoMatch = ctx.match(/\bimo\s*:?\s*(\d{7})\b/);
  if (imoMatch) return `imo:${imoMatch[1]}`;
  
  // Extract MMSI (stable but can change)
  const mmsiMatch = ctx.match(/\bmmsi\s*:?\s*(\d{9})\b/);
  if (mmsiMatch) return `mmsi:${mmsiMatch[1]}`;
  
  // Extract vessel/company name (least stable)
  // Pattern: "PREVIOUSLY DISCUSSED: - Name" or just first capitalized entity
  const nameMatch = entityContext.match(/(?:PREVIOUSLY DISCUSSED[^:]*:\s*-\s*|^)([A-Z][A-Za-z0-9\s\-]+?)(?:\n|$)/);
  if (nameMatch) {
    const name = nameMatch[1].trim().toLowerCase().replace(/\s+/g, '-');
    return `name:${name}`;
  }
  
  // No identifiable entity
  return '';
}

/**
 * PHASE 3 FIX: Generate cache key from query + canonical entity (not full context)
 * This prevents cache collisions when same entity is queried from different sessions
 */
export function generateCacheKey(query: string, entityContext?: string): string {
  // Normalize query (lowercase, trim, collapse whitespace)
  let normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // PHASE 3: Extract canonical identifiers ONLY (not full context)
  const canonicalEntity = extractCanonicalIdentifiers(entityContext);
  
  // If we have a canonical entity, use it; otherwise just use query
  const input = canonicalEntity 
    ? `${normalizedQuery}::${canonicalEntity}`
    : normalizedQuery;
  
  // Create SHA-256 hash
  const hash = createHash('sha256').update(input).digest('hex').substring(0, 16);
  
  // Format: gemini:v1:<hash>
  return `${CACHE_KEY_PREFIX}:${CACHE_VERSION}:${hash}`;
}

/**
 * Get cached Gemini result from Cloudflare KV
 */
export async function getCachedResult(
  kv: KVNamespace | undefined,
  query: string,
  entityContext?: string
): Promise<CachedGeminiResult | null> {
  
  if (!kv) {
    console.log(`   📦 KV not available - cache disabled`);
    return null;
  }
  
  const cacheKey = generateCacheKey(query, entityContext);
  
  try {
    const cached = await kv.get(cacheKey, 'json');
    
    if (!cached) {
      console.log(`   ❌ Cache miss: ${cacheKey}`);
      return null;
    }
    
    const result = cached as CachedGeminiResult;
    
    // Check expiration (double-check even though KV handles TTL)
    if (result.expiresAt && Date.now() > result.expiresAt) {
      console.log(`   ⏰ Cache expired: ${cacheKey}`);
      return null;
    }
    
    const age = Math.floor((Date.now() - result.cachedAt) / 1000);
    console.log(`   ✅ Cache HIT: ${cacheKey} (age: ${age}s)`);
    console.log(`   📊 Cached sources: ${result.sources.length}, answer: ${!!result.answer}`);
    
    return result;
    
  } catch (error) {
    console.error(`   ❌ Cache read error:`, error);
    return null;
  }
}

/**
 * Store Gemini result in Cloudflare KV with TTL
 */
export async function setCachedResult(
  kv: KVNamespace | undefined,
  query: string,
  entityContext: string | undefined,
  result: {
    sources: any[];
    answer: string | null;
    diagnostics: any;
  },
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  
  if (!kv) {
    console.log(`   📦 KV not available - skipping cache write`);
    return;
  }
  
  const cacheKey = generateCacheKey(query, entityContext);
  const now = Date.now();
  
  const cachedResult: CachedGeminiResult = {
    ...result,
    cachedAt: now,
    expiresAt: now + (ttlSeconds * 1000),
  };
  
  try {
    await kv.put(cacheKey, JSON.stringify(cachedResult), {
      expirationTtl: ttlSeconds,
    });
    
    console.log(`   ✅ Cache WRITE: ${cacheKey} (TTL: ${ttlSeconds}s)`);
    console.log(`   📊 Stored: ${result.sources.length} sources, answer: ${!!result.answer}`);
    
  } catch (error) {
    console.error(`   ❌ Cache write error:`, error);
    // Don't throw - cache write failure shouldn't break the request
  }
}

/**
 * Invalidate cached result (useful for forced refresh)
 */
export async function invalidateCache(
  kv: KVNamespace | undefined,
  query: string,
  entityContext?: string
): Promise<void> {
  
  if (!kv) return;
  
  const cacheKey = generateCacheKey(query, entityContext);
  
  try {
    await kv.delete(cacheKey);
    console.log(`   🗑️  Cache invalidated: ${cacheKey}`);
  } catch (error) {
    console.error(`   ❌ Cache delete error:`, error);
  }
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getCacheStats(cachedResult: CachedGeminiResult | null): {
  hit: boolean;
  age?: number;
  ttl?: number;
} {
  if (!cachedResult) {
    return { hit: false };
  }
  
  const now = Date.now();
  const age = Math.floor((now - cachedResult.cachedAt) / 1000);
  const ttl = Math.floor((cachedResult.expiresAt - now) / 1000);
  
  return {
    hit: true,
    age,
    ttl: Math.max(0, ttl),
  };
}

/**
 * Wrapper function: Get cached OR execute query with caching
 */
export async function getCachedOrExecute<T>(
  kv: KVNamespace | undefined,
  query: string,
  entityContext: string | undefined,
  executor: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<{ result: T; cached: boolean }> {
  
  // Try cache first
  const cached = await getCachedResult(kv, query, entityContext);
  
  if (cached) {
    return { result: cached as any, cached: true };
  }
  
  // Execute and cache
  const result = await executor();
  
  // Cache the result
  await setCachedResult(kv, query, entityContext, result as any, ttlSeconds);
  
  return { result, cached: false };
}

