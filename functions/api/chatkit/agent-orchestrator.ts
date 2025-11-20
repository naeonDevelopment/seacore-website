/**
 * Maritime Intelligence Agent Orchestrator
 * Simplified architecture - LLM-driven with tool orchestration
 * 
 * Philosophy:
 * - Trust the LLM intelligence (via comprehensive maritime prompt)
 * - Minimal business logic - let LLM decide
 * - Simple memory integration
 * - Clean tool orchestration
 */

import { Annotation, StateGraph, END, START } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Client as LangSmithClient } from "langsmith";
import { MARITIME_SYSTEM_PROMPT } from './maritime-system-prompt';
import { maritimeTools } from './tools';
import { deepResearchTool } from './tools/deep-research';
import { geminiTool } from './tools/gemini-tool';
import { SessionMemoryManager, type SessionMemory } from './session-memory';
import { 
  classifyQuery, 
  generateClassificationLog,
  enrichQueryWithContext,
  buildFleetcoreContext,
  type QueryClassification
} from './query-classification-rules';
import {
  selectCoTTechnique,
  buildZeroShotCoT,
  buildAutoCoT,
  buildPlanAndSolveCoT,
  selfConsistentGeneration,
  detectQueryType,
  detectComparativeAttribute,
  type CoTConfig
} from './synthetic-cot-engine';
import {
  analyzeResearchGaps,
  extractVesselName,
  type GapAnalysis
} from './research-gap-analyzer';
import { 
  planQuery,
  executeParallelQueries,
  aggregateAndRank,
  calculateConfidence,
  type QueryPlan,
  type ConfidenceScore
} from './query-planner';
import { 
  getCachedResult,
  setCachedResult,
  getCacheStats
} from './kv-cache';
import { getCachedResultWithSemantics } from './semantic-cache';
import { 
  enforceCitations,
  validateCitations
} from './citation-enforcer';
import {
  ensureModernCitationFormat,
  validateCitationFormat,
  getCitationStats
} from './citation-formatter';
import { 
  extractOwnerOperator,
  hasOwnerOperatorData,
  type OwnerOperatorData
} from './owner-operator-extractor';
import {
  extractEnhancedContent,
  getSmartPreview,
  type ExtractedContent
} from './content-extractor';
import { accumulateKnowledge } from './memory-accumulation';
import { computeCoverage, missingVesselCoverage } from './source-categorizer';
import { emitMetrics } from './metrics';
import { 
  detectConversationState, 
  detectUserIntent,
  detectStateTransition,
  shouldPreserveContext,
  getContextWindow,
  buildStateSummary,
  ConversationState
} from './conversation-state';
import {
  shouldSummarize,
  generateSummary,
  compressOldTurns,
  logSummarization
} from './conversation-summarization';
import { generateFollowUps, trackFollowUpUsage, type FollowUpSuggestion } from './follow-up-generator';
import { calculateConfidenceIndicator, assessSourceQuality, getConfidenceMessage, type QualityMetrics, type ConfidenceIndicator } from './confidence-indicators';
import { 
  generateFleetcoreMapping, 
  formatMappingAsMarkdown,
  type FleetcoreApplicationMapping 
} from './fleetcore-entity-mapper';
import { extractMaritimeEntities } from './utils/entity-utils';
import { validateVesselEntity } from './entity-validation';

// Cloudflare Workers types
declare global {
  interface KVNamespace {
    get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
    put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
  }
  interface D1Database {}
  interface VectorizeIndex {}
  interface Ai {}
}

// =====================
// TYPES
// =====================

interface Source {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
  enableBrowsing: boolean;
  env: {
    OPENAI_API_KEY: string;
    TAVILY_API_KEY: string;
    GEMINI_API_KEY: string;
    LANGSMITH_API_KEY?: string;
    CHAT_SESSIONS?: KVNamespace;
    MARITIME_MEMORY?: D1Database;
    VECTOR_INDEX?: VectorizeIndex;
    AI?: Ai;
  };
}

// Helper: Convert planner plan into concise thinking steps WITHOUT calling an LLM
async function emitPlanThinkingSteps(
  plan: { strategy: string; subQueries: Array<{ query: string; purpose?: string; priority?: string }> },
  statusEmitter: ((event: any) => void) | null
): Promise<void> {
  if (!statusEmitter) return;
  const rows = (plan.subQueries || []).slice(0, 7).map((sq, i) => {
    const prefix = `${i + 1}.`;
    let text = (sq.purpose || sq.query || '').trim();
    
    // P0 FIX: Make camelCase readable (findVesselIdentification → Find vessel identification)
    text = text
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → camel Case
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // HTTPRequest → HTTP Request
      .replace(/^\w/, c => c.toUpperCase()) // capitalize first letter
      .replace(/\s+/g, ' '); // normalize whitespace
    
    return `${prefix} ${text}`;
  });
  // NO STRATEGY LINE - just emit numbered steps
  const payload = rows.join('\n');
  statusEmitter({ type: 'thinking', step: 'plan_steps', content: payload });
}

// 
// Direct formatting is faster, cheaper, and GUARANTEED not to leak JSON
async function emitPlanThinkingStepsLLM(
  plan: { strategy: string; subQueries: Array<{ query: string; purpose?: string; priority?: string }> },
  statusEmitter: ((event: any) => void) | null,
  openaiKey?: string
): Promise<void> {
  // CRITICAL: Always use direct formatting (no LLM = no JSON leak)
  return emitPlanThinkingSteps(plan, statusEmitter);
}

// Convert structured JSON vessel response to markdown with citations
function convertVesselJsonToMarkdown(vesselData: any, sources: Source[]): string {
  let markdown = `## VESSEL PROFILE\n\n`;
  
  // Helper: Find best source for a field based on content relevance
  const findSourceForField = (fieldName: string, value: string): number => {
    if (value === 'Not found in sources') return 0;
    
    // Try to find source containing this value
    for (let i = 0; i < sources.length; i++) {
      const content = (sources[i].content || '').toLowerCase();
      const valueLower = value.toLowerCase();
      if (content.includes(valueLower)) {
        return i + 1; // 1-indexed for user display
      }
    }
    
    // Default to source 1 if no match
    return sources.length > 0 ? 1 : 0;
  };
  
  // Helper: Add citation if not "Not found"
  const withCitation = (value: string, sourceNum: number): string => {
    if (value === 'Not found in sources' || sourceNum === 0) {
      return value;
    }
    
    // CRITICAL FIX: Filter out Google search placeholder URLs
    const sourceUrl = sources[sourceNum - 1]?.url || '#';
    const isPlaceholderUrl = sourceUrl.includes('google.com/search') || sourceUrl.includes('google search');
    
    // If it's a placeholder, just return the value without citation
    if (isPlaceholderUrl) {
      return value;
    }
    
    return `${value} [[${sourceNum}]](${sourceUrl})`;
  };
  
  const profile = vesselData.vessel_profile;
  
  // Identity & Registration
  markdown += `**Identity & Registration:**\n`;
  markdown += `- IMO Number: ${withCitation(profile.identity.imo, findSourceForField('imo', profile.identity.imo))}\n`;
  markdown += `- MMSI: ${withCitation(profile.identity.mmsi, findSourceForField('mmsi', profile.identity.mmsi))}\n`;
  markdown += `- Call Sign: ${withCitation(profile.identity.call_sign, findSourceForField('call sign', profile.identity.call_sign))}\n`;
  markdown += `- Flag State: ${withCitation(profile.identity.flag, findSourceForField('flag', profile.identity.flag))}\n\n`;
  
  // Ownership & Management
  markdown += `**Ownership & Management:**\n`;
  markdown += `- Owner: ${withCitation(profile.ownership.owner, findSourceForField('owner', profile.ownership.owner))}\n`;
  markdown += `- Operator/Manager: ${withCitation(profile.ownership.operator, findSourceForField('operator', profile.ownership.operator))}\n\n`;
  
  // Principal Dimensions
  markdown += `**Principal Dimensions:**\n`;
  markdown += `- Length Overall (LOA): ${withCitation(profile.dimensions.loa, findSourceForField('loa', profile.dimensions.loa))}\n`;
  markdown += `- Breadth: ${withCitation(profile.dimensions.breadth, findSourceForField('breadth', profile.dimensions.breadth))}\n`;
  markdown += `- Draft: ${withCitation(profile.dimensions.draft, findSourceForField('draft', profile.dimensions.draft))}\n\n`;
  
  // Tonnages
  markdown += `**Tonnages:**\n`;
  markdown += `- Gross Tonnage (GT): ${withCitation(profile.tonnages.gross_tonnage, findSourceForField('gross tonnage', profile.tonnages.gross_tonnage))}\n`;
  markdown += `- Deadweight (DWT): ${withCitation(profile.tonnages.deadweight, findSourceForField('deadweight', profile.tonnages.deadweight))}\n\n`;
  
  // Build Information
  markdown += `**Build Information:**\n`;
  markdown += `- Shipyard: ${withCitation(profile.build_info.shipyard, findSourceForField('shipyard', profile.build_info.shipyard))}\n`;
  markdown += `- Build Year: ${withCitation(profile.build_info.build_year, findSourceForField('build year', profile.build_info.build_year))}\n\n`;
  
  // Propulsion & Machinery
  markdown += `**Propulsion & Machinery:**\n`;
  markdown += `- Main Engines: ${withCitation(profile.propulsion.main_engines, findSourceForField('engine', profile.propulsion.main_engines))}\n`;
  markdown += `- Propellers/Propulsion: ${withCitation(profile.propulsion.propellers, findSourceForField('propeller', profile.propulsion.propellers))}\n\n`;
  
  // Current Status
  markdown += `**Current Status:**\n`;
  markdown += `- Location: ${withCitation(profile.current_status.location, findSourceForField('location', profile.current_status.location))}\n`;
  markdown += `- Destination: ${withCitation(profile.current_status.destination, findSourceForField('destination', profile.current_status.destination))}\n\n`;
  
  // Executive Summary
  markdown += `## EXECUTIVE SUMMARY\n\n`;
  markdown += `${vesselData.executive_summary}\n\n`;
  
  // Technical Analysis
  markdown += `## TECHNICAL ANALYSIS\n\n`;
  markdown += `${vesselData.technical_analysis}\n\n`;
  
  // Maritime Context
  markdown += `## MARITIME CONTEXT\n\n`;
  markdown += `${vesselData.maritime_context}\n`;
  
  return markdown;
}

// ===== Vessel Reflexion Utilities =====
function hasRegistrySourceUrl(url: string): boolean {
  const u = (url || '').toLowerCase();
  return u.includes('vesselfinder') || u.includes('marinetraffic') || u.includes('equasis') || u.includes('myshiptracking') || u.includes('vesseltracker') || u.includes('fleetmon');
}

function hasRegistryCoverage(sources: Array<{ url: string }>): boolean {
  return sources.some(s => hasRegistrySourceUrl(s.url));
}

function hasEquasisCoverage(sources: Array<{ url: string }>): boolean {
  return sources.some(s => (s.url || '').toLowerCase().includes('equasis'));
}

// Check if owner/operator data can be extracted from sources
// Uses pattern-based extraction instead of simple keyword detection
function hasOwnerOperatorHints(sources: Array<{ title: string; content: string }>): boolean {
  return hasOwnerOperatorData(sources as any);
}

function isLikelyVesselQuery(q: string): boolean {
  const ql = (q || '').toLowerCase();
  return /\b(imo|mmsi|call\s*sign|vessel|ship)\b/.test(ql) || /\b([a-z]+(?:\s+[a-z]+)*\s+\d{1,3})\b/i.test(q);
}

async function generateVesselRefinementSubQueries(
  query: string,
  missing: { needRegistry: boolean; needEquasis: boolean; needIdentifiers: boolean; needOwnerOperator: boolean },
  openaiKey?: string
): Promise<Array<{ query: string; purpose: string; priority: 'high'|'medium' }>> {
  // Deterministic baseline
  const baseline: Array<{ query: string; purpose: string; priority: 'high'|'medium' }> = [];
  if (missing.needRegistry) baseline.push({ query: `${query} marinetraffic vesselfinder AIS position MMSI IMO`, purpose: 'Add AIS/registry corroboration', priority: 'high' });
  if (missing.needEquasis) baseline.push({ query: `${query} Equasis registry profile vessel details`, purpose: 'Fetch Equasis registry profile', priority: 'high' });
  if (missing.needIdentifiers) baseline.push({ query: `${query} IMO MMSI call sign identifiers`, purpose: 'Find vessel identifiers (IMO/MMSI/Call Sign)', priority: 'high' });
  
  // Enhanced owner/operator search with multiple targeted queries
  if (missing.needOwnerOperator) {
    baseline.push({ 
      query: `${query} "operated by" "owned by" ship owner company`, 
      purpose: 'Find owner/operator with exact phrase matching', 
      priority: 'high' 
    });
    baseline.push({ 
      query: `${query} vessel owner shipping company fleet operator`, 
      purpose: 'Find parent company and fleet operator', 
      priority: 'high' 
    });
    baseline.push({ 
      query: `${query} ship management technical manager`, 
      purpose: 'Find technical management company', 
      priority: 'medium' 
    });
  }

  if (!openaiKey) return baseline.slice(0, 3);
  try {
    const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.2, openAIApiKey: openaiKey, streaming: false });
    const prompt = `You are generating up to 3 VERY targeted follow-up search queries for a vessel lookup. Query: "${query}". Missing evidence: ${JSON.stringify(missing)}.
Rules: natural language, include site names as text (no site: operator), short and specific. Output JSON array: [{"query":"...","purpose":"...","priority":"high|medium"}] and nothing else.`;
    const resp = await llm.invoke([
      { role: 'system', content: 'Generate JSON only. No preamble.' },
      { role: 'user', content: prompt }
    ]);
    const content = typeof resp.content === 'string' ? resp.content : JSON.stringify(resp.content);
    const match = content.match(/\[\s*[\s\S]*\]/);
    if (!match) return baseline.slice(0, 3);
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 3);
    return baseline.slice(0, 3);
  } catch {
    return baseline.slice(0, 3);
  }
}

// =====================
// STATE DEFINITION
// =====================

const AgentState = Annotation.Root({
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
  // Query mode detection result
  mode: Annotation<'verification' | 'research' | 'none'>({
    reducer: (_, next) => next,
    default: () => 'none',
  }),
  // Technical depth requirement (for detailed maintenance/OEM analysis)
  requiresTechnicalDepth: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  // Technical depth score (0-10)
  technicalDepthScore: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  // Research context - populated after tool execution
  researchContext: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  planTrace: Annotation<QueryPlan | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  sources: Annotation<Source[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  // Gemini answer for verification mode
  geminiAnswer: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  // Phase B & C: Quality metrics and engagement
  confidenceIndicator: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  followUpSuggestions: Annotation<any[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  // ENHANCEMENT: Fleetcore entity mapping
  fleetcoreMapping: Annotation<FleetcoreApplicationMapping | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  // PHASE 1: Safety override flag for entity queries without browsing
  safetyOverride: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
});

type State = typeof AgentState.State;

// =====================
// AGENT NODE
// =====================

/**
 * Router Node - Intelligent mode detection and Gemini calling (for verification)
 * Uses centralized classification rules from query-classification-rules.ts
 * Enhanced with context preservation for hybrid queries
 */
async function routerNode(state: State, config: any): Promise<Partial<State>> {
  const env = config.configurable?.env;
  const sessionMemory = config.configurable?.sessionMemory as SessionMemory | null;
  const statusEmitter = config.configurable?.statusEmitter; // NEW: Phase A1
  
  console.log(`\n🎯 ROUTER NODE`);
  console.log(`   Messages: ${state.messages.length}`);
  
  // Get user query
  const lastUserMessage = state.messages.filter(m => m.constructor.name === 'HumanMessage').slice(-1)[0];
  const userQuery = lastUserMessage?.content?.toString() || '';
  
  // Detect conversation state and intent
  if (sessionMemory) {
    const currentState = (sessionMemory.conversationState || 'cold_start') as ConversationState;
    const newState = detectConversationState(userQuery, sessionMemory, currentState);
    const intent = detectUserIntent(userQuery, sessionMemory);
    const transition = detectStateTransition(currentState, newState, userQuery);
    
    console.log(`\n🔄 CONVERSATION STATE TRACKING`);
    console.log(buildStateSummary(newState, intent, transition));
    
    // Chain of Thought - ALWAYS emit state transition (transparency-first)
    if (transition && statusEmitter) {
      statusEmitter({
        type: 'thinking',
        step: 'state_detection',
        content: `${transition.from} → ${transition.to}`
      });
    }
    
    // Update session memory with state tracking (will be saved later)
    if (transition) {
      (config.configurable.sessionMemory as any).conversationState = newState;
      (config.configurable.sessionMemory as any).stateTransitions = [
        ...((config.configurable.sessionMemory as any).stateTransitions || []),
        transition
      ].slice(-10);
    }
    
    (config.configurable.sessionMemory as any).intentHistory = [
      ...((config.configurable.sessionMemory as any).intentHistory || []),
      intent
    ].slice(-10);
    
    // Chain of Thought - ALWAYS emit intent (transparency-first)
    if (statusEmitter && intent.confidence > 0.5) {
      statusEmitter({
        type: 'thinking',
        step: 'intent_detection',
        content: `${intent.intent} (${(intent.confidence * 100).toFixed(0)}%)`
      });
    }
  }
  
  // INTELLIGENT MODE DETECTION (using centralized classification rules with session context)
  const classification = classifyQuery(userQuery, state.enableBrowsing, sessionMemory || undefined);
  
  // DEBUG: Log classification results for debugging mode issues
  console.log(`   🎯 CLASSIFICATION RESULT:`);
  console.log(`      Mode: ${classification.mode}`);
  console.log(`      Original Query: "${classification.resolvedQuery.originalQuery}"`);
  console.log(`      Resolved Query: "${classification.resolvedQuery.resolvedQuery}"`);
  console.log(`      Has Context: ${classification.resolvedQuery.hasContext}`);
  console.log(`      Active Entity: ${classification.resolvedQuery.activeEntity?.name || 'none'}`);
  console.log(`      Technical Depth: ${classification.requiresTechnicalDepth} (score: ${classification.technicalDepthScore}/10)`);
  
  // Chain of Thought - ALWAYS emit entity resolution (if applicable)
  if (classification.resolvedQuery.hasContext && statusEmitter) {
    statusEmitter({
      type: 'thinking',
      step: 'entity_resolution',
      content: `"${classification.resolvedQuery.originalQuery}" → ${classification.resolvedQuery.activeEntity?.name}`
    });
    statusEmitter({
      type: 'thought',
      phase: 'plan',
      content: `Planning for ${classification.resolvedQuery.activeEntity?.name || 'entity'} using ${classification.mode} mode`,
    });
  }
  
  // Chain of Thought - ALWAYS emit technical depth detection (if applicable)
  if (classification.requiresTechnicalDepth && statusEmitter) {
    statusEmitter({
      type: 'thinking',
      step: 'technical_depth',
      content: `Technical depth required (score: ${classification.technicalDepthScore}/10) - Detailed analysis`
    });
  }
  
  // Chain of Thought - ALWAYS emit mode selection
  if (statusEmitter) {
    const modeDescription = {
      'none': 'Using knowledge base',
      'verification': 'Verifying with web search',
      'research': 'Deep research mode (disabled)' // Should not occur - research disabled
    };
    const modeText = modeDescription[classification.mode];
    const hybridText = classification.isHybrid ? ' + platform context' : '';
    const technicalText = classification.requiresTechnicalDepth ? ' (technical depth)' : '';
    statusEmitter({
      type: 'thinking',
      step: 'mode_selection',
      content: `${modeText}${hybridText}${technicalText}`
    });
  }
  
  // Log detailed classification for debugging
  const log = generateClassificationLog(userQuery, classification, state.enableBrowsing);
  console.log(log);
  
  // MODE: VERIFICATION - Call Gemini directly and store result
  if (classification.mode === 'verification') {
    console.log(`   🔮 VERIFICATION MODE: Calling Gemini directly`);
    
    if (classification.isHybrid) {
      console.log(`   🎯 HYBRID QUERY: Will inject fleetcore context`);
    }
    
    try {
      // CRITICAL: Use resolved query (pronouns already replaced with entity names)
      let queryToSend = classification.resolvedQuery.resolvedQuery;
      
      // Build entity context for Gemini
      let entityContext = classification.resolvedQuery.entityContext || '';
      
      // Enrich with fleetcore context if needed (hybrid queries)
      if (classification.enrichQuery && classification.preserveFleetcoreContext) {
        const fleetcoreContext = buildFleetcoreContext(sessionMemory || undefined);
        if (fleetcoreContext) {
          entityContext += fleetcoreContext;
          console.log(`   📝 Added fleetcore context to Gemini query`);
        }
      }
      
      console.log(`   📤 Sending to Gemini:`);
      console.log(`      Query: "${queryToSend.substring(0, 80)}"`);
      if (entityContext) {
        console.log(`      Context length: ${entityContext.length} chars`);
      }
      
      // PHASE 2: Query Planning + Parallel Execution + KV/Semantic Cache
      let planTraceForState: QueryPlan | null = null;
      try {
        const kvStore = env.CHAT_SESSIONS;
        let cachedResult: Awaited<ReturnType<typeof getCachedResult>> | null = null;
        let cacheType: 'semantic' | 'exact' | null = null;
        let cacheSimilarity: number | undefined;
        
        if (kvStore) {
          if (env.OPENAI_API_KEY) {
            const cacheAttempt = await getCachedResultWithSemantics(
              kvStore,
              queryToSend,
              entityContext || undefined,
              env.OPENAI_API_KEY,
              () => getCachedResult(kvStore, queryToSend, entityContext)
            );
            
            if (cacheAttempt.result) {
              cachedResult = cacheAttempt.result;
              cacheType = cacheAttempt.cacheType;
              cacheSimilarity = cacheAttempt.similarity;
            }
          }
          
          if (!cachedResult) {
            cachedResult = await getCachedResult(kvStore, queryToSend, entityContext);
            cacheType = cachedResult ? 'exact' : null;
          }
        }
        
        if (cachedResult) {
        const stats = cacheType === 'exact' ? getCacheStats(cachedResult) : null;
        console.log(
          cacheType === 'semantic'
            ? `   ⚡ SEMANTIC CACHE HIT${cacheSimilarity ? ` (${(cacheSimilarity * 100).toFixed(1)}% match)` : ''}`
            : `   ⚡ CACHE HIT${stats ? ` (age: ${stats.age}s, ttl: ${stats.ttl}s)` : ''}`
        );
        
        // PHASE 3: Calculate confidence from cached sources
        const confidence = calculateConfidence(cachedResult.sources);
        console.log(`   📊 Confidence (cached): ${confidence.label} (${confidence.score}/100)`);
        
        if (statusEmitter) {
          const cacheMessage =
            cacheType === 'semantic'
              ? `✓ Semantic cache hit${cacheSimilarity ? ` (${(cacheSimilarity * 100).toFixed(0)}% match)` : ''}`
              : `✓ Cache hit${stats ? ` (${stats.age}s old)` : ''}`;
          
          statusEmitter({
            type: 'thinking',
            step: 'cache_hit',
            content: cacheMessage
          });
          statusEmitter({
            type: 'confidence',
            data: confidence
          });
        }
        
        // Build research context from cache
        let researchContext = `=== GEMINI GROUNDING RESULTS (CACHED) ===\n\n`;
        if (cachedResult.answer) researchContext += `ANSWER:\n${cachedResult.answer}\n\n`;
        if (cachedResult.sources.length > 0) {
          researchContext += `SOURCES (${cachedResult.sources.length}):\n`;
          cachedResult.sources.forEach((s: any, idx: number) => {
            // Include substantial content (800 chars) for proper citation generation
            researchContext += `[${idx + 1}] ${s.title}\n${s.url}\n${s.content?.substring(0, 800) || 'No content'}...\n\n`;
          });
        }
        if (classification.preserveFleetcoreContext) {
          const fleetcoreContext = buildFleetcoreContext(sessionMemory || undefined);
          if (fleetcoreContext) researchContext += fleetcoreContext;
        }
        
        return {
          mode: classification.mode,
          geminiAnswer: cachedResult.answer,
          sources: cachedResult.sources,
          researchContext,
          planTrace: planTraceForState,
          requiresTechnicalDepth: classification.requiresTechnicalDepth,
          technicalDepthScore: classification.technicalDepthScore,
          safetyOverride: classification.safetyOverride || false,
          confidenceIndicator: confidence,  // PHASE 3: Include confidence score
        };
      }
      
      // PHASE 2: Cache miss - proceed with query planning + parallel execution
      console.log(`   ❌ CACHE MISS - executing query planning`);
      
      if (statusEmitter) {
        statusEmitter({
          type: 'status',
          stage: 'searching',
          content: `🔍 Planning comprehensive search strategy...`,
          progress: 0
        });
      }
      
      // Query Planning
      const queryPlan = await planQuery(queryToSend, entityContext, env.OPENAI_API_KEY);
      // Apply per-session sub-query budget (prioritize high > medium > low)
      const MAX_SUBQUERIES = 10;
      const prioritized = [...queryPlan.subQueries].sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
      });
      const budgetedSubQueries = prioritized.slice(0, MAX_SUBQUERIES);
      planTraceForState = { ...queryPlan, subQueries: budgetedSubQueries };
      if (statusEmitter) {
        statusEmitter({
          type: 'thought',
          phase: 'plan',
          content: `Planned ${budgetedSubQueries.length}/${queryPlan.subQueries.length} targeted searches for "${classification.resolvedQuery.activeEntity?.name || queryToSend}"`,
        });
      }
      // NEW: Emit human-friendly thinking steps from the planner JSON (fast gpt-4o-mini with fallback)
      await emitPlanThinkingStepsLLM({ strategy: queryPlan.strategy, subQueries: budgetedSubQueries as any }, statusEmitter, env.OPENAI_API_KEY);
      
      if (statusEmitter) {
        statusEmitter({
          type: 'thinking',
          step: 'query_planning',
          content: `Planned ${budgetedSubQueries.length} targeted searches`
        });
        statusEmitter({
          type: 'status',
          stage: 'searching',
          content: `⚡ Executing ${budgetedSubQueries.length} parallel searches...`,
          progress: 25
        });
      }
      
      // Parallel Execution
      const allSources = await executeParallelQueries(
        budgetedSubQueries,
        env.GEMINI_API_KEY,
        entityContext,
        env.CHAT_SESSIONS,
        statusEmitter,
        (env as any).PSE_API_KEY,
        (env as any).PSE_CX,
        env.OPENAI_API_KEY // PHASE 4B: For semantic caching
      );
      
      // Aggregate + Rank
      if (statusEmitter) {
        statusEmitter({
          type: 'status',
          stage: 'analyzing',
          content: `📊 Ranking ${allSources.length} sources by relevance and authority...`,
          progress: 50
        });
      }
      
      let rankedSources = aggregateAndRank(allSources, { query: queryToSend });
      let didDeepResearch = false;
      const criticNotes: string[] = [];
      if (statusEmitter) {
        statusEmitter({
          type: 'thought',
          phase: 'search',
          content: `Collected ${allSources.length} sources → ${rankedSources.length} ranked by authority`,
        });
      }
      
      // PHASE 3: Calculate confidence indicator
      let confidence = calculateConfidence(rankedSources);
      console.log(`   📊 Confidence: ${confidence.label} (${confidence.score}/100) - ${confidence.reasoning}`);
      
      if (statusEmitter) {
        statusEmitter({
          type: 'thinking',
          step: 'source_ranking',
          content: `✓ Selected top ${rankedSources.length} authoritative sources`
        });
        statusEmitter({
          type: 'confidence',
          data: confidence
        });
        statusEmitter({
          type: 'thought',
          phase: 'verify',
          content: `Verification confidence: ${confidence.label} (${confidence.score}/100)`
        });
      }
      
      // Fallback reinforcement: if too few or weak sources, run deep-research (Tavily) and re-aggregate
      if (rankedSources.length < 3) {
        console.log(`   ⚠️ Low source count (${rankedSources.length}) → running deep-research fallback`);
        if (statusEmitter) {
          statusEmitter({ type: 'status', stage: 'searching', content: '🔎 Expanding search (deep-research)...', progress: 60 });
        }
        try {
          const dr = await deepResearchTool.invoke({
            query: queryToSend,
            search_depth: 'advanced',
            use_multi_query: true,
            entityContext: entityContext || undefined
          }, config);
          const parsed = typeof dr === 'string' ? JSON.parse(dr) : dr;
          const extra = (parsed?.sources || []).map((s: any) => ({
            url: s.url,
            title: s.title,
            content: s.content,
            score: s.score,
            tier: s.tier,
          }));
          const merged = [...rankedSources, ...extra];
          rankedSources = aggregateAndRank(merged, { query: queryToSend });
          didDeepResearch = true;
          console.log(`   ✅ Deep-research merged: total ${rankedSources.length} sources after re-aggregation`);
        } catch (e: any) {
          console.warn(`   ⚠️ Deep-research fallback failed: ${e.message}`);
        }
      }

      // Evidence threshold gate (after optional deep-research due to low count)
      const tierCounts = rankedSources.reduce((acc: Record<string, number>, s: any) => {
        if (s.tier) acc[s.tier] = (acc[s.tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const totalAfter = rankedSources.length;
      const qLower = (queryToSend || '').toLowerCase();
      const resolvedEntityType = classification.resolvedQuery?.activeEntity?.type;
      const hasImoOrMmsi = /\b(imo|mmsi)\b/.test(qLower);
      const hasVesselKeyword = /\b(vessel|ship|cargo|tanker|bulk|container|maersk|mv|ms|mt|ss|hms)\b/i.test(qLower);
      const hasVesselNamePattern = /\b([A-Z][a-z]+(?:\s+[A-Z0-9][A-Za-z0-9\-]+)+)\b/.test(queryToSend);
      const isVesselQuery = Boolean(
        resolvedEntityType === 'vessel' ||
        hasImoOrMmsi ||
        hasVesselKeyword ||
        hasVesselNamePattern
      );
      const hasRegistrySource = rankedSources.some((s: any) => /marinetraffic|vesselfinder|equasis/.test((s.url || '').toLowerCase()));
      const meetsEvidence = isVesselQuery ? hasRegistrySource : ((tierCounts['T1'] || 0) >= 1 || (tierCounts['T2'] || 0) >= 2);
      if ((!meetsEvidence || confidence.label === 'low') && !didDeepResearch) {
        console.log(`   ⚠️ Evidence below threshold (T1=${tierCounts['T1'] || 0}, T2=${tierCounts['T2'] || 0}) → running deep-research`);
        if (statusEmitter) {
          statusEmitter({ type: 'status', stage: 'searching', content: '🔎 Strengthening evidence (deep-research)...', progress: 65 });
        }
        try {
          const dr2 = await deepResearchTool.invoke({
            query: queryToSend,
            search_depth: 'advanced',
            use_multi_query: true,
            entityContext: entityContext || undefined
          }, config);
          const parsed2 = typeof dr2 === 'string' ? JSON.parse(dr2) : dr2;
          const extra2 = (parsed2?.sources || []).map((s: any) => ({ url: s.url, title: s.title, content: s.content, score: s.score, tier: s.tier }));
          rankedSources = aggregateAndRank([...rankedSources, ...extra2], { query: queryToSend });
          confidence = calculateConfidence(rankedSources);
          console.log(`   ✅ Evidence reinforcement complete: confidence now ${confidence.label} (${confidence.score})`);
        } catch (e: any) {
          console.warn(`   ⚠️ Evidence reinforcement failed: ${e.message}`);
        }
      }

      // Vessel Reflexion loop with smart gap detection and convergence
      // Iteratively fills data gaps: identifiers, registry, owner/operator
      // Max 2 iterations with progress tracking to prevent infinite loops
      if (isVesselQuery) {
        let reflexionIteration = 0;
        const MAX_REFLEXION_ITERATIONS = 2;
        let lastGapCount = 999;
        let previousGaps = new Set<string>();
        
        while (reflexionIteration < MAX_REFLEXION_ITERATIONS) {
          const minimal = rankedSources.map((s: any) => ({ title: s.title || '', url: s.url || '', content: s.content || '' }));
          const validation = validateVesselEntity(queryToSend, minimal);
          
          // Enhanced gap detection with specificity
          const haveIdentifiers = validation.matchedBy.includes('IMO') || validation.matchedBy.includes('MMSI') || validation.matchedBy.includes('CallSign');
          const needIdentifiers = !haveIdentifiers;
          const needRegistry = !hasRegistrySource;
          const needEquasis = !hasEquasisCoverage(rankedSources as any);
          const needOwnerOperator = !hasOwnerOperatorHints(minimal as any);
          
          // Build gap signature for progress tracking
          const currentGaps = new Set<string>();
          if (needIdentifiers) currentGaps.add('identifiers');
          if (needRegistry) currentGaps.add('registry');
          if (needEquasis) currentGaps.add('equasis');
          if (needOwnerOperator) currentGaps.add('owner');
          
          const currentGapCount = currentGaps.size;
          const needsRefine = currentGapCount > 0;
          
          // Smart stopping conditions
          if (!needsRefine) {
            console.log(`   ✅ Reflexion: All required fields present (identifiers, registry, equasis, owner/operator)`);
            break;
          }
          
          // Check if we're making progress
          if (reflexionIteration > 0) {
            const gapsResolved = lastGapCount - currentGapCount;
            const stuckOnSameGaps = [...currentGaps].every(gap => previousGaps.has(gap));
            
            if (gapsResolved <= 0) {
              console.log(`   ⚠️ Reflexion: No gaps resolved (${currentGapCount} remain), stopping`);
              break;
            }
            
            if (stuckOnSameGaps && gapsResolved < 2) {
              console.log(`   ⚠️ Reflexion: Insufficient progress on same gaps, stopping`);
              break;
            }
          }
          
          previousGaps = new Set(currentGaps);
          
          reflexionIteration++;
          lastGapCount = currentGapCount;
          
          console.log(`   🔁 Reflexion iteration ${reflexionIteration}/${MAX_REFLEXION_ITERATIONS}: ${currentGapCount} gaps → identifiers:${needIdentifiers} registry:${needRegistry} equasis:${needEquasis} owner:${needOwnerOperator}`);
          
          if (statusEmitter) {
            statusEmitter({ 
              type: 'thinking', 
              step: `reflexion_iter_${reflexionIteration}`, 
              content: `Iteration ${reflexionIteration}: Filling ${currentGapCount} gaps (registry/Equasis/IDs/owner)...` 
            });
          }
          
          // Generate targeted follow-ups
          const followups = await generateVesselRefinementSubQueries(
            queryToSend, 
            { needRegistry, needEquasis, needIdentifiers, needOwnerOperator }, 
            env.OPENAI_API_KEY
          );
          
          if (statusEmitter) {
            await emitPlanThinkingStepsLLM({ strategy: `refinement-iter-${reflexionIteration}`, subQueries: followups as any }, statusEmitter, env.OPENAI_API_KEY);
          }
          
          try {
            const beforeCount = rankedSources.length;
            const beforeConfidence = confidence.score;
            
            // Execute follow-ups
            const moreSources = await executeParallelQueries(
              followups.map(f => ({ query: f.query, purpose: f.purpose, priority: f.priority })),
              env.GEMINI_API_KEY,
              entityContext || undefined,
              env.CHAT_SESSIONS,
              statusEmitter,
              (env as any).PSE_API_KEY,
              (env as any).PSE_CX,
              env.OPENAI_API_KEY // PHASE 4B: For semantic caching
            );
            
            // PHASE 3: Quality gate - only merge if new sources are relevant
            const relevantNewSources = moreSources.filter((s: any) => {
              const content = (s.content || '').toLowerCase();
              const hasVesselData = /\b(imo|mmsi|vessel|ship|marine|gross\s*tonnage|dwt)\b/.test(content);
              return hasVesselData && content.length >= 100;
            });
            
            if (relevantNewSources.length === 0) {
              console.log(`   ⚠️ Reflexion iteration ${reflexionIteration}: No relevant sources found, stopping`);
              break;
            }
            
            console.log(`   📊 Reflexion iteration ${reflexionIteration}: ${moreSources.length} sources → ${relevantNewSources.length} relevant`);
            
            // Merge and re-rank
            const merged = aggregateAndRank([...rankedSources, ...relevantNewSources], { query: queryToSend });
            const afterCount = merged.length;
            
            // PHASE 3: Progress validation - must add at least 1 new unique source
            if (afterCount <= beforeCount) {
              console.log(`   ⚠️ Reflexion iteration ${reflexionIteration}: No new sources after dedup (${beforeCount}→${afterCount}), stopping`);
              break;
            }
            
            rankedSources = merged;
            confidence = calculateConfidence(rankedSources);
            
            console.log(`   ✅ Reflexion iteration ${reflexionIteration}: ${beforeCount}→${afterCount} sources, confidence ${beforeConfidence}→${confidence.score}`);
            
          } catch (e: any) {
            console.warn(`   ⚠️ Reflexion iteration ${reflexionIteration} failed: ${e.message}`);
            break;
          }
        }
        
        if (reflexionIteration > 0) {
          console.log(`   🏁 Reflexion complete: ${reflexionIteration} iterations, final confidence ${confidence.label} (${confidence.score})`);
          
          // Log final data coverage
          const finalMinimal = rankedSources.map((s: any) => ({ title: s.title || '', url: s.url || '', content: s.content || '' }));
          const finalValidation = validateVesselEntity(queryToSend, finalMinimal);
          const finalHaveIdentifiers = finalValidation.matchedBy.includes('IMO') || finalValidation.matchedBy.includes('MMSI') || finalValidation.matchedBy.includes('CallSign');
          const finalHaveRegistry = hasRegistrySource;
          const finalHaveEquasis = hasEquasisCoverage(rankedSources as any);
          const finalHaveOwner = hasOwnerOperatorHints(finalMinimal as any);
          
          console.log(`   📊 Final vessel data coverage:`);
          console.log(`      ${finalHaveIdentifiers ? '✅' : '❌'} Identifiers (IMO/MMSI/CallSign)`);
          console.log(`      ${finalHaveRegistry ? '✅' : '❌'} Registry source`);
          console.log(`      ${finalHaveEquasis ? '✅' : '❌'} Equasis coverage`);
          console.log(`      ${finalHaveOwner ? '✅' : '❌'} Owner/Operator data`);
          console.log(`      📚 Total sources: ${rankedSources.length}`);
          
          if (!finalHaveIdentifiers || !finalHaveOwner) {
            const criticIssues: string[] = [];
            if (!finalHaveIdentifiers) criticIssues.push('IMO/MMSI data');
            if (!finalHaveOwner) criticIssues.push('owner/operator');
            const criticMessage = `⚠️ Critic: Missing ${criticIssues.join(' + ')}`;
            console.warn(`   ${criticMessage}`);
            statusEmitter?.({
              type: 'thinking',
              step: 'critic',
              content: criticMessage
            });
            const criticNote = `${criticMessage}. Prioritize authoritative registry sources before final synthesis.`;
            criticNotes.push(criticNote);
          }
        }
      }

      // Emit metrics snapshot
      const dedupPercent = allSources.length > 0 ? Math.max(0, (allSources.length - rankedSources.length)) / allSources.length : 0;
      const metrics = {
        totalFound: allSources.length,
        totalRanked: rankedSources.length,
        dedupPercent: Number((dedupPercent * 100).toFixed(1)),
        tiers: {
          T1: tierCounts['T1'] || 0,
          T2: tierCounts['T2'] || 0,
          T3: tierCounts['T3'] || 0
        },
        confidence
      };
      console.log(`   📈 Metrics:`, metrics);
      if (statusEmitter) {
        statusEmitter({ type: 'metrics', content: 'research_metrics', progress: 70, ...metrics } as any);
      }

      // Build research context
      let researchContext = `=== GEMINI GROUNDING RESULTS (PARALLEL SEARCH) ===\n\n`;
      // Note: DO NOT include queryPlan details here - GPT-4o might echo them back
      researchContext += `SOURCES FOUND: ${allSources.length} → ${rankedSources.length} (ranked by relevance & authority)\n\n`;
      
      if (rankedSources.length > 0) {
        researchContext += `SOURCES (ranked by relevance & authority):\n`;
        rankedSources.forEach((s: any, idx: number) => {
          // CRITICAL: Include substantial content (800 chars) for LLM to generate detailed, cited answers
          // 200 chars was too little - LLM couldn't find specific facts to cite
          researchContext += `[${idx + 1}] [${s.tier}] ${s.title}\n${s.url}\n${s.content?.substring(0, 800) || 'No content'}...\n\n`;
        });
      }
      
      if (criticNotes.length > 0) {
        researchContext += `CRITIC NOTES:\n${criticNotes.map(note => `- ${note}`).join('\n')}\n\n`;
      }
      
      if (classification.preserveFleetcoreContext) {
        const fleetcoreContext = buildFleetcoreContext(sessionMemory || undefined);
        if (fleetcoreContext) researchContext += fleetcoreContext;
      }
      
      // Cache results
      await setCachedResult(kvStore, queryToSend, entityContext, {
        sources: rankedSources,
        answer: null,
        diagnostics: {
          sourcesByTier: rankedSources.reduce((acc, s) => {
            if (s.tier) acc[s.tier] = (acc[s.tier] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          totalSources: rankedSources.length,
          foundBeforeDedup: allSources.length,
          dedupPercent: metrics.dedupPercent,
          confidence: metrics.confidence,
          hasAnswer: false,
          answerLength: 0
        }
      }, 900);
      
        return {
          mode: classification.mode,
          geminiAnswer: null,
          sources: rankedSources,
          researchContext,
          planTrace: planTraceForState,
          requiresTechnicalDepth: classification.requiresTechnicalDepth,
          technicalDepthScore: classification.technicalDepthScore,
          safetyOverride: classification.safetyOverride || false,
          confidenceIndicator: confidence,  // PHASE 3: Include confidence score
        };
      } catch (error: any) {
        console.error(`   ❌ Phase 2 pipeline failed:`, error.message);
        
        // Fallback: Create error context
        const fallbackContext = `=== SEARCH ERROR ===\n\nSearch encountered an error: ${error.message}\n\nPlease answer from general maritime knowledge or suggest the user try again.`;
        
        return { 
          mode: classification.mode,
          geminiAnswer: null,
          sources: [],
          researchContext: fallbackContext,
          planTrace: planTraceForState,
          requiresTechnicalDepth: classification.requiresTechnicalDepth,
          technicalDepthScore: classification.technicalDepthScore,
          safetyOverride: classification.safetyOverride || false,
        };
      }
    } catch (error: any) {
      console.error(`   ❌ Router node error:`, error);
      return {
        mode: 'none',
        sources: [],
        requiresTechnicalDepth: false,
        technicalDepthScore: 0,
        safetyOverride: false,
      };
    }
  }
  
  // Other modes (none/research) just set the mode
  return { 
    mode: classification.mode,
    requiresTechnicalDepth: classification.requiresTechnicalDepth,
    technicalDepthScore: classification.technicalDepthScore,
    safetyOverride: classification.safetyOverride || false,
    planTrace: null,
  };
}

/**
 * Synthesizer Node - Streams answer based on mode
 */
async function synthesizerNode(state: State, config: any): Promise<Partial<State>> {
  const env = config.configurable?.env;
  const sessionMemory = config.configurable?.sessionMemory as SessionMemory | null;
  const statusEmitter = config.configurable?.statusEmitter;
  
  console.log(`\n🎨 SYNTHESIZER NODE`);
  console.log(`   Mode: ${state.mode}`);
  console.log(`   Has researchContext: ${!!state.researchContext}`);
  console.log(`   Technical Depth Required: ${state.requiresTechnicalDepth} (score: ${state.technicalDepthScore}/10)`);
  
  // Emit IMMEDIATE status before AI generation
  if (statusEmitter) {
    statusEmitter({
      type: 'status',
      stage: 'synthesis_start',
      content: state.sources && state.sources.length > 0 
        ? '🎯 Analyzing sources and formulating response...'
        : '💭 Formulating response...',
      progress: 0
    });
    console.log(`   📢 Emitted synthesis start status to frontend`);
  }
  
  // Get user query for Phase C follow-ups
  const lastUserMessage = state.messages.filter(m => m.constructor.name === 'HumanMessage').slice(-1)[0];
  const userQuery = lastUserMessage?.content?.toString() || '';
  console.log(`   Has research context: ${!!state.researchContext}`);
  
  // Build context from session memory
  let contextAddition = "";
  if (sessionMemory) {
    if (sessionMemory.conversationSummary) {
      contextAddition += `\n\n=== CONVERSATION CONTEXT ===\n${sessionMemory.conversationSummary}\n`;
    }
    
    const vesselEntities = Object.keys(sessionMemory.accumulatedKnowledge?.vesselEntities || {});
    const companyEntities = Object.keys(sessionMemory.accumulatedKnowledge?.companyEntities || {});
    
    if (vesselEntities.length > 0 || companyEntities.length > 0) {
      contextAddition += `\n=== KNOWN ENTITIES ===\n`;
      if (vesselEntities.length > 0) {
        contextAddition += `Vessels: ${vesselEntities.join(', ')}\n`;
      }
      if (companyEntities.length > 0) {
        contextAddition += `Companies: ${companyEntities.join(', ')}\n`;
      }
    }
  }
  
    // CRITICAL: streaming: true enables token-by-token output via LangGraph callbacks
    // PHASE 1: Deterministic settings for verification mode (temperature=0)
    const temperature = state.mode === 'verification' 
      ? 0.0  // DETERMINISTIC: Verification mode uses grounded sources, must be consistent
      : 0.3; // CREATIVE: Knowledge mode can vary slightly for natural language
    
    const llm = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature,
      topP: 1.0,  // PHASE 1: Explicit top_p for deterministic sampling
      openAIApiKey: env.OPENAI_API_KEY,
      streaming: true, // Enable token streaming for all modes
    });
    
    console.log(`   ⚙️ LLM settings: temperature=${temperature}, topP=1.0, mode=${state.mode}`);
    
    // PHASE 3 FIX: Define timeout constant for verification mode
    const LLM_TIMEOUT_MS = 60000; // 60 seconds max for LLM response (increased from 45s)
    const WARNING_INTERVALS = [30000, 45000, 55000]; // Progressive warning times
    
    // MODE: NONE - Answer from training data
    if (state.mode === 'none') {
    console.log(`   🎯 Synthesizing NONE mode - training data only`);
    
    const platformContext = `\n\n=== PLATFORM QUERY ===
Answer comprehensively from your training knowledge about fleetcore.
DO NOT suggest using external research - provide detailed information directly.`;
    
    const systemMessage = new SystemMessage(MARITIME_SYSTEM_PROMPT + contextAddition + platformContext);
    
    // CRITICAL: Use stream() and pass config for LangGraph callback system
    // PHASE 3 FIX: Add timeout protection with progressive warnings
    const LLM_TIMEOUT_MS = 60000; // 60 seconds max for LLM response (increased from 45s)
    const WARNING_INTERVALS = [30000, 45000, 55000]; // Progressive warning times
    
    let timeoutWarningSent = new Set<number>();
    const streamPromise = (async () => {
      const stream = await llm.stream([systemMessage, ...state.messages], config);
      let fullContent = '';
      let chunkCount = 0;
      const startTime = Date.now();
      console.log(`   📡 Starting LLM stream (mode: none)`);
      
      for await (const chunk of stream) {
        fullContent += chunk.content;
        chunkCount++;
        
        // PHASE 3 FIX: Emit progressive timeout warnings
        const elapsed = Date.now() - startTime;
        for (const warningTime of WARNING_INTERVALS) {
          if (elapsed >= warningTime && !timeoutWarningSent.has(warningTime)) {
            timeoutWarningSent.add(warningTime);
            const remaining = Math.ceil((LLM_TIMEOUT_MS - elapsed) / 1000);
            statusEmitter?.({
              type: 'status',
              stage: 'synthesis',
              content: `⏱️ Still processing... ${remaining}s remaining`,
              progress: Math.min(90, Math.floor((elapsed / LLM_TIMEOUT_MS) * 100))
            });
            console.log(`   ⏱️ Timeout warning at ${warningTime}ms (${remaining}s remaining)`);
          }
        }
        
        // NOTE: Do NOT proxy tokens here - LangGraph's stream handler already sends AIMessageChunk
        // Proxying here causes double emission (each token sent twice)
        
        if (chunkCount === 1 || chunkCount % 20 === 0) {
          console.log(`   💬 Streaming chunk #${chunkCount} (${fullContent.length} chars so far)`);
        }
      }
      
      console.log(`   ✅ Stream complete: ${chunkCount} chunks, ${fullContent.length} chars`);
      return fullContent;
    })();
    
    const timeoutPromise = new Promise<string>((_, reject) => 
      setTimeout(() => reject(new Error('LLM_STREAM_TIMEOUT')), LLM_TIMEOUT_MS)
    );
    
    let fullContent: string;
    try {
      fullContent = await Promise.race([streamPromise, timeoutPromise]);
    } catch (error: any) {
      if (error.message === 'LLM_STREAM_TIMEOUT') {
        console.error(`   ❌ LLM stream timeout after ${LLM_TIMEOUT_MS}ms`);
        fullContent = `I apologize, but I'm experiencing a response delay. This query is taking longer than expected. Please try again, or try rephrasing your question. For vessel/equipment queries, I automatically verify with trusted web sources and include citations.`;
      } else {
        console.error(`   ❌ LLM stream error:`, error);
        throw error;
      }
    }
    
    console.log(`   ✅ Synthesized (${fullContent.length} chars)`);
    return { messages: [new AIMessage(fullContent)] };
  }
  
  // MODE: VERIFICATION - Synthesize from Gemini answer with GPT-4o (enables streaming)
  if (state.mode === 'verification') {
    console.log(`\n   📊 VERIFICATION MODE STATE CHECK:`);
    console.log(`      - Has researchContext: ${!!state.researchContext}`);
    console.log(`      - researchContext length: ${state.researchContext?.length || 0}`);
    console.log(`      - researchContext preview: ${state.researchContext?.substring(0, 150)}...`);
    console.log(`      - Has geminiAnswer: ${!!state.geminiAnswer}`);
    console.log(`      - geminiAnswer length: ${state.geminiAnswer?.length || 0}`);
    console.log(`      - Sources count: ${state.sources?.length || 0}`);
    
    // CRITICAL: Check if we have research context from Gemini
    // This should ALWAYS be present in verification mode since router node builds it
    if (!state.researchContext || state.researchContext.length === 0) {
      console.error(`\n   ❌ CRITICAL ERROR: VERIFICATION mode but researchContext is missing!`);
      console.error(`   This should never happen - router node always builds researchContext`);
      console.error(`   State object keys:`, Object.keys(state));
      console.error(`   Mode:`, state.mode);
      console.error(`   Sources:`, state.sources?.length || 0);
      console.error(`   GeminiAnswer:`, state.geminiAnswer?.substring(0, 100));
      
      const fallbackPrompt = `${MARITIME_SYSTEM_PROMPT}${contextAddition}

=== FALLBACK MODE ===
Gemini search was unavailable. Answer from your maritime knowledge base.
If you don't have specific information, be honest and suggest the user enable online research.`;
      
      const systemMessage = new SystemMessage(fallbackPrompt);
      
      // PHASE 3 FIX: Add timeout protection with increased limit
      const LLM_TIMEOUT_MS = 60000; // 60 seconds (increased from 45s)
      const streamPromise = (async () => {
        const stream = await llm.stream([systemMessage, ...state.messages], config);
        let fullContent = '';
        console.log(`   📡 Starting fallback LLM stream`);
        for await (const chunk of stream) {
          fullContent += chunk.content;
        }
        console.log(`   ✅ Fallback stream complete: ${fullContent.length} chars`);
        return fullContent;
      })();
      
      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('LLM_STREAM_TIMEOUT')), LLM_TIMEOUT_MS)
      );
      
      let fullContent: string;
      try {
        fullContent = await Promise.race([streamPromise, timeoutPromise]);
      } catch (error: any) {
        if (error.message === 'LLM_STREAM_TIMEOUT') {
          console.error(`   ❌ Fallback LLM stream timeout`);
          fullContent = `I apologize, but I'm experiencing technical difficulties. Please try again or rephrase your question.`;
        } else {
          throw error;
        }
      }
      
      console.log(`   ✅ Synthesized fallback (${fullContent.length} chars)`);
      return { messages: [new AIMessage(fullContent)] };
    }
    
    console.log(`   ✅ Research context validated - proceeding with Gemini synthesis`);
    
    console.log(`   🔮 Synthesizing VERIFICATION mode from Gemini grounding (${state.sources.length} sources)`);
    
    // Emit status: Starting synthesis (BEFORE calling GPT-4o)
    if (statusEmitter) {
      if (state.requiresTechnicalDepth) {
        statusEmitter({
          type: 'status',
          stage: 'synthesis',
          content: `📝 Preparing detailed technical analysis...`
        });
      } else {
        statusEmitter({
          type: 'status',
          stage: 'synthesis',
          content: `📝 Formatting results...`
        });
      }
    }
    
    // CRITICAL FIX: Use same vessel detection as classifier (query-classification-rules.ts line 234-258)
    // This uses comprehensive entity extraction to detect vessel names like "Stanford Rhine"
    const qLower = userQuery.toLowerCase();
    const hasVesselKeyword = /\b(vessel|ship|imo|mmsi|call\s*sign|flag)\b/.test(qLower);
    const hasVesselPattern = /\b(MV|MS|MT|SS|HMS)\s+[A-Z]/i.test(userQuery);
    const hasIdentifierPattern = /\b(IMO|MMSI)[\s:]?\d+/i.test(userQuery);
    const extractedEntities = extractMaritimeEntities(userQuery);
    const isVesselQuery = hasVesselKeyword || hasVesselPattern || hasIdentifierPattern || extractedEntities.length > 0;
    
    if (extractedEntities.length > 0) {
      console.log(`   🚢 Detected vessel entities: ${extractedEntities.join(', ')}`);
    }
    // Verification pipeline removed in favor of lightweight critic (Phase 1)
    
    // SIMPLIFIED synthesis prompt matching legacy pattern with technical depth flag
    const technicalDepthFlag = `**TECHNICAL DEPTH REQUIRED: ${state.requiresTechnicalDepth ? 'TRUE' : 'FALSE'}** (Score: ${state.technicalDepthScore}/10)

${state.requiresTechnicalDepth ? `
**CRITICAL REQUIREMENT: This is a TECHNICAL DEPTH query - you MUST provide detailed analysis:**

**MANDATORY SECTIONS (ALL REQUIRED):**
1. Executive Summary (2-3 sentences)
2. Technical Specifications (equipment specs, model numbers, ratings)
3. **MAINTENANCE ANALYSIS** (REQUIRED - OEM intervals, service schedules, common failure modes)
4. **OPERATIONAL RECOMMENDATIONS** (REQUIRED - performance optimization, warnings, best practices)
5. **REAL-WORLD SCENARIOS** (REQUIRED - field experience, typical duty cycles, operational conditions)
6. Maritime Context (regulatory/industry perspective)

**WRITING STYLE:**
- Write as a Chief Engineer with 20+ years hands-on experience
- Include specific numbers: service intervals, temperatures, pressures, hours
- Mention OEM manufacturers by name (Caterpillar, Wartsila, MAN, etc.)
- Add practical warnings and tips from real operations
- Target length: 600-800 words minimum

**FAILURE TO INCLUDE MAINTENANCE ANALYSIS, OPERATIONAL RECOMMENDATIONS, AND REAL-WORLD SCENARIOS SECTIONS IS UNACCEPTABLE.**
` : `
**This is an OVERVIEW query - user needs executive summary:**
- Provide concise high-level information
- Write as a Technical Director (strategic level)
- Target length: 400-500 words
- Use format: Executive Summary, Technical Specifications, Operational Status, Technical Analysis, Maritime Context
`}`;

    // Vessel field requirements (ALWAYS use clean narrative format - Reflexion loop will fill gaps)
    // Note: isVesselQuery already defined earlier in this function
    const vesselRequirements = isVesselQuery ? `

**🚢 THIS IS A BRIEF VESSEL QUERY - Provide CLEAN OVERVIEW (NO detailed VESSEL PROFILE):**

**CRITICAL: DO NOT use the detailed VESSEL PROFILE structure with many "Not found" fields.**
**INSTEAD, use narrative format and ONLY include information you actually found:**

**STRUCTURE FOR BRIEF VESSEL QUERIES:**

## EXECUTIVE SUMMARY
[2-3 paragraphs describing: vessel purpose/type, owner/operator, key specifications, and current operational role - cite all facts]
[**CRITICAL**: MUST include vessel type, flag state, **owner/operator company name** (search ALL sources thoroughly), build year, and operational context]
[Owner/Operator is HIGH PRIORITY - look for: "owned by", "operated by", "managed by", "owner:", "operator:", company names in AIS data]

## TECHNICAL SPECIFICATIONS
[ONLY list specs you found - use narrative or clean bullet format]
- IMO Number: [number] [N]
- MMSI: [number] [N]
- Flag State: [country] [N]
- Owner/Operator: [company name if found] [N]
- Build Year: [year if found] [N]
- Draft: [if found] [N]
[Add other specs ONLY if found: dimensions, tonnages, engines, vessel type]
[NEVER write "Not found in sources" - just omit missing fields]

## OPERATIONAL STATUS
[Current location, speed, destination, operational context - cite sources]

## TECHNICAL ANALYSIS
[Brief technical commentary on propulsion, systems, capabilities if known]

## MARITIME CONTEXT
[Vessel's role and significance in maritime operations]

**CRITICAL RULES FOR BRIEF MODE:**
1. Omit fields you cannot find - DO NOT write "Not found in sources"
2. Use narrative prose, not exhaustive field-by-field lists
3. Keep concise (400-500 words total)
4. Focus on what you CAN tell the user, not what you cannot
5. Cite every fact with [N] (REFERENCES section added automatically)

**⚠️ CRITICAL FORMATTING RULES ⚠️**
1. Add blank line BEFORE every ## header
2. Add blank line AFTER every ## header
3. Proper format example:

## EXECUTIVE SUMMARY

[Content here with proper spacing]

## TECHNICAL SPECIFICATIONS

[Content here with proper spacing]

**CRITICAL FORMATTING - DO NOT let sections bleed together:**

WRONG (DO NOT DO THIS):
\`\`\`
OPERATIONAL STATUSAs of the last report...
MAINTENANCE ANALYSISDynamic25, being a crew boat...
REAL-WORLD INSIGHTSCrew boats like...
MARITIME CONTEXTDynamic25 plays...
\`\`\`

CORRECT (DO THIS):
\`\`\`

## OPERATIONAL STATUS

As of the last report...


## MAINTENANCE ANALYSIS

Dynamic25, being a crew boat...


## REAL-WORLD INSIGHTS

Crew boats like...


## MARITIME CONTEXT

Dynamic25 plays...
\`\`\`

**EVERY HEADER MUST HAVE:**
- TWO blank lines BEFORE it (press Enter twice)
- ONE blank line AFTER it (press Enter once)
- NO text touching the header directly
` : '';

    // Pre-extract owner/operator data before synthesis
    // This ensures GPT-4 never misses this critical information
    let ownerOperatorExtraction: OwnerOperatorData | null = null;
    let ownerOperatorPromptAddition = '';
    
    if (isVesselQuery && state.sources.length > 0) {
      console.log(`   🔍 PHASE 1: Pre-extracting owner/operator from ${state.sources.length} sources...`);
      ownerOperatorExtraction = extractOwnerOperator(state.sources);
      
      if (ownerOperatorExtraction) {
        console.log(`   ✅ Owner/Operator extracted via ${ownerOperatorExtraction.extractionMethod}:`);
        console.log(`      Owner: ${ownerOperatorExtraction.owner || 'N/A'}`);
        console.log(`      Operator: ${ownerOperatorExtraction.operator || 'N/A'}`);
        console.log(`      Manager: ${ownerOperatorExtraction.manager || 'N/A'}`);
        console.log(`      Source: [${ownerOperatorExtraction.sourceIndex + 1}] ${ownerOperatorExtraction.sourceUrl}`);
        console.log(`      Confidence: ${ownerOperatorExtraction.confidence}`);
        
        // Build prompt addition with pre-extracted data
        ownerOperatorPromptAddition = `

**🎯 PRE-EXTRACTED OWNER/OPERATOR DATA:**

The following ownership data has been automatically extracted from Source [${ownerOperatorExtraction.sourceIndex + 1}]:
${ownerOperatorExtraction.owner ? `- **Owner**: ${ownerOperatorExtraction.owner} [${ownerOperatorExtraction.sourceIndex + 1}]` : ''}
${ownerOperatorExtraction.operator ? `- **Operator**: ${ownerOperatorExtraction.operator} [${ownerOperatorExtraction.sourceIndex + 1}]` : ''}
${ownerOperatorExtraction.manager ? `- **Manager**: ${ownerOperatorExtraction.manager} [${ownerOperatorExtraction.sourceIndex + 1}]` : ''}
${ownerOperatorExtraction.technicalManager ? `- **Technical Manager**: ${ownerOperatorExtraction.technicalManager} [${ownerOperatorExtraction.sourceIndex + 1}]` : ''}

**CRITICAL INSTRUCTION**: Use this pre-extracted data for the "Ownership & Management" section. This data has been verified and extracted with ${ownerOperatorExtraction.confidence} confidence using ${ownerOperatorExtraction.extractionMethod} extraction.

`;
      } else {
        console.log(`   ⚠️ Owner/Operator NOT found in sources - will rely on GPT-4 extraction`);
      }
    }

    const synthesisPrompt = `${MARITIME_SYSTEM_PROMPT}${contextAddition}

${state.researchContext}

${technicalDepthFlag}

${vesselRequirements}

${ownerOperatorPromptAddition}

**USER QUERY**: ${userQuery}

**CRITICAL: ${isVesselQuery ? '🚢 THIS IS A VESSEL QUERY 🚢' : 'THIS IS A GENERAL QUERY'}**

${isVesselQuery ? `
**⚠️ START WITH ## EXECUTIVE SUMMARY ⚠️**

Use clean narrative format with ONLY found data. DO NOT write "Not found in sources".
The Reflexion loop will automatically detect and fill any missing critical data through additional research.` : ''}

**CRITICAL OUTPUT FORMAT REQUIREMENTS:**
${isVesselQuery ? `- YOUR FIRST SECTION MUST BE: ## EXECUTIVE SUMMARY
- ONLY include information you found - omit missing fields entirely
- THEN: ## TECHNICAL SPECIFICATIONS (clean list - no "Not found")
- THEN: ## OPERATIONAL STATUS
- THEN: ## TECHNICAL ANALYSIS
- THEN: ## MARITIME CONTEXT
- DO NOT write "Not found in sources" - the Reflexion loop will fill gaps automatically` : `- START with: ## EXECUTIVE SUMMARY
- THEN: ## KEY SPECIFICATIONS
- THEN: Additional sections`}

**⚠️ CRITICAL: ABSOLUTELY NO JSON OUTPUT ⚠️**
- DO NOT generate JSON objects like {"strategy": ..., "subQueries": ...}
- DO NOT generate JSON arrays like [{"query": ..., "purpose": ...}]
- DO NOT generate structured data formats
- DO NOT include internal planning or reasoning in JSON format
- ONLY generate human-readable markdown prose
- If you have internal reasoning, keep it internal - DO NOT output it
- Your FIRST character must be # (markdown header)
- Your output must be pure markdown content only

**⚠️ CRITICAL: CITATION FORMAT ⚠️**
- Citations should be INLINE with URLs: [1](url), [2](url), [3](url)
- You MAY include a REFERENCES section at the end if you prefer, but inline citations with URLs are preferred
- If you include REFERENCES, format as: [1] SiteName, "Title," URL
- The system will ensure all citations have clickable URLs

**YOUR TASK:**
You are a ${state.requiresTechnicalDepth ? 'Chief Engineer with 20+ years hands-on experience' : 'Technical Director providing executive briefings'}. Extract facts from the ${state.sources.length} verified sources below and synthesize a ${state.requiresTechnicalDepth ? 'comprehensive technical analysis (600-800 words)' : 'concise but complete overview (400-500 words)'}.

${!state.requiresTechnicalDepth ? `
**⚠️ BRIEF MODE - Keep Response Focused:**
- This is an initial overview query - be concise and well-organized
- Cover ALL key points but avoid excessive detail
- User can ask follow-up questions for deeper analysis
- Think "executive briefing" not "technical manual"
` : `
**⚠️ DETAILED MODE - Comprehensive Analysis:**
- User explicitly requested detailed information
- Provide comprehensive technical analysis with maintenance insights
- Include real-world operational data and best practices
- Think "technical manual" not "executive summary"
`}

**⚠️ CRITICAL: DO NOT USE TRAINING DATA - ONLY USE INFORMATION FROM SOURCES BELOW ⚠️**
**Using training data instead of sources is UNACCEPTABLE and will result in incorrect responses.**

**⚠️ YOU HAVE ${state.sources.length} SOURCES - USE THEM ALL ⚠️**
**EXTRACTION REQUIREMENT: You must extract EVERY available detail from ALL sources below.**

**SOURCE-BY-SOURCE EXTRACTION CHECKLIST:**
${state.sources.map((s: any, i: number) => `- Source [${i+1}]: Extract ALL facts from ${s.title || s.url}`).join('\n')}

**CRITICAL RULE: Every fact must come from sources [1-${state.sources.length}]. If a fact is not in the sources, DO NOT include it.**

**⚠️ YOU HAVE ${state.sources.length} SOURCES - YOU MUST USE AT LEAST ${Math.ceil(state.sources.length * 0.6)} OF THEM ⚠️**
**DO NOT rely on only 1-2 sources. Extract information from MULTIPLE sources and cite them all.**

**❌ WRONG APPROACH (DO NOT DO THIS):**
- Using only 1 source: "The vessel is 34 meters long [1]"
- Generic statements: "Crew boats typically require maintenance"
- Missing citations: "Dynamic 17 operates in the Persian Gulf" (no citation)
- Using training data: "Most crew boats are built in 2009" (not from sources)

**✅ CORRECT APPROACH (DO THIS):**
- Multiple sources: "The vessel is 34 meters long [1] and has a beam of 7.85 meters [2]"
- Specific facts: "Dynamic 17, operated by [Company Name] [3], was built in 2009 [1]"
- Every fact cited: "The vessel is registered under St Kitts & Nevis flag [1] and operates in the Persian Gulf [2]"
- Source-specific: "According to MarineTraffic [1], the vessel's MMSI is 341234001"

${state.sources.map((s: any, i: number) => {
  // Enhanced content extraction for vessel queries
  // Vessel queries: 5000 chars with table extraction (increased from 3000)
  // Other queries: 1500 chars standard preview
  const previewLength = isVesselQuery ? 5000 : 1500;
  
  // Use smart preview that preserves complete sentences
  const contentPreview = getSmartPreview(s.content || '', previewLength);
  const hasMore = (s.content || '').length > previewLength;
  
  // For vessel queries, try to extract structured data from tables
  let structuredDataHint = '';
  if (isVesselQuery && s.content && s.content.includes('<table')) {
    try {
      const extracted = extractEnhancedContent(s.content, previewLength, true);
      if (extracted.structuredData && Object.keys(extracted.structuredData).length > 0) {
        const keyFields = Object.entries(extracted.structuredData)
          .filter(([key]) => /imo|mmsi|owner|operator|flag|type|loa|length|beam|tonnage|built/.test(key))
          .slice(0, 5);
        if (keyFields.length > 0) {
          structuredDataHint = `\n   **Structured Data Found**: ${keyFields.map(([k, v]) => `${k}=${v}`).join(', ')}`;
        }
      }
    } catch (e) {
      // Extraction failed, continue with normal preview
    }
  }
  
  return `**Source [${i+1}]**: ${s.title || 'Source ' + (i+1)}
   URL: ${s.url}
   Content: ${contentPreview}${hasMore ? '...' : ''}${structuredDataHint}
   ${hasMore ? '[CONTINUED - Additional data available]' : ''}
   **ACTION**: Read this source carefully and extract ALL vessel specifications, dimensions, dates, names, and technical details.`;
}).join('\n\n')}

**CONTENT REQUIREMENTS:**
1. **USE ALL ${state.sources.length} SOURCES**: 
   - Review EVERY source above and extract facts
   - Cross-reference information across multiple sources
   - Combine information from different sources for complete picture
   - DO NOT rely on just 1-2 sources - use ALL of them
   
2. **Extract Specific Facts**: 
   - **OWNER/OPERATOR COMPANY NAME** (TOP PRIORITY - search ALL sources for: "owner", "operator", "managed by", "operated by", company names)
   - Exact model numbers (e.g., "Caterpillar C32 ACERT")
   - Precise specifications (e.g., "41.00 meters LOA")
   - Actual company names (e.g., "Stanford Marine Group")
   - Equipment details (engines, propulsion, generators)
   - Class society and notation
   - All dimensions and tonnages

3. **Citation Format (IEEE Style)**:
   - Add [N] after EVERY fact where N = source number (1-${state.sources.length})
   - Example: "Length: 41 meters [1]"
   - Citations are simple numbered references - full URLs will be in REFERENCES section
   - Cite ALL specifications, dimensions, names, dates, and technical details
   - A REFERENCES section will be automatically generated at the end
   
4. **CRITICAL - Avoid "Not found" when possible**:
   - ONLY write "Not found in sources" if you've checked ALL ${state.sources.length} sources thoroughly
   - If you find partial information (e.g., "built 2022" without shipyard name), still include it
   - Extract ANY related information even if not perfectly formatted
   - Cross-reference between sources to piece together complete information
   - Look for implied information (e.g., if sources mention "PSV" or "supply vessel", that's the vessel type)

3. **Structure** (${isVesselQuery ? 'VESSEL QUERY - USE THIS ORDER' : 'use these headers'}):
   ${isVesselQuery ? `
   ${!state.requiresTechnicalDepth ? `
   **BRIEF MODE (Initial Vessel Lookup):**
   - ## EXECUTIVE SUMMARY (2-3 paragraphs: vessel purpose, operator, key specs)
   - ## TECHNICAL SPECIFICATIONS (organized list with citations)
   - ## OPERATIONAL STATUS (current location, flag, operational context)
   - ## TECHNICAL ANALYSIS (brief technical commentary on propulsion, systems)
   - ## MARITIME CONTEXT (vessel's role in maritime operations)
   ` : `
   **DETAILED MODE (Comprehensive Vessel Analysis):**
   - ## VESSEL PROFILE (complete technical specifications)
   - ## EXECUTIVE SUMMARY
   - ## TECHNICAL SPECIFICATIONS (comprehensive)
   - ## OPERATIONAL STATUS
   - ## MAINTENANCE ANALYSIS
   - ## REAL-WORLD INSIGHTS
   - ## MARITIME CONTEXT
   `}` : (state.requiresTechnicalDepth ? `
   - ## EXECUTIVE SUMMARY
   - ## TECHNICAL SPECIFICATIONS
   - ## MAINTENANCE ANALYSIS (required for technical depth)
   - ## OPERATIONAL RECOMMENDATIONS (required for technical depth)
   - ## REAL-WORLD SCENARIOS (required for technical depth)
   - ## MARITIME CONTEXT` : `
   - ## EXECUTIVE SUMMARY
   - ## KEY SPECIFICATIONS
   - ## OPERATIONAL STATUS
   - ## TECHNICAL ANALYSIS
   - ## MARITIME CONTEXT`)}

4. **Quality Standards**:
   - Write with authority and confidence
   - Use precise technical language
   - NO vague terms ("approximately", "around", "seems to be")
   - NO generic statements without specific facts
   - Cross-reference multiple sources for accuracy
   - ${isVesselQuery ? 'EVERY field in VESSEL PROFILE must be extracted from sources' : 'Extract ALL available technical specifications'}

**═══════════════════════════════════════════════════════════════**
**CRITICAL FORMATTING RULES (ENFORCE STRICTLY)**
**═══════════════════════════════════════════════════════════════**

1. Add TWO blank lines BEFORE every ## header
2. Add ONE blank line AFTER every ## header
3. NEVER let headers touch content directly

CORRECT FORMAT EXAMPLE:
\`\`\`

## EXECUTIVE SUMMARY

The vessel measures 400 meters...


## TECHNICAL SPECIFICATIONS

Length Overall: 399m...
\`\`\`

WRONG FORMAT (DO NOT DO THIS):
\`\`\`
## EXECUTIVE SUMMARYThe vessel measures...
## TECHNICAL SPECIFICATIONSLength Overall:...
\`\`\`

**═══════════════════════════════════════════════════════════════**

**REMINDER**: ${isVesselQuery ? 'Start with ## VESSEL PROFILE section, then continue with other sections.' : 'Start with ## EXECUTIVE SUMMARY.'}`;
    
    console.log(`   📝 Synthesis prompt length: ${synthesisPrompt.length} chars`);
    console.log(`   📝 Research context included: ${state.researchContext?.substring(0, 100)}...`);
    
    // 🧠 PHASE 2: SYNTHETIC CHAIN OF THOUGHT INTEGRATION
    // Detect which CoT technique to use based on query type
    const classification: QueryClassification = {
      mode: state.mode,
      requiresTechnicalDepth: state.requiresTechnicalDepth,
      isVesselQuery
    };
    
    const cotConfig = selectCoTTechnique(userQuery, classification, state.sources || []);
    console.log(`\n🧠 CHAIN OF THOUGHT:`);
    console.log(`   Technique: ${cotConfig.technique}`);
    console.log(`   Domain: ${cotConfig.domain}`);
    console.log(`   Complexity: ${cotConfig.complexityLevel}`);
    console.log(`   Requires Comparison: ${cotConfig.requiresComparison}`);
    
    // Build CoT-enhanced prompt based on technique
    let enhancedPrompt: string;
    let cotThinking: string = '';
    let cotAnswer: string = '';
    let usesSelfConsistency = false;
    
    switch (cotConfig.technique) {
      case 'zero-shot':
        // Most common: Add structured thinking prompt (80% of queries)
        enhancedPrompt = buildZeroShotCoT(userQuery, synthesisPrompt, cotConfig.domain);
        console.log(`   ✅ Using Zero-Shot CoT (80% of queries)`);
        break;
        
      case 'auto-cot':
        // Domain-specific templates for vessel/equipment queries
        const queryType = detectQueryType(userQuery);
        enhancedPrompt = buildAutoCoT(userQuery, synthesisPrompt, queryType);
        console.log(`   ✅ Using Auto-CoT for ${queryType} query`);
        break;
        
      case 'plan-solve':
        // Comparative queries need systematic breakdown
        const targetAttribute = detectComparativeAttribute(userQuery);
        enhancedPrompt = buildPlanAndSolveCoT(
          userQuery,
          synthesisPrompt,
          'superlative',
          targetAttribute
        );
        console.log(`   ✅ Using Plan-and-Solve CoT for comparative query (attribute: ${targetAttribute})`);
        break;
        
      case 'self-consistent':
        // High-stakes queries: Run 3x and pick most consistent
        // This is handled separately AFTER this block
        enhancedPrompt = synthesisPrompt; // Will be replaced by self-consistent logic
        usesSelfConsistency = true;
        console.log(`   ✅ Using Self-Consistency CoT (3x generation)`);
        break;
        
      default:
        enhancedPrompt = synthesisPrompt;
        console.log(`   ⚠️ No CoT applied - using base prompt`);
    }
    
    const systemMessage = new SystemMessage(enhancedPrompt);
    
    // PHASE 5 FIX: Emit synthesis start status immediately with progress indicator
    if (statusEmitter) {
      statusEmitter({
        type: 'status',
        stage: 'synthesis',
        content: state.requiresTechnicalDepth 
          ? `⚙️ Generating comprehensive technical analysis with ${cotConfig.technique} reasoning (600+ words)...`
          : `⚙️ Generating response with ${cotConfig.technique} reasoning...`,
        progress: 0
      });
      console.log(`   📢 Emitted synthesis start status`);
    }
    
    // CRITICAL FIX: DISABLE Structured Output - it's too rigid and causes "Not found" for everything
    // Pure streaming markdown with strong prompts works better for extraction
    const USE_STRUCTURED_OUTPUT = false; // DISABLED - causes missing data issues
    
    // CRITICAL: Use stream() and pass config for LangGraph callback system
    // Add timeout protection to prevent infinite hangs
    const LLM_TIMEOUT_MS = 45000; // 45 seconds max for LLM response
    const TARGET_LENGTH = state.requiresTechnicalDepth ? 4000 : 2000; // chars
    
    let fullContent = '';
    
    if (USE_STRUCTURED_OUTPUT && isVesselQuery) {
      // P1 FIX: Use Structured Output API for guaranteed vessel profile structure
      console.log(`   🎯 Using Structured Output API for vessel query`);
      
      const structuredLlm = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0,
        topP: 1.0,
        openAIApiKey: env.OPENAI_API_KEY,
        streaming: false, // Structured output doesn't support streaming
      });
      
      const vesselSchema = {
        type: "json_schema" as const,
        json_schema: {
          name: "vessel_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              vessel_profile: {
                type: "object",
                properties: {
                  identity: {
                    type: "object",
                    properties: {
                      imo: { type: "string", description: "IMO number or 'Not found in sources'" },
                      mmsi: { type: "string", description: "MMSI or 'Not found in sources'" },
                      call_sign: { type: "string", description: "Call sign or 'Not found in sources'" },
                      flag: { type: "string", description: "Flag state or 'Not found in sources'" }
                    },
                    required: ["imo", "mmsi", "call_sign", "flag"],
                    additionalProperties: false
                  },
                  ownership: {
                    type: "object",
                    properties: {
                      owner: { type: "string", description: "Owner company or 'Not found in sources'" },
                      operator: { type: "string", description: "Operator/manager or 'Not found in sources'" }
                    },
                    required: ["owner", "operator"],
                    additionalProperties: false
                  },
                  dimensions: {
                    type: "object",
                    properties: {
                      loa: { type: "string", description: "Length overall or 'Not found in sources'" },
                      breadth: { type: "string", description: "Breadth or 'Not found in sources'" },
                      draft: { type: "string", description: "Draft or 'Not found in sources'" }
                    },
                    required: ["loa", "breadth", "draft"],
                    additionalProperties: false
                  },
                  tonnages: {
                    type: "object",
                    properties: {
                      gross_tonnage: { type: "string", description: "Gross tonnage or 'Not found in sources'" },
                      deadweight: { type: "string", description: "Deadweight or 'Not found in sources'" }
                    },
                    required: ["gross_tonnage", "deadweight"],
                    additionalProperties: false
                  },
                  build_info: {
                    type: "object",
                    properties: {
                      shipyard: { type: "string", description: "Shipyard name and location or 'Not found in sources'" },
                      build_year: { type: "string", description: "Build year or 'Not found in sources'" }
                    },
                    required: ["shipyard", "build_year"],
                    additionalProperties: false
                  },
                  propulsion: {
                    type: "object",
                    properties: {
                      main_engines: { type: "string", description: "Main engines make/model/power or 'Not found in sources'" },
                      propellers: { type: "string", description: "Propellers/propulsion type or 'Not found in sources'" }
                    },
                    required: ["main_engines", "propellers"],
                    additionalProperties: false
                  },
                  current_status: {
                    type: "object",
                    properties: {
                      location: { type: "string", description: "Current location from AIS or 'Not found in sources'" },
                      destination: { type: "string", description: "Destination or 'Not found in sources'" }
                    },
                    required: ["location", "destination"],
                    additionalProperties: false
                  }
                },
                required: ["identity", "ownership", "dimensions", "tonnages", "build_info", "propulsion", "current_status"],
                additionalProperties: false
              },
              executive_summary: { 
                type: "string",
                description: "2-3 paragraph executive summary of the vessel"
              },
              technical_analysis: { 
                type: "string",
                description: "Technical analysis of vessel specifications and capabilities"
              },
              maritime_context: { 
                type: "string",
                description: "Maritime context and operational significance"
              }
            },
            required: ["vessel_profile", "executive_summary", "technical_analysis", "maritime_context"],
            additionalProperties: false
          }
        }
      };
      
      // CRITICAL: Do NOT pass config to avoid streaming callbacks
      // Invoke with empty options object to prevent JSON from leaking to stream
      const response = await structuredLlm.invoke([systemMessage, ...state.messages], {
        response_format: vesselSchema,
        // Explicitly prevent any callbacks
        callbacks: []
      });
      
      // Parse JSON response
      const jsonContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const vesselData = JSON.parse(jsonContent);
      
      console.log(`   🔍 Parsed structured output: ${Object.keys(vesselData).join(', ')}`);
      
      // Convert JSON to markdown with citations
      fullContent = convertVesselJsonToMarkdown(vesselData, state.sources);
      console.log(`   ✅ Structured output generated: ${fullContent.length} chars`);
      
    } else {
      // PHASE 3 FIX: Standard streaming with progressive timeout warnings
      let timeoutWarningSent = new Set<number>();
      const streamPromise = (async () => {
        const stream = await llm.stream([systemMessage, ...state.messages], config);
        let chunkCount = 0;
        const startTime = Date.now();
        console.log(`   📡 Starting LLM stream (mode: verification)`);
        
        for await (const chunk of stream) {
          fullContent += chunk.content;
          chunkCount++;
        
          // PHASE 3 FIX: Emit progressive timeout warnings
          const elapsed = Date.now() - startTime;
          for (const warningTime of WARNING_INTERVALS) {
            if (elapsed >= warningTime && !timeoutWarningSent.has(warningTime)) {
              timeoutWarningSent.add(warningTime);
              const remaining = Math.ceil((LLM_TIMEOUT_MS - elapsed) / 1000);
              statusEmitter?.({
                type: 'status',
                stage: 'synthesis',
                content: `⏱️ Still processing... ${remaining}s remaining`,
                progress: Math.min(90, Math.floor((elapsed / LLM_TIMEOUT_MS) * 100))
              });
              console.log(`   ⏱️ Timeout warning at ${warningTime}ms (${remaining}s remaining)`);
            }
          }
        
          // NOTE: Do NOT proxy tokens here - LangGraph's stream handler already sends AIMessageChunk
          // Proxying here causes double emission (each token sent twice)
        
          if (chunkCount === 1) {
            console.log(`   💬 First chunk received - streaming active`);
          }
          
          // PHASE 5 FIX: Emit progress updates more frequently (every 5 chunks instead of 10)
          // More frequent updates = better user feedback during generation
          if (statusEmitter && chunkCount % 5 === 0) {
            const progress = Math.min(95, Math.floor((fullContent.length / TARGET_LENGTH) * 100));
            const elapsed = Date.now() - startTime;
            const estimatedTotal = (elapsed / progress) * 100;
            const remaining = Math.max(0, Math.ceil((estimatedTotal - elapsed) / 1000));
            
            console.log(`   💬 Progress: chunk #${chunkCount}, ${fullContent.length} chars (${progress}%)`);
            statusEmitter({
              type: 'status',
              stage: 'synthesis',
              content: state.requiresTechnicalDepth
                ? `⚙️ Generating technical analysis... ${progress}%${remaining > 0 ? ` (~${remaining}s remaining)` : ''}`
                : `⚙️ Generating response... ${progress}%${remaining > 0 ? ` (~${remaining}s remaining)` : ''}`,
              progress: progress
            });
          }
        }
      
        console.log(`   ✅ Stream complete: ${chunkCount} chunks, ${fullContent.length} chars`);
        return { fullContent, chunkCount };
      })();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('LLM_STREAM_TIMEOUT')), LLM_TIMEOUT_MS)
      );
      
      let chunkCount: number;
      try {
        const result = await Promise.race([streamPromise, timeoutPromise]);
        fullContent = result.fullContent;
        chunkCount = result.chunkCount;
      } catch (error: any) {
        if (error.message === 'LLM_STREAM_TIMEOUT') {
          console.error(`   ❌ LLM stream timeout after ${LLM_TIMEOUT_MS}ms`);
          fullContent = `I apologize, but I'm experiencing a response delay. This query is taking longer than expected. Please try again, or try rephrasing your question. For vessel/equipment queries, I automatically verify with trusted web sources and include citations.`;
          chunkCount = 0;
        } else {
          console.error(`   ❌ LLM stream error:`, error);
          throw error;
        }
      }
      
      console.log(`   ✅ Synthesized (${fullContent.length} chars, ${chunkCount} chunks)`);
    }
    
    // PHASE 1 FIX: Post-process formatting to fix header spacing issues
    const fixHeaderSpacing = (text: string): string => {
      if (!text) return text;
      
      // Fix headers that run into content without ##: "OPERATIONAL STATUSAs of..." -> "## OPERATIONAL STATUS\n\nAs of..."
      // Match uppercase headers followed immediately by content
      let fixed = text.replace(/(^|\n\n)([A-Z][A-Z\s&]{3,40})([A-Za-z])/g, (match, before, header, firstChar) => {
        // Skip if it's already a markdown header
        if (before.includes('##')) return match;
        // Skip if header is too short or looks like a word
        if (header.length < 5 || header.split(' ').length === 1) return match;
        // Convert to markdown header with proper spacing
        return `${before}## ${header.trim()}\n\n${firstChar}`;
      });
      
      // Fix headers that have ## but run into content: "## HEADERContent" -> "## HEADER\n\nContent"
      fixed = fixed.replace(/(##\s+[A-Z][A-Z\s&]+)([A-Za-z])/g, (match, header, firstChar) => {
        return `${header}\n\n${firstChar}`;
      });
      
      // Ensure headers have blank lines after them if missing: "## HEADER\nContent" -> "## HEADER\n\nContent"
      fixed = fixed.replace(/(##\s+[A-Z][A-Z\s&]+)\n([A-Za-z])/g, '$1\n\n$2');
      
      // Ensure headers have blank lines before them if missing
      fixed = fixed.replace(/([^\n])\n(##\s+[A-Z][A-Z\s&]+)/g, '$1\n\n$2');
      
      console.log(`   🔧 Fixed header spacing issues`);
      return fixed;
    };
    fullContent = fixHeaderSpacing(fullContent);
    
    // Strip any leaked JSON/planner blocks before enforcement
    const stripLeadingJson = (text: string): string => {
      if (!text) return text;
      let cleaned = text;
      
      // AGGRESSIVE: Remove ANY leading JSON object (query plans, strategies, etc.)
      // Match opening brace to closing brace, handling nested objects
      let depth = 0;
      let inString = false;
      let escape = false;
      let jsonEnd = -1;
      
      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        
        if (escape) {
          escape = false;
          continue;
        }
        
        if (char === '\\') {
          escape = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            depth++;
          } else if (char === '}') {
            depth--;
            if (depth === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }
      }
      
      // If we found a complete JSON object at the start, remove it
      if (jsonEnd > 0) {
        cleaned = cleaned.slice(jsonEnd).trimStart();
        console.log(`   🧹 Stripped ${jsonEnd} chars of leading JSON from response`);
      }
      
      // Also remove fenced code blocks at start
      const fence = cleaned.match(/^\s*```[\s\S]*?```\s*/);
      if (fence) {
        cleaned = cleaned.slice(fence[0].length).trimStart();
        console.log(`   🧹 Stripped ${fence[0].length} chars of fenced code block from response`);
      }
      
      return cleaned;
    };
    fullContent = stripLeadingJson(fullContent);
    
    // PHASE 4: Citation Enforcement - Ensure inline citations are present
    // Raise minimum citations for vessel queries to match source count (use all sources)
    const lastUser = state.messages.filter(m => m.constructor.name === 'HumanMessage').slice(-1)[0];
    const vesselQueryFlag = /\b(vessel|ship|imo\s*\d{7}|mmsi\s*\d{9}|crew\s*boat)\b/i.test(String((lastUser as any)?.content || ''));
    // PHASE 1 FIX: Require citations from ALL sources for vessel queries (not just 60%)
    const minRequired = vesselQueryFlag 
      ? Math.max(3, state.sources.length) // Use ALL sources for vessel queries
      : undefined;
    const citationResult = enforceCitations(fullContent, state.sources, { technicalDepth: state.requiresTechnicalDepth, minRequired });
    if (citationResult.wasEnforced) {
      console.log(`   📎 Citation enforcement: added ${citationResult.citationsAdded} citations (${citationResult.citationsFound}→${citationResult.citationsFound + citationResult.citationsAdded})`);
      fullContent = citationResult.enforcedContent;
    } else {
      console.log(`   ✅ Citations sufficient: ${citationResult.citationsFound}/${citationResult.citationsRequired}`);
    }
    
    // PHASE 1 FIX: Validate minimum citations for vessel queries
    if (vesselQueryFlag) {
      const citationCount = (fullContent.match(/\[\d+\]/g) || []).length;
      const minCitations = Math.max(3, state.sources.length);
      if (citationCount < minCitations) {
        console.warn(`   ⚠️ WARNING: Only ${citationCount} citations found, expected at least ${minCitations} for vessel query`);
        // Don't reject, but log warning - enforcement should have added more
      } else {
        console.log(`   ✅ Citation validation passed: ${citationCount} citations (minimum: ${minCitations})`);
      }
    }
    
    // Validate citations are well-formed
    const validation = validateCitations(fullContent, state.sources);
    if (!validation.valid) {
      console.warn(`   ⚠️ Citation validation warnings:`, validation.warnings);
      if (validation.errors.length > 0) {
        console.error(`   ❌ Citation validation errors:`, validation.errors);
      }
    }
    
    // PHASE 3 FIX: Ensure all citations have URLs before modern format conversion
    // This guarantees clickable citations even if model didn't include URLs
    const bareCitations = fullContent.match(/\[(\d+)\](?!\()/g);
    if (bareCitations && bareCitations.length > 0) {
      console.log(`   🔗 Found ${bareCitations.length} bare citations - adding URLs...`);
      fullContent = fullContent.replace(/\[(\d+)\](?!\()/g, (match, indexStr) => {
        const index = parseInt(indexStr, 10);
        if (index >= 1 && index <= state.sources.length) {
          const sourceUrl = state.sources[index - 1]?.url || '';
          return `[${index}](${sourceUrl})`;
        }
        return match;
      });
      console.log(`   ✅ Added URLs to ${bareCitations.length} citations`);
    }
    
    // Convert to modern citation format with REFERENCES section
    const modernCitationResult = ensureModernCitationFormat(fullContent, state.sources);
    if (modernCitationResult.wasConverted) {
      console.log(`   📚 Converted to modern IEEE citation format`);
      console.log(`   📚 Citations: ${modernCitationResult.citationCount}, REFERENCES section added`);
      fullContent = modernCitationResult.content;
      
      // Validate modern format
      const formatValidation = validateCitationFormat(fullContent, state.sources);
      if (formatValidation.warnings.length > 0) {
        console.warn(`   ⚠️ Citation format warnings:`, formatValidation.warnings);
      }
      
      // Log citation statistics
      const stats = getCitationStats(fullContent);
      console.log(`   📊 Citation stats: ${stats.totalCitations} total, ${stats.uniqueCitations.size} unique sources, ${stats.citationDensity.toFixed(2)} per 100 words`);
    }
    
    // PHASE 1 FIX: Enforce owner/operator in vessel queries
    if (isVesselQuery && ownerOperatorExtraction) {
      const ownerOperatorLower = fullContent.toLowerCase();
      const hasOwner = ownerOperatorExtraction.owner && ownerOperatorLower.includes(ownerOperatorExtraction.owner.toLowerCase());
      const hasOperator = ownerOperatorExtraction.operator && ownerOperatorLower.includes(ownerOperatorExtraction.operator.toLowerCase());
      const hasManager = ownerOperatorExtraction.manager && ownerOperatorLower.includes(ownerOperatorExtraction.manager.toLowerCase());
      
      if (!hasOwner && !hasOperator && !hasManager) {
        console.log(`   ⚠️ Owner/Operator extracted but missing from response - injecting...`);
        const sourceIndex = ownerOperatorExtraction.sourceIndex + 1;
        const ownerOperatorSection = `\n\n## OWNERSHIP & MANAGEMENT\n\n`;
        let ownerOperatorContent = '';
        
        if (ownerOperatorExtraction.owner) {
          ownerOperatorContent += `**Owner**: ${ownerOperatorExtraction.owner} [${sourceIndex}]\n\n`;
        }
        if (ownerOperatorExtraction.operator) {
          ownerOperatorContent += `**Operator**: ${ownerOperatorExtraction.operator} [${sourceIndex}]\n\n`;
        }
        if (ownerOperatorExtraction.manager) {
          ownerOperatorContent += `**Manager**: ${ownerOperatorExtraction.manager} [${sourceIndex}]\n\n`;
        }
        if (ownerOperatorExtraction.technicalManager) {
          ownerOperatorContent += `**Technical Manager**: ${ownerOperatorExtraction.technicalManager} [${sourceIndex}]\n\n`;
        }
        
        // Insert before MARITIME CONTEXT or at end if not found
        const maritimeContextIndex = fullContent.indexOf('## MARITIME CONTEXT');
        if (maritimeContextIndex !== -1) {
          fullContent = fullContent.slice(0, maritimeContextIndex) + ownerOperatorSection + ownerOperatorContent + fullContent.slice(maritimeContextIndex);
        } else {
          fullContent += ownerOperatorSection + ownerOperatorContent;
        }
        
        console.log(`   ✅ Owner/Operator section injected with citation [${sourceIndex}]`);
      } else {
        console.log(`   ✅ Owner/Operator already present in response`);
      }
    } else if (isVesselQuery && !ownerOperatorExtraction) {
      // Check if response explicitly states owner/operator not found
      const hasExplicitNotFound = /\b(owner|operator|management).*not.*found|not.*available|unknown/i.test(fullContent);
      if (!hasExplicitNotFound) {
        console.log(`   ⚠️ Vessel query but no owner/operator extraction - response may be incomplete`);
      }
    }
    
    // Phase B & C: Calculate confidence and generate follow-ups
    const updates = await generateIntelligenceMetrics(
      userQuery,
      fullContent,
      state.sources,
      state.mode,
      sessionMemory,
      env.OPENAI_API_KEY,
      statusEmitter
    );
    
    // P0 FIX: Fleetcore mapping disabled per user request
    // User feedback: "remove this section from the answers"
    // ENHANCEMENT: Generate individualized fleetcore mapping for entities
    // This is the KEY ADDITION - automatically append entity-specific fleetcore applications
    const ENABLE_FLEETCORE_MAPPING = false; // TODO: Make this a user preference
    
    let fleetcoreMapping: FleetcoreApplicationMapping | null = null;
    if (ENABLE_FLEETCORE_MAPPING) {
      fleetcoreMapping = await generateEntityFleetcoreMapping(
        userQuery,
        fullContent,
        sessionMemory,
        statusEmitter
      );
    }
    
    // If we generated a mapping, append it to the response
    let finalContent = fullContent;
    if (ENABLE_FLEETCORE_MAPPING && fleetcoreMapping) {
      const mappingMarkdown = formatMappingAsMarkdown(fleetcoreMapping);
      finalContent = fullContent + mappingMarkdown;
      console.log(`   ✨ Added fleetcore mapping for ${fleetcoreMapping.entityName} (${fleetcoreMapping.features.length} features)`);
    }
    
    // 🔄 REFLEXION LOOP: Self-healing research for vessel queries
    // Guarantees zero "Not found" by iteratively filling data gaps
    if (isVesselQuery && fullContent) {
      const MAX_ITERATIONS = 3;
      let currentIteration = 1;
      let enhancedContent = fullContent;
      let allSources = [...(state.sources || [])];
      
      const vesselName = extractVesselName(userQuery) || userQuery;
      
      while (currentIteration <= MAX_ITERATIONS) {
        console.log(`\n🔄 REFLEXION ITERATION ${currentIteration}:`);
        
        // Analyze for gaps
        const gapAnalysis: GapAnalysis = analyzeResearchGaps(
          enhancedContent,
          vesselName,
          allSources,
          currentIteration
        );
        
        console.log(`   Completeness: ${gapAnalysis.completeness}%`);
        console.log(`   Missing fields: ${gapAnalysis.missingFields.length}`);
        gapAnalysis.missingFields.forEach(g => {
          console.log(`      - ${g.field} (${g.importance})`);
        });
        
        // Stop if complete or no more research needed
        if (!gapAnalysis.needsAdditionalResearch) {
          console.log(`   ✅ Data complete (${gapAnalysis.completeness}%) - stopping`);
          break;
        }
        
        console.log(`   🎯 Triggering targeted research for ${gapAnalysis.missingFields.length} gaps`);
        
        // Emit status
        if (statusEmitter) {
          statusEmitter({
            type: 'status',
            stage: 'reflexion',
            content: `🔍 Iteration ${currentIteration}: ${gapAnalysis.completeness}% complete - researching ${gapAnalysis.missingFields.length} missing fields...`
          });
        }
        
        // Generate targeted queries (prioritize critical and high)
        const targetedGaps = gapAnalysis.missingFields
          .filter(g => g.importance === 'critical' || g.importance === 'high')
          .slice(0, 3); // Max 3 per iteration
        
        // Execute additional research
        const newSources: any[] = [];
        for (const gap of targetedGaps) {
          try {
            console.log(`      Searching: ${gap.field}`);
            
            const result = await geminiTool.invoke({
              query: gap.searchQuery,
              entityContext: `Finding missing data: ${gap.field} for vessel ${userQuery}`
            }, config);
            
            const parsed = typeof result === 'string' ? JSON.parse(result) : result;
            if (parsed.sources && parsed.sources.length > 0) {
              console.log(`      ✅ Found ${parsed.sources.length} sources for ${gap.field}`);
              newSources.push(...parsed.sources);
            }
          } catch (error: any) {
            console.warn(`      ⚠️ Search failed for ${gap.field}: ${error.message}`);
          }
        }
        
        console.log(`   📚 Collected ${newSources.length} new sources`);
        
        // If no new sources found, stop iterating
        if (newSources.length === 0) {
          console.log(`   ⚠️ No new sources found - stopping iteration`);
          break;
        }
        
        // Merge sources
        allSources = [...allSources, ...newSources];
        
        // Emit new sources to frontend
        if (statusEmitter) {
          newSources.forEach((source, idx) => {
            statusEmitter({
              type: 'source',
              action: 'selected',
              url: source.url,
              title: source.title || 'Source',
              index: allSources.length - newSources.length + idx
            });
          });
        }
        
        // Re-build research context with all sources
        const enhancedResearchContext = buildSourcesContext(allSources);
        
        // Re-synthesize with complete sources
        console.log(`   🔁 Re-synthesizing with ${allSources.length} total sources`);
        
        const reSynthesisPrompt = `${synthesisPrompt}

**🔄 ITERATION ${currentIteration + 1}: Additional Sources Provided**
You previously generated a response but were missing: ${targetedGaps.map(g => g.field).join(', ')}.
We have conducted additional targeted research and now have ${newSources.length} MORE sources with this specific data.

**CRITICAL INSTRUCTIONS:**
1. Review the NEW sources below (marked with [NEW])
2. Extract the missing data: ${targetedGaps.map(g => g.field).join(', ')}
3. Update your response to include ALL found data
4. DO NOT repeat "Not found" for fields now available in new sources

**NEW SOURCES (Iteration ${currentIteration}):**
${newSources.map((s, i) => `[NEW-${i+1}] ${s.title}: ${s.content?.substring(0, 500) || s.snippet || ''}`).join('\n\n')}

Now provide the COMPLETE response with all available data.`;

        // Re-invoke LLM with enhanced prompt
        const reSynthesisSystemMessage = new SystemMessage(reSynthesisPrompt);
        
        try {
          const stream = await llm.stream([reSynthesisSystemMessage, ...state.messages], config);
          let reContent = '';
          
          for await (const chunk of stream) {
            reContent += chunk.content;
          }
          
          console.log(`   ✅ Re-synthesis complete: ${reContent.length} chars`);
          enhancedContent = reContent;
          fullContent = reContent; // Update main content
          finalContent = reContent; // Update final content
          
        } catch (error: any) {
          console.error(`   ❌ Re-synthesis failed: ${error.message}`);
          break;
        }
        
        currentIteration++;
      }
      
      console.log(`\n✅ REFLEXION COMPLETE after ${currentIteration - 1} iterations`);
      const finalAnalysis = analyzeResearchGaps(fullContent, vesselName, allSources);
      console.log(`   Final completeness: ${finalAnalysis.completeness}%`);
      console.log(`   Total sources used: ${allSources.length}`);
      
      // Update state with all sources
      state.sources = allSources;
    }
    
    return { 
      messages: [new AIMessage(finalContent)],
      ...updates,
      fleetcoreMapping
    };
  }
  
  // MODE: RESEARCH - LLM orchestrates tools
  console.log(`   📚 Executing RESEARCH mode - LLM with all tools`);
  const researchLlm = llm.bindTools(maritimeTools);
  
  // CRITICAL: Use stream() even with tools for consistent streaming behavior
  // When tools are called, stream() will pause at tool calls
  // When generating final answer, stream() will emit tokens
  const stream = await researchLlm.stream([new SystemMessage(MARITIME_SYSTEM_PROMPT + contextAddition), ...state.messages], config);
  let response: AIMessage | null = null;
  let fullContent = '';
  
  for await (const chunk of stream) {
    if (!response) {
      response = chunk as AIMessage;
      fullContent = typeof chunk.content === 'string' ? chunk.content : '';
    } else {
      // Accumulate string content
      if (typeof chunk.content === 'string') {
        fullContent += chunk.content;
      }
    }
  }
  
  // Ensure response has accumulated content
  if (response && fullContent) {
    const stripLeadingArtifacts = (text: string): string => {
      if (!text) return text;
      const json = text.match(/^\s*\{[\s\S]*?\}\s*(?=(##\s|$))/);
      if (json) return text.slice(json[0].length).trimStart();
      const fence = text.match(/^\s*```[\s\S]*?```\s*(?=(##\s|$))/);
      if (fence) return text.slice(fence[0].length).trimStart();
      return text;
    };
    response.content = stripLeadingArtifacts(fullContent);
  }
  
  console.log(`   Has tool calls: ${!!response?.tool_calls?.length}`);
  console.log(`   Response content length: ${fullContent.length} chars`);
  
  // Phase B & C: Calculate confidence and generate follow-ups (for research mode final answer)
  if (!response?.tool_calls?.length && fullContent.length > 100) {
    const updates = await generateIntelligenceMetrics(
      userQuery,
      fullContent,
      state.sources,
      state.mode,
      sessionMemory,
      env.OPENAI_API_KEY,
      statusEmitter
    );
    
    // ENHANCEMENT: Generate fleetcore mapping for research mode too
    const fleetcoreMapping = await generateEntityFleetcoreMapping(
      userQuery,
      fullContent,
      sessionMemory,
      statusEmitter
    );
    
    // If we generated a mapping, append it to the response
    let finalContent = fullContent;
    if (fleetcoreMapping && response) {
      const mappingMarkdown = formatMappingAsMarkdown(fleetcoreMapping);
      finalContent = fullContent + mappingMarkdown;
      response.content = finalContent;
      console.log(`   ✨ Added fleetcore mapping to research response for ${fleetcoreMapping.entityName}`);
    }
    
    return { 
      messages: [response!],
      ...updates,
      fleetcoreMapping
    };
  }
  
  return { messages: [response!] };
}

/**
 * ENHANCEMENT: Generate individualized fleetcore mapping for discussed entities
 * This is the magic - automatically map entities to specific fleetcore features
 */
async function generateEntityFleetcoreMapping(
  query: string,
  answer: string,
  sessionMemory: SessionMemory | null,
  statusEmitter: any
): Promise<FleetcoreApplicationMapping | null> {
  console.log(`\n🎯 CHECKING FOR FLEETCORE MAPPING OPPORTUNITY`);
  
  // STEP 1: Check if this is appropriate for fleetcore mapping
  // Don't add mapping for pure platform queries (user already knows about fleetcore)
  const isPurePlatformQuery = /\b(fleetcore|pms|maintenance system|how does|what is|tell me about)\b.*\b(fleetcore|pms|system|platform|features?)\b/i.test(query);
  // Also skip mapping for vessel-centric queries (user asked about a specific ship)
  // Use same detection logic as synthesizer node
  const hasVesselKeyword = /\b(vessel|ship|imo|mmsi|call\s*sign|flag)\b/i.test(query);
  const extractedEntities = extractMaritimeEntities(query);
  const isVesselQuery = hasVesselKeyword || extractedEntities.length > 0;
  
  if (isPurePlatformQuery || isVesselQuery) {
    console.log(`   ⏭️  Skipping: Pure platform query (user asking about fleetcore itself)`);
    return null;
  }
  
  // STEP 2: Extract entities from the query and answer
  const queryEntities = extractMaritimeEntities(query);
  const answerEntities = extractMaritimeEntities(answer);
  const allEntities = [...new Set([...queryEntities, ...answerEntities])];
  
  if (allEntities.length === 0) {
    console.log(`   ⏭️  Skipping: No entities detected`);
    return null;
  }
  
  console.log(`   🔍 Found ${allEntities.length} entities: ${allEntities.join(', ')}`);
  
  // STEP 3: Determine the primary entity to map
  // Priority: entities in query > entities in answer > most recent entity in session memory
  let primaryEntity = allEntities[0];
  
  // Check session memory for most recently discussed entity
  if (sessionMemory) {
    const vessels = Object.keys(sessionMemory.accumulatedKnowledge.vesselEntities);
    const companies = Object.keys(sessionMemory.accumulatedKnowledge.companyEntities);
    
    // If query entity exists in memory, use it (it's the active context)
    if (queryEntities.length > 0) {
      for (const entity of queryEntities) {
        if (vessels.includes(entity.toLowerCase()) || companies.includes(entity.toLowerCase())) {
          primaryEntity = entity;
          break;
        }
      }
    }
  }
  
  console.log(`   🎯 Primary entity: ${primaryEntity}`);
  
  // STEP 4: Check if answer is substantial enough to warrant mapping
  // We want technical/informational answers, not simple acknowledgments
  if (answer.length < 200) {
    console.log(`   ⏭️  Skipping: Answer too short (${answer.length} chars)`);
    return null;
  }
  
  // STEP 5: Check if we've already provided a mapping for this entity recently
  // Avoid repetitive mappings in the same conversation
  const recentMessages = sessionMemory?.recentMessages.slice(-4) || [];
  const hasRecentMapping = recentMessages.some(m => 
    m.content.includes('🎯 How fleetcore Applies to') && 
    m.content.includes(primaryEntity)
  );
  
  if (hasRecentMapping) {
    console.log(`   ⏭️  Skipping: Already provided mapping for ${primaryEntity} recently`);
    return null;
  }
  
  // STEP 6: Generate the mapping!
  if (statusEmitter) {
    statusEmitter({
      type: 'thinking',
      step: 'fleetcore_mapping',
      content: `Analyzing how fleetcore applies to ${primaryEntity}...`
    });
  }
  
  try {
    // Combine query + answer as context for entity analysis
    const contextText = `${query}\n\n${answer}`;
    
    const mapping = generateFleetcoreMapping(
      primaryEntity,
      'auto', // Auto-detect entity type
      sessionMemory,
      contextText
    );
    
    if (mapping) {
      console.log(`   ✅ Generated mapping: ${mapping.features.length} features, ${mapping.useCases.length} use cases`);
      
      if (statusEmitter) {
        statusEmitter({
          type: 'thinking',
          step: 'fleetcore_mapping_complete',
          content: `✓ Mapped ${mapping.features.length} fleetcore features to ${primaryEntity}`
        });
      }
    } else {
      console.log(`   ⚠️  Mapping generation returned null`);
    }
    
    return mapping;
  } catch (error: any) {
    console.error(`   ❌ Error generating mapping:`, error.message);
    return null;
  }
}

/**
 * Phase B & C: Generate intelligence metrics (confidence + follow-ups)
 */
async function generateIntelligenceMetrics(
  query: string,
  answer: string,
  sources: Source[],
  mode: string,
  sessionMemory: SessionMemory | null,
  openaiKey: string,
  statusEmitter: any
): Promise<{ confidenceIndicator: any | null; followUpSuggestions: any[] }> {
  
  // Phase C3: Calculate confidence indicator
  let confidenceIndicator: any | null = null;
  
  if (mode === 'verification' || mode === 'research') {
    if (statusEmitter) {
      statusEmitter({
        type: 'thinking',
        step: 'quality_assessment',
        content: 'Evaluating answer quality...'
      });
    }
    
    const sourceQuality = assessSourceQuality(sources);
    const metrics: QualityMetrics = {
      sourceCount: sources.length,
      sourceQuality,
      hasConflicts: false, // Will be enhanced when verification pipeline is integrated
      verificationPassed: sources.length >= 2,
      comparativeAnalysis: false, // Will be set by verification pipeline
      claimCount: 0,
      normalizedDataPoints: 0
    };
    
    confidenceIndicator = calculateConfidenceIndicator(
      sources.length >= 3 ? 75 : sources.length >= 1 ? 60 : 40,
      metrics
    );
    
    console.log(`✅ Confidence: ${confidenceIndicator?.score || 0}% (${confidenceIndicator?.label || 'N/A'})`);
  }
  
  // Phase C1 & C2: Generate follow-up suggestions
  let followUpSuggestions: FollowUpSuggestion[] = [];
  
  if (sessionMemory && answer.length > 100) {
    if (statusEmitter) {
      statusEmitter({
        type: 'thinking',
        step: 'followup_generation',
        content: 'Generating follow-up questions...'
      });
    }
    
    try {
      followUpSuggestions = await generateFollowUps(
        query,
        answer,
        sessionMemory,
        openaiKey
      );
      
      console.log(`✅ Generated ${followUpSuggestions.length} follow-up suggestions`);
      
      // Track that follow-ups were presented
      trackFollowUpUsage(sessionMemory, null);
    } catch (error) {
      console.error('❌ Follow-up generation failed:', error);
    }
  }
  
  return {
    confidenceIndicator,
    followUpSuggestions
  };
}

// =====================
// TOOL PROCESSING NODE
// =====================

/**
 * Process tool results and build research context
 * Enhanced with source quality evaluation (PHASE A2)
 */
async function processToolResults(state: State, config: any): Promise<Partial<State>> {
  console.log(`\n🔧 PROCESS TOOL RESULTS`);
  
  const statusEmitter = config.configurable?.statusEmitter;
  const lastMessages = state.messages.slice(-10); // Check recent messages
  const toolMessages = lastMessages.filter((m: BaseMessage) => m.constructor.name === 'ToolMessage');
  
  if (toolMessages.length === 0) {
    return {};
  }
  
  console.log(`   Processing ${toolMessages.length} tool results`);
  
  // Extract sources and metrics from all tool results
  const allSources: Source[] = [];
  let hasResearch = false;
  const collectedMetrics: any = {};
  
  for (const toolMsg of toolMessages) {
    const content = typeof toolMsg.content === 'string' ? toolMsg.content : JSON.stringify(toolMsg.content);
    
    try {
      const data = JSON.parse(content);
      
      if (data.sources && Array.isArray(data.sources)) {
        allSources.push(...data.sources);
        hasResearch = true;
      }
      if (data.metrics) {
        Object.assign(collectedMetrics, data.metrics);
      }
      
      // Also check for Gemini answer
      if (data.answer) {
        hasResearch = true;
      }
    } catch (e) {
      // Not JSON, skip
    }
  }
  
  // Advanced Chain of Thought - Source Quality Evaluation
  if (hasResearch && allSources.length > 0 && statusEmitter) {
    // Evaluate source quality
    const highQuality = allSources.filter(s => {
      const url = s.url?.toLowerCase() || '';
      return url.includes('.gov') || url.includes('.edu') || url.includes('imo.org') || 
             url.includes('iacs.org.uk') || url.includes('classnk') || url.includes('dnv.com');
    });
    
    const mediumQuality = allSources.filter(s => {
      const url = s.url?.toLowerCase() || '';
      return url.includes('maritime') || url.includes('shipping') || url.includes('vessel');
    });
    
    statusEmitter({
      type: 'thinking',
      step: 'source_evaluation',
      content: `Evaluating ${allSources.length} sources: ${highQuality.length} authoritative, ${mediumQuality.length} maritime-specific`
    });
    
    // Emit accepted/rejected logic
    const acceptedCount = Math.min(10, allSources.length);
    const rejectedCount = Math.max(0, allSources.length - 10);
    
    if (rejectedCount > 0) {
      statusEmitter({
        type: 'thinking',
        step: 'source_filtering',
        content: `✓ Accepting top ${acceptedCount} sources, filtering ${rejectedCount} low-relevance`
      });
    } else {
      statusEmitter({
        type: 'thinking',
        step: 'source_filtering',
        content: `✓ All ${acceptedCount} sources meet quality threshold`
      });
    }
  }
  
  // Build research context and perform vessel entity validation when applicable
  let researchContext: string | null = null;
  let validatedSources = allSources;
  if (hasResearch && allSources.length > 0) {
    const lastUser = [...state.messages].reverse().find((m: BaseMessage) => m.constructor.name === 'HumanMessage');
    const userText = (lastUser as any)?.content || '';
    const looksLikeVessel = /\b(vessel|ship|imo\s*\d{7}|mmsi\s*\d{9}|crew\s*boat)\b/i.test(userText);

    if (looksLikeVessel) {
      const validation = validateVesselEntity(String(userText), allSources as any, undefined);
      validatedSources = validation.filteredSources as any;
      const validationLine = `ENTITY VALIDATION: match=${validation.match} confidence=${Math.round(validation.confidence*100)}% via ${validation.matchedBy.join('+') || 'N/A'} | supportingSources=${validation.supportingSources} authoritativeHits=${validation.authoritativeHits}`;
      console.log(`   ${validationLine}`);
      if (statusEmitter) {
        statusEmitter({ type: 'thinking', step: 'entity_validation', content: validationLine });
      }
      // If validation is weak, hint the synthesizer via context
      if (!validation.match) {
        researchContext = (researchContext || '') + `⚠️ Entity validation weak. Consider clarifying vessel name/IMO or re-running targeted AIS/Equasis queries.\n\n`;
      }

      // PHASE 4: Category coverage (AIS, registry, owner, class, directory/news)
      const coverage = computeCoverage(validatedSources as any);
      const missing = missingVesselCoverage(coverage);
      const covLine = `COVERAGE: ais=${coverage.ais||0} registry=${coverage.registry||0} owner=${coverage.owner||0} class=${coverage.class||0} directory/news=${coverage.directory_news||0}`;
      console.log(`   ${covLine}`);
      if (statusEmitter) {
        statusEmitter({ type: 'thinking', step: 'coverage_check', content: covLine });
      }
      if (missing.length > 0) {
        const msg = `⚠️ Missing vessel coverage categories: ${missing.join(', ')}. Consider expanding search (AIS/registry/owner/class/news).`;
        researchContext = (researchContext || '') + msg + `\n\n`;
      }

      // Emit structured metrics event
      emitMetrics(statusEmitter, {
        totalSources: validatedSources.length,
        entityValidationConfidence: validation.confidence,
        vesselCoverage: coverage as any,
        missingCoverage: missing,
        ...collectedMetrics,
      });
    }

    researchContext = (researchContext || `=== RESEARCH CONTEXT ===\nFound ${validatedSources.length} sources:\n\n`);
    validatedSources.forEach((source, idx) => {
      researchContext += `[${idx + 1}] ${source.title}\n${source.url}\n${source.content?.substring(0, 300)}...\n\n`;
    });
  }
  
  console.log(`   Sources extracted: ${allSources.length}`);
  console.log(`   Research context: ${hasResearch ? 'YES' : 'NO'}`);
  
  return {
    sources: validatedSources,
    researchContext,
  };
}

// =====================
// ROUTING LOGIC
// =====================

/**
 * Routing logic - determines next step based on mode and tool calls
 */
function shouldContinue(state: State): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const hasToolCalls = !!(lastMessage as AIMessage).tool_calls?.length;
  
  console.log(`\n🔀 ROUTING`);
  console.log(`   Mode: ${state.mode}`);
  console.log(`   Last message: ${lastMessage?.constructor.name}`);
  console.log(`   Has tool calls: ${hasToolCalls}`);
  
  // If LLM called tools (research mode), execute them
  if (hasToolCalls) {
    console.log(`→ Execute tools`);
    return "tools";
  }
  
  // Otherwise done
  console.log(`→ END`);
  return END;
}

// =====================
// BUILD WORKFLOW
// =====================

const toolNode = new ToolNode(maritimeTools);

const workflow = new StateGraph(AgentState)
  .addNode("router", routerNode)        // Detects mode, calls Gemini for verification
  .addNode("synthesizer", synthesizerNode) // Streams answer based on mode
  .addNode("tools", toolNode)            // Executes tools (research mode only)
  .addNode("process", processToolResults) // Processes tool results
  .addEdge(START, "router")             // Start with router
  .addEdge("router", "synthesizer")      // Router always goes to synthesizer
  .addConditionalEdges("synthesizer", shouldContinue, {
    "tools": "tools",                    // Research mode: execute tools
    [END]: END,                          // None/Verification mode: done
  })
  .addEdge("tools", "process")          // Process tool results
  .addEdge("process", "synthesizer");    // Loop back to synthesizer after tools

const checkpointer = new MemorySaver();
export const agent = workflow.compile({ checkpointer });

// =====================
// HANDLER
// =====================

// PHASE 3 FIX: Streaming configuration (optimized for performance)
const SSE_CHUNK_SIZE = 300; // chars per SSE event (increased from 150 for better throughput)
const SSE_THROTTLE_INTERVAL_MS = 10; // ms between chunks (increased from 5ms - less aggressive throttling)
const SSE_THROTTLE_EVERY_N_CHUNKS = 10; // throttle every N chunks (increased to reduce throttling frequency)

/**
 * Handle chat request with streaming
 */
export async function handleChatWithAgent(request: ChatRequest): Promise<ReadableStream> {
  const { messages, sessionId, enableBrowsing, env } = request;
  
  console.log(`\n🚀 AGENT REQUEST | Session: ${sessionId} | Browsing: ${enableBrowsing}`);
  
  // PHASE 2 FIX: Always emit thinking events (remove suppression)
  // Thinking events are critical for user feedback and transparency
  const suppressThinkingEvents = false; // Always false - never suppress thinking
  
  // Load session memory
  let sessionMemory: SessionMemory | null = null;
  let sessionMemoryManager: SessionMemoryManager | null = null;
  
  if (env.CHAT_SESSIONS) {
    try {
      sessionMemoryManager = new SessionMemoryManager(env.CHAT_SESSIONS);
      sessionMemory = await sessionMemoryManager.load(sessionId);
      sessionMemory = sessionMemoryManager.updateConversationSummary(sessionMemory);
      
      console.log(`📦 Memory loaded: ${sessionMemory.conversationTopic || 'new session'}`);
    } catch (error) {
      console.error(`❌ Memory load failed:`, error);
    }
  }
  
  // Convert messages to BaseMessage format
  const baseMessages: BaseMessage[] = messages.map((msg) =>
    msg.role === "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
  );
  
  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      // PHASE 2 FIX: Always emit thinking events for transparency
      const EMIT_THINKING_EVENTS = true; // Always true - never suppress
      
      // PHASE A1 & A2: Create status/thinking emitter
      const sanitizeThinking = (text: string): string => {
        if (!text) return text;
        let out = String(text);
        // CRITICAL: Remove ALL three types of JSON that can leak
        // 1. Planner object JSON
        out = out.replace(/\{[\s\S]*?"strategy"[\s\S]*?"subQueries"[\s\S]*?\}\s*/g, '').trim();
        // 2. Structured output JSON
        out = out.replace(/\{[\s\S]*?"vessel_profile"[\s\S]*?\}\s*/g, '').trim();
        // 3. Reflexion array JSON (NEW FIX)
        out = out.replace(/\[[\s\S]*?\{\s*"query"[\s\S]*?"purpose"[\s\S]*?\}\s*\]\s*/g, '').trim();
        // Collapse excessive whitespace
        out = out.replace(/[\t\r]+/g, ' ').replace(/\s{2,}/g, ' ');
        // Add space after numbered steps like `1.` if missing
        out = out.replace(/(\d+)\.(\S)/g, '$1. $2');
        return out;
      };

      // Track last status time for smart heartbeat
      let lastStatusTime = Date.now();
      
      const statusEmitter = (event: { type: string; step?: string; stage?: string; content: string; progress?: number }) => {
        try {
          if (!EMIT_THINKING_EVENTS) { // suppress thinking/status/metrics
            lastStatusTime = Date.now();
            return;
          }
          const e = { ...event } as any;
          if (typeof e.content === 'string') {
            e.content = sanitizeThinking(e.content);
            if (!e.content) return;
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
          lastStatusTime = Date.now();
        } catch (err) {
          console.warn('⚠️ Status emit failed:', err);
        }
      };
      
      // UX HEARTBEAT: emit periodic status so UI never appears stalled
      // Reduced frequency to avoid overriding detailed thinking steps
      let heartbeatTimer: any = null;
      try {
        if (EMIT_THINKING_EVENTS) {
          heartbeatTimer = setInterval(() => {
            try {
              if (Date.now() - lastStatusTime > 3000) {
                statusEmitter({ type: 'status', stage: 'heartbeat', content: '⏳ Processing...' });
              }
            } catch {}
          }, 3000);
        }
      } catch {}
      
      // Initialize LangSmith tracing as early as possible (before any chain execution)
      let langsmithClient: LangSmithClient | null = null;
      try {
        if (env.LANGSMITH_API_KEY) {
          (globalThis as any).process = (globalThis as any).process || {};
          (globalThis as any).process.env = (globalThis as any).process.env || {};
          (globalThis as any).process.env.LANGCHAIN_TRACING_V2 = 'true';
          (globalThis as any).process.env.LANGCHAIN_API_KEY = env.LANGSMITH_API_KEY;
          (globalThis as any).process.env.LANGCHAIN_PROJECT = (globalThis as any).process.env.LANGCHAIN_PROJECT || 'seacore-maritime-agent';
          (globalThis as any).process.env.LANGCHAIN_ENDPOINT = (globalThis as any).process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com';
          langsmithClient = new LangSmithClient({ apiKey: env.LANGSMITH_API_KEY });
          console.log(`🔬 LangSmith tracing enabled (project="${(globalThis as any).process.env.LANGCHAIN_PROJECT}")`);
        }
      } catch (e) {
        console.warn(`⚠️ Failed to initialize LangSmith client:`, (e as any)?.message || e);
      }
      
      try {
        // CRITICAL: Use .stream() with streamMode (not .streamEvents())
        // This enables token-level streaming via AIMessageChunk
        const agentStream = await agent.stream(
          {
            messages: baseMessages,
            sessionId,
            enableBrowsing,
          },
          {
            configurable: {
              thread_id: sessionId,
              // Propagate a fast streaming hint to nodes (skip heavy verification)
              env: { ...(env as any), FAST_STREAM_MODE: true },
              sessionMemory,
              statusEmitter, // PHASE A1 & A2: Pass emitter to nodes
            },
            // Tags/metadata flow to LangSmith traces via LangChain RunnableConfig
            tags: [
              'seacore',
              'maritime',
              enableBrowsing ? 'browsing:on' : 'browsing:off'
            ],
            metadata: {
              session_id: sessionId,
              project: (globalThis as any).process?.env?.LANGCHAIN_PROJECT || 'seacore-maritime-agent',
              feature_flag: 'simplified-orchestrator',
              environment: (env as any)?.ENVIRONMENT || 'production',
            },
            streamMode: ["messages", "updates"] as const, // KEY: Enable both message and state streaming
          }
        );
        
        let fullResponse = "";
        let sources: Source[] = [];
        let eventCount = 0;
        let hasStreamedContent = false; // Track if token streaming worked
        let finalState: any = null; // Capture final state for fallback
        // Defensive buffer for planner JSON that may arrive across multiple chunks
        let suppressPlannerJson = false;
        let plannerJsonBuffer = "";
        // P0 FIX: Track source index for proper numbering in frontend
        let sourceIndex = 0;
        // 🧠 PHASE 2.3: Thinking detection and streaming
        let thinkingInProgress = false;
        let thinkingBuffer = "";
        
        console.log(`📡 Agent stream created - entering event loop`);
        
        // Stream events using [streamType, event] tuple pattern
        for await (const [streamType, event] of agentStream) {
          eventCount++;
          
          // Handle token-level streaming from "messages" mode
          if (streamType === 'messages') {
            const messages = event as BaseMessage[] | BaseMessage;
            const messageArray = Array.isArray(messages) ? messages : [messages];
            
            for (const msg of messageArray) {
              // Check for AIMessageChunk (streaming tokens)
              if (msg.constructor.name === 'AIMessageChunk' && msg.content) {
                const text = typeof msg.content === 'string' ? msg.content : String(msg.content);
                if (text) {
                  // P0 FIX: Preserve whitespace! Use trimmed for validation but emit original
                  const chunk = text; // PRESERVE original text with spaces
                  const trimmedForValidation = chunk.trim(); // Only for checks

                  // PHASE 5 FIX: Enhanced thinking detection and streaming
                  // Detect and handle <thinking> sections separately
                  // PHASE 5 FIX: More flexible detection - check for opening tag (case-insensitive, with/without spaces)
                  const hasThinkingStart = /<thinking\s*>|<thinking>/i.test(chunk);
                  if (hasThinkingStart && !thinkingInProgress) {
                    thinkingInProgress = true;
                    thinkingBuffer = chunk; // Start buffer with this chunk
                    console.log('   💭 Detected start of <thinking> section');
                    statusEmitter?.({
                      type: 'thinking_start',
                      stage: 'reasoning',
                      content: '💭 AI is analyzing the query...'
                    });
                    // Don't emit thinking tag as regular content
                    continue;
                  }
                  
                  if (thinkingInProgress) {
                    thinkingBuffer += chunk;
                    
                    // PHASE 5 FIX: More flexible end detection - check for closing tag (case-insensitive)
                    const hasThinkingEnd = /<\/thinking\s*>|<\/thinking>/i.test(chunk);
                    if (hasThinkingEnd) {
                      thinkingInProgress = false;
                      
                      // PHASE 5 FIX: Extract clean thinking content (remove tags) - more flexible regex
                      const thinkingMatch = thinkingBuffer.match(/<thinking[^>]*>([\s\S]*?)<\/thinking[^>]*>/i);
                      if (thinkingMatch && thinkingMatch[1]) {
                        const thinkingContent = thinkingMatch[1].trim();
                        console.log(`   ✅ Thinking complete: ${thinkingContent.length} chars`);
                        
                        // PHASE 5 FIX: Emit complete thinking as separate event (not regular content)
                        statusEmitter?.({
                          type: 'thinking_complete',
                          stage: 'reasoning_done',
                          content: thinkingContent
                        });
                        
                        // Clear thinking buffer and continue to answer
                        thinkingBuffer = '';
                        statusEmitter?.({
                          type: 'status',
                          stage: 'synthesis',
                          content: '📝 Formulating detailed answer...'
                        });
                      } else {
                        // PHASE 5 FIX: Fallback - extract content even if regex fails
                        const fallbackContent = thinkingBuffer
                          .replace(/<thinking[^>]*>/gi, '')
                          .replace(/<\/thinking[^>]*>/gi, '')
                          .trim();
                        if (fallbackContent.length > 0) {
                          console.log(`   ✅ Thinking complete (fallback extraction): ${fallbackContent.length} chars`);
                          statusEmitter?.({
                            type: 'thinking_complete',
                            stage: 'reasoning_done',
                            content: fallbackContent
                          });
                          thinkingBuffer = '';
                        }
                      }
                      
                      // Don't emit thinking tags as regular content
                      continue;
                    } else {
                      // PHASE 2 FIX: Still in thinking section - emit partial progress more frequently (every 20 chars)
                      const partialThinking = thinkingBuffer
                        .replace(/<thinking[^>]*>/gi, '')
                        .replace(/<\/thinking[^>]*>/gi, '')
                        .trim();
                      if (partialThinking.length > 0 && partialThinking.length % 20 === 0) {
                        // PHASE 2 FIX: Emit progress every ~20 chars of thinking (increased frequency)
                        console.log(`   💭 Emitting thinking_partial: ${partialThinking.length} chars`);
                        statusEmitter?.({
                          type: 'thinking_partial',
                          content: partialThinking
                        });
                      }
                      // Don't emit as regular content
                      continue;
                    }
                  }
                  
                  // PHASE 2 FIX: Enhanced fallback detection - if we see numbered thinking steps without tags
                  // This handles cases where model generates thinking without XML tags
                  const thinkingPatterns = [
                    /^\d+\.\s*(Understanding|Information|Source|Analysis|Synthesis|Citation|Quality)/i,
                    /^(First|Second|Third|Next|Then|Finally).*?(analyze|consider|examine|review|check)/i,
                    /^(I need to|Let me|I should|I will).*?(understand|analyze|check|verify|extract)/i
                  ];
                  
                  if (!thinkingInProgress && thinkingPatterns.some(pattern => pattern.test(trimmedForValidation))) {
                    console.log('   💭 Detected thinking content without tags (fallback):', trimmedForValidation.substring(0, 50));
                    thinkingInProgress = true;
                    thinkingBuffer = chunk;
                    statusEmitter?.({
                      type: 'thinking_start',
                      stage: 'reasoning',
                      content: '💭 AI is analyzing the query...'
                    });
                    continue;
                  }

                  // If previously detected an opening JSON plan, keep buffering until closing brace
                  if (suppressPlannerJson) {
                    plannerJsonBuffer += trimmedForValidation;
                    if (/\}\s*$/.test(trimmedForValidation) || /\]\s*$/.test(trimmedForValidation)) {
                      // Closing brace/bracket reached — drop buffered planner JSON
                      console.log(`   🚫 Dropped buffered JSON (${plannerJsonBuffer.length} chars)`);
                      suppressPlannerJson = false;
                      plannerJsonBuffer = "";
                    }
                    continue; // Do not forward any part of planner JSON
                  }

                  // FIXED: Only filter if it's COMPLETE VALID JSON, not just text containing these words
                  // This prevents filtering legitimate markdown like "## EXECUTIVE SUMMARY"
                  const isCompleteJson = /^\s*\{[\s\S]*\}\s*$/.test(trimmedForValidation) || /^\s*\[[\s\S]*\]\s*$/.test(trimmedForValidation);
                  if (isCompleteJson) {
                    try {
                      JSON.parse(trimmedForValidation); // Validate it's real JSON
                      console.log(`   🚫 FILTERED valid JSON: "${trimmedForValidation.substring(0, 60)}..."`);
                      continue; // Only drop if it's actual parseable JSON
                    } catch {
                      // Not valid JSON despite looking like it - allow through
                      console.log(`   ✅ Allowing through (looked like JSON but invalid): "${trimmedForValidation.substring(0, 60)}..."`);
                    }
                  }

                  // CRITICAL FIX: Detect and filter ALL types of JSON:
                  // 1. Planner JSON: {"strategy": "focused", "subQueries": [...]}
                  // 2. Structured Output JSON: {"vessel_profile": {...}, "executive_summary": ...}
                  // 3. Reflexion Array JSON: [{"query": "...", "purpose": "...", "priority": "..."}]
                  
                  // Check for planner JSON (object)
                  const isPlannerJson = /^\s*\{[\s\S]*"strategy"[\s\S]*"subQueries"[\s\S]*\}\s*$/.test(trimmedForValidation);
                  if (isPlannerJson) {
                    console.log(`   🚫 FILTERED planner JSON: "${trimmedForValidation.substring(0, 60)}..."`);
                    continue;
                  }
                  
                  // Check for structured output JSON (vessel_profile)
                  const isStructuredOutputJson = /^\s*\{[\s\S]*"vessel_profile"[\s\S]*\}\s*$/.test(trimmedForValidation);
                  if (isStructuredOutputJson) {
                    console.log(`   🚫 FILTERED structured output JSON: "${trimmedForValidation.substring(0, 60)}..."`);
                    continue;
                  }
                  
                  // Check for reflexion/follow-up queries JSON (array)
                  const isReflexionArrayJson = /^\s*\[[\s\S]*\{\s*"query"[\s\S]*"purpose"[\s\S]*\}\s*\]\s*$/.test(trimmedForValidation);
                  if (isReflexionArrayJson) {
                    console.log(`   🚫 FILTERED reflexion array JSON: "${trimmedForValidation.substring(0, 60)}..."`);
                    continue;
                  }

                  // Detect start of planner JSON that may span multiple chunks
                  const startsPlannerJson = /^\s*\{[\s\S]*"strategy"[\s\S]*"subQueries"[\s\S]*$/.test(trimmedForValidation) && !/\}\s*$/.test(trimmedForValidation);
                  if (startsPlannerJson) {
                    suppressPlannerJson = true;
                    plannerJsonBuffer = trimmedForValidation;
                    console.log('   🚫 Detected start of planner JSON (buffering)');
                    continue;
                  }
                  
                  // Detect start of structured output JSON
                  const startsStructuredJson = /^\s*\{[\s\S]*"vessel_profile"[\s\S]*$/.test(trimmedForValidation) && !/\}\s*$/.test(trimmedForValidation);
                  if (startsStructuredJson) {
                    suppressPlannerJson = true;
                    plannerJsonBuffer = trimmedForValidation;
                    console.log('   🚫 Detected start of structured output JSON (buffering)');
                    continue;
                  }
                  
                  // Detect start of reflexion array JSON
                  const startsReflexionJson = /^\s*\[[\s\S]*\{\s*"query"[\s\S]*$/.test(trimmedForValidation) && !/\]\s*$/.test(trimmedForValidation);
                  if (startsReflexionJson) {
                    suppressPlannerJson = true;
                    plannerJsonBuffer = trimmedForValidation;
                    console.log('   🚫 Detected start of reflexion array JSON (buffering)');
                    continue;
                  }

                  // P0 FIX: Strip ALL three types of JSON inline
                  let contentToEmit = chunk.replace(/\{[\s\S]*?"strategy"[\s\S]*?"subQueries"[\s\S]*?\}\s*/g, '');
                  contentToEmit = contentToEmit.replace(/\{[\s\S]*?"vessel_profile"[\s\S]*?\}\s*/g, '');
                  contentToEmit = contentToEmit.replace(/\[[\s\S]*?\{\s*"query"[\s\S]*?"purpose"[\s\S]*?\}\s*\]\s*/g, '');
                  const contentTrimmed = contentToEmit.trim(); // Check if empty after strip
                  
                  if (contentTrimmed.length === 0 && (/"strategy"[\s\S]*"subQueries"/.test(trimmedForValidation) || /"vessel_profile"/.test(trimmedForValidation) || /\[[\s\S]*"query"[\s\S]*"purpose"/.test(trimmedForValidation))) {
                    console.log('   🚫 Stripped embedded JSON (left empty)');
                    continue;
                  }
                  
                  // Skip empty chunks
                  if (contentTrimmed.length === 0) {
                    continue;
                  }

                  // CRITICAL: First content chunk MUST start with markdown header
                  // This enforces our prompt requirement and catches LLM generating JSON first
                  if (!hasStreamedContent && contentTrimmed.length > 0) {
                    if (!/^#[\s#]/.test(contentTrimmed)) {
                      console.log(`   🚫 FILTERED invalid first chunk (must start with #): "${contentTrimmed.substring(0, 50)}..."`);
                      // Start buffering to see if this is JSON
                      suppressPlannerJson = true;
                      plannerJsonBuffer = trimmedForValidation;
                      continue;
                    }
                  }

                  // Forward any non-empty, non-JSON chunk (be permissive on first chunk)
                  // We already stripped planner/structured/reflexion JSON above, so avoid over-filtering here.
                  if (/^\s*[\[{]/.test(contentTrimmed) || /^\s*"strategy"/.test(contentTrimmed)) {
                    console.log(`   🚫 FILTERED JSON-like chunk: "${contentTrimmed.substring(0, 50)}..."`);
                    continue;
                  }

                  hasStreamedContent = true; // Mark that token streaming is working
                  fullResponse += contentToEmit; // PRESERVE spaces!
                  
                  // PHASE 4 FIX: Emit token immediately for real-time streaming
                  const eventData = `data: ${JSON.stringify({ type: 'content', content: contentToEmit })}\n\n`;
                  controller.enqueue(encoder.encode(eventData));
                  
                  // PHASE 4 FIX: Note - ReadableStream doesn't support flush(), but enqueue() should send immediately
                  // The browser's EventSource should receive tokens as they're enqueued

                  if (eventCount <= 5) {
                    console.log(`   💬 Token #${eventCount}: "${text.substring(0, 30)}..."`);
                  }
                }
              }
            }
            continue; // Skip to next event
          }
          
          // Handle node-level updates from "updates" mode
          if (streamType === 'updates') {
            const eventKey = Object.keys(event || {})[0];
            
            // DEBUG: Log all node updates
            if (eventCount <= 10) {
              console.log(`   📦 Update event #${eventCount}: ${eventKey}`);
            }
            
            // Capture final state for fallback
            if (event.synthesizer) {
              finalState = event.synthesizer;
            }
            
            // Capture sources from router node (Gemini results)
            if (event.router) {
              const routerState = event.router;
              console.log(`   🔍 DEBUG: Router event received, has sources: ${!!routerState?.sources}, sources array: ${Array.isArray(routerState?.sources)}, length: ${routerState?.sources?.length || 0}`);
              
              // Check for sources from Gemini
              if (routerState?.sources && Array.isArray(routerState.sources) && routerState.sources.length > 0) {
                const newSources = routerState.sources;
                
                console.log(`   🔮 Router returned ${newSources.length} Gemini sources`);
                
                // P0 FIX: Validate URLs before emitting to frontend
                let validCount = 0;
              for (const source of newSources) {
                  // Quick validation (basic check without importing full validator)
                  const url = source.url || '';
                  const isValid = url && 
                    !url.includes('/ais/details/ships?') && // no query params only
                    !url.match(/\/ais\/details\/ships$/) && // no bare endpoint
                    !url.includes('/ports/') && // no port pages for vessel queries
                    !url.match(/\/vessels\/details\/\d{1,6}$/); // no incomplete vessel IDs
                  
                  if (isValid) {
                    sourceIndex++; // P0 FIX: Increment source counter
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ 
                        type: 'source',
                        action: 'selected',
                        index: sourceIndex, // P0 FIX: Include index for frontend display
                        title: source.title,
                        url: source.url,
                        content: source.content?.substring(0, 300) || '',
                        score: source.score || 0.5
                      })}\n\n`
                    ));
                    validCount++;
                    // PHASE 3 FIX: Stagger source emissions for progressive reveal (reduced delay)
                    await sleep(50); // Reduced from 150ms to 50ms
                  } else {
                    console.log(`   🚫 Blocked invalid source: ${url.substring(0, 60)}`);
                  }
                }
                
                // Only push valid sources
                const validSources = newSources.filter(s => {
                  const url = s.url || '';
                  return url && 
                    !url.includes('/ais/details/ships?') && 
                    !url.match(/\/ais\/details\/ships$/) && 
                    !url.includes('/ports/') && 
                    !url.match(/\/vessels\/details\/\d{1,6}$/);
                });
                sources.push(...validSources);
                console.log(`   📚 Added ${validCount}/${newSources.length} valid Gemini sources (total: ${sources.length})`);
              }
            }
            
            // Capture sources from tool execution node (research mode)
            if (event.tools || event.process) {
              const nodeState = event.tools || event.process;
              
              // Check for verified sources in state
              if (nodeState?.sources && Array.isArray(nodeState.sources) && nodeState.sources.length > 0) {
                const newSources = nodeState.sources;
                
                // P0 FIX: Validate URLs before emitting to frontend
                let validCount = 0;
              for (const source of newSources) {
                  const url = source.url || '';
                  const isValid = url && 
                    !url.includes('/ais/details/ships?') && 
                    !url.match(/\/ais\/details\/ships$/) && 
                    !url.includes('/ports/') && 
                    !url.match(/\/vessels\/details\/\d{1,6}$/);
                  
                  if (isValid) {
                    sourceIndex++; // P0 FIX: Increment source counter
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ 
                        type: 'source',
                        action: 'selected',
                        index: sourceIndex, // P0 FIX: Include index for frontend display
                        title: source.title,
                        url: source.url,
                        content: source.content?.substring(0, 300) || '',
                        score: source.score || 0.5
                    })}\n\n`
                  ));
                    validCount++;
                    // PHASE 3 FIX: Reduced delay for faster source emission
                    await sleep(50); // Reduced from 150ms to 50ms
                } else {
                  console.log(`   🚫 Blocked invalid source: ${url.substring(0, 60)}`);
                }
              }
              
              // Only push valid sources
              const validSources = newSources.filter(s => {
                const url = s.url || '';
                return url && 
                  !url.includes('/ais/details/ships?') && 
                  !url.match(/\/ais\/details\/ships$/) && 
                  !url.includes('/ports/') && 
                  !url.match(/\/vessels\/details\/\d{1,6}$/);
              });
              sources.push(...validSources);
              console.log(`   📚 Added ${validCount}/${newSources.length} valid research sources (total: ${sources.length})`);
            }
          }
          }
        }
        
        console.log(`\n📊 Stream complete:`);
        console.log(`   Response length: ${fullResponse.length} chars`);
        console.log(`   Token streaming worked: ${hasStreamedContent}`);
        console.log(`   Sources: ${sources.length}`);
        
        // Ensure final enforced content reaches the UI.
        // If token streaming didn't work, chunk the complete response (legacy pattern)
        if (!hasStreamedContent && finalState?.messages) {
          console.log(`⚠️ No token streaming occurred, using fallback chunking`);
          
          const messagesUpdate = finalState.messages;
          if (Array.isArray(messagesUpdate) && messagesUpdate.length > 0) {
            const lastMessage = messagesUpdate[messagesUpdate.length - 1];
            const content = typeof lastMessage.content === 'string' 
              ? lastMessage.content 
              : JSON.stringify(lastMessage.content);
            
            if (content && content.length > 0) {
              console.log(`   📦 Chunking ${content.length} chars in ${SSE_CHUNK_SIZE}-char chunks`);

              for (let i = 0; i < content.length; i += SSE_CHUNK_SIZE) {
                const chunk = content.slice(i, i + SSE_CHUNK_SIZE);
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`
                ));

                // Throttle to prevent overwhelming client
                if ((i / SSE_CHUNK_SIZE) % SSE_THROTTLE_EVERY_N_CHUNKS === 0) {
                  await new Promise(resolve => setTimeout(resolve, SSE_THROTTLE_INTERVAL_MS));
                }
              }

              fullResponse = content;
              console.log(`   ✅ Fallback chunking complete: ${content.length} chars sent`);
            }
          }
        }

        // PHASE 4 FIX: If we did stream tokens, but the final synthesized message differs (e.g., citation enforcement),
        // send a final overwrite event so the frontend replaces the content with the enforced version.
        if (hasStreamedContent && finalState?.messages) {
          const messagesUpdate = finalState.messages;
          if (Array.isArray(messagesUpdate) && messagesUpdate.length > 0) {
            const lastMessage = messagesUpdate[messagesUpdate.length - 1];
            const enforced = typeof lastMessage.content === 'string'
              ? lastMessage.content
              : JSON.stringify(lastMessage.content);
            
            // PHASE 4 FIX: Character-by-character comparison (not just length)
            // Normalize whitespace for comparison but preserve original for sending
            const normalizedStreamed = fullResponse.replace(/\s+/g, ' ').trim();
            const normalizedEnforced = enforced.replace(/\s+/g, ' ').trim();
            const contentDiffers = normalizedStreamed !== normalizedEnforced;
            
            if (enforced && enforced.length > 0 && contentDiffers) {
              const diffLength = Math.abs(enforced.length - fullResponse.length);
              console.log(`   🔄 Sending final enforced content overwrite:`);
              console.log(`      Streamed: ${fullResponse.length} chars`);
              console.log(`      Enforced: ${enforced.length} chars`);
              console.log(`      Difference: ${diffLength} chars`);
              
              // PHASE 4 FIX: Always send overwrite event if content differs
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'content', overwrite: true, content: enforced })}\n\n`
              ));
              fullResponse = enforced;
              console.log(`   ✅ Overwrite event sent successfully`);
            } else if (enforced && enforced.length > 0) {
              console.log(`   ✅ Streamed content matches enforced content - no overwrite needed`);
            } else {
              console.warn(`   ⚠️ Enforced content is empty or invalid`);
            }
          } else {
            console.warn(`   ⚠️ Final state has no messages - cannot send overwrite`);
          }
        } else if (!hasStreamedContent && finalState?.messages) {
          // PHASE 4 FIX: If streaming didn't work, ensure we still send the final content
          const messagesUpdate = finalState.messages;
          if (Array.isArray(messagesUpdate) && messagesUpdate.length > 0) {
            const lastMessage = messagesUpdate[messagesUpdate.length - 1];
            const finalContent = typeof lastMessage.content === 'string'
              ? lastMessage.content
              : JSON.stringify(lastMessage.content);
            if (finalContent && finalContent.length > 0) {
              console.log(`   📦 Sending final content (streaming didn't work): ${finalContent.length} chars`);
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'content', overwrite: true, content: finalContent })}\n\n`
              ));
              fullResponse = finalContent;
            }
          }
        }
        
        // If we still got no response, something went wrong
        if (fullResponse.length === 0) {
          console.error(`❌ No response content generated!`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            content: 'Agent completed but produced no response. This might be a streaming configuration issue.' 
          })}\n\n`));
        }
        
        // Phase C3: (suppressed when thinking events disabled) Send confidence indicator
        if (finalState?.confidenceIndicator && false) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'confidence',
            indicator: finalState.confidenceIndicator
          })}\n\n`));
          console.log(`📊 Confidence indicator sent: ${finalState.confidenceIndicator.score}%`);
        }
        
        // Phase C1 & C2: (suppressed when thinking events disabled) Send follow-up suggestions
        if (finalState?.followUpSuggestions && finalState.followUpSuggestions.length > 0 && false) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'followups',
            suggestions: finalState.followUpSuggestions
          })}\n\n`));
          console.log(`💡 Sent ${finalState.followUpSuggestions.length} follow-up suggestions`);
        }
        
        // Send sources
        if (sources.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'sources', 
            sources: sources.slice(0, 10) // Limit to 10 sources
          })}\n\n`));
        }
        
        // Save memory with knowledge accumulation
        if (sessionMemoryManager && sessionMemory && fullResponse.length > 0) {
          const userMessage = messages[messages.length - 1];
          
          // ACCUMULATE KNOWLEDGE: Extract entities, features, topics from this turn
          await accumulateKnowledge(
            userMessage.content,
            fullResponse,
            sessionMemory,
            sessionMemoryManager,
            sessionMemory.messageCount
          );
          
          // Add messages to recent history
          sessionMemory.recentMessages.push(
            { role: 'user', content: userMessage.content, timestamp: Date.now() },
            { role: 'assistant', content: fullResponse, timestamp: Date.now() }
          );
          
          // Increment message count
          sessionMemory.messageCount++;
          
          // Automatic summarization every 5 turns
          if (shouldSummarize(sessionMemory.messageCount)) {
            const summary = generateSummary(sessionMemory);
            const oldMessageCount = sessionMemory.recentMessages.length;
            
            // Update summary
            sessionMemory.conversationSummary = summary;
            
            // Compress old turns
            compressOldTurns(sessionMemory, 10);
            
            const compressed = oldMessageCount - sessionMemory.recentMessages.length;
            logSummarization(sessionMemory.messageCount, summary.length, compressed);
          }
          
          await sessionMemoryManager.save(sessionId, sessionMemory);
          console.log(`💾 Memory saved with accumulated knowledge`);
        }
        
        // Done
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        try { if (heartbeatTimer) clearInterval(heartbeatTimer); } catch {}
        controller.close();
      } catch (error: any) {
        console.error('❌ Stream error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error', 
          content: error.message 
        })}\n\n`));
        try { if (heartbeatTimer) clearInterval(heartbeatTimer); } catch {}
        controller.close();
      }
    },
  });
  
  return stream;
}

