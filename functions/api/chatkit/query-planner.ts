/**
 * Query Planning & Parallel Execution
 * 
 * Decomposes complex queries into 3-6 targeted sub-queries
 * Executes them in parallel using LangGraph async capabilities
 * Aggregates, deduplicates, and ranks results by authority
 * 
 * Benefits:
 * - Better recall (multiple search angles)
 * - Parallel execution (faster than sequential)
 * - Authority-based ranking (T1 > T2 > T3)
 * - Stable outputs (deterministic sort + dedup)
 */

import { ChatOpenAI } from "@langchain/openai";
import { setTimeout as sleep } from "timers/promises";
import { extractSourcesFromGeminiResponse } from "./grounding-extractor";
import { fetchWithRetry } from "./retry";
import { getCachedResult, setCachedResult, getCacheStats } from "./kv-cache";
import { getSemanticCachedResult, setSemanticCachedResult, getDefaultSemanticCacheConfig } from "./semantic-cache";
import { detectEntityType, getSourceHints, type EntityDetectionResult } from "./entity-type-detector";
import { generateSpecializedStrategy, strategyToQueryList, getTechnicalForumSites, getOEMSites, getClassificationSocietySites } from "./specialized-query-strategies";

// =====================
// TYPES
// =====================

export interface SubQuery {
  query: string;
  purpose: string;  // Why we're asking this
  priority: 'high' | 'medium' | 'low';  // Execution priority
}

export interface QueryPlan {
  mainQuery: string;
  subQueries: SubQuery[];
  strategy: 'comprehensive' | 'focused' | 'comparative';
  estimatedExecutionTime: number;  // ms
}

export interface Source {
  url: string;
  title: string;
  content: string;
  score?: number;
  tier?: 'T1' | 'T2' | 'T3';
}

export interface AggregatedResult {
  sources: Source[];
  answer: string | null;
  diagnostics: {
    subQueriesExecuted: number;
    totalSourcesFound: number;
    sourcesByTier: { T1: number; T2: number; T3: number };
    deduplicatedCount: number;
    executionTimeMs: number;
  };
}

// =====================
// QUERY PLANNING
// =====================

// Phase 3: Minimal canonicalization helpers (local to avoid module resolution issues)
interface CanonicalEntity { type: 'vessel' | 'company' | 'unknown'; name?: string; imo?: string; mmsi?: string; callSign?: string; }
function canonicalizeQueryEntity(query: string): CanonicalEntity | null {
  const text = query.trim();
  const imo = (text.match(/\bIMO\s*(\d{7})\b/i) || [])[1];
  const mmsi = (text.match(/\bMMSI\s*(\d{9})\b/i) || [])[1];
  const csMatch = text.match(/\b(call\s*sign|cs)\s*([A-Z0-9]{3,8})\b/i);
  const callSign = csMatch ? csMatch[2].toUpperCase() : undefined;
  const nameMatch = text.match(/\b([A-Z][a-z]+\s+(?:[A-Z][a-z]+|\d{2,}))\b/);
  const name = nameMatch ? nameMatch[1].trim() : undefined;
  if (imo || mmsi || callSign || name) {
    const type: CanonicalEntity['type'] = (imo || mmsi || callSign || /\bvessel|ship\b/i.test(text)) ? 'vessel' : (/company|operator|owner/i.test(text) ? 'company' : 'unknown');
    return { type, name, imo, mmsi, callSign };
  }
  return null;
}

/**
 * Generate 3-6 targeted sub-queries for a complex maritime query
 * Uses GPT-4o-mini for fast, cheap query decomposition
 */
export async function planQuery(
  query: string,
  entityContext: string | undefined,
  openaiKey: string
): Promise<QueryPlan> {
  
  console.log(`\n📋 QUERY PLANNER: Decomposing query`);
  console.log(`   Main query: "${query}"`);
  
  // ==========================================
  // ENTITY TYPE DETECTION (NEW INTELLIGENT ROUTING)
  // ==========================================
  const entityDetection = detectEntityType(query);
  console.log(`   🎯 Entity type detected: ${entityDetection.type} (${entityDetection.confidence}% confidence)`);
  console.log(`   📦 Entities found: ${entityDetection.entities.join(', ')}`);
  console.log(`   🔍 Search strategy: ${entityDetection.searchStrategy}`);
  
  // Check if we should use specialized strategy (high confidence)
  const useSpecializedStrategy = entityDetection.confidence >= 60 && entityDetection.type !== 'general';
  
  if (useSpecializedStrategy) {
    console.log(`   ⚡ Using specialized ${entityDetection.type} strategy`);
    const specializedStrategy = generateSpecializedStrategy(query, entityDetection.type, entityDetection.entities);
    const specializedQueries = strategyToQueryList(specializedStrategy);
    
    // Convert to our SubQuery format
    const subQueries: SubQuery[] = specializedQueries.slice(0, 12).map(sq => ({
      query: sq.query,
      purpose: sq.purpose,
      priority: sq.priority as 'high' | 'medium' | 'low'
    }));
    
    console.log(`   ✅ Generated ${subQueries.length} specialized queries for ${entityDetection.type}`);
    
    return {
      mainQuery: query,
      subQueries,
      strategy: 'comprehensive',
      estimatedExecutionTime: subQueries.length * 800 // ~800ms per query
    };
  }
  
  // Fallback to original vessel detection logic for backwards compatibility
  console.log(`   ℹ️  Using legacy planning strategy (low confidence or general query)`);
  
  // Detect query type for strategy selection
  const isComparative = /largest|biggest|smallest|best|worst|compare|versus|vs/i.test(query);
  
  // ENHANCED: Vessel detection with name pattern matching
  // Patterns: "Stanford Maya", "Dynamic 25", "MV Ocean Star", "IMO 1234567"
  const hasVesselKeyword = /vessel|ship|mv|ms|mt|ss|hms|imo\s*\d{7}|mmsi\s*\d{9}/i.test(query);
  const hasVesselNamePattern = /^(tell me about |what about |info on |details on |search for )?([A-Z][a-z]+\s+([A-Z][a-z]+|\d+))$/i.test(query.trim());
  const isVesselQuery = hasVesselKeyword || hasVesselNamePattern;
  
  const isCompanyQuery = /company|operator|owner|fleet|maritime\s+group/i.test(query);
  const isEquipmentQuery = /engine|generator|equipment|machinery|pump|compressor/i.test(query);
  
  let strategy: 'comprehensive' | 'focused' | 'comparative' = 'focused';
  if (isComparative) strategy = 'comparative';
  else if (query.split(' ').length > 10) strategy = 'comprehensive';
  
  console.log(`   Strategy: ${strategy}`);
  console.log(`   Vessel Query: ${isVesselQuery} (keyword: ${hasVesselKeyword}, pattern: ${hasVesselNamePattern})`);
  
  // Phase 3: Minimal canonicalization to assist planning (IMO/MMSI/name)
  const canonical = canonicalizeQueryEntity(query);

  const planningPrompt = `You are a maritime intelligence query planner. Decompose this query into 3-6 targeted sub-queries that search SPECIFIC maritime sources.

MAIN QUERY: "${query}"
${entityContext ? `CONTEXT: ${entityContext}` : ''}
${canonical ? `\nENTITY CANONICALIZATION:\n${JSON.stringify(canonical)}` : ''}

STRATEGY: ${strategy}
${isVesselQuery ? '- THIS IS A VESSEL QUERY - Search for vessel registries, AIS data, specifications, ownership' : ''}
${isCompanyQuery ? '- Focus on company fleet, operations, ownership structure' : ''}
${isEquipmentQuery ? '- Focus on equipment specs, OEM details, maintenance, REAL-WORLD OPERATIONAL DATA' : ''}
${isComparative ? '- Focus on comparative attributes and verification' : ''}

${isVesselQuery ? `
⚠️ CRITICAL: VESSEL NAME DETECTION
The query contains a vessel name: "${query}"
DO NOT search for generic technical terms or equipment!
ONLY search for THIS SPECIFIC VESSEL by name.
` : ''}

CRITICAL: TARGET SPECIFIC MARITIME DATA SOURCES:

**FOR EQUIPMENT/MAINTENANCE QUERIES - USE NATURAL LANGUAGE:**
CRITICAL: NO site: or filetype: operators - they prevent Gemini grounding.

Good examples:
1. "[equipment model] caterpillar wartsila MAN maintenance manual PDF OEM"
2. "[equipment] service bulletin technical circular documentation"
3. "[equipment] gcaptain maritime forum maintenance problems failures experience"
4. "[equipment] marineinsight common issues maintenance challenges"
5. "[equipment] DNV classification requirements standards"
6. "[equipment] specifications datasheet technical data"

Bad examples (DO NOT DO THIS):
❌ "site:cat.com [equipment]"
❌ "filetype:pdf [equipment]"

**FOR VESSEL QUERIES - DO NOT USE site: OPERATORS:**
CRITICAL: Gemini's grounding search works BEST with natural language queries.
DO NOT use site: operators - they prevent proper grounding source extraction.

Good examples:
1. "[vessel name] IMO MMSI call sign marinetraffic vesselfinder"
2. "[vessel name] specifications owner operator registry"
3. "[vessel name] shipyard built delivery date"
4. "[vessel name] equasis registry data"
5. "[vessel name] AIS position current location"

Bad examples (DO NOT DO THIS):
❌ "site:vesselfinder.com [vessel name]"
❌ "site:equasis.org [vessel name]"

**FOR COMPANY QUERIES - NATURAL LANGUAGE ONLY:**
Good examples:
1. "[company] fleet list vessels operations"
2. "[company] maritime operations areas services"
3. "[company] linkedin profile maritime shipping"

Bad examples (DO NOT DO THIS):
❌ "site:linkedin.com [company]"

RULES:
1. Generate 6-8 sub-queries for vessel queries, 3-5 for others
2. Each sub-query should use NATURAL LANGUAGE (NO site: or filetype: operators!)
3. Include relevant domain names IN THE QUERY TEXT (e.g., "marinetraffic vesselfinder")
4. Prioritize sub-queries by importance (high/medium/low)
5. For equipment: Include OEM names (Caterpillar, Wartsila, MAN) + forum names (gcaptain)
6. For vessels: Include registry sites (equasis, marinetraffic, vesselfinder) as TEXT in query
7. For companies: Include source types (linkedin, press releases) as TEXT in query
8. For comparative queries: Create separate queries for each entity + verification
9. Keep sub-queries concise, specific, and searchable with natural language

⚠️ CRITICAL FOR VESSEL QUERIES ⚠️
If this is a VESSEL query (contains vessel name like "Dynamic 25", "Stanford Pelican", etc.):
- FOCUS on vessel-specific searches: registries, AIS tracking, specifications, ownership
- Include the vessel name in queries for context
- Prioritize: MarineTraffic, VesselFinder, Equasis, company websites, maritime registries
- Example: "Dynamic 25 vessel IMO MMSI specifications marinetraffic vesselfinder"
- Avoid: Pure equipment searches without vessel name (but vessel + equipment is OK)

⚠️ CRITICAL OUTPUT FORMAT:
Return ONLY valid JSON with NO additional text, explanations, or markdown.
Do NOT add any text before or after the JSON.
Your FIRST character must be "{" and LAST character must be "}".

JSON Schema:
{
  "strategy": "${strategy}",
  "subQueries": [
    {
      "query": "natural language query including relevant site names as TEXT (no operators)",
      "purpose": "what this finds (e.g., vessel registry from MarineTraffic, OEM docs from Wartsila)",
      "priority": "high|medium|low"
    }
  ]
}

START YOUR RESPONSE WITH: {`;

  try {
    // CRITICAL FIX: Use non-streaming LLM for internal planning (don't leak to UI)
    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.0,  // Deterministic planning
      openAIApiKey: openaiKey,
      streaming: false,  // CRITICAL: Disable streaming to prevent UI leak
    });
    
    // CRITICAL: Call without config to prevent streaming callbacks from leaking planner output
    const response = await llm.invoke([
      { role: 'system', content: 'You are a precise query planning system. Return valid JSON only.' },
      { role: 'user', content: planningPrompt }
    ], {
      tags: ['planner', 'query-planning', strategy],
      metadata: {
        component: 'planner',
        strategy,
        isVesselQuery,
        isCompanyQuery,
        isEquipmentQuery
      }
    });
    
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.warn(`   ⚠️ No valid JSON in planner response, using fallback`);
      return createFallbackPlan(query, strategy);
    }
    
    const plan = JSON.parse(jsonMatch[0]);
    
    let subQueries: SubQuery[] = plan.subQueries || [];

    // DISABLED: This filtering was too aggressive and reduced grounding quality
    // Gemini's search is smart enough to filter generic results
    // Our mandatory vessel queries (lines 315-330) already ensure vessel-specific searches
    /*
    if (isVesselQuery) {
      // Extract vessel name from query
      const vesselName = query
        .replace(/^(tell me about|details on|info on|search for|what about|vessel)\s+/i, '')
        .trim();
      
      const vesselWords = vesselName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      // Only filter if we can confidently identify generic searches
      const filtered = subQueries.filter(sq => {
        const sqLower = (sq.query || '').toLowerCase();
        
        // Block ONLY clearly generic searches without ANY vessel reference
        const isObviouslyGeneric = 
          (/^(dynamic positioning|propulsion systems|marine equipment)\b/i.test(sqLower) ||
          /^(wartsila|man engines|caterpillar)\b/i.test(sqLower)) &&
          !vesselWords.some(word => sqLower.includes(word)) &&
          !/\bvessel\b/i.test(sqLower);
        
        return !isObviouslyGeneric;
      });
      
      if (filtered.length < subQueries.length) {
        console.log(`   🧹 Filtered obvious generic queries: ${subQueries.length} → ${filtered.length}`);
        subQueries = filtered;
      }
    }
    */

    // PHASE 2 FIX: Natural language mandatory vessel sub-queries (NO keyword spam)
    if (isVesselQuery) {
      const ensure = (q: string, purpose: string, priority: 'high'|'medium'|'low'='high') => {
        // Check if similar query already exists (fuzzy match on purpose or key terms)
        const similar = subQueries.some(sq => {
          const sqLower = (sq.query || '').toLowerCase();
          const qLower = q.toLowerCase();
          const sqPurpose = (sq.purpose || '').toLowerCase();
          const purposeLower = purpose.toLowerCase();
          
          // Exact match
          if (sqLower === qLower) return true;
          
          // Purpose match (e.g., both about registry)
          if (sqPurpose === purposeLower) return true;
          
          // Key term overlap (3+ shared words)
          const sqWords = new Set(sqLower.split(/\s+/).filter(w => w.length > 3));
          const qWords = new Set(qLower.split(/\s+/).filter(w => w.length > 3));
          const overlap = [...sqWords].filter(w => qWords.has(w)).length;
          if (overlap >= 3) return true;
          
          return false;
        });
        
        if (!similar) {
          subQueries.push({ query: q, purpose, priority });
        }
      };
      
      // PHASE 2: Natural language queries (NO keyword spam)
      // CRITICAL: All queries MUST include vessel name to avoid generic results
      
      // Registry and identity - HIGHEST PRIORITY
      ensure(`${query} vessel IMO MMSI call sign marinetraffic vesselfinder`, 'vessel identifiers from registries', 'high');
      ensure(`${query} vessel equasis registry data specifications`, 'Equasis official registry', 'high');
      ensure(`${query} vessel AIS tracking current position`, 'AIS tracking data', 'high');
      
      // Ownership/management
      ensure(`${query} vessel owner operator management company`, 'ownership and management', 'high');
      
      // Vessel particulars
      ensure(`${query} vessel specifications dimensions LOA beam tonnage`, 'dimensions and tonnages', 'high');
      ensure(`${query} vessel build year shipyard builder`, 'construction info', 'medium');
      
      // Classification
      ensure(`${query} vessel class society flag state`, 'class and flag', 'medium');
      
      // Technical specs (if available)
      ensure(`${query} vessel engines propulsion machinery`, 'propulsion details', 'low');
    }
    
    // Company-specific mandatory sub-queries
    if (isCompanyQuery) {
      const ensure = (q: string, purpose: string, priority: 'high'|'medium'|'low'='high') => {
        if (!subQueries.some(sq => (sq.query || '').toLowerCase() === q.toLowerCase())) {
          subQueries.push({ query: q, purpose, priority });
        }
      };
      ensure(`${query} fleet list vessels operations`, 'company fleet and assets', 'high');
      ensure(`${query} linkedin maritime company profile`, 'company profile and operations from LinkedIn', 'medium');
      ensure(`${query} press release news recent activities`, 'recent activities and contracts', 'medium');
    }
    
    // Equipment-specific mandatory sub-queries
    if (isEquipmentQuery) {
      const ensure = (q: string, purpose: string, priority: 'high'|'medium'|'low'='high') => {
        if (!subQueries.some(sq => (sq.query || '').toLowerCase() === q.toLowerCase())) {
          subQueries.push({ query: q, purpose, priority });
        }
      };
      ensure(`${query} maintenance manual PDF OEM documentation`, 'OEM PDF documentation (manuals/bulletins)', 'high');
      ensure(`${query} gcaptain maritime forum maintenance problems failures`, 'operator experience and failures from forums', 'medium');
      ensure(`${query} specifications datasheet technical data`, 'technical specifications', 'medium');
    }

    const queryPlan: QueryPlan = {
      mainQuery: query,
      subQueries,
      strategy: plan.strategy || strategy,
      estimatedExecutionTime: subQueries.length * 3000,  // ~3s per sub-query
    };
    
    console.log(`   ✅ Generated ${queryPlan.subQueries.length} sub-queries`);
    queryPlan.subQueries.forEach((sq, i) => {
      console.log(`      ${i+1}. [${sq.priority}] ${sq.query}`);
    });
    
    return queryPlan;
    
  } catch (error) {
    console.error(`   ❌ Query planning failed:`, error);
    return createFallbackPlan(query, strategy);
  }
}

/**
 * Fallback plan if LLM planning fails
 * Creates simple decomposition based on query type
 */
function createFallbackPlan(query: string, strategy: string): QueryPlan {
  console.log(`   🔧 Using fallback query plan`);
  
  const subQueries: SubQuery[] = [
    {
      query: query,  // Main query as-is
      purpose: 'primary search',
      priority: 'high'
    }
  ];
  
  // Add context-specific sub-queries with targeted source discovery
  if (/vessel|ship/i.test(query)) {
    subQueries.push({
      query: `${query} owner operator`,
      purpose: 'ownership info',
      priority: 'medium'
    });
    subQueries.push({
      query: `${query} specifications technical data`,
      purpose: 'technical specs',
      priority: 'medium'
    });
  } else if (/company/i.test(query)) {
    subQueries.push({
      query: `${query} fleet vessels`,
      purpose: 'fleet information',
      priority: 'medium'
    });
  } else if (/engine|generator|equipment|machinery|maintenance/i.test(query)) {
    // Equipment queries - add PDF and forum searches
    subQueries.push({
      query: `${query} maintenance manual PDF OEM`,
      purpose: 'OEM PDF documentation',
      priority: 'high'
    });
    subQueries.push({
      query: `${query} gcaptain maritime forum maintenance problems`,
      purpose: 'forum operational experience',
      priority: 'medium'
    });
  }
  
  return {
    mainQuery: query,
    subQueries,
    strategy: strategy as any,
    estimatedExecutionTime: subQueries.length * 3000,
  };
}

// =====================
// PARALLEL EXECUTION
// =====================

/**
 * Execute sub-queries in parallel using Promise.all
 * Leverages async/await for maximum concurrency
 */
export async function executeParallelQueries(
  subQueries: SubQuery[],
  geminiApiKey: string,
  entityContext: string | undefined,
  kv?: KVNamespace,
  statusEmitter?: (event: any) => void,
  pseApiKey?: string,
  pseCx?: string,
  openaiApiKey?: string // PHASE 4B: For semantic caching
): Promise<Source[]> {
  
  console.log(`\n⚡ PARALLEL EXECUTION: ${subQueries.length} sub-queries`);
  
  if (statusEmitter) {
    statusEmitter({
      type: 'thinking',
      step: 'parallel_search',
      content: `Executing ${subQueries.length} parallel searches...`
    });
  }
  
  // Deduplicate sub-queries by normalized query string (exact dedup)
  const dedupedSubQueries: SubQuery[] = [];
  const seen = new Set<string>();
  for (const sq of subQueries) {
    const key = (sq.query || '').toLowerCase().trim().replace(/\s+/g, ' ');
    if (!seen.has(key)) {
      seen.add(key);
      dedupedSubQueries.push(sq);
    }
  }
  if (dedupedSubQueries.length !== subQueries.length) {
    console.log(`   🧹 Deduped sub-queries: ${subQueries.length} → ${dedupedSubQueries.length}`);
  }

  const startTime = Date.now();
  
  // PHASE 4A FIX: Global timeout (circuit breaker pattern)
  // Instead of 6 queries × 8s = 48s worst case, cap total execution to 20s
  const GLOBAL_TIMEOUT_MS = 20000; // 20s max for ALL queries combined
  const PER_QUERY_TIMEOUT_MS = Math.max(
    3000, // minimum 3s per query
    Math.floor(GLOBAL_TIMEOUT_MS / Math.max(dedupedSubQueries.length, 1))
  );
  
  console.log(`   ⏱️ Timeout strategy: ${PER_QUERY_TIMEOUT_MS}ms per query (global limit: ${GLOBAL_TIMEOUT_MS}ms)`);
  
  // Execute with a higher concurrency for faster perceived latency (cap to 8)
  const CONCURRENCY = Math.min(8, Math.max(4, dedupedSubQueries.length));
  const results: Source[][] = [];
  let inFlight = 0;
  let index = 0;
  let globalTimeoutTriggered = false;

  async function runNext(): Promise<void> {
    if (index >= dedupedSubQueries.length || globalTimeoutTriggered) return;
    const currentIndex = index++;
    const subQuery = dedupedSubQueries[currentIndex];
    inFlight++;
    const startedAt = Date.now();
    console.log(`   🔍 [${currentIndex + 1}/${dedupedSubQueries.length}] "${subQuery.query}"`);
    
    // Emit progress update to UI
    if (statusEmitter) {
      const progress = Math.floor((currentIndex / dedupedSubQueries.length) * 100);
      statusEmitter({
        type: 'status',
        stage: 'searching',
        content: `🔎 Search ${currentIndex + 1}/${dedupedSubQueries.length}: ${subQuery.purpose || 'Gathering data'}`,
        progress: Math.min(progress, 75) // Cap at 75% to leave room for aggregation
      });
    }
    
    // PHASE 4A: Per-query timeout is now adaptive based on global budget
    const timeoutPromise = new Promise<Source[]>((resolve) => 
      setTimeout(() => resolve([]), PER_QUERY_TIMEOUT_MS)
    );
    try {
      const sources = await Promise.race([
        executeSingleGeminiQuery(
          subQuery.query,
          entityContext,
          geminiApiKey,
          kv,
          pseApiKey,
          pseCx,
          openaiApiKey // PHASE 4B: Pass for semantic caching
        ),
        timeoutPromise
      ]);
      console.log(`   ✅ [${currentIndex + 1}] Found ${sources.length} sources`);
      results[currentIndex] = sources;
      
      // Emit completion for this sub-query
      if (statusEmitter) {
        const latency = Date.now() - startedAt;
        statusEmitter({
          type: 'thinking',
          step: `search_${currentIndex + 1}_complete`,
          content: `✓ Found ${sources.length} sources from ${subQuery.purpose || 'search'}`
        });
        statusEmitter({
          type: 'metrics',
          content: 'subquery_metrics',
          index: currentIndex + 1,
          latencyMs: latency,
          purpose: subQuery.purpose || 'search',
          priority: subQuery.priority || 'medium'
        });
      }
    } catch (error: any) {
      console.error(`   ❌ [${currentIndex + 1}] Failed: ${error.message}`);
      results[currentIndex] = [];
    } finally {
      inFlight--;
    }
    // brief micro-yield to avoid event loop starvation
    await sleep(0);
    if (index < dedupedSubQueries.length && !globalTimeoutTriggered) await runNext();
  }

  // PHASE 4A: Wrap entire execution in global timeout
  const starters = Array.from({ length: Math.min(CONCURRENCY, dedupedSubQueries.length) }, () => runNext());
  const executionPromise = Promise.all(starters);
  
  const globalTimeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      globalTimeoutTriggered = true;
      console.warn(`   ⏱️ Global timeout triggered after ${GLOBAL_TIMEOUT_MS}ms`);
      resolve();
    }, GLOBAL_TIMEOUT_MS);
  });
  
  await Promise.race([executionPromise, globalTimeoutPromise]);
  
  const executionTime = Date.now() - startTime;
  let allSources = results.flat();
  
  // Vessel-centric filtering: remove off-topic sources when queries clearly target a vessel
  const isVesselContext = dedupedSubQueries.some(sq => /\b(vessel|ship|imo|mmsi|call\s*sign)\b/i.test(sq.query));
  if (isVesselContext) {
    const isLikelyVesselSource = (s: Source) => {
      const url = (s.url || '').toLowerCase();
      const title = (s.title || '').toLowerCase();
      const content = (s.content || '').toLowerCase();
      const maritimeDomain = (
        url.includes('vesselfinder') || url.includes('marinetraffic') || url.includes('equasis') ||
        url.includes('vesseltracker') || url.includes('myshiptracking') || url.includes('magicport') ||
        url.includes('maritime') || url.includes('ship') || url.includes('fleetmon')
      );
      const maritimeSignals = /\b(imo|mmsi|call\s*sign|vessel|ship|loa|gross\s*tonnage|crew\s*boat)\b/i.test(title + ' ' + content);
      const clearlyOffTopic = url.includes('stanford.edu') || url.includes('hs-fps.stanford') || url.includes('linkedin.com/in/');
      return (maritimeDomain || maritimeSignals) && !clearlyOffTopic;
    };
    const filtered = allSources.filter(isLikelyVesselSource);
    if (filtered.length >= Math.min(3, allSources.length)) {
      allSources = filtered;
      console.log(`   🚧 Vessel filter applied: ${filtered.length}/${results.flat().length} retained`);
    }
  }
  
  console.log(`   ⚡ Parallel execution complete: ${executionTime}ms`);
  console.log(`   📊 Total sources: ${allSources.length} (before dedup)`);
  
  return allSources;
}

/**
 * Execute a single Gemini query
 * PHASE 4B: Now supports semantic caching with embeddings
 * Extracted from gemini-tool.ts for parallel execution
 */
async function executeSingleGeminiQuery(
  query: string,
  entityContext: string | undefined,
  geminiApiKey: string,
  kv?: KVNamespace,
  pseApiKey?: string,
  pseCx?: string,
  openaiApiKey?: string
): Promise<Source[]> {
  
  // Build query with context if available
  let enrichedQuery = query;
  if (entityContext) {
    enrichedQuery = `${entityContext}\n\nQuery: ${query}`;
  }
  
  // PHASE 4B: Try semantic cache first (if OpenAI key available)
  if (openaiApiKey && kv) {
    try {
      const semanticMatch = await getSemanticCachedResult(
        kv,
        enrichedQuery,
        entityContext,
        openaiApiKey,
        getDefaultSemanticCacheConfig()
      );
      
      if (semanticMatch) {
        console.log(`   ⚡ SEMANTIC CACHE HIT (${(semanticMatch.similarity * 100).toFixed(1)}% similar)`);
        return semanticMatch.result.sources || [];
      }
    } catch (error: any) {
      console.warn(`   ⚠️ Semantic cache failed: ${error.message}, falling back to exact cache`);
    }
  }
  
  // Fall back to exact hash cache
  try {
    const cached = await getCachedResult(kv as any, enrichedQuery, undefined);
    if (cached && cached.sources?.length) {
      const stats = getCacheStats(cached);
      console.log(`   ⚡ EXACT CACHE HIT (age: ${stats.age}s)`);
      return cached.sources as any;
    }
  } catch {}
  
  // Gemini API call with deterministic config
  const generationConfig = {
    temperature: 0.0,
    topP: 1.0,
    topK: 1,
    maxOutputTokens: 2048,
  };
  
  const response = await fetchWithRetry('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent', {
    method: 'POST',
    headers: {
      'x-goog-api-key': geminiApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: enrichedQuery }]
      }],
      generationConfig,
      tools: [{ google_search: {} }]
    }),
  }, {
    retries: 3,
    baseDelayMs: 400,
    maxDelayMs: 6000,
    timeoutMs: 15000,
    retryOnStatuses: [408, 429, 500, 502, 503, 504],
  });
  
  if (!response.ok) {
    // Attempt PSE fallback if configured
    if (pseApiKey && pseCx) {
      console.warn(`   ⚠️ Gemini error ${response.status} → trying PSE fallback`);
      return await executePSESearch(enrichedQuery, pseApiKey, pseCx);
    }
    throw new Error(`Gemini API error: ${response.status}`);
  }
  
  const data = await response.json();
  const candidate = data.candidates?.[0];
  const answer = candidate?.content?.parts?.[0]?.text || null;
  
  // Normalize sources using shared extractor
  const unified = extractSourcesFromGeminiResponse(data, enrichedQuery, answer || undefined);
  const sources: Source[] = unified.map((u) => ({
    url: u.url,
    title: u.title,
    content: u.content,
    score: u.score,
  }));
  
  // Store in KV cache (shorter TTL for sub-queries) - truncate content to cap KV size
  try {
    const toCache = sources.map(s => ({ ...s, content: (s.content || '').slice(0, 600) }));
    const cachePayload = {
      sources: toCache,
      answer: null,
      diagnostics: { totalSources: toCache.length, hasAnswer: false, answerLength: 0, sourcesByTier: {} }
    };
    
    // Store in exact hash cache
    await setCachedResult(kv as any, enrichedQuery, undefined, cachePayload, 600);
    
    // PHASE 4B: Also store in semantic cache (if OpenAI key available)
    if (openaiApiKey && kv) {
      try {
        await setSemanticCachedResult(
          kv,
          enrichedQuery,
          entityContext,
          cachePayload,
          openaiApiKey,
          600, // 10 min TTL for sub-queries
          getDefaultSemanticCacheConfig()
        );
        console.log(`   💾 Stored in both exact and semantic caches`);
      } catch (error: any) {
        console.warn(`   ⚠️ Semantic cache storage failed: ${error.message}`);
      }
    }
  } catch {}
  
  // If Gemini produced no sources but PSE is available, attempt fallback
  if ((!sources || sources.length === 0) && pseApiKey && pseCx) {
    console.warn(`   ⚠️ No sources from Gemini → trying PSE fallback`);
    try {
      const fallback = await executePSESearch(enrichedQuery, pseApiKey, pseCx);
      if (fallback.length > 0) return fallback;
    } catch {}
  }
  return sources;
}

/**
 * Google Programmable Search Engine (PSE) fallback
 */
async function executePSESearch(query: string, apiKey: string, cx: string): Promise<Source[]> {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', '10');
  const resp = await fetchWithRetry(url.toString(), { method: 'GET' }, {
    retries: 2,
    baseDelayMs: 400,
    maxDelayMs: 4000,
    timeoutMs: 12000,
    retryOnStatuses: [408, 429, 500, 502, 503, 504]
  });
  if (!resp.ok) {
    throw new Error(`PSE error: ${resp.status}`);
  }
  const data = await resp.json();
  const items = data.items || [];
  const mapped: Source[] = items.map((it: any) => ({
    url: it.link,
    title: it.title,
    content: it.snippet || it.htmlSnippet || '',
    score: 0.5
  }));
  return mapped;
}

// =====================
// RESULT AGGREGATION
// =====================

/**
 * Aggregate, deduplicate, and rank sources by relevance and authority
 * Implements stable sorting with query-aware boosts and top-10 selection
 */
export function aggregateAndRank(sources: Source[], opts?: { query?: string }): Source[] {
  
  console.log(`\n📊 AGGREGATION: Processing ${sources.length} sources`);
  
  // Step 1: Assign authority tiers
  const withTiers = sources.map(assignAuthorityTier);
  
  // Step 2: Normalize URLs for deduplication
  const withNormalizedUrls = withTiers.map(s => ({
    ...s,
    normalizedUrl: normalizeUrl(s.url)
  }));
  
  // Step 3: Deduplicate by normalized URL (keep highest tier)
  const deduped = deduplicateByUrl(withNormalizedUrls);
  
  console.log(`   📉 Deduplication: ${sources.length} → ${deduped.length} sources`);
  
  // Step 4: Stable sort with query relevance boost (then tier DESC, url ASC, title ASC)
  const query = (opts?.query || '').toLowerCase();
  const vesselMatch = query.match(/\b([a-z]+(?:\s+[a-z]+)*\s+\d{1,3})\b/i);
  const vesselPhrase = vesselMatch ? (vesselMatch[1] || '').toLowerCase() : '';
  const vesselTokens = vesselPhrase ? vesselPhrase.split(/\s+/).filter(Boolean) : [];

  function relevanceWeight(s: any): number {
    if (!query) return 0;
    const url = (s.url || '').toLowerCase();
    const title = (s.title || '').toLowerCase();
    const text = `${url} ${title}`;
    let weight = 0;
    const isRegistry = /marinetraffic|vesselfinder|equasis/.test(url);
    if (vesselPhrase) {
      if (text.includes(vesselPhrase)) weight += 200; // exact phrase match
      else if (vesselTokens.length > 1 && vesselTokens.every(t => text.includes(t))) weight += 120; // all tokens
      else if (vesselTokens.some(t => text.includes(t))) weight += 40; // partial
    }
    if (isRegistry) weight += vesselPhrase ? 150 : 80; // prefer registries, especially for named vessels
    return weight;
  }

  const sorted = deduped.sort((a, b) => {
    // Primary: query relevance (DESC)
    const rwA = relevanceWeight(a);
    const rwB = relevanceWeight(b);
    if (rwA !== rwB) return rwB - rwA;

    // Secondary: tier (T1 > T2 > T3)
    const tierOrder = { 'T1': 1, 'T2': 2, 'T3': 3 } as Record<string, number>;
    if (a.tier && b.tier) {
      const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
      if (tierDiff !== 0) return tierDiff;
    }

    // Tertiary: normalized URL (alphabetical)
    const urlA = (a as any).normalizedUrl || a.url;
    const urlB = (b as any).normalizedUrl || b.url;
    if (urlA !== urlB) return urlA.localeCompare(urlB);

    // Quaternary: title (alphabetical)
    return (a.title || '').localeCompare(b.title || '');
  });
  
  // Step 5: Top 10
  const top10 = sorted.slice(0, 10);
  
  // Count by tier
  const tierCounts = top10.reduce((acc, s) => {
    if (s.tier) acc[s.tier] = (acc[s.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`   🏆 Top 10 selected: T1=${tierCounts.T1 || 0}, T2=${tierCounts.T2 || 0}, T3=${tierCounts.T3 || 0}`);
  
  return top10;
}

/**
 * Calculate confidence score based on source quality and corroboration
 * Returns a score from 0-100 and a label (high/medium/low)
 * 
 * PHASE 3: Confidence indicator for UI display
 */
export interface ConfidenceScore {
  score: number;         // 0-100
  label: 'high' | 'medium' | 'low';
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  totalSources: number;
  reasoning: string;     // Human-readable explanation
}

export function calculateConfidence(sources: Source[]): ConfidenceScore {
  const tierCounts = sources.reduce((acc, s) => {
    if (s.tier) acc[s.tier] = (acc[s.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const tier1Count = tierCounts.T1 || 0;
  const tier2Count = tierCounts.T2 || 0;
  const tier3Count = tierCounts.T3 || 0;
  const totalSources = sources.length;
  
  // Confidence scoring algorithm:
  // Base score: 50 (neutral)
  // +40 for each T1 source (capped at +40 total, i.e., 1+ T1 sources)
  // +20 for each T2 source (capped at +20 total)
  // +10 for multiple sources (corroboration)
  // -10 if only T3 sources
  // -20 if < 3 total sources
  
  let score = 50; // Base neutral
  
  // T1 sources (authoritative) add significant confidence
  if (tier1Count >= 1) {
    score += 40; // At least one authoritative source = high confidence
  }
  
  // T2 sources (industry publications) add moderate confidence
  if (tier2Count >= 1) {
    score += 20;
  }
  
  // Corroboration (multiple sources) adds confidence
  if (totalSources >= 5) {
    score += 10; // Good corroboration
  } else if (totalSources >= 3) {
    score += 5; // Some corroboration
  }
  
  // Penalties
  if (tier1Count === 0 && tier2Count === 0 && tier3Count > 0) {
    score -= 10; // Only general/blog sources
  }
  
  if (totalSources < 3) {
    score -= 20; // Limited sources
  }
  
  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));
  
  // Determine label
  let label: 'high' | 'medium' | 'low';
  if (score >= 80) label = 'high';
  else if (score >= 50) label = 'medium';
  else label = 'low';
  
  // Generate reasoning
  const reasoning = generateConfidenceReasoning(tier1Count, tier2Count, tier3Count, totalSources, label);
  
  return {
    score,
    label,
    tier1Count,
    tier2Count,
    tier3Count,
    totalSources,
    reasoning
  };
}

/**
 * Generate human-readable explanation for confidence score
 */
function generateConfidenceReasoning(
  tier1: number, 
  tier2: number, 
  tier3: number, 
  total: number,
  label: 'high' | 'medium' | 'low'
): string {
  const parts: string[] = [];
  
  if (tier1 > 0) {
    parts.push(`${tier1} authoritative source${tier1 > 1 ? 's' : ''}`);
  }
  if (tier2 > 0) {
    parts.push(`${tier2} industry source${tier2 > 1 ? 's' : ''}`);
  }
  if (tier3 > 0) {
    parts.push(`${tier3} general source${tier3 > 1 ? 's' : ''}`);
  }
  
  const sourceBreakdown = parts.join(', ');
  
  if (label === 'high') {
    return `High confidence based on ${sourceBreakdown} with strong corroboration (${total} total sources)`;
  } else if (label === 'medium') {
    return `Medium confidence from ${sourceBreakdown} (${total} total sources)`;
  } else {
    return `Limited confidence - ${sourceBreakdown} (${total} total sources). Consider enabling deeper research.`;
  }
}

/**
 * PHASE 2 FIX: Content-aware authority tier assignment
 * Validates content quality and relevance, not just domain
 */
function assignAuthorityTier(source: Source): Source {
  const url = source.url?.toLowerCase() || '';
  const title = source.title?.toLowerCase() || '';
  const content = source.content?.toLowerCase() || '';
  
  // PHASE 2: Content quality checks
  const hasSubstantialContent = content.length >= 100;
  const hasErrorIndicators = content.includes('404') || content.includes('not found') || 
                              content.includes('error') || content.includes('page not available');
  const hasMaritimeKeywords = /\b(vessel|ship|marine|maritime|imo|mmsi|port|cargo|crew|engine)\b/.test(content);
  
  // Reject low-quality sources regardless of domain
  if (hasErrorIndicators || !hasSubstantialContent) {
    console.log(`   🚫 PHASE 2: Rejected low-quality source (${content.length} chars, errors: ${hasErrorIndicators}): ${url.substring(0, 60)}`);
    return { ...source, tier: 'T3' }; // Downgrade to T3
  }
  
  // Check if source is a PDF (high value for technical documentation)
  const isPDF = url.includes('.pdf') || title.includes('.pdf');
  
  // PHASE 2: T1 tier requires BOTH authoritative domain AND relevant content
  const isAuthoritativeDomain = (
    url.includes('.gov') || url.includes('imo.org') || url.includes('iacs.org.uk') || 
    url.includes('classnk') || url.includes('dnv.com') || url.includes('lr.org') || 
    url.includes('abs.org') || url.includes('.edu')
  );
  
  const isOEMDomain = (
    url.includes('wartsila.com') || url.includes('cat.com') || url.includes('man-es.com') ||
    url.includes('rolls-royce.com') || url.includes('abb.com') || url.includes('siemens.com') ||
    url.includes('kongsberg.com') || url.includes('cummins.com')
  );
  
  // T1: Authoritative sources WITH relevant content
  if (isAuthoritativeDomain && hasMaritimeKeywords) {
    return { ...source, tier: 'T1' };
  }
  
  // T1: OEM PDFs with technical content (not marketing)
  if (isPDF && isOEMDomain) {
    const hasTechnicalContent = /\b(maintenance|service|specifications|manual|bulletin|technical|datasheet)\b/.test(content);
    if (hasTechnicalContent) {
      return { ...source, tier: 'T1' };
    }
    // OEM PDF without technical keywords → T2
    return { ...source, tier: 'T2' };
  }
  
  // PHASE 2: T2 tier for maritime-specific sources WITH content validation
  const isMaritimeDomain = (
    url.includes('maritime') || url.includes('shipping') || url.includes('vessel') ||
    url.includes('gcaptain.com') || url.includes('tradewinds') || url.includes('splash247') ||
    url.includes('maritime-executive') || url.includes('shippingwatch') ||
    url.includes('marineinsight.com') || url.includes('seatrade') ||
    url.includes('marinelink') || url.includes('offshore-energy')
  );
  
  const isRegistryDomain = (
    url.includes('vesselfinder') || url.includes('marinetraffic') || url.includes('equasis') ||
    url.includes('registry') || url.includes('flagstate')
  );
  
  // T2: Maritime industry sources with relevant content
  if ((isMaritimeDomain || isRegistryDomain) && hasMaritimeKeywords) {
    return { ...source, tier: 'T2' };
  }
  
  // PHASE 2: Registry sources without vessel data → downgrade to T3
  if (isRegistryDomain && !hasMaritimeKeywords) {
    console.log(`   ⚠️ PHASE 2: Registry domain without vessel data, downgrading: ${url.substring(0, 60)}`);
    return { ...source, tier: 'T3' };
  }
  
  // T3: General web sources or maritime sources without relevant content
  return { ...source, tier: 'T3' };
}

/**
 * Normalize URL for deduplication
 * Removes tracking params, www, trailing slashes, etc.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Remove www
    let hostname = parsed.hostname.replace(/^www\./, '');
    
    // Remove locale prefix from pathname (e.g., /en/, /fr/, /ar/, etc.) for dedupe
    let pathname = parsed.pathname || '';
    pathname = pathname.replace(/^\/(ar|en|es|fr|no|pt|de|it|ru|tr|zh|ja|ko)\//, '/');

    // Remove tracking params
    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((value, key) => {
      // Keep meaningful params, remove tracking
      if (!key.match(/^(utm_|fbclid|gclid|msclkid|ref|source|campaign)/i)) {
        cleanParams.set(key, value);
      }
    });
    
    // Rebuild URL
    const normalized = `${parsed.protocol}//${hostname}${pathname}`;
    const params = cleanParams.toString();
    
    return params ? `${normalized}?${params}` : normalized;
    
  } catch (e) {
    return url;  // Return as-is if parsing fails
  }
}

/**
 * Deduplicate by normalized URL (keep highest tier)
 */
function deduplicateByUrl(sources: (Source & { normalizedUrl: string })[]): Source[] {
  const seen = new Map<string, Source>();
  
  for (const source of sources) {
    const existing = seen.get(source.normalizedUrl);
    
    if (!existing) {
      seen.set(source.normalizedUrl, source);
    } else {
      // Keep highest tier
      const tierOrder = { 'T1': 1, 'T2': 2, 'T3': 3 };
      const existingTier = existing.tier ? tierOrder[existing.tier] : 999;
      const sourceTier = source.tier ? tierOrder[source.tier] : 999;
      
      if (sourceTier < existingTier) {
        seen.set(source.normalizedUrl, source);
      }
    }
  }
  
  return Array.from(seen.values());
}


