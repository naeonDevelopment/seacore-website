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
 */
function extractMaritimeEntities(text: string): string[] {
  const entities: string[] = [];
  
  // Company patterns
  const companyMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Marine|Shipping|Lines|Group|Services))\b/g);
  if (companyMatch) entities.push(...companyMatch);
  
  // Vessel patterns (MV, MS, MT prefixes or quoted names)
  const vesselMatch = text.match(/\b(?:MV|MS|MT|vessel|ship)\s+([A-Z][a-zA-Z0-9\s-]+)/gi);
  if (vesselMatch) entities.push(...vesselMatch);
  
  // Equipment models (alphanumeric patterns)
  const equipmentMatch = text.match(/\b([A-Z][a-z]+\s+\d+[A-Z0-9-]+)\b/g);
  if (equipmentMatch) entities.push(...equipmentMatch);
  
  return [...new Set(entities)];
}

/**
 * Check if query is a follow-up question
 */
function isFollowUpQuery(query: string, previousMessages: BaseMessage[]): boolean {
  const hasReferentialPronouns = /\b(them|those|that|it|its|each one|the above|mentioned|listed|same|their|this|these)\b/i.test(query);
  const hasFollowUpPhrases = /\b(give me|tell me|what about|how about|also|additionally|furthermore|more about|details of|specs of|tech details)\b/i.test(query);
  
  // Check if previous messages contain research context
  const hasPreviousResearch = previousMessages.some(msg => 
    msg.content && typeof msg.content === 'string' && msg.content.includes('RESEARCH CONTEXT')
  );
  
  return (hasReferentialPronouns || hasFollowUpPhrases) && hasPreviousResearch;
}

/**
 * Detect if query needs VERIFICATION (fast fact-check) vs RESEARCH (deep intelligence)
 */
function detectQueryMode(query: string, enableBrowsing: boolean): 'verification' | 'research' | 'none' {
  const queryLower = query.toLowerCase();
  
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
  
  // RESEARCH MODE: Deep maritime intelligence
  // Specific entities, technical specs, comparative analysis
  const researchIndicators = [
    'MV ', 'MS ', 'MT ', 'vessel ', 'ship ',
    'largest', 'biggest', 'best', 'compare',
    'specifications', 'technical details', 'datasheet',
    'propulsion system', 'engine specs', 'manufacturer',
    'fleet', 'shipyard', 'maritime company'
  ];
  
  const needsResearch = researchIndicators.some(keyword =>
    new RegExp(`\\b${keyword}`, 'i').test(queryLower)
  );
  
  // Decision logic:
  // 1. User enabled browsing → Research mode (even for simple queries)
  // 2. Verification keywords → Verification mode (fast, targeted)
  // 3. Research indicators → Auto-enable verification (regulatory accuracy)
  // 4. Nothing detected → Expert mode (no external queries)
  
  if (enableBrowsing && needsResearch) return 'research';
  if (needsVerification || needsResearch) return 'verification';
  
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
 * TOOL 1: Smart Verification - Fast fact-checking for regulations/compliance
 * Ultra-fast, authoritative sources only, minimal results
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
 * TOOL 2: Deep Research - Comprehensive maritime intelligence with multi-query orchestration
 * Features: Parallel searches, quality filtering, iterative refinement, raw content extraction
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
const tools = [smartVerificationTool, deepResearchTool, maritimeKnowledgeTool];
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
  
  // Extract entities
  const entities = extractMaritimeEntities(userQuery);
  
  // Check if follow-up
  const isFollowUp = isFollowUpQuery(userQuery, state.messages);
  
  // Detect query mode: verification, research, or none
  const queryMode = detectQueryMode(userQuery, state.enableBrowsing);
  
  console.log(`   Entities: ${entities.length ? entities.join(', ') : 'none'}`);
  console.log(`   Follow-up: ${isFollowUp}`);
  console.log(`   User enabled browsing: ${state.enableBrowsing}`);
  console.log(`   Detected mode: ${queryMode}`);
  
  // If follow-up with existing research context, skip research
  if (isFollowUp && state.researchContext) {
    console.log(`✅ Using existing research context for follow-up`);
    return {
      maritimeEntities: entities,
      researchMode: state.researchMode, // Keep existing mode
    };
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
  
  // Prepare AI planner for tool selection
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.1,
    apiKey: (config?.configurable as any)?.env?.OPENAI_API_KEY,
  }).bindTools(tools);
  
  // Mode-specific planning prompts
  const planningPrompts = {
    verification: `You are a fact-checking assistant for maritime regulations and compliance.

User Query: "${userQuery}"

Your task: Use the smart_verification tool to quickly verify regulatory facts.
- This query needs AUTHORITATIVE sources (IMO, classification societies, gov sites)
- Call smart_verification with a concise, focused query
- DO NOT use deep_research for simple compliance questions

Call smart_verification now.`,
    
    research: `You are a maritime intelligence researcher.

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

Call deep_research now with appropriate parameters.`
  };
  
  const planningPrompt = planningPrompts[queryMode];
  
  console.log(`📋 Invoking ${queryMode} mode planner...`);
  
  const response = await model.invoke([
    new SystemMessage(planningPrompt),
    new HumanMessage(userQuery)
  ], config);
  
  console.log(`📋 Planner decided: ${response.tool_calls?.length || 0} tool calls`);
  
  return {
    messages: [response],
    maritimeEntities: entities,
    researchMode: queryMode,
  };
}

/**
 * Process Tool Results - Extract and format research findings
 * Handles both verification (minimal sources) and research (comprehensive) modes
 */
async function processToolResults(state: AgentState): Promise<Partial<AgentState>> {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // Find tool messages
  const toolMessages = state.messages
    .filter(msg => (msg as any).tool_calls || msg.constructor.name === 'ToolMessage')
    .slice(-5); // Last 5 tool interactions
  
  if (toolMessages.length === 0) {
    return {};
  }
  
  console.log(`🔧 Processing ${toolMessages.length} tool results (mode: ${state.researchMode})`);
  
  // Extract sources from tool results
  let allSources: Source[] = [];
  let allRejected: Source[] = [];
  let confidenceScore = 0;
  let tavilyAnswer: string | null = null;
  
  for (const msg of toolMessages) {
    const content = msg.content;
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (parsed.sources) {
          allSources.push(...parsed.sources);
          confidenceScore = Math.max(confidenceScore, parsed.confidence || 0);
        }
        if (parsed.rejected_sources) {
          allRejected.push(...parsed.rejected_sources);
        }
        // VERIFICATION MODE: Capture Tavily's AI answer
        if (parsed.tavily_answer) {
          tavilyAnswer = parsed.tavily_answer;
          console.log(`   📝 Tavily AI Answer available: ${tavilyAnswer?.substring(0, 100)}...`);
        }
      } catch (e) {
        // Not JSON, might be knowledge base result
        console.log('   Non-JSON tool result (likely knowledge base)');
      }
    }
  }
  
  // Build research context based on mode
  let researchContext = '';
  
  if (state.researchMode === 'verification' && allSources.length > 0) {
    // VERIFICATION MODE: Compact context with Tavily answer
    researchContext = `=== VERIFICATION SOURCES ===

${tavilyAnswer ? `Tavily AI Summary: ${tavilyAnswer}\n\n` : ''}Authoritative sources (${allSources.length}):

${allSources.map((s, i) => `[${i + 1}] ${s.title} (${new URL(s.url).hostname})
   ${s.content.substring(0, 200)}...`).join('\n\n')}

=== END VERIFICATION ===`;
  } else if (state.researchMode === 'research' && allSources.length > 0) {
    // RESEARCH MODE: Comprehensive context with full details
    researchContext = `=== RESEARCH INTELLIGENCE ===

Found ${allSources.length} verified sources (rejected ${allRejected.length} low-quality):

${allSources.map((s, i) => `[${i + 1}] ${s.title}
   URL: ${s.url}
   Score: ${s.score?.toFixed(2) || 'N/A'}
   Content: ${s.content.substring(0, 500)}...
`).join('\n')}

=== END RESEARCH ===`;
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
  
  const stream = await model.stream(synthesisMessages, config);
  
  for await (const chunk of stream) {
    fullContent += chunk.content;
  }
  
  console.log(`✅ Synthesized ${fullContent.length} characters`);
  
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
  console.log(`   Research context: ${state.researchContext ? 'YES' : 'NO'}`);
  console.log(`   Confidence: ${state.confidence}`);
  console.log(`   Verified sources: ${state.verifiedSources.length}`);
  console.log(`   Needs refinement: ${state.needsRefinement}`);
  
  // If last message has tool calls, execute them
  if ((lastMessage as AIMessage).tool_calls?.length) {
    console.log(`→ Routing to: tools`);
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
  };
}

/**
 * Handle chat request with LangGraph agent
 * Returns SSE stream for real-time updates
 */
export async function handleChatWithLangGraph(request: ChatRequest): Promise<ReadableStream> {
  const { messages, sessionId, enableBrowsing, env } = request;
  
  console.log(`\n🚀 LangGraph Agent Request | Session: ${sessionId} | Browsing: ${enableBrowsing}`);
  
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
    }
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
        
        // Remove test content now that streaming is confirmed working
        // console.log(`📡 SSE Stream: Sending test content`);
        // controller.enqueue(encoder.encode(
        //   `data: ${JSON.stringify({ type: 'content', content: 'TEST: Stream active. Processing query...\n\n' })}\n\n`
        // ));
        
        // Send thinking based on expected mode
        // Expert mode: No thinking (instant)
        // Verification mode: Brief thinking (fast verification)
        // Research mode: Full thinking (comprehensive search)
        
        // We don't know the mode yet, so we'll send thinking in the router event instead
        // This keeps the stream clean for expert mode
        
        console.log(`📡 SSE Stream: Starting agent.stream()`);
        
        // Stream events from agent
        // Use "messages" mode to get token-by-token streaming
        const stream = await agent.stream(
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
        
        let sourcesEmitted = false;
        let eventCount = 0;
        
        console.log(`📡 SSE Stream: Entering event loop`);
        
        let hasStreamedContent = false;
        
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
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'thinking', content: '⚡ Verifying with authoritative sources...' })}\n\n`
              ));
            } else if (mode === 'research') {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'thinking', content: '🔬 Analyzing query and searching maritime intelligence...' })}\n\n`
              ));
            }
            // Expert mode (none): No thinking bubble
          }
          
          if (event.tools) {
            // Tools are executing - show progress
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'thinking', content: 'Gathering maritime data...' })}\n\n`
            ));
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
            } else {
              // RESEARCH MODE: Full research panel with source selection
              console.log(`   🔬 Research mode: Emitting sources to research panel`);
              
              // Emit verified sources with action='select'
              for (const source of sources) {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: 'source',
                    action: 'select',
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
                      action: 'reject',
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
        }
        
        // Done
        console.log(`📡 SSE Stream: Sending [DONE] and closing`);
        console.log(`📡 SSE Stream: Total events emitted: ${eventCount}`);
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

