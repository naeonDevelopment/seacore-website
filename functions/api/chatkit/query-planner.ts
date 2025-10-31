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
  
  // Detect query type for strategy selection
  const isComparative = /largest|biggest|smallest|best|worst|compare|versus|vs/i.test(query);
  const isVesselQuery = /vessel|ship|mv|ms|mt|imo\s*\d+/i.test(query);
  const isCompanyQuery = /company|operator|owner|fleet|maritime\s+group/i.test(query);
  const isEquipmentQuery = /engine|generator|equipment|machinery|pump|compressor/i.test(query);
  
  let strategy: 'comprehensive' | 'focused' | 'comparative' = 'focused';
  if (isComparative) strategy = 'comparative';
  else if (query.split(' ').length > 10) strategy = 'comprehensive';
  
  console.log(`   Strategy: ${strategy}`);
  
  const planningPrompt = `You are a maritime intelligence query planner. Decompose this query into 3-6 targeted sub-queries that search SPECIFIC maritime sources.

MAIN QUERY: "${query}"
${entityContext ? `CONTEXT: ${entityContext}` : ''}

STRATEGY: ${strategy}
${isVesselQuery ? '- Focus on vessel specifications, ownership, operations' : ''}
${isCompanyQuery ? '- Focus on company fleet, operations, ownership structure' : ''}
${isEquipmentQuery ? '- Focus on equipment specs, OEM details, maintenance, REAL-WORLD OPERATIONAL DATA' : ''}
${isComparative ? '- Focus on comparative attributes and verification' : ''}

CRITICAL: TARGET SPECIFIC MARITIME DATA SOURCES:

**FOR EQUIPMENT/MAINTENANCE QUERIES - GENERATE THESE SUB-QUERY TYPES:**
1. OEM Technical Documentation (HIGH PRIORITY):
   - "site:cat.com filetype:pdf [equipment model] maintenance"
   - "site:wartsila.com filetype:pdf [equipment] service bulletin"
   - "site:man-es.com filetype:pdf [equipment] technical circular"

2. Maritime Forums & Field Reports (for real-world scenarios):
   - "site:gcaptain.com [equipment] maintenance problems OR failures OR experience"
   - "site:marineinsight.com [equipment] common issues OR maintenance"
   - "[equipment] chief engineer forum failure OR troubleshooting"

3. Classification Society Standards:
   - "site:dnv.com [equipment type] requirements"
   - "site:lr.org [equipment type] guidance"

4. General Equipment Information:
   - "[equipment] specifications datasheet"
   - "[equipment] operator manual"

**FOR VESSEL QUERIES:**
1. "site:vesselfinder.com OR site:marinetraffic.com [vessel name] IMO"
2. "[vessel name] specifications owner operator"
3. "[vessel name] shipyard built classification"
4. "site:equasis.org [vessel name]"

**FOR COMPANY QUERIES:**
1. "[company] fleet list vessels"
2. "[company] maritime operations areas"
3. "site:linkedin.com [company] maritime"

RULES:
1. Generate 3-6 sub-queries (depending on complexity)
2. Each sub-query should target a SPECIFIC source type
3. Prioritize sub-queries by importance (high/medium/low)
4. For equipment queries: ALWAYS include at least one PDF search + one forum search
5. For vessel queries: owner, specs, classification, current status
6. For company queries: fleet size, operations, ownership, reputation
7. For comparative queries: attribute for each entity + verification sources
8. Use site: operators and filetype:pdf when targeting specific sources
9. Keep sub-queries concise and searchable

Return JSON:
{
  "strategy": "${strategy}",
  "subQueries": [
    {
      "query": "specific searchable query with site: or filetype: operators",
      "purpose": "what this finds (e.g., OEM PDF manual, forum discussion, vessel registry)",
      "priority": "high|medium|low"
    }
  ]
}

Return ONLY the JSON:`;

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
    ]);
    
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.warn(`   ⚠️ No valid JSON in planner response, using fallback`);
      return createFallbackPlan(query, strategy);
    }
    
    const plan = JSON.parse(jsonMatch[0]);
    
    let subQueries: SubQuery[] = plan.subQueries || [];

    // Ensure mandatory vessel sub-queries are present for comprehensive coverage
    if (isVesselQuery) {
      const ensure = (q: string, purpose: string, priority: 'high'|'medium'|'low'='high') => {
        if (!subQueries.some(sq => (sq.query || '').toLowerCase() === q.toLowerCase())) {
          subQueries.push({ query: q, purpose, priority });
        }
      };
      // Registry and identity
      ensure(`${query} IMO MMSI call sign`, 'registry identifiers (IMO/MMSI/Call sign)', 'high');
      ensure(`site:equasis.org ${query}`, 'official registry profile', 'high');
      // Ownership/management
      ensure(`${query} owner operator manager`, 'ownership and management', 'high');
      // Class and flag
      ensure(`${query} class society classification notation`, 'class society and class notations', 'medium');
      ensure(`${query} flag state registry`, 'flag and registry details', 'medium');
      ensure(`${query} flag certificates PDF filetype:pdf`, 'flag certification documents (PDF)', 'low');
      // Particulars
      ensure(`${query} lightship gross tonnage deadweight length overall breadth depth`, 'principal particulars', 'medium');
      ensure(`${query} keel lay date delivery date built shipyard`, 'build dates and shipyard', 'medium');
      // Current status/location
      ensure(`site:vesselfinder.com OR site:marinetraffic.com ${query} position AIS`, 'current location/status (AIS)', 'medium');
      // Equipment (propulsion/auxiliaries)
      ensure(`${query} propulsion engines generators auxiliaries specifications`, 'equipment (propulsion/auxiliaries)', 'medium');
    }
    
    // Company-specific mandatory sub-queries
    if (isCompanyQuery) {
      const ensure = (q: string, purpose: string, priority: 'high'|'medium'|'low'='high') => {
        if (!subQueries.some(sq => (sq.query || '').toLowerCase() === q.toLowerCase())) {
          subQueries.push({ query: q, purpose, priority });
        }
      };
      ensure(`${query} fleet list vessels`, 'company fleet and assets', 'high');
      ensure(`site:linkedin.com ${query} maritime`, 'company profile and operations', 'medium');
      ensure(`${query} press release news`, 'recent activities and contracts', 'medium');
    }
    
    // Equipment-specific mandatory sub-queries
    if (isEquipmentQuery) {
      const ensure = (q: string, purpose: string, priority: 'high'|'medium'|'low'='high') => {
        if (!subQueries.some(sq => (sq.query || '').toLowerCase() === q.toLowerCase())) {
          subQueries.push({ query: q, purpose, priority });
        }
      };
      ensure(`${query} filetype:pdf maintenance manual`, 'OEM PDF documentation (manuals/bulletins)', 'high');
      ensure(`site:gcaptain.com ${query} maintenance OR problems`, 'operator experience and failures', 'medium');
      ensure(`${query} specifications datasheet`, 'technical specifications', 'medium');
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
      query: `${query} filetype:pdf maintenance manual`,
      purpose: 'OEM PDF documentation',
      priority: 'high'
    });
    subQueries.push({
      query: `site:gcaptain.com ${query} maintenance OR problems`,
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
  statusEmitter?: (event: any) => void
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
  
  // Execute with a simple concurrency limit to avoid saturating APIs
  const CONCURRENCY = Math.min(4, Math.max(2, Math.floor((dedupedSubQueries.length + 1) / 2)));
  const results: Source[][] = [];
  let inFlight = 0;
  let index = 0;

  async function runNext(): Promise<void> {
    if (index >= dedupedSubQueries.length) return;
    const currentIndex = index++;
    const subQuery = dedupedSubQueries[currentIndex];
    inFlight++;
    console.log(`   🔍 [${currentIndex + 1}/${dedupedSubQueries.length}] "${subQuery.query}"`);
    try {
      const sources = await executeSingleGeminiQuery(
        subQuery.query,
        entityContext,
        geminiApiKey,
        kv,
      );
      console.log(`   ✅ [${currentIndex + 1}] Found ${sources.length} sources`);
      results[currentIndex] = sources;
    } catch (error: any) {
      console.error(`   ❌ [${currentIndex + 1}] Failed: ${error.message}`);
      results[currentIndex] = [];
    } finally {
      inFlight--;
    }
    // brief micro-yield to avoid event loop starvation
    await sleep(0);
    if (index < dedupedSubQueries.length) await runNext();
  }

  const starters = Array.from({ length: Math.min(CONCURRENCY, dedupedSubQueries.length) }, () => runNext());
  await Promise.all(starters);
  
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
 * Extracted from gemini-tool.ts for parallel execution
 */
async function executeSingleGeminiQuery(
  query: string,
  entityContext: string | undefined,
  geminiApiKey: string,
  kv?: KVNamespace
): Promise<Source[]> {
  
  // Build query with context if available
  let enrichedQuery = query;
  if (entityContext) {
    enrichedQuery = `${entityContext}\n\nQuery: ${query}`;
  }
  
  // Try KV cache for this sub-query
  try {
    const cached = await getCachedResult(kv as any, enrichedQuery, undefined);
    if (cached && cached.sources?.length) {
      const stats = getCacheStats(cached);
      console.log(`   ⚡ SUBQUERY CACHE HIT (age: ${stats.age}s)`);
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
    await setCachedResult(kv as any, enrichedQuery, undefined, {
      sources: toCache,
      answer: null,
      diagnostics: { totalSources: toCache.length, hasAnswer: false, answerLength: 0, sourcesByTier: {} }
    }, 600);
  } catch {}
  
  return sources;
}

// =====================
// RESULT AGGREGATION
// =====================

/**
 * Aggregate, deduplicate, and rank sources by authority
 * Implements stable sorting and top-10 selection
 */
export function aggregateAndRank(sources: Source[]): Source[] {
  
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
  
  // Step 4: Stable sort (tier DESC, url ASC, title ASC)
  const sorted = deduped.sort((a, b) => {
    // Primary: tier (T1 > T2 > T3)
    const tierOrder = { 'T1': 1, 'T2': 2, 'T3': 3 };
    if (a.tier && b.tier) {
      const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
      if (tierDiff !== 0) return tierDiff;
    }
    
    // Secondary: normalized URL (alphabetical)
    const urlA = (a as any).normalizedUrl || a.url;
    const urlB = (b as any).normalizedUrl || b.url;
    if (urlA !== urlB) return urlA.localeCompare(urlB);
    
    // Tertiary: title (alphabetical)
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
 * Assign authority tier based on domain and content type
 * Enhanced to recognize PDFs, forums, and maritime-specific sources
 */
function assignAuthorityTier(source: Source): Source {
  const url = source.url?.toLowerCase() || '';
  const title = source.title?.toLowerCase() || '';
  const content = source.content?.toLowerCase() || '';
  
  // Check if source is a PDF (high value for technical documentation)
  const isPDF = url.includes('.pdf') || title.includes('.pdf') || content.includes('pdf');
  
  // T1: Authoritative (government, IMO, classification societies, OEMs, academia, PDF manuals)
  if (url.includes('.gov') || url.includes('imo.org') || url.includes('iacs.org.uk') || 
      url.includes('classnk') || url.includes('dnv.com') || url.includes('lr.org') || 
      url.includes('abs.org') || url.includes('.edu') || 
      url.includes('wartsila.com') || url.includes('cat.com') || url.includes('man-es.com') ||
      url.includes('rolls-royce.com') || url.includes('abb.com') || url.includes('siemens.com') ||
      url.includes('kongsberg.com') || url.includes('cummins.com') || url.includes('volvo.com') ||
      (isPDF && (url.includes('wartsila') || url.includes('cat') || url.includes('man') || 
                 url.includes('rolls') || url.includes('abb') || url.includes('cummins')))) {
    return { ...source, tier: 'T1' };
  }
  
  // T2: Industry publications, maritime forums, and maritime-specific sources
  if (url.includes('maritime') || url.includes('shipping') || url.includes('vessel') ||
      url.includes('gcaptain.com') || url.includes('tradewinds') || url.includes('splash247') ||
      url.includes('maritime-executive') || url.includes('shippingwatch') ||
      url.includes('marineinsight.com') || url.includes('seatrade') ||
      url.includes('marinelink') || url.includes('offshore-energy') ||
      url.includes('vesselfinder') || url.includes('marinetraffic') || url.includes('equasis') ||
      url.includes('iseaport') || url.includes('marineengineering') ||
      (isPDF && url.includes('maritime'))) {
    return { ...source, tier: 'T2' };
  }
  
  // T3: General web sources
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
    
    // Remove tracking params
    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((value, key) => {
      // Keep meaningful params, remove tracking
      if (!key.match(/^(utm_|fbclid|gclid|msclkid|ref|source|campaign)/i)) {
        cleanParams.set(key, value);
      }
    });
    
    // Rebuild URL
    const normalized = `${parsed.protocol}//${hostname}${parsed.pathname}`;
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

