/**
 * LangGraph-powered Maritime Intelligence Agent
 * Modern agent architecture with tool-based research and state management
 */

import { Annotation, StateGraph, END, START } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { MARITIME_SYSTEM_PROMPT } from './maritime-system-prompt';
import { analyzeContentIntelligence, batchAnalyzeContent, type ContentSource, type ContentIntelligence } from './content-intelligence';

// =====================
// TYPES & INTERFACES
// =====================

interface Source {
  title: string;
  url: string;
  content: string;
  score?: number;
  intelligence?: ContentIntelligence; // Multi-tiered analysis results
}

interface ResearchResult {
  sources: Source[];
  rejected_sources?: Source[];
  summary?: string;
  confidence: number;
}

// =====================
// STATE DEFINITION
// =====================

const MaritimeAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  sessionId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  enableBrowsing: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  // NEW: Track which mode the agent is operating in
  researchMode: Annotation<'verification' | 'research' | 'none'>({
    reducer: (_, next) => next,
    default: () => 'none',
  }),
  researchContext: Annotation<string>({
    reducer: (_, next) => next || "",
    default: () => "",
  }),
  verifiedSources: Annotation<Source[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  rejectedSources: Annotation<Source[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  confidence: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  maritimeEntities: Annotation<string[]>({
    reducer: (current, update) => [...new Set([...current, ...update])],
    default: () => [],
  }),
  // NEW: Persistent entity memory across conversation
  conversationEntities: Annotation<Record<string, string>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
  needsRefinement: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
});

type AgentState = typeof MaritimeAgentState.State;

// =====================
// MARITIME SYSTEM PROMPT - Imported from maritime-system-prompt.ts
// Complete 404-line industry-leading prompt transferred 1:1 from chat.ts
// =====================

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Extract maritime entities from query
 * IMPROVED: Better vessel name extraction, including multi-word names
 */
function extractMaritimeEntities(text: string): string[] {
  const entities: string[] = [];
  
  // Company patterns
  const companyMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Marine|Shipping|Lines|Group|Services))\b/g);
  if (companyMatch) entities.push(...companyMatch);
  
  // Vessel patterns - IMPROVED
  // Pattern 1: MV/MS/MT prefix
  const prefixVesselMatch = text.match(/\b(?:MV|MS|MT)\s+([A-Z][a-zA-Z0-9\s-]+?)(?:\s+(?:is|was|has|vessel|ship)|[,.]|$)/gi);
  if (prefixVesselMatch) {
    entities.push(...prefixVesselMatch.map(v => v.trim()));
  }
  
  // Pattern 2: Multi-word capitalized names (like "MSC Michel Cappellini")
  const multiWordMatch = text.match(/\b([A-Z]{2,}(?:\s+[A-Z][a-z]+){1,3})\b/g);
  if (multiWordMatch) {
    entities.push(...multiWordMatch);
  }
  
  // Pattern 3: "vessel [Name]" or "ship [Name]"
  const namedVesselMatch = text.match(/\b(?:vessel|ship)\s+([A-Z][a-zA-Z0-9\s-]+?)(?:\s+(?:is|was|has)|[,.]|$)/gi);
  if (namedVesselMatch) {
    entities.push(...namedVesselMatch.map(v => v.replace(/^(?:vessel|ship)\s+/i, '').trim()));
  }
  
  // Equipment models (alphanumeric patterns)
  const equipmentMatch = text.match(/\b([A-Z][a-z]+\s+\d+[A-Z0-9-]+)\b/g);
  if (equipmentMatch) entities.push(...equipmentMatch);
  
  return [...new Set(entities)];
}

/**
 * Check if query is a follow-up question with entity extraction
 * IMPROVED: Extract entities from conversation history
 */
function isFollowUpQuery(query: string, previousMessages: BaseMessage[], entities: string[]): boolean {
  const queryLower = query.toLowerCase();
  
  // Pattern 1: Referential pronouns
  const hasReferentialPronouns = /\b(them|those|that|it|its|each one|the above|mentioned|listed|same|their|this|these)\b/i.test(query);
  
  // Pattern 2: Follow-up phrases
  const hasFollowUpPhrases = /\b(give me|tell me|what about|how about|also|additionally|furthermore|more about|details of|specs of|tech details|list|show me)\b/i.test(query);
  
  // Pattern 3: NEW - Entity continuity (mentions entity from previous messages)
  const mentionsPreviousEntity = entities.length > 0 && entities.some(entity => {
    // Check if any previous entity is mentioned in current query
    const entityLower = entity.toLowerCase();
    return queryLower.includes(entityLower);
  });
  
  // Pattern 4: Specific request about previous subject
  const hasSpecificRequest = /\b(engine|propulsion|specification|system|equipment|details|list)\b/i.test(query);
  
  // Check if previous messages contain research or specific entities
  const hasPreviousContext = previousMessages.some(msg => {
    if (!msg.content || typeof msg.content !== 'string') return false;
    const content = msg.content.toLowerCase();
    return content.includes('research') || 
           content.includes('vessel') || 
           content.includes('ship') ||
           entities.some(e => content.includes(e.toLowerCase()));
  });
  
  // Follow-up detected if:
  // 1. Uses pronouns/follow-up phrases AND has context, OR
  // 2. Mentions previous entity AND makes specific request
  const isFollowUp = 
    ((hasReferentialPronouns || hasFollowUpPhrases) && hasPreviousContext) ||
    (mentionsPreviousEntity && hasSpecificRequest);
  
  if (isFollowUp) {
    console.log(`   ✅ Follow-up detected: entity=${mentionsPreviousEntity}, specific=${hasSpecificRequest}`);
  }
  
  return isFollowUp;
}

/**
 * Detect if query needs VERIFICATION (fast fact-check) vs RESEARCH (deep intelligence)
 */
function detectQueryMode(query: string, enableBrowsing: boolean): 'verification' | 'research' | 'none' {
  const queryLower = query.toLowerCase();
  
  // EXCLUSIONS: Platform/system terms that should NEVER trigger research
  // These are fleetcore features answered from training data
  const platformExclusions = [
    'pms', 'planned maintenance system',
    'fleetcore', 'seacore',
    'maintenance scheduling', 'work order',
    'inventory management', 'crew management',
    'compliance tracking', 'safety management system',
    'dashboard', 'analytics', 'reporting'
  ];
  
  const isPlatformQuery = platformExclusions.some(keyword => 
    new RegExp(`\\b${keyword}`, 'i').test(queryLower)
  );
  
  if (isPlatformQuery) {
    console.log(`   Platform query detected - answering from training data`);
    return 'none';
  }
  
  // VERIFICATION MODE: Quick fact-checking for regulations/compliance
  // These need authoritative sources but not deep research
  const verificationKeywords = [
    'solas', 'marpol', 'ism code', 'stcw', 'colreg',
    'compliance', 'regulation', 'requirement',
    'maritime law', 'international convention',
    'classification society', 'flag state', 'port state',
    'what is', 'define', 'explain'
  ];
  
  const needsVerification = verificationKeywords.some(keyword => 
    new RegExp(`\\b${keyword}`, 'i').test(queryLower)
  );
  
  // SPECIFIC ENTITY QUERIES: Use Gemini grounding for quick lookups
  // Even when browsing is OFF, we want to use Gemini for these
  const entityIndicators = [
    'MV ', 'MS ', 'MT ', 'vessel ', 'ship ',
    'largest', 'biggest', 'newest', 'smallest',
    'fleet', 'shipyard', 'maritime company', 'shipping company',
    'cargo vessel', 'tanker', 'bulk carrier', 'container ship',
    'caterpillar', 'wärtsilä', 'man', 'rolls-royce', // equipment manufacturers
  ];
  
  const needsEntityLookup = entityIndicators.some(keyword =>
    new RegExp(`\\b${keyword}`, 'i').test(queryLower)
  );
  
  // DEEP RESEARCH MODE: Multi-source comprehensive intelligence
  // Only when user explicitly enables browsing toggle
  const deepResearchIndicators = [
    'compare', 'comparison', 'analyze', 'analysis',
    'specifications', 'technical details', 'datasheet',
    'propulsion system', 'engine specs', 'manufacturer documentation',
    'detailed specs', 'technical specifications'
  ];
  
  const needsDeepResearch = deepResearchIndicators.some(keyword =>
    new RegExp(`\\b${keyword}`, 'i').test(queryLower)
  );
  
  // Decision logic:
  // 1. User enabled browsing → Research mode (ALWAYS - deep multi-source research)
  // 2. Specific entities → Verification mode (use Gemini for quick lookup)
  // 3. Verification keywords → Verification mode (regulatory fact-checking)
  // 4. Nothing detected → Expert mode (training data only)
  
  if (enableBrowsing) {
    console.log(`   Mode: RESEARCH (user enabled browsing - deep research)`);
    return 'research';
  }
  
  if (needsEntityLookup) {
    console.log(`   Mode: VERIFICATION (entity lookup with Gemini)`);
    return 'verification';
  }
  
  if (needsVerification) {
    console.log(`   Mode: VERIFICATION (regulatory query)`);
    return 'verification';
  }
  
  console.log(`   Mode: NONE (expert mode - training data)`);
  return 'none';
}

/**
 * Select best sources with MULTI-TIERED CONTENT INTELLIGENCE
 * Cursor-inspired: Hierarchical analysis with configurable depth
 */
async function selectBestSources(
  results: any[], 
  maxSources: number = 15,
  query: string = '',
  analysisDepth: 'fast' | 'standard' | 'deep' = 'standard'
): Promise<{ selected: Source[], rejected: Source[] }> {
  
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
  analyzed.sort((a, b) => b.intelligence.final_score - b.intelligence.final_score);
  
  // SMART SELECTION with adaptive thresholds
  const bestScore = analyzed[0]?.intelligence.final_score || 0;
  const bestConfidence = analyzed[0]?.intelligence.confidence || 0;
  
  // Adaptive quality gap based on top source confidence
  const qualityGap = bestConfidence > 0.8 ? 0.15 : 0.20; // Stricter if high confidence
  const minQualityThreshold = 0.45; // Absolute minimum
  
  const qualityFiltered = analyzed.filter(s => 
    s.intelligence.final_score >= bestScore - qualityGap && 
    s.intelligence.final_score >= minQualityThreshold &&
    s.intelligence.confidence >= 0.5 // Confidence filter
  );
  
  const selected = qualityFiltered.slice(0, maxSources);
  const rejected = analyzed.filter(s => !selected.includes(s));
  
  // Enhanced logging
  console.log(`   📊 Intelligence Metrics:`);
  console.log(`      Best Score: ${(bestScore * 100).toFixed(1)}% (confidence: ${(bestConfidence * 100).toFixed(0)}%)`);
  console.log(`      Quality Range: ${(bestScore * 100).toFixed(1)}% - ${(Math.max(bestScore - qualityGap, minQualityThreshold) * 100).toFixed(1)}%`);
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
  
  // Return with intelligence metadata attached
  return { 
    selected: selected.map(s => ({ ...s, score: s.intelligence.final_score })), 
    rejected: rejected.map(s => ({ ...s, score: s.intelligence.final_score }))
  };
}

/**
 * Calculate confidence score based on sources
 */
function calculateConfidence(sources: Source[]): number {
  if (sources.length === 0) return 0;
  if (sources.length < 3) return 0.5;
  if (sources.length < 5) return 0.7;
  
  // Check for technical documentation
  const hasTechnicalDocs = sources.some(s => 
    /(manual|specification|datasheet|technical)/i.test(s.title)
  );
  
  return hasTechnicalDocs ? 0.9 : 0.8;
}

// =====================
// TOOLS
// =====================

/**
 * TOOL 1: Gemini Grounding Search - Google-powered instant answers with citations
 * Uses Google's entire index for fresh, accurate maritime information
 */
const geminiGroundingTool = tool(
  async ({ query }: { query: string }, config) => {
    console.log(`\n🔮 GEMINI GROUNDING TOOL CALLED`);
    console.log(`   Query: "${query}"`);
    
    const env = (config?.configurable as any)?.env;
    console.log(`   Has GEMINI_API_KEY: ${!!env?.GEMINI_API_KEY}`);
    
    if (!env?.GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not configured, falling back');
      return JSON.stringify({
        sources: [],
        answer: null,
        confidence: 0,
        mode: 'gemini_grounding',
        error: 'GEMINI_API_KEY not configured',
        fallback_needed: true
      });
    }
    
    console.log(`🔮 Executing Gemini API call...`);
    
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
        method: 'POST',
        headers: {
          'x-goog-api-key': env.GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: query }]
          }],
          tools: [{
            google_search: {}  // Enable Google Search grounding
          }]
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log(`   ✅ Gemini API response received`);
      console.log(`   📊 FULL GEMINI RESPONSE:`, JSON.stringify(data, null, 2).substring(0, 2000));
      
      // Extract answer and grounding metadata
      const candidate = data.candidates?.[0];
      const answer = candidate?.content?.parts?.[0]?.text || null;
      const groundingMetadata = candidate?.groundingMetadata;
      
      console.log(`   Has candidate: ${!!candidate}`);
      console.log(`   Has answer: ${!!answer}`);
      console.log(`   Answer length: ${answer?.length || 0} chars`);
      console.log(`   Has grounding metadata: ${!!groundingMetadata}`);
      console.log(`   📊 groundingMetadata keys:`, Object.keys(groundingMetadata || {}));
      console.log(`   📊 webResults count:`, groundingMetadata?.webResults?.length || 0);
      console.log(`   📊 searchEntryPoint:`, groundingMetadata?.searchEntryPoint);
      console.log(`   📊 groundingChunks:`, groundingMetadata?.groundingChunks?.length || 0);
      
      // Extract web results with citations
      // Try multiple possible locations for sources
      let sources: any[] = [];
      
      // Method 1: webResults (most common)
      if (groundingMetadata?.webResults && Array.isArray(groundingMetadata.webResults)) {
        sources = groundingMetadata.webResults.map((result: any) => ({
          url: result.url,
          title: result.title || 'Untitled',
          content: result.snippet || result.content || '',
          score: 0.9,
        }));
        console.log(`   📚 Extracted ${sources.length} sources from webResults`);
      }
      
      // Method 2: groundingChunks (alternative structure)
      else if (groundingMetadata?.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
        sources = groundingMetadata.groundingChunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            url: chunk.web?.uri || '',
            title: chunk.web?.title || 'Untitled',
            content: chunk.web?.snippet || '',
            score: 0.9,
          }));
        console.log(`   📚 Extracted ${sources.length} sources from groundingChunks`);
      }
      
      // Method 3: searchEntryPoint with related searches
      else if (groundingMetadata?.searchEntryPoint) {
        console.log(`   ℹ️ Gemini used searchEntryPoint but no direct sources available`);
        // Create a pseudo-source from search entry point
        sources = [{
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          title: 'Google Search',
          content: answer?.substring(0, 500) || '',
          score: 0.8,
        }];
      }
      
      console.log(`✅ Gemini grounding complete: ${sources.length} Google sources`);
      if (sources.length > 0) {
        console.log(`   📚 Sources extracted:`);
        sources.forEach((s: any, i: number) => {
          console.log(`      [${i+1}] ${s.title.substring(0, 60)} - ${s.url}`);
        });
      } else {
        console.log(`   ⚠️ NO SOURCES EXTRACTED from Gemini response!`);
        console.log(`   Gemini provided answer but no source URLs`);
      }
      console.log(`   Answer generated: ${answer ? 'YES' : 'NO'}`);
      if (answer) {
        console.log(`   Answer preview: ${answer.substring(0, 200)}...`);
      }
      
      const result = {
        sources,
        answer,
        searchQueries: groundingMetadata?.searchQueries || [],
        citations: groundingMetadata?.citations || [],
        confidence: sources.length >= 2 ? 0.95 : 0.8, // High confidence from Google
        mode: 'gemini_grounding'
      };
      
      console.log(`   📤 Returning JSON result with keys: ${Object.keys(result).join(', ')}`);
      
      // Return as JSON string for ToolMessage compatibility
      return JSON.stringify(result);
    } catch (error: any) {
      console.error('❌ Gemini grounding error:', error.message);
      return JSON.stringify({
        sources: [],
        answer: null,
        confidence: 0,
        mode: 'gemini_grounding',
        error: error.message,
        fallback_needed: true
      });
    }
  },
  {
    name: "gemini_grounding",
    description: `Google-powered search with instant answers and citations. Best for simple factual queries.
    
Use this for:
- Vessel information (IMO, owner, specs, location)
- Company lookups (fleet, ownership, operations)
- Current maritime news and events
- Simple technical facts and definitions
- Quick regulatory lookups

Returns: Google search results with AI-generated answer and inline citations`,
    schema: z.object({
      query: z.string().describe("Simple factual query needing fast, accurate answer from Google's index")
    })
  }
);

/**
 * TOOL 2: Smart Verification - Fast fact-checking for regulations/compliance
 * Ultra-fast, authoritative sources only, minimal results (Tavily-powered)
 */
const smartVerificationTool = tool(
  async ({ query }: { query: string }, config) => {
    const env = (config?.configurable as any)?.env;
    if (!env?.TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY not configured');
    }
    
    console.log(`⚡ Smart Verification: "${query}"`);
    
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: env.TAVILY_API_KEY,
          query,
          search_depth: 'basic', // Fast mode
          include_answer: true, // Tavily AI summary for instant facts
          include_raw_content: false,
          max_results: 5, // Minimal, authoritative only
          // CRITICAL: Only authoritative maritime sources
          include_domains: [
            'imo.org',              // International Maritime Organization
            'gov',                  // Government sites
            'dnv.com',              // DNV Classification
            'lr.org',               // Lloyd's Register
            'abs.org',              // American Bureau of Shipping
            'bvmarine.com',         // Bureau Veritas
            'uscg.mil',             // US Coast Guard
            'emsa.europa.eu'        // European Maritime Safety Agency
          ],
          exclude_domains: ['wikipedia.org', 'facebook.com', 'twitter.com', 'instagram.com'],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // For verification, we want QUALITY over QUANTITY
      const results = data.results || [];
      const topSources = results.slice(0, 3); // Max 3 authoritative sources
      
      console.log(`✅ Verification complete: ${topSources.length} authoritative sources`);
      console.log(`   Tavily AI Answer: ${data.answer ? 'YES' : 'NO'}`);
      
      return {
        sources: topSources,
        tavily_answer: data.answer || null, // AI-generated fact summary
        confidence: topSources.length >= 2 ? 0.9 : 0.7, // High confidence from authoritative sources
        mode: 'verification'
      };
    } catch (error: any) {
      console.error('❌ Verification error:', error.message);
      return {
        sources: [],
        tavily_answer: null,
        confidence: 0,
        mode: 'verification',
        error: error.message,
      };
    }
  },
  {
    name: "smart_verification",
    description: `Fast fact-checking tool for regulations, compliance, and maritime standards.
    
Use this for:
- SOLAS, MARPOL, ISM Code, STCW requirements
- Maritime law and compliance questions
- Classification society standards
- Regulatory definitions and explanations

Returns: 2-3 authoritative sources + Tavily AI fact summary`,
    schema: z.object({
      query: z.string().describe("Regulatory or compliance query needing authoritative verification")
    })
  }
);

/**
 * TOOL 3: Deep Research - Comprehensive maritime intelligence with multi-query orchestration
 * Features: Parallel searches, quality filtering, iterative refinement, raw content extraction (Tavily-powered)
 */
const deepResearchTool = tool(
  async ({ 
    query, 
    search_depth, 
    use_multi_query = false 
  }: { 
    query: string; 
    search_depth: 'basic' | 'advanced';
    use_multi_query?: boolean;
  }, config) => {
    const env = (config?.configurable as any)?.env;
    if (!env?.TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY not configured');
    }
    
    console.log(`🔬 Deep Research: "${query}" (${search_depth}, multi-query: ${use_multi_query})`);
    
    try {
      // PHASE 3: Multi-Query Orchestration
      // For complex queries, generate multiple search angles
      const queries = use_multi_query && search_depth === 'advanced' 
        ? generateMultipleQueries(query)
        : [query];
      
      console.log(`   🔍 Executing ${queries.length} parallel searches`);
      
      // Execute all queries in parallel for speed
      const searchPromises = queries.map(q => executeTavilySearch(q, search_depth, env.TAVILY_API_KEY));
      const searchResults = await Promise.all(searchPromises);
      
      // Merge and deduplicate results
      const allResults: any[] = [];
      const seenUrls = new Set<string>();
      
      for (const result of searchResults) {
        if (result.results) {
          for (const item of result.results) {
            if (!seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              allResults.push(item);
            }
          }
        }
      }
      
      console.log(`   📊 Total unique results: ${allResults.length} from ${queries.length} queries`);
      if (queries.length > 1) {
        console.log(`   🔍 Multi-query used: ${queries.map(q => `"${q.substring(0, 50)}..."`).join(', ')}`);
      }
      
      // Advanced source selection with MULTI-TIERED INTELLIGENCE
      const analysisDepth = search_depth === 'advanced' ? 'deep' : 'standard';
      const { selected, rejected } = await selectBestSources(
        allResults,
        search_depth === 'advanced' ? 15 : 10,
        query,
        analysisDepth
      );
      
      const confidence = calculateConfidence(selected);
      
      console.log(`✅ Deep research complete: ${selected.length} sources (rejected ${rejected.length})`);
      console.log(`   Confidence: ${confidence.toFixed(2)}`);
      
      return {
        sources: selected,
        rejected_sources: rejected,
        total_results: allResults.length,
        confidence,
        mode: 'research',
        queries_executed: queries.length,
        needs_refinement: confidence < 0.7 && selected.length < 5,
      };
    } catch (error: any) {
      console.error('❌ Deep research error:', error.message);
      return {
        sources: [],
        rejected_sources: [],
        total_results: 0,
        confidence: 0,
        mode: 'research',
        queries_executed: 1,
        needs_refinement: false,
        error: error.message,
      };
    }
  },
  {
    name: "deep_research",
    description: `Comprehensive maritime intelligence tool with multi-query orchestration.
    
Use this for:
- Specific vessels, ships, fleets
- Technical specifications and equipment
- Maritime companies and operations
- Comparative analysis
- Industry developments

Parameters:
- query: Detailed search query
- search_depth: 'basic' for focused search, 'advanced' for comprehensive intelligence
- use_multi_query: Enable parallel multi-angle searches (recommended for 'advanced')`,
    schema: z.object({
      query: z.string().describe("Complex maritime query requiring multi-source intelligence"),
      search_depth: z.enum(['basic', 'advanced']).default('basic').describe("'basic' for focused search, 'advanced' for comprehensive research"),
      use_multi_query: z.boolean().optional().describe("Enable multi-query orchestration for comprehensive coverage (default: false)")
    })
  }
);

/**
 * PHASE 3 & 4: Multi-query generation for comprehensive research
 * Generates multiple search angles for complex queries
 */
function generateMultipleQueries(originalQuery: string): string[] {
  const queries: string[] = [originalQuery]; // Always include original
  
  const queryLower = originalQuery.toLowerCase();
  
  // SUPERLATIVES: biggest, largest, best, fastest (need comparison data)
  if (/\b(biggest|largest|best|fastest|smallest|most|top|leading)\b/i.test(originalQuery)) {
    // Extract the subject (ship, fleet, company, etc.)
    const subject = originalQuery.match(/\b(ship|vessel|fleet|company|operator|port|container|tanker|bulk carrier)\b/i)?.[0] || 'vessel';
    const location = originalQuery.match(/\b(german|germany|europe|asia|world)\b/i)?.[0] || '';
    
    queries.push(`${location} ${subject} size comparison specifications`);
    queries.push(`${location} largest ${subject} fleet operator statistics`);
  }
  
  // For vessel queries, add multiple search angles
  if (/vessel|ship|MV |MS |MT /i.test(originalQuery)) {
    const vesselName = originalQuery.match(/(?:MV|MS|MT)\s+([A-Z][a-zA-Z\s]+)/i)?.[1]?.trim();
    if (vesselName) {
      queries.push(`${vesselName} vessel specifications technical details`);
      queries.push(`${vesselName} ship owner operator fleet`);
    }
  }
  
  // For company queries, add operational and fleet angles
  if (/company|operator|shipyard|manufacturer/i.test(originalQuery)) {
    queries.push(`${originalQuery} fleet operations`);
    queries.push(`${originalQuery} vessels specifications`);
  }
  
  // For equipment queries, add manufacturer and specs angles
  if (/engine|propulsion|equipment|specifications/i.test(originalQuery)) {
    queries.push(`${originalQuery} manufacturer datasheet`);
    queries.push(`${originalQuery} technical manual specifications`);
  }
  
  // For compliance/regulatory queries, add regional and classification angles
  if (/compliance|regulation|solas|marpol/i.test(originalQuery)) {
    queries.push(`${originalQuery} classification society requirements`);
    queries.push(`${originalQuery} port state control inspection`);
  }
  
  // Limit to 3 queries max to avoid excessive API calls
  return queries.slice(0, 3);
}

/**
 * PHASE 4: Execute Tavily search with advanced features
 * Supports raw_content, time_range, and domain filtering
 */
async function executeTavilySearch(
  query: string, 
  search_depth: 'basic' | 'advanced',
  apiKey: string
): Promise<any> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth,
      include_answer: false,
      include_raw_content: search_depth === 'advanced', // PHASE 4: Extract full content for advanced research
      max_results: search_depth === 'advanced' ? 20 : 15,
      // PHASE 4: Time-based filtering for recent info
      days: 365, // Focus on recent year for current information
      // Maritime intelligence domains
      include_domains: [
        'marinetraffic.com',      // Vessel tracking
        'vesselfinder.com',       // Fleet data
        'wartsila.com',           // OEM equipment
        'man-es.com',             // MAN engines
        'rolls-royce.com',        // Propulsion
        'kongsberg.com',          // Maritime tech
        'maritime-executive.com', // Industry news
        'gcaptain.com',           // Maritime news
        'dnv.com',                // Classification
        'lr.org',                 // Lloyd's Register
        'abs.org',                // ABS
        'imo.org',                // IMO
      ],
      exclude_domains: ['facebook.com', 'twitter.com', 'instagram.com', 'wikipedia.org'],
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Maritime Knowledge Base Tool - Internal fleetcore knowledge
 */
const maritimeKnowledgeTool = tool(
  async ({ topic }: { topic: string }) => {
    console.log(`📚 Knowledge Base Query: "${topic}"`);
    
    const knowledge: Record<string, string> = {
      'SOLAS': 'SOLAS (Safety of Life at Sea) is the most important international maritime safety treaty, covering construction, equipment, operation, and training standards.',
      'MARPOL': 'MARPOL (International Convention for the Prevention of Pollution from Ships) regulates pollution from ships, including oil, chemicals, sewage, garbage, and air emissions.',
      'ISM': 'ISM Code (International Safety Management Code) provides an international standard for safe ship management and pollution prevention.',
      'fleetcore': 'fleetcore is an enterprise Maritime Maintenance Operating System providing predictive maintenance, compliance management, and digital transformation for maritime operations.',
    };
    
    const result = Object.entries(knowledge)
      .filter(([key]) => topic.toLowerCase().includes(key.toLowerCase()))
      .map(([_, value]) => value)
      .join('\n\n');
    
    return result || "Topic not found in knowledge base. Please use maritime_search for specific queries.";
  },
  {
    name: "maritime_knowledge",
    description: "Query fleetcore's internal maritime knowledge base for regulations, standards, and general maritime concepts (SOLAS, MARPOL, ISM, fleetcore features).",
    schema: z.object({
      topic: z.string().describe("Topic to query: SOLAS, MARPOL, ISM, fleetcore, vessel types, equipment categories")
    })
  }
);

// Register both tools - router will decide which to use
const tools = [geminiGroundingTool, smartVerificationTool, deepResearchTool, maritimeKnowledgeTool];
const toolNode = new ToolNode(tools);

// =====================
// AGENT NODES
// =====================

/**
 * Router Node - Decides if research is needed and which tools to use
 */
async function routerNode(state: AgentState, config?: any): Promise<Partial<AgentState>> {
  const lastMessage = state.messages[state.messages.length - 1];
  const userQuery = lastMessage.content as string;
  
  console.log(`🎯 Router analyzing: "${userQuery.substring(0, 100)}..."`);
  
  // Extract entities from current query
  const entities = extractMaritimeEntities(userQuery);
  
  // Get ALL entities from conversation history (persistent memory)
  const allConversationEntities = [...entities, ...state.maritimeEntities];
  
  // Check if follow-up (now considers all conversation entities)
  const isFollowUp = isFollowUpQuery(userQuery, state.messages, allConversationEntities);
  
  // Detect query mode: verification, research, or none
  const queryMode = detectQueryMode(userQuery, state.enableBrowsing);
  
  console.log(`   Entities: ${entities.length ? entities.join(', ') : 'none'}`);
  console.log(`   Follow-up: ${isFollowUp}`);
  console.log(`   User enabled browsing: ${state.enableBrowsing}`);
  console.log(`   Detected mode: ${queryMode}`);
  
  // NEW: Build entity context for follow-up queries
  let entityContext = '';
  if (isFollowUp && allConversationEntities.length > 0) {
    console.log(`📋 Follow-up query detected. Previous entities: ${allConversationEntities.join(', ')}`);
    
    // Extract the main entity being discussed
    const mainEntity = allConversationEntities[allConversationEntities.length - 1];
    
    // If user asks for specific details (engines, specs, etc.) without entity name, add it to query
    const needsEntityAddition = 
      /\b(engine|propulsion|specification|system|equipment|details|list)\b/i.test(userQuery) &&
      !allConversationEntities.some(e => userQuery.toLowerCase().includes(e.toLowerCase()));
    
    if (needsEntityAddition) {
      entityContext = `\n\n**CONTEXT**: User is asking about ${mainEntity} from previous discussion. Focus your search on ${mainEntity} specifically.`;
      console.log(`   🎯 Enriching query with entity context: ${mainEntity}`);
    }
  }
  
  // If follow-up with existing research context but needs NEW specific info, DO research
  // Example: Previous: "biggest vessel" → Now: "list engines" (needs technical deep dive)
  if (isFollowUp && state.researchContext) {
    const needsNewResearch = /\b(engine|propulsion|specification|technical|system|equipment|maintenance|oem)\b/i.test(userQuery);
    
    if (!needsNewResearch) {
      console.log(`✅ Using existing research context for follow-up`);
      return {
        maritimeEntities: entities,
        researchMode: state.researchMode,
      };
    } else {
      console.log(`🔄 Follow-up needs NEW technical research despite existing context`);
      // Continue to research below
    }
  }
  
  // Route based on detected mode
  if (queryMode === 'none') {
    // Expert mode - no external queries needed
    console.log(`💬 Expert mode: Answering from maritime expertise`);
    return {
      maritimeEntities: entities,
      researchMode: 'none',
    };
  }
  
  // VERIFICATION MODE: Direct Gemini call (bypasses tool_choice issues)
  if (queryMode === 'verification') {
    console.log(`🔮 VERIFICATION MODE: Calling Gemini directly (bypass tool_choice)`);
    console.log(`   Query: "${userQuery}"`);
    console.log(`   Entity context: "${entityContext}"`);
    console.log(`   Full query to Gemini: "${userQuery + entityContext}"`);
    
    try {
      console.log(`   Calling geminiGroundingTool.invoke()...`);
      
      // Call Gemini grounding tool directly
      const geminiResult = await geminiGroundingTool.invoke(
        { query: userQuery + entityContext },
        config
      );
      
      console.log(`   ✅ Gemini direct call complete`);
      console.log(`   Result type: ${typeof geminiResult}`);
      console.log(`   Result preview: ${typeof geminiResult === 'string' ? geminiResult.substring(0, 200) : 'N/A'}`);
      
      // Parse the result
      const parsed = typeof geminiResult === 'string' ? JSON.parse(geminiResult) : geminiResult;
      
      console.log(`   📊 Parsed result keys:`, Object.keys(parsed));
      console.log(`   Sources count: ${parsed.sources?.length || 0}`);
      console.log(`   Has answer: ${!!parsed.answer}`);
      if (parsed.sources && parsed.sources.length > 0) {
        console.log(`   ✅ Sources successfully extracted from Gemini:`);
        parsed.sources.forEach((s: any, i: number) => {
          console.log(`      [${i+1}] ${s.title} - ${s.url}`);
        });
      } else {
        console.log(`   ⚠️ WARNING: Gemini returned 0 sources! This is why citations are missing.`);
      }
      
      // Process the sources directly and build research context
      const sources = parsed.sources || [];
      const geminiAnswer = parsed.answer || null;
      
      // Build research context for synthesis
      let researchContext = '';
      if (sources.length > 0 || geminiAnswer) {
        console.log(`   📝 Building research context with ${sources.length} sources`);
        researchContext = `=== GEMINI GROUNDING RESULTS (Direct Call) ===

${geminiAnswer ? `Google-verified Answer:\n${geminiAnswer}\n\n` : ''}${sources.length > 0 ? `Google Sources (${sources.length}):\n\n${sources.map((s: any, i: number) => `[${i + 1}] ${s.title} (${new URL(s.url).hostname})
   ${s.content.substring(0, 300)}...`).join('\n\n')}` : 'Direct answer from Google\'s knowledge base'}

=== END GEMINI GROUNDING ===

**CRITICAL INSTRUCTIONS:**
- You MUST cite sources with [1][2][3] after EVERY factual statement
- Example: "The vessel is 400m long [1] and has 24,346 TEU capacity [2]"
- Use the Google-verified information above to answer the user's query
- This is accurate information from Google Search grounding
- Add the disclaimer about deep research for comprehensive analysis

**CRITICAL - Answer Focus:**
- User query: "${userQuery}"
- Answer ONLY what the user asked for, don't provide generic overviews`;
        
        console.log(`   📝 Research context built: ${researchContext.length} chars`);
      } else {
        console.log(`   ⚠️ No sources or answer from Gemini - this should not happen!`);
      }
      
      // Return state update to skip directly to synthesis
      console.log(`   📤 Returning state with ${sources.length} verified sources`);
      const stateUpdate = {
        maritimeEntities: entities,
        researchMode: 'verification' as const,
        conversationEntities: entities.reduce((acc, e) => ({ ...acc, [e.toLowerCase()]: e }), {}),
        researchContext,
        verifiedSources: sources,
        confidence: parsed.confidence || 0.9,
      };
      console.log(`   📊 State update verifiedSources length:`, stateUpdate.verifiedSources.length);
      return stateUpdate;
    } catch (error: any) {
      console.error(`❌ Direct Gemini call failed:`, error.message);
      console.error(`   Stack: ${error.stack?.substring(0, 300)}`);
      // Fall back to expert mode
      return {
        maritimeEntities: entities,
        researchMode: 'none',
      };
    }
  }
  
  // RESEARCH MODE: Use deep_research tool via LangGraph
  console.log(`📋 Invoking research mode planner...`);
  
  const planningPrompt = `You are a maritime intelligence researcher.

User Query: "${userQuery}"
Detected Entities: ${entities.join(', ')}

Your task: Use the deep_research tool for comprehensive intelligence.
- For COMPLEX queries (comparisons, analysis, multiple entities):
  * Use search_depth='advanced'
  * Enable use_multi_query=true for parallel multi-angle research
- For FOCUSED queries (single entity, simple specs):
  * Use search_depth='basic'
  * Keep use_multi_query=false
- You can also use maritime_knowledge for internal fleetcore information

Call deep_research now with appropriate parameters.`;
  
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.1,
    apiKey: (config?.configurable as any)?.env?.OPENAI_API_KEY,
  }).bindTools(tools);
  
  const response = await model.invoke([
    new SystemMessage(planningPrompt),
    new HumanMessage(userQuery)
  ], config);
  
  const toolCallsCount = response.tool_calls?.length || 0;
  console.log(`📋 Planner decided: ${toolCallsCount} tool calls`);
  console.log(`   Response type: ${response.constructor.name}`);
  console.log(`   Response has tool_calls property: ${!!response.tool_calls}`);
  console.log(`   Response.tool_calls value: ${JSON.stringify(response.tool_calls)}`);
  
  // CRITICAL: Verify tool was called (we're in research mode at this point)
  if (toolCallsCount === 0) {
    console.error(`❌ CRITICAL ERROR: research mode but no tools called!`);
    console.error(`   Query: "${userQuery}"`);
    console.error(`   Expected tool: deep_research`);
    console.error(`   Response content: ${typeof response.content === 'string' ? response.content.substring(0, 200) : 'N/A'}`);
  }
  
  if (toolCallsCount > 0) {
    const toolNames = response.tool_calls?.map(tc => tc.name).join(', ') || 'none';
    console.log(`   🔧 Tools selected: ${toolNames}`);
    console.log(`   💡 Strategy: ${
      toolNames.includes('gemini_grounding') ? 'Google Gemini (fast factual lookup)' :
      toolNames.includes('smart_verification') ? 'Tavily (authoritative sources only)' :
      toolNames.includes('deep_research') ? 'Tavily (deep maritime intelligence)' :
      'Knowledge base'
    }`);
  }
  
  // Store entities in persistent memory
  const entityMemory: Record<string, string> = {};
  entities.forEach(entity => {
    entityMemory[entity.toLowerCase()] = entity;
  });
  
  return {
    messages: [response],
    maritimeEntities: entities,
    researchMode: queryMode,
    conversationEntities: entityMemory,
  };
}

/**
 * Process Tool Results - Extract and format research findings
 * Handles both verification (minimal sources) and research (comprehensive) modes
 */
async function processToolResults(state: AgentState): Promise<Partial<AgentState>> {
  const lastMessage = state.messages[state.messages.length - 1];
  
  console.log(`\n🔧 PROCESS TOOL RESULTS`);
  console.log(`   Total messages in state: ${state.messages.length}`);
  console.log(`   Research mode: ${state.researchMode}`);
  
  // DEBUG: Log all message types
  state.messages.forEach((msg, i) => {
    console.log(`   Msg ${i}: ${msg.constructor.name} | hasToolCalls: ${!!(msg as any).tool_calls?.length}`);
  });
  
  // Find tool messages - look for ToolMessage class instances
  const toolMessages = state.messages.filter(msg => 
    msg.constructor.name === 'ToolMessage'
  );
  
  console.log(`   Found ${toolMessages.length} ToolMessage instances`);
  
  if (toolMessages.length === 0) {
    console.warn(`   ⚠️ NO TOOL MESSAGES FOUND - this means tools didn't execute or results weren't captured`);
    return {};
  }
  
  console.log(`🔧 Processing ${toolMessages.length} tool results (mode: ${state.researchMode})`);
  
  // Extract sources from tool results
  let allSources: Source[] = [];
  let allRejected: Source[] = [];
  let confidenceScore = 0;
  let geminiAnswer: string | null = null;
  
  for (const msg of toolMessages) {
    const content = msg.content;
    console.log(`   📦 ToolMessage content type: ${typeof content}`);
    console.log(`   📦 Content preview: ${typeof content === 'string' ? content.substring(0, 200) : 'N/A'}`);
    
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        console.log(`   ✅ Parsed JSON keys: ${Object.keys(parsed).join(', ')}`);
        
        if (parsed.sources) {
          console.log(`   📚 Found ${parsed.sources.length} sources`);
          allSources.push(...parsed.sources);
          confidenceScore = Math.max(confidenceScore, parsed.confidence || 0);
        }
        if (parsed.rejected_sources) {
          allRejected.push(...parsed.rejected_sources);
        }
        // VERIFICATION MODE: Capture AI answer (from Gemini or Tavily)
        if (parsed.answer || parsed.tavily_answer) {
          geminiAnswer = parsed.answer || parsed.tavily_answer;
          console.log(`   📝 AI Answer captured: ${geminiAnswer?.substring(0, 100)}...`);
        }
      } catch (e) {
        // Not JSON, might be knowledge base result
        console.log(`   ⚠️ Non-JSON tool result: ${e}`);
      }
    }
  }
  
  // Build research context based on mode
  let researchContext = '';
  
  if (state.researchMode === 'verification') {
    if (allSources.length > 0 || geminiAnswer) {
      console.log(`\n✅ GEMINI RESULTS FOUND AND PROCESSING`);
      console.log(`   Sources: ${allSources.length}`);
      console.log(`   Has Answer: ${!!geminiAnswer}`);
      console.log(`   Answer preview: ${geminiAnswer?.substring(0, 150)}...`);
      
      // VERIFICATION MODE: Gemini-powered answer with Google sources
      researchContext = `=== GEMINI GROUNDING RESULTS ===

${geminiAnswer ? `Google-verified Answer:\n${geminiAnswer}\n\n` : ''}${allSources.length > 0 ? `Google Sources (${allSources.length}):\n\n${allSources.map((s, i) => `[${i + 1}] ${s.title} (${new URL(s.url).hostname})
   ${s.content.substring(0, 300)}...`).join('\n\n')}` : 'Direct answer from Google\'s knowledge base'}

=== END GEMINI GROUNDING ===

**Instructions:**
- Use the Google-verified information above to answer the user's query
- Cite sources with [1][2][3] if provided
- This is accurate information from Google Search grounding
- Add the disclaimer about deep research for comprehensive analysis

**CRITICAL - Answer Focus:**
- User query: "${typeof lastMessage.content === 'string' ? lastMessage.content : 'See query above'}"
- Answer ONLY what the user asked for, don't provide generic overviews
- If they ask for engines → ONLY engines
- If they ask for specifications → ONLY specifications
- Stay focused on the specific question`;
    } else {
      // No sources found - provide guidance to use training data
      console.warn(`⚠️ Verification mode but no sources found - falling back to training data`);
      console.warn(`   This means either:`);
      console.warn(`   1. Gemini tool was not called`);
      console.warn(`   2. Gemini tool was called but returned no results`);
      console.warn(`   3. Tool messages were not captured in state`);
      
      researchContext = `=== NO GEMINI GROUNDING RESULTS ===

**CRITICAL: Gemini grounding did NOT provide results for this query.**

This should NOT happen for entity queries like vessels, companies, equipment.
Possible causes:
1. Tool was not called (check router logs)
2. API error occurred
3. No Google results found (unlikely)

**DO NOT add the Gemini disclaimer to your answer.**
**DO NOT claim this is Gemini-powered information.**

Instead, answer from your general maritime knowledge and add:

"I apologize, but I encountered an issue accessing real-time vessel information. Based on general maritime knowledge: [your answer].

To get current, verified vessel data, please try enabling the 'Online research' toggle above or try your query again."

=== END NO RESULTS ===`;
    }
  } else if (state.researchMode === 'research' && allSources.length > 0) {
    // RESEARCH MODE: Comprehensive context with full details
    const lastMsg = state.messages[state.messages.length - 1];
    const userQuery = typeof lastMsg?.content === 'string' ? lastMsg.content : '';
    
    // DETECT SPECIFIC REQUEST TYPE
    const isEngineQuery = /\b(engine|propulsion|motor|machinery|main engine|auxiliary)\b/i.test(userQuery);
    const isSpecQuery = /\b(specification|specs|technical details|dimensions|capacity)\b/i.test(userQuery);
    const isEquipmentQuery = /\b(equipment|system|machinery|generator|pump|boiler)\b/i.test(userQuery);
    const isMaintenanceQuery = /\b(maintenance|service|oem|inspection|interval)\b/i.test(userQuery);
    
    let focusInstructions = '';
    if (isEngineQuery) {
      focusInstructions = `
**CRITICAL - FOCUSED ANSWER REQUIRED:**
User asked specifically about ENGINES/PROPULSION. Your answer MUST focus ONLY on:
1. Main engine(s): manufacturer, model, power (kW/HP), cylinders, RPM, fuel type
2. Auxiliary engines/generators: models, power ratings, quantities
3. Propulsion type: direct drive, diesel-electric, pod propulsion, etc.
4. OEM maintenance recommendations if available in sources

DO NOT provide general vessel overview - ONLY engine/propulsion technical details.
Cite sources [1][2][3] for every specification.`;
    } else if (isSpecQuery) {
      focusInstructions = `
**CRITICAL - FOCUSED ANSWER REQUIRED:**
User asked for SPECIFICATIONS. Focus on technical numbers with units:
- Dimensions, capacities, performance metrics, equipment specs
- Cite sources [1][2][3] for every number
DO NOT provide general descriptions - ONLY hard specifications.`;
    } else if (isEquipmentQuery) {
      focusInstructions = `
**CRITICAL - FOCUSED ANSWER REQUIRED:**
User asked about specific EQUIPMENT/SYSTEMS. List each system with:
- Manufacturer and model number
- Capacity/rating with units
- Quantity/configuration
Cite sources [1][2][3] for every item.`;
    } else if (isMaintenanceQuery) {
      focusInstructions = `
**CRITICAL - FOCUSED ANSWER REQUIRED:**
User asked about MAINTENANCE. Focus on:
- OEM service intervals
- Critical maintenance procedures
- Spare parts and consumables
Cite sources [1][2][3] for every recommendation.`;
    } else {
      focusInstructions = `
**STANDARD COMPREHENSIVE RESPONSE:**
- You MUST write a COMPREHENSIVE, DETAILED response of AT LEAST 2000-3000 characters
- Use ALL ${allSources.length} sources provided below - cite each source [1][2][3] throughout
- Follow structure: Overview → Technical Specifications → Operational Capabilities → Maritime Significance → Operational Impact
- Include maritime context, strategic importance, and industry perspective for EVERY fact`;
    }
    
    researchContext = `=== RESEARCH INTELLIGENCE ===
${focusInstructions}

Found ${allSources.length} verified sources (rejected ${allRejected.length} low-quality):

${allSources.map((s, i) => `[${i + 1}] ${s.title}
   URL: ${s.url}
   Domain: ${new URL(s.url).hostname}
   Authority Score: ${s.score?.toFixed(2) || 'N/A'}
   
   Full Content:
   ${s.content.substring(0, 2500)}${s.content.length > 2500 ? '...' : ''}
   
`).join('\n')}

=== END RESEARCH ===

**REMINDER: Answer EXACTLY what the user asked for. If they asked for engines, provide ONLY engine details with citations, not a general vessel overview.**`;
  }
  
  console.log(`✅ Processed: ${allSources.length} sources, confidence: ${confidenceScore.toFixed(2)}`);
  console.log(`   Mode: ${state.researchMode}, Context length: ${researchContext.length} chars`);
  
  // PHASE 3: Check if iterative refinement is needed
  const needsRefinement = state.researchMode === 'research' && 
                          confidenceScore < 0.7 && 
                          allSources.length < 5 &&
                          !state.researchContext; // Don't refine if we already did research
  
  if (needsRefinement) {
    console.log(`⚠️ Low confidence (${confidenceScore.toFixed(2)}), may need refinement query`);
  }
  
  return {
    researchContext,
    verifiedSources: allSources,
    rejectedSources: allRejected,
    confidence: confidenceScore,
    needsRefinement,
  };
}

/**
 * Synthesizer Node - Generate final answer with citations
 */
async function synthesizerNode(state: AgentState, config?: any): Promise<Partial<AgentState>> {
  console.log(`\n🎨 SYNTHESIZER NODE`);
  console.log(`   Sources: ${state.verifiedSources.length}`);
  console.log(`   Research context: ${state.researchContext ? 'YES' : 'NO'}`);
  console.log(`   Messages in state: ${state.messages.length}`);
  
  // CRITICAL: Use streaming: true to get token-by-token output
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: state.researchContext ? 0.4 : 0.3,
    apiKey: (config?.configurable as any)?.env?.OPENAI_API_KEY,
    streaming: true, // Enable token streaming
  });
  
  // Build context-aware system prompt
  let systemPrompt = MARITIME_SYSTEM_PROMPT;
  
  if (state.researchContext) {
    systemPrompt = systemPrompt.replace(
      '{source_count}',
      state.verifiedSources.length.toString()
    );
  }
  
  // Prepare messages for synthesis
  const synthesisMessages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
  ];
  
  // Add conversation history
  for (const msg of state.messages) {
    // Skip tool call messages, they're already processed
    if (!(msg as any).tool_calls && msg.constructor.name !== 'ToolMessage') {
      synthesisMessages.push(msg);
    }
  }
  
  // Add research context if available
  if (state.researchContext) {
    synthesisMessages.push(
      new SystemMessage(state.researchContext)
    );
  }
  
  // CRITICAL: Stream the response token-by-token
  // We'll collect it here but the actual streaming happens in handleChatWithLangGraph
  let fullContent = '';
  
  console.log(`🎨 Starting synthesis...`);
  console.log(`   System prompt length: ${systemPrompt.length} chars`);
  console.log(`   Research context length: ${state.researchContext?.length || 0} chars`);
  console.log(`   Total messages to synthesize: ${synthesisMessages.length}`);
  console.log(`   Research mode: ${state.researchMode}`);
  console.log(`   Has research context: ${!!state.researchContext}`);
  
  if (state.researchContext) {
    console.log(`   First 500 chars of research context:`, state.researchContext.substring(0, 500));
  } else {
    console.warn(`   ⚠️ WARNING: No research context despite having ${state.verifiedSources.length} verified sources!`);
  }
  
  const stream = await model.stream(synthesisMessages, config);
  
  for await (const chunk of stream) {
    fullContent += chunk.content;
  }
  
  console.log(`✅ Synthesized ${fullContent.length} characters`);
  
  if (state.researchContext && fullContent.length < 2000) {
    console.warn(`⚠️ WARNING: Response is too short! Only ${fullContent.length} chars (target: 2000-3000)`);
    console.warn(`   Sources available: ${state.verifiedSources.length}`);
    console.warn(`   This indicates the LLM is not following the comprehensive response requirement!`);
  } else if (state.researchContext) {
    console.log(`✅ Response length meets requirement: ${fullContent.length} chars`);
  }
  
  return {
    messages: [new AIMessage(fullContent)],
  };
}

// =====================
// ROUTING LOGIC
// =====================

function shouldContinue(state: AgentState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const messageType = lastMessage.constructor.name;
  
  console.log(`\n🔀 ROUTING DECISION`);
  console.log(`   Messages: ${state.messages.length}`);
  console.log(`   Last message type: ${messageType}`);
  console.log(`   Last message has tool_calls: ${!!(lastMessage as AIMessage).tool_calls}`);
  console.log(`   Last message tool_calls count: ${(lastMessage as AIMessage).tool_calls?.length || 0}`);
  console.log(`   Research context: ${state.researchContext ? 'YES' : 'NO'}`);
  console.log(`   Confidence: ${state.confidence}`);
  console.log(`   Verified sources: ${state.verifiedSources.length}`);
  console.log(`   Needs refinement: ${state.needsRefinement}`);
  
  // If last message has tool calls, execute them
  if ((lastMessage as AIMessage).tool_calls?.length) {
    console.log(`→ Routing to: tools (${(lastMessage as AIMessage).tool_calls?.length} tool calls to execute)`);
    console.log(`   Tool names: ${(lastMessage as AIMessage).tool_calls?.map((tc: any) => tc.name).join(', ')}`);
    return "tools";
  }
  
  // PHASE 3: Iterative Refinement - If confidence is low and we haven't refined yet, go back to router
  // This enables automatic follow-up queries to improve results
  if (state.needsRefinement && state.confidence < 0.7 && state.verifiedSources.length > 0 && state.verifiedSources.length < 5) {
    console.log(`→ Routing to: router (ITERATIVE REFINEMENT - low confidence ${state.confidence.toFixed(2)})`);
    // TODO: In router, detect this and generate a refinement query
    // For now, proceed to synthesis with what we have
    console.log(`   (Refinement disabled for this iteration - will synthesize with available sources)`);
  }
  
  // CRITICAL: If we have research context, we need to synthesize
  // This happens after tools execute (lastMessage = ToolMessage)
  if (state.researchContext) {
    // If last message is already a final AIMessage answer, we're done
    const isAIAnswer = messageType === 'AIMessage' && !(lastMessage as AIMessage).tool_calls?.length;
    if (isAIAnswer) {
      console.log(`→ Routing to: END (answer complete)`);
      return END;
    }
    // Otherwise, go to synthesizer to create the answer
    console.log(`→ Routing to: synthesizer (research complete, ${state.verifiedSources.length} sources)`);
    return "synthesizer";
  }
  
  // If no research and last message is from user, go to synthesizer (expert mode)
  if (messageType === 'HumanMessage') {
    console.log(`→ Routing to: synthesizer (expert mode - no research)`);
    return "synthesizer";
  }
  
  // Otherwise, we're done
  console.log(`→ Routing to: END (fallthrough)`);
  return END;
}

// =====================
// BUILD WORKFLOW
// =====================

const workflow = new StateGraph(MaritimeAgentState)
  // Add nodes
  .addNode("router", routerNode)
  .addNode("tools", toolNode)
  .addNode("process", processToolResults)
  .addNode("synthesizer", synthesizerNode)
  
  // Define edges
  .addEdge(START, "router")
  .addConditionalEdges(
    "router",
    shouldContinue,
    {
      "tools": "tools",
      "synthesizer": "synthesizer",
      [END]: END,
    }
  )
  .addEdge("tools", "process")
  .addConditionalEdges(
    "process",
    shouldContinue,
    {
      "router": "router",
      "synthesizer": "synthesizer",
      [END]: END,
    }
  )
  .addEdge("synthesizer", END);

// Compile with memory
const checkpointer = new MemorySaver();
const agent = workflow.compile({ 
  checkpointer,
});

// =====================
// EXPORT API
// =====================

export interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
  enableBrowsing: boolean;
  env: {
    OPENAI_API_KEY: string;
    TAVILY_API_KEY: string;
    GEMINI_API_KEY: string;
    LANGSMITH_API_KEY?: string; // Optional for tracing/debugging
  };
}

/**
 * Handle chat request with LangGraph agent
 * Returns SSE stream for real-time updates
 */
export async function handleChatWithLangGraph(request: ChatRequest): Promise<ReadableStream> {
  const { messages, sessionId, enableBrowsing, env } = request;
  
  console.log(`\n🚀 LangGraph Agent Request | Session: ${sessionId} | Browsing: ${enableBrowsing}`);
  
  // Configure LangSmith tracing if API key is available
  if (env.LANGSMITH_API_KEY) {
    console.log(`🔬 LangSmith tracing enabled`);
    console.log(`   Project: fleetcore-maritime-agent`);
    console.log(`   Session: ${sessionId}`);
    // Set environment variables for LangSmith
    (globalThis as any).process = (globalThis as any).process || {};
    (globalThis as any).process.env = (globalThis as any).process.env || {};
    (globalThis as any).process.env.LANGCHAIN_TRACING_V2 = 'true';
    (globalThis as any).process.env.LANGCHAIN_API_KEY = env.LANGSMITH_API_KEY;
    (globalThis as any).process.env.LANGCHAIN_PROJECT = 'fleetcore-maritime-agent';
    (globalThis as any).process.env.LANGCHAIN_ENDPOINT = 'https://api.smith.langchain.com';
    
    // Log trace URL format for debugging
    console.log(`   View traces at: https://smith.langchain.com/o/YOUR-ORG/projects/p/fleetcore-maritime-agent`);
  } else {
    console.warn(`⚠️ LANGSMITH_API_KEY not set - tracing disabled`);
  }
  
  // Convert messages to BaseMessage format
  const baseMessages: BaseMessage[] = messages.map(msg => {
    if (msg.role === 'user') {
      return new HumanMessage(msg.content);
    } else if (msg.role === 'assistant') {
      return new AIMessage(msg.content);
    } else {
      return new SystemMessage(msg.content);
    }
  });
  
  const config = {
    configurable: {
      thread_id: sessionId,
      env,
    },
    // Add metadata for LangSmith tracing
    metadata: {
      session_id: sessionId,
      enable_browsing: enableBrowsing,
      user_query: messages[messages.length - 1]?.content?.substring(0, 100),
    },
    // Add tags for easier filtering in LangSmith
    tags: ['maritime-agent', enableBrowsing ? 'research-mode' : 'verification-mode'],
  };
  
  // Create SSE stream
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      try {
        // IMMEDIATE DEBUG: Send first event to confirm stream started
        console.log(`📡 SSE Stream: Sending initial debug event`);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'debug', message: 'LangGraph stream started', sessionId, enableBrowsing })}\n\n`
        ));
        
        console.log(`📡 SSE Stream: Creating agent stream...`);
        console.log(`   Messages: ${baseMessages.length}`);
        console.log(`   Session: ${sessionId}`);
        console.log(`   Browsing: ${enableBrowsing}`);
        console.log(`   Has API keys: ${!!env.OPENAI_API_KEY && !!env.TAVILY_API_KEY && !!env.GEMINI_API_KEY}`);
        
        // Validate input
        if (!env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY not configured');
        }
        if (enableBrowsing && !env.TAVILY_API_KEY) {
          throw new Error('TAVILY_API_KEY not configured but browsing is enabled');
        }
        
        // Stream events from agent
        // Use "messages" mode to get token-by-token streaming
        let stream;
        try {
          stream = await agent.stream(
            {
              messages: baseMessages,
              sessionId,
              enableBrowsing,
            },
            {
              ...config,
              streamMode: ["messages", "updates"] as const,
            }
          );
          console.log(`📡 SSE Stream: Agent stream created successfully`);
        } catch (streamError: any) {
          console.error(`❌ Failed to create agent stream:`, streamError);
          throw new Error(`Agent stream creation failed: ${streamError.message}`);
        }
        
        let sourcesEmitted = false;
        let eventCount = 0;
        
        console.log(`📡 SSE Stream: Entering event loop`);
        
        let hasStreamedContent = false;
        let hasError = false;
        
        try {
          for await (const [streamType, event] of stream) {
            eventCount++;
            console.log(`\n📤 EVENT #${eventCount}:`, streamType, Object.keys(event || {})[0]);
          
          // Handle token-level streaming from "messages" mode
          if (streamType === 'messages') {
            const messages = event as BaseMessage[] | BaseMessage;
            const messageArray = Array.isArray(messages) ? messages : [messages];
            
            for (const msg of messageArray) {
              if (msg.constructor.name === 'AIMessageChunk' && msg.content) {
                // This is a streaming token! Emit immediately
                hasStreamedContent = true;
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'content', content: msg.content })}\n\n`
                ));
              }
            }
            continue; // Skip to next event
          }
          
          // Handle node-level updates from "updates" mode
          const eventKey = Object.keys(event || {})[0];
          console.log(`   Event structure:`, JSON.stringify(event, null, 2).substring(0, 500));
          
          // Emit thinking process - Mode-specific messages
          if (event.router) {
            const mode = event.router.researchMode || 'none';
            
            if (mode === 'verification') {
              // Send research start event for frontend loading state
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'research_start', mode: 'verification' })}\n\n`
              ));
              
              // If router has research context, Gemini was called directly
              if (event.router.researchContext) {
                const sourceCount = event.router.verifiedSources?.length || 0;
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: 'debug',
                    message: `✅ Gemini executed directly: ${sourceCount} sources`,
                    geminiUsed: true,
                    sourceCount
                  })}\n\n`
                ));
              }
            } else if (mode === 'research') {
              // Send research start event for frontend loading state
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'research_start', mode: 'research' })}\n\n`
              ));
            }
            // Expert mode (none): No research event
          }
          
          if (event.tools) {
            // Tools are executing - emit which tool is being used
            const currentMessages = event.router?.messages || [];
            const toolMessages = currentMessages.filter((msg: any) => 
              msg.tool_calls?.length > 0
            );
            
            if (toolMessages.length > 0) {
              const lastToolCall = toolMessages[toolMessages.length - 1].tool_calls[0];
              const toolName = lastToolCall?.name || 'unknown';
              
              const toolLabels: Record<string, string> = {
                'gemini_grounding': '🔮 Searching Google with Gemini...',
                'smart_verification': '⚡ Verifying with authoritative sources...',
                'deep_research': '🔬 Deep maritime intelligence search...',
                'maritime_knowledge': '📚 Consulting fleetcore knowledge base...',
              };
              
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'tool_execution',
                  tool: toolName,
                  message: toolLabels[toolName] || 'Gathering maritime data...'
                })}\n\n`
              ));
            }
          }
          
          // Emit sources - Mode-specific display
          if (event.process?.verifiedSources && !sourcesEmitted) {
            const sources = event.process.verifiedSources;
            const mode = event.process.researchMode || 'research'; // Default to research for backward compat
            
            console.log(`   Emitting ${sources.length} sources (mode: ${mode})`);
            
            if (mode === 'verification') {
              // VERIFICATION MODE: Minimal inline display
              // Don't emit individual source events for verification
              // Sources will be inline-cited in the answer like [1][2][3]
              console.log(`   ⚡ Verification mode: Sources will be inline-cited, no research panel`);
              
              // EMIT DEBUG EVENT so frontend knows Gemini was used
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'debug',
                  message: `Gemini grounding results: ${sources.length} sources found`,
                  geminiUsed: true,
                  sourceCount: sources.length
                })}\n\n`
              ));
            } else {
              // RESEARCH MODE: Full research panel with source selection
              console.log(`   🔬 Research mode: Emitting sources to research panel`);
              
              // Emit verified sources with action='select'
              for (const source of sources) {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: 'source',
                    action: 'selected',
                    title: source.title,
                    url: source.url,
                    content: source.content.substring(0, 300),
                    score: source.score || 0.5
                  })}\n\n`
                ));
              }
              
              // Emit rejected sources with action='reject'
              if (event.process.rejectedSources?.length) {
                console.log(`   Emitting ${event.process.rejectedSources.length} rejected sources`);
                for (const rejected of event.process.rejectedSources) {
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: 'source',
                      action: 'rejected',
                      title: rejected.title,
                      url: rejected.url,
                      reason: 'Lower relevance score',
                      score: rejected.score || 0
                    })}\n\n`
                  ));
                }
              }
            }
            
            sourcesEmitted = true;
          }
          
          if (event.synthesizer) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'thinking', content: 'Synthesizing comprehensive answer...' })}\n\n`
            ));
          }
          
          // Emit final answer - Only if token streaming didn't work
          if (event.synthesizer) {
            console.log(`   Synthesizer event keys:`, Object.keys(event.synthesizer));
            
            // If we already streamed tokens, skip this to avoid duplicates
            if (hasStreamedContent) {
              console.log(`   ✅ Content already streamed token-by-token, skipping duplicate`);
            } else {
              console.log(`   ⚠️ No token streaming occurred, falling back to chunk streaming`);
              console.log(`   Synthesizer full value:`, JSON.stringify(event.synthesizer, null, 2).substring(0, 800));
              
              // Fallback: Emit in chunks (shouldn't happen if token streaming works)
              const messagesUpdate = event.synthesizer.messages;
              
              if (Array.isArray(messagesUpdate) && messagesUpdate.length > 0) {
                const lastMessage = messagesUpdate[messagesUpdate.length - 1];
                const content = typeof lastMessage.content === 'string' 
                  ? lastMessage.content 
                  : JSON.stringify(lastMessage.content);
                
                console.log(`   ✅ Answer found: ${content?.length || 0} chars`);
                
                if (content && content.length > 0) {
                  const chunkSize = 50;
                  for (let i = 0; i < content.length; i += chunkSize) {
                    const chunk = content.slice(i, i + chunkSize);
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`
                    ));
                    if ((i / chunkSize) % 5 === 0) {
                      await new Promise(resolve => setTimeout(resolve, 10));
                    }
                  }
                }
              }
            }
          }
          }  // End for await loop
        } catch (streamLoopError: any) {
          hasError = true;
          console.error(`❌ Error in stream event loop:`, streamLoopError);
          console.error(`   Error name: ${streamLoopError.name}`);
          console.error(`   Error message: ${streamLoopError.message}`);
          console.error(`   Stack: ${streamLoopError.stack?.substring(0, 500)}`);
          
          // Send error to client
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ 
              type: 'error', 
              error: `Stream processing error: ${streamLoopError.message}`,
              details: hasStreamedContent ? 'Partial content was sent' : 'No content was sent'
            })}\n\n`
          ));
        }
        
        // Done
        console.log(`📡 SSE Stream: Sending [DONE] and closing`);
        console.log(`📡 SSE Stream: Total events emitted: ${eventCount}`);
        console.log(`📡 SSE Stream: Had streamed content: ${hasStreamedContent}`);
        console.log(`📡 SSE Stream: Had errors: ${hasError}`);
        
        // Safety check: If no content was sent and no error was sent, send a fallback
        if (!hasStreamedContent && !hasError) {
          console.warn(`⚠️ WARNING: Stream ended without any content or errors!`);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ 
              type: 'content', 
              content: 'I apologize, but I encountered an issue generating a response. Please try again.'
            })}\n\n`
          ));
        }
        
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        
        console.log(`✅ LangGraph stream complete (${eventCount} events)\n`);
        
      } catch (error: any) {
        console.error(`❌ LangGraph error:`, error);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
        ));
        controller.close();
      }
    }
  });
}

export { agent, workflow };

