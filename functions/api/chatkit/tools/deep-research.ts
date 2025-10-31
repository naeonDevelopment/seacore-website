/**
 * Deep Research Tool - Comprehensive maritime intelligence
 * Context-aware multi-query orchestration with content intelligence
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { batchAnalyzeContent, type ContentSource } from '../content-intelligence';
import { fetchWithRetry } from "../retry";
import { emitMetrics } from "../metrics";

/**
 * Execute Tavily search with maritime-specific configuration
 */
async function executeTavilySearch(
  query: string, 
  search_depth: 'basic' | 'advanced',
  apiKey: string
): Promise<{ json: any; retryCount: number }> {
  let retryCount = 0;
  const response = await fetchWithRetry('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth,
      include_answer: false,
      include_raw_content: search_depth === 'advanced',
      max_results: search_depth === 'advanced' ? 20 : 15,
      days: 365,
      // Maritime intelligence domains
      include_domains: [
        'marinetraffic.com', 'vesselfinder.com', 'wartsila.com', 'man-es.com',
        'rolls-royce.com', 'kongsberg.com', 'maritime-executive.com', 'gcaptain.com',
        'dnv.com', 'lr.org', 'abs.org', 'imo.org'
      ],
      exclude_domains: ['facebook.com', 'twitter.com', 'instagram.com', 'wikipedia.org'],
    }),
  }, {
    retries: 3,
    baseDelayMs: 400,
    maxDelayMs: 6000,
    timeoutMs: 12000,
    retryOnStatuses: [408, 429, 500, 502, 503, 504],
    onRetry: ({ attempt }) => { retryCount = attempt; }
  });
  
  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }
  const json = await response.json();
  return { json, retryCount };
}

/**
 * Generate multiple search queries for comprehensive coverage
 * Simplified - let LLM decide complexity, we just add technical variants
 */
function generateSearchVariants(query: string): string[] {
  const queries: string[] = [query];
  const queryLower = query.toLowerCase();
  
  // For vessels, add technical details variant
  if (/vessel|ship|MV |MS |MT /i.test(query)) {
    queries.push(`${query} technical specifications`);
  }
  
  // For equipment, add manufacturer variant
  if (/engine|propulsion|equipment/i.test(query)) {
    queries.push(`${query} manufacturer datasheet`);
  }
  
  // For compliance, add classification variant
  if (/compliance|regulation|solas|marpol/i.test(query)) {
    queries.push(`${query} classification requirements`);
  }
  
  return queries.slice(0, 3); // Max 3 variants
}

/**
 * Intelligent source selection with content intelligence analysis
 * Multi-tiered analysis: domain authority + relevance + maritime specificity
 */
async function selectBestSources(
  results: any[], 
  maxSources: number = 15,
  query: string = '',
  analysisDepth: 'fast' | 'standard' | 'deep' = 'standard'
): Promise<{ selected: any[], rejected: any[] }> {
  
  console.log(`\n🧠 CONTENT INTELLIGENCE ANALYSIS (${analysisDepth} mode)`);
  console.log(`   Analyzing ${results.length} sources...`);
  
  // Convert to ContentSource format
  const sources: ContentSource[] = results.map(r => ({
    title: r.title || '',
    url: r.url || '',
    content: r.content || '',
    score: r.score,
    raw_content: r.raw_content,
    published_date: r.published_date,
  }));
  
  // Run multi-tiered intelligence analysis
  const startTime = Date.now();
  const analyzed = await batchAnalyzeContent(sources, query, analysisDepth);
  const analysisTime = Date.now() - startTime;
  
  console.log(`   ✅ Intelligence analysis complete (${analysisTime}ms)`);
  
  // Sort by intelligence score
  analyzed.sort((a, b) => b.intelligence.final_score - a.intelligence.final_score);
  
  // SMART SELECTION with adaptive thresholds
  const bestScore = analyzed[0]?.intelligence.final_score || 0;
  const bestConfidence = analyzed[0]?.intelligence.confidence || 0;
  
  // Adaptive quality gap based on top source confidence
  const qualityGap = bestConfidence > 0.8 ? 0.15 : 0.20;
  const minQualityThreshold = 0.45;
  
  const qualityFiltered = analyzed.filter(s => 
    s.intelligence.final_score >= bestScore - qualityGap && 
    s.intelligence.final_score >= minQualityThreshold &&
    s.intelligence.confidence >= 0.5
  );
  
  const selected = qualityFiltered.slice(0, maxSources);
  const rejected = analyzed.filter(s => !selected.includes(s));
  
  // Enhanced logging
  console.log(`   📊 Intelligence Metrics:`);
  console.log(`      Best Score: ${(bestScore * 100).toFixed(1)}% (confidence: ${(bestConfidence * 100).toFixed(0)}%)`);
  console.log(`      Selected: ${selected.length}/${analyzed.length} sources`);
  console.log(`      Rejected: ${rejected.length} low-quality sources`);
  
  if (selected.length >= 3) {
    console.log(`      Top 3 Intelligence Scores:`);
    for (let i = 0; i < Math.min(3, selected.length); i++) {
      const s = selected[i];
      const intel = s.intelligence;
      console.log(`        ${i + 1}. ${(intel.final_score * 100).toFixed(1)}% - Domain:${(intel.domain_authority * 100).toFixed(0)}% Relevance:${(intel.relevance_score * 100).toFixed(0)}% Maritime:${(intel.maritime_specificity * 100).toFixed(0)}%`);
    }
  }
  
  return { 
    selected: selected.map(s => ({ ...s, score: s.intelligence.final_score })), 
    rejected: rejected.map(s => ({ ...s, score: s.intelligence.final_score }))
  };
}

export const deepResearchTool = tool(
  async ({ 
    query, 
    search_depth = 'basic', 
    use_multi_query = false,
    entityContext 
  }: { 
    query: string; 
    search_depth?: 'basic' | 'advanced';
    use_multi_query?: boolean;
    entityContext?: string;
  }, config) => {
    const env = (config?.configurable as any)?.env;
    if (!env?.TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY not configured');
    }
    
    console.log(`🔬 Deep Research: "${query}" (${search_depth}, multi: ${use_multi_query})`);
    
    // Enrich vague queries with entity context
    let enrichedQuery = query;
    if (entityContext) {
      const isVague = /\b(it|its|their|them|this|that)\b/i.test(query) || query.split(' ').length <= 5;
      if (isVague) {
        // Extract entity names from context
        const entityMatch = entityContext.match(/PREVIOUSLY DISCUSSED[^:]*:\s*-\s*([^\n|]+)/);
        if (entityMatch) {
          const entityName = entityMatch[1].trim();
          enrichedQuery = `${entityName} ${query.replace(/\b(it|its|their|them|this|that)\b/gi, '').trim()}`;
          console.log(`   🔄 Enriched: "${query}" → "${enrichedQuery}"`);
        }
      }
    }
    
    try {
      // Generate query variants if multi-query enabled
      const queries = (use_multi_query && search_depth === 'advanced') 
        ? generateSearchVariants(enrichedQuery)
        : [enrichedQuery];
      
      console.log(`   🔍 Executing ${queries.length} searches`);
      
      // Execute searches in parallel
      const searchPromises = queries.map(q => executeTavilySearch(q, search_depth, env.TAVILY_API_KEY));
      const searchResults = await Promise.all(searchPromises);
      const totalRetryCount = searchResults.reduce((sum, r) => sum + (r.retryCount || 0), 0);
      
      // Merge and deduplicate results
      const allResults: any[] = [];
      const seenUrls = new Set<string>();
      
      for (const result of searchResults) {
        const payload = result.json;
        if (payload.results) {
          for (const item of payload.results) {
            if (!seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              allResults.push(item);
            }
          }
        }
      }
      
      console.log(`   📊 Total unique results: ${allResults.length} from ${queries.length} queries`);
      
      // Intelligent source selection with content intelligence
      const analysisDepth = search_depth === 'advanced' ? 'deep' : 'standard';
      const maxSources = search_depth === 'advanced' ? 15 : 10;
      
      const { selected, rejected } = await selectBestSources(
        allResults,
        maxSources,
        query,
        analysisDepth
      );
      
      // Calculate confidence based on source quality
      const avgScore = selected.reduce((sum, s) => sum + (s.score || 0), 0) / selected.length;
      const confidence = selected.length >= 5 ? Math.min(avgScore + 0.1, 0.95) : avgScore;
      
      console.log(`✅ Research complete: ${selected.length} sources (rejected ${rejected.length})`);
      console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);
      
      // Emit metrics
      emitMetrics((config?.configurable as any)?.statusEmitter, {
        tavilyRetryCount: totalRetryCount,
        totalSources: selected.length,
      });

      return {
        sources: selected,
        rejected_sources: rejected,
        total_results: allResults.length,
        confidence,
        mode: 'research',
        queries_executed: queries.length,
        metrics: { tavilyRetryCount: totalRetryCount }
      };
    } catch (error: any) {
      console.error('❌ Research error:', error.message);
      return {
        sources: [],
        total_results: 0,
        confidence: 0,
        mode: 'research',
        queries_executed: 1,
        error: error.message,
      };
    }
  },
  {
    name: "deep_research",
    description: `Comprehensive maritime intelligence with multi-query orchestration. Context-aware.

Use for:
- Specific vessels, ships, fleets
- Technical specifications and equipment
- Maritime companies and operations
- Comparative analysis
- Follow-up questions about previously discussed entities

Automatically enriches vague queries with entity context from conversation.

Parameters:
- query: Search query (conversational queries work with context)
- search_depth: 'basic' (focused) or 'advanced' (comprehensive)
- use_multi_query: Enable parallel multi-angle searches (recommended for advanced)`,
    schema: z.object({
      query: z.string().describe("Maritime query requiring multi-source intelligence"),
      search_depth: z.enum(['basic', 'advanced']).optional().describe("Search depth"),
      use_multi_query: z.boolean().optional().describe("Enable multi-query orchestration"),
      entityContext: z.string().optional().describe("Auto-populated entity context from memory")
    })
  }
);

