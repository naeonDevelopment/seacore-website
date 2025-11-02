/**
 * PHASE 4B: Semantic Caching with Embeddings
 * 
 * Problem: Current cache uses exact string matching
 *   "Stanford Maya specifications" → hash: abc123
 *   "Stanford Maya specs" → hash: def456 (CACHE MISS despite same intent!)
 * 
 * Solution: Use text-embedding-3-small for semantic similarity matching
 * 
 * Architecture:
 * 1. Generate embedding for query
 * 2. Store embedding in KV with results
 * 3. On lookup, compute cosine similarity with stored embeddings
 * 4. If similarity > 0.92, return cached result
 * 
 * Expected Impact: 2-3x cache hit rate improvement
 * 
 * Based on 2025 research:
 * - Multiple papers on semantic caching for LLMs
 * - Embedding-based retrieval is now standard practice
 * - text-embedding-3-small: cheap ($0.02/1M tokens), fast, 1536 dimensions
 */

import { createHash } from 'crypto';

// =====================
// TYPES
// =====================

export interface EmbeddingCacheEntry {
  query: string;
  embedding: number[]; // 1536-dim vector from text-embedding-3-small
  entityContext?: string;
  result: any; // Cached result (sources, answer, diagnostics)
  timestamp: number;
  ttl: number; // seconds
}

export interface SemanticCacheConfig {
  similarityThreshold: number; // 0-1, default 0.92 (high precision)
  maxCandidates: number; // How many cached entries to check, default 10
  embeddingModel: 'text-embedding-3-small' | 'text-embedding-3-large';
  enableFallback: boolean; // Fall back to exact hash if embedding fails
}

// =====================
// EMBEDDING GENERATION
// =====================

/**
 * Generate embedding for a query using OpenAI text-embedding-3-small
 * Cost: $0.02 per 1M tokens (~500K queries)
 * Latency: ~50-100ms
 */
export async function generateEmbedding(
  text: string,
  openaiApiKey: string,
  model: 'text-embedding-3-small' | 'text-embedding-3-large' = 'text-embedding-3-small'
): Promise<number[]> {
  
  // Normalize text (lowercase, trim, collapse whitespace)
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: normalized,
        encoding_format: 'float', // Standard float array
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;
    
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from OpenAI');
    }
    
    return embedding;
    
  } catch (error: any) {
    console.error(`   ❌ Embedding generation failed:`, error.message);
    throw error;
  }
}

// =====================
// SIMILARITY COMPUTATION
// =====================

/**
 * Compute cosine similarity between two embeddings
 * Returns value between -1 and 1 (higher = more similar)
 * Typical thresholds:
 * - > 0.95: Very similar (likely same query)
 * - > 0.92: Similar (semantic match)
 * - > 0.85: Related (may share topic)
 * - < 0.85: Different queries
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimension mismatch: ${a.length} vs ${b.length}`);
  }
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

// =====================
// KV STORAGE HELPERS
// =====================

/**
 * Generate a key for storing embedding cache entries
 * Format: semantic:v1:<entity_hash>
 */
function generateSemanticCacheKey(entityContext?: string): string {
  if (entityContext) {
    const hash = createHash('sha256').update(entityContext).digest('hex').substring(0, 16);
    return `semantic:v1:${hash}`;
  }
  return 'semantic:v1:global';
}

/**
 * Store an embedding cache entry in KV
 * Stores as JSON array to allow multiple entries per entity
 */
export async function storeSemanticCacheEntry(
  kv: KVNamespace | null | undefined,
  entry: EmbeddingCacheEntry
): Promise<void> {
  if (!kv) return;
  
  const key = generateSemanticCacheKey(entry.entityContext);
  
  try {
    // Retrieve existing entries
    const existing = await kv.get<EmbeddingCacheEntry[]>(key, 'json');
    const entries = existing || [];
    
    // Add new entry
    entries.push(entry);
    
    // Keep only last 20 entries per entity (prevent unlimited growth)
    const pruned = entries.slice(-20);
    
    // Store with TTL (use longest TTL from entries)
    const maxTtl = Math.max(...pruned.map(e => e.ttl), 3600);
    await kv.put(key, JSON.stringify(pruned), { expirationTtl: maxTtl });
    
    console.log(`   💾 Stored semantic cache entry (${pruned.length} total for entity)`);
    
  } catch (error: any) {
    console.error(`   ❌ Failed to store semantic cache entry:`, error.message);
  }
}

/**
 * Find semantically similar cached result
 * Returns best match if similarity > threshold, null otherwise
 */
export async function findSemanticMatch(
  kv: KVNamespace | null | undefined,
  query: string,
  queryEmbedding: number[],
  entityContext: string | undefined,
  config: SemanticCacheConfig
): Promise<{ result: any; similarity: number; matchedQuery: string } | null> {
  if (!kv) return null;
  
  const key = generateSemanticCacheKey(entityContext);
  
  try {
    // Retrieve cached entries for this entity
    const entries = await kv.get<EmbeddingCacheEntry[]>(key, 'json');
    
    if (!entries || entries.length === 0) {
      console.log(`   🔍 Semantic cache: No entries for entity`);
      return null;
    }
    
    console.log(`   🔍 Semantic cache: Checking ${entries.length} cached entries`);
    
    // Filter expired entries
    const now = Date.now();
    const validEntries = entries.filter(e => {
      const age = (now - e.timestamp) / 1000; // seconds
      return age < e.ttl;
    });
    
    if (validEntries.length === 0) {
      console.log(`   🔍 Semantic cache: All entries expired`);
      return null;
    }
    
    // Compute similarity with each entry
    const candidates = validEntries
      .map(entry => ({
        entry,
        similarity: cosineSimilarity(queryEmbedding, entry.embedding),
      }))
      .filter(c => c.similarity >= config.similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, config.maxCandidates);
    
    if (candidates.length === 0) {
      console.log(`   🔍 Semantic cache: No matches above threshold ${config.similarityThreshold}`);
      return null;
    }
    
    // Return best match
    const best = candidates[0];
    console.log(`   ✅ Semantic cache HIT: "${best.entry.query}" (similarity: ${(best.similarity * 100).toFixed(1)}%)`);
    
    return {
      result: best.entry.result,
      similarity: best.similarity,
      matchedQuery: best.entry.query,
    };
    
  } catch (error: any) {
    console.error(`   ❌ Semantic cache lookup failed:`, error.message);
    return null;
  }
}

// =====================
// HIGH-LEVEL API
// =====================

/**
 * Get default semantic cache configuration
 */
export function getDefaultSemanticCacheConfig(): SemanticCacheConfig {
  return {
    similarityThreshold: 0.92, // High precision (avoid false positives)
    maxCandidates: 10,
    embeddingModel: 'text-embedding-3-small', // Cheap & fast
    enableFallback: true, // Fall back to exact hash if embedding fails
  };
}

/**
 * Try to get cached result using semantic matching
 * Returns cached result if found, null otherwise
 */
export async function getSemanticCachedResult(
  kv: KVNamespace | null | undefined,
  query: string,
  entityContext: string | undefined,
  openaiApiKey: string,
  config: SemanticCacheConfig = getDefaultSemanticCacheConfig()
): Promise<{ result: any; similarity: number; matchedQuery: string } | null> {
  
  console.log(`\n🔍 SEMANTIC CACHE LOOKUP: "${query.substring(0, 60)}..."`);
  
  try {
    // Generate embedding for query
    const startTime = Date.now();
    const embedding = await generateEmbedding(query, openaiApiKey, config.embeddingModel);
    const embeddingLatency = Date.now() - startTime;
    
    console.log(`   ⚡ Generated embedding in ${embeddingLatency}ms (${embedding.length} dims)`);
    
    // Find semantic match
    const match = await findSemanticMatch(kv, query, embedding, entityContext, config);
    
    if (match) {
      console.log(`   ✅ Semantic cache HIT (${(match.similarity * 100).toFixed(1)}% similar to "${match.matchedQuery}")`);
      return match;
    }
    
    console.log(`   ❌ Semantic cache MISS`);
    return null;
    
  } catch (error: any) {
    console.error(`   ❌ Semantic cache error:`, error.message);
    
    // Fall back to exact hash caching if enabled
    if (config.enableFallback) {
      console.log(`   ⚠️ Falling back to exact hash cache`);
    }
    
    return null;
  }
}

/**
 * Store query result with semantic caching
 */
export async function setSemanticCachedResult(
  kv: KVNamespace | null | undefined,
  query: string,
  entityContext: string | undefined,
  result: any,
  openaiApiKey: string,
  ttl: number = 3600, // 1 hour default
  config: SemanticCacheConfig = getDefaultSemanticCacheConfig()
): Promise<void> {
  
  if (!kv) return;
  
  console.log(`\n💾 SEMANTIC CACHE STORE: "${query.substring(0, 60)}..."`);
  
  try {
    // Generate embedding
    const embedding = await generateEmbedding(query, openaiApiKey, config.embeddingModel);
    
    // Create cache entry
    const entry: EmbeddingCacheEntry = {
      query,
      embedding,
      entityContext,
      result,
      timestamp: Date.now(),
      ttl,
    };
    
    // Store in KV
    await storeSemanticCacheEntry(kv, entry);
    
    console.log(`   ✅ Stored semantic cache entry (TTL: ${ttl}s)`);
    
  } catch (error: any) {
    console.error(`   ❌ Failed to store semantic cache:`, error.message);
  }
}

/**
 * Integration helper: Wrap existing cache with semantic layer
 * Try semantic cache first, fall back to exact hash
 */
export async function getCachedResultWithSemantics(
  kv: KVNamespace | null | undefined,
  query: string,
  entityContext: string | undefined,
  openaiApiKey: string,
  exactHashGetter: () => Promise<any | null>, // Existing cache getter
  config: SemanticCacheConfig = getDefaultSemanticCacheConfig()
): Promise<{ result: any; cacheType: 'semantic' | 'exact' | null; similarity?: number }> {
  
  // Try semantic cache first
  const semanticMatch = await getSemanticCachedResult(kv, query, entityContext, openaiApiKey, config);
  
  if (semanticMatch) {
    return {
      result: semanticMatch.result,
      cacheType: 'semantic',
      similarity: semanticMatch.similarity,
    };
  }
  
  // Fall back to exact hash cache
  const exactMatch = await exactHashGetter();
  
  if (exactMatch) {
    console.log(`   ✅ Exact hash cache HIT (semantic miss)`);
    return {
      result: exactMatch,
      cacheType: 'exact',
    };
  }
  
  return {
    result: null,
    cacheType: null,
  };
}

