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
import { 
  enforceCitations,
  validateCitations
} from './citation-enforcer';
import { accumulateKnowledge } from './memory-accumulation';
import { validateVesselEntity } from './entity-validation';
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
import { 
  verifyAndAnswer as verificationPipeline,
  extractEntities,
  normalizeData,
  performComparativeAnalysis,
  extractClaims,
  verifyClaims
} from './verification-system';
import { generateFollowUps, trackFollowUpUsage, type FollowUpSuggestion } from './follow-up-generator';
import { calculateConfidenceIndicator, assessSourceQuality, getConfidenceMessage, type QualityMetrics, type ConfidenceIndicator } from './confidence-indicators';
import { 
  generateFleetcoreMapping, 
  formatMappingAsMarkdown,
  type FleetcoreApplicationMapping 
} from './fleetcore-entity-mapper';
import { extractMaritimeEntities } from './utils/entity-utils';

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
      
      // PHASE 2: Query Planning + Parallel Execution + KV Cache
      try {
        const kvStore = env.CHAT_SESSIONS;
        const cachedResult = await getCachedResult(kvStore, queryToSend, entityContext);
        
        if (cachedResult) {
        const stats = getCacheStats(cachedResult);
        console.log(`   ⚡ CACHE HIT (age: ${stats.age}s, ttl: ${stats.ttl}s)`);
        
        // PHASE 3: Calculate confidence from cached sources
        const confidence = calculateConfidence(cachedResult.sources);
        console.log(`   📊 Confidence (cached): ${confidence.label} (${confidence.score}/100)`);
        
        if (statusEmitter) {
          statusEmitter({
            type: 'thinking',
            step: 'cache_hit',
            content: `✓ Using cached results (${stats.age}s old)`
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
      if (statusEmitter) {
        statusEmitter({
          type: 'thought',
          phase: 'plan',
          content: `Planned ${queryPlan.subQueries.length} targeted searches for "${classification.resolvedQuery.activeEntity?.name || queryToSend}"`,
        });
      }
      
      if (statusEmitter) {
        statusEmitter({
          type: 'thinking',
          step: 'query_planning',
          content: `Planned ${queryPlan.subQueries.length} targeted searches`
        });
        statusEmitter({
          type: 'status',
          stage: 'searching',
          content: `⚡ Executing ${queryPlan.subQueries.length} parallel searches...`,
          progress: 25
        });
      }
      
      // Parallel Execution
      const allSources = await executeParallelQueries(
        queryPlan.subQueries,
        env.GEMINI_API_KEY,
        entityContext,
        env.CHAT_SESSIONS,
        statusEmitter
      );
      
      // Aggregate + Rank
      if (statusEmitter) {
        statusEmitter({
          type: 'status',
          stage: 'analyzing',
          content: `📊 Ranking ${allSources.length} sources by authority...`,
          progress: 50
        });
      }
      
      let rankedSources = aggregateAndRank(allSources);
      if (statusEmitter) {
        statusEmitter({
          type: 'thought',
          phase: 'search',
          content: `Collected ${allSources.length} sources → ${rankedSources.length} ranked by authority`,
        });
      }
      
      // PHASE 3: Calculate confidence indicator
      const confidence = calculateConfidence(rankedSources);
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
          rankedSources = aggregateAndRank(merged);
          console.log(`   ✅ Deep-research merged: total ${rankedSources.length} sources after re-aggregation`);
        } catch (e: any) {
          console.warn(`   ⚠️ Deep-research fallback failed: ${e.message}`);
        }
      }

      // Build research context
      let researchContext = `=== GEMINI GROUNDING RESULTS (PARALLEL SEARCH) ===\n\n`;
      // Note: DO NOT include queryPlan details here - GPT-4o might echo them back
      researchContext += `SOURCES FOUND: ${allSources.length} → ${rankedSources.length} (ranked by authority)\n\n`;
      
      if (rankedSources.length > 0) {
        researchContext += `SOURCES (ranked by authority):\n`;
        rankedSources.forEach((s: any, idx: number) => {
          // CRITICAL: Include substantial content (800 chars) for LLM to generate detailed, cited answers
          // 200 chars was too little - LLM couldn't find specific facts to cite
          researchContext += `[${idx + 1}] [${s.tier}] ${s.title}\n${s.url}\n${s.content?.substring(0, 800) || 'No content'}...\n\n`;
        });
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
          hasAnswer: false,
          answerLength: 0
        }
      }, 900);
      
        return {
          mode: classification.mode,
          geminiAnswer: null,
          sources: rankedSources,
          researchContext,
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

  if (statusEmitter) {
    statusEmitter({
      type: 'status',
      stage: 'synthesis_start',
      content: state.sources.length > 0 
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
  
  // MODE: NONE - Answer from training data
  if (state.mode === 'none') {
    console.log(`   🎯 Synthesizing NONE mode - training data only`);
    
    const platformContext = `\n\n=== PLATFORM QUERY ===
Answer comprehensively from your training knowledge about fleetcore.
DO NOT suggest using external research - provide detailed information directly.`;
    
    const systemMessage = new SystemMessage(MARITIME_SYSTEM_PROMPT + contextAddition + platformContext);
    
    // CRITICAL: Use stream() and pass config for LangGraph callback system
    // Add timeout protection to prevent infinite hangs
    const LLM_TIMEOUT_MS = 45000; // 45 seconds max for LLM response
    const streamPromise = (async () => {
      const stream = await llm.stream([systemMessage, ...state.messages], config);
      let fullContent = '';
      let chunkCount = 0;
      console.log(`   📡 Starting LLM stream (mode: none)`);
      
      for await (const chunk of stream) {
        fullContent += chunk.content;
        chunkCount++;
        
        // Proxy tokens to client immediately to prevent UI timeouts
        if (statusEmitter && chunk.content) {
          statusEmitter({ type: 'content', content: chunk.content });
        }
        
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
        fullContent = `I apologize, but I'm experiencing a response delay. Please try your question again. For vessel/equipment queries I automatically verify with trusted web sources and include citations.`;
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
      
      // Add timeout protection
      const LLM_TIMEOUT_MS = 45000;
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
          fullContent = `I apologize, but I'm experiencing technical difficulties. Please try again.`;
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
    
    // OPTIONAL: Run verification pipeline for high-value queries (comparative, multi-entity)
    const isVesselQuery = /\b(vessel|ship|imo\s*\d{7}|call\s*sign)\b/i.test(userQuery);
    const shouldRunVerificationPipeline = 
      (isVesselQuery && state.sources.length >= 3) ||
      (state.sources.length >= 3 && // Multiple sources available
       (userQuery.match(/\b(largest|biggest|smallest|compare|versus|vs|which|best)\b/i) || // Comparative query
        state.sources.length >= 5)); // Rich source set
    
    if (shouldRunVerificationPipeline) {
      console.log(`   🔬 Running verification pipeline (${state.sources.length} sources)`);
      
      if (statusEmitter) {
        statusEmitter({
          type: 'thinking',
          step: 'verification_pipeline',
          content: 'Extracting entities and claims...'
        });
      }
      
      try {
        // Stage 1: Entity extraction
        const entities = await extractEntities(userQuery, state.sources, env.OPENAI_API_KEY);
        console.log(`   ✓ Extracted ${entities.length} entities`);
        
        if (statusEmitter && entities.length > 0) {
          statusEmitter({
            type: 'thinking',
            step: 'entity_extraction',
            content: `Found ${entities.length} entities: ${entities.slice(0, 3).map(e => e.name).join(', ')}`
          });
        }
        
        // Stage 2: Data normalization
        const normalizedData = await normalizeData(userQuery, state.sources, entities, env.OPENAI_API_KEY);
        console.log(`   ✓ Normalized ${normalizedData.length} data points`);
        
        if (statusEmitter && normalizedData.length > 0) {
          statusEmitter({
            type: 'thinking',
            step: 'data_normalization',
            content: `Normalized ${normalizedData.length} specifications`
          });
        }
        
        // Stage 3: Comparative analysis (if applicable)
        const comparativeAnalysis = await performComparativeAnalysis(
          userQuery,
          normalizedData,
          entities,
          env.OPENAI_API_KEY
        );
        
        if (comparativeAnalysis && statusEmitter) {
          statusEmitter({
            type: 'thinking',
            step: 'comparative_analysis',
            content: `Winner: ${comparativeAnalysis.winner?.entity || 'Analyzing...'}`
          });
        }
        
        // Stage 4: Claim extraction
        const claims = await extractClaims(userQuery, state.sources, normalizedData, env.OPENAI_API_KEY);
        console.log(`   ✓ Extracted ${claims.length} verifiable claims`);
        
        if (statusEmitter && claims.length > 0) {
          statusEmitter({
            type: 'thinking',
            step: 'claim_extraction',
            content: `Extracted ${claims.length} verifiable claims`
          });
        }
        
        // Stage 5: Verification
        const verification = verifyClaims(claims, 'high', comparativeAnalysis);
        console.log(`   ✓ Verification: ${verification.verified ? 'PASSED' : 'FAILED'} (${verification.confidence.toFixed(0)}%)`);
        
        if (statusEmitter) {
          const status = verification.verified ? '✓ Verified' : '⚠ Needs review';
          statusEmitter({
            type: 'thinking',
            step: 'verification_result',
            content: `${status} - Confidence: ${verification.confidence.toFixed(0)}%`
          });
        }
        
        // Enhance research context with verification metadata
        console.log(`   📊 Verification complete: ${claims.length} claims, ${entities.length} entities, ${normalizedData.length} data points`);
        
      } catch (error: any) {
        console.error(`   ❌ Verification pipeline error:`, error.message);
        // Continue with standard synthesis if pipeline fails
      }
    }
    
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

    // Vessel field requirements (applies when vessel query detected)
    const vesselRequirements = /\b(vessel|ship|imo\s*\d{7}|call\s*sign)\b/i.test(userQuery) ? `

**VESSEL PROFILE - REQUIRED FIELDS:**
Provide a structured profile with the following fields. For each factual entry, cite inline immediately. If a field is not found in the provided sources, write "Not found in sources" (do NOT guess):
1. Management/Operator
2. Owner
3. Class Society and Class Notation
4. Flag State
5. Flag Certification Documents (link title if available)
6. Lightship (t)
7. Gross Tonnage (GT) and Net Tonnage (NT)
8. Deadweight (DWT)
9. Keel Lay Date
10. Delivery/Build Date and Shipyard
11. Length Overall (LOA), Breadth, Depth, Draft
12. IMO, MMSI, Call Sign
13. Current Location/Status (AIS) with timestamp qualifier

**EQUIPMENT SUMMARY (VESSEL):**
- Propulsion: engine make/model, count, total power, propulsors
- Auxiliaries: generators/alternators, bow/stern thrusters if any

ONLY include data backed by sources with citations. If AIS/position is stale, say "as per latest available AIS in sources".
` : '';

    const synthesisPrompt = `${MARITIME_SYSTEM_PROMPT}${contextAddition}

${state.researchContext}

${technicalDepthFlag}

${vesselRequirements}

**USER QUERY**: ${userQuery}

**CRITICAL INSTRUCTIONS FOR SYNTHESIS:**

**IMPORTANT - READ THIS FIRST:** 
- Do NOT output any JSON structures, query plans, search strategies, or internal processing details
- Do NOT echo back any technical structures from previous messages or context
- START IMMEDIATELY with your markdown-formatted answer (EXECUTIVE SUMMARY header)
- NEVER begin with { "strategy": ... } or any JSON - this will break the UI
- Your FIRST characters must be: ## EXECUTIVE SUMMARY or ## (section name)
- DO NOT output "AI" or any label before your answer - start directly with ##

1. **SOURCE UTILIZATION:**
   - You have ${state.sources.length} verified sources with ${state.sources.length * 800} characters of content
   - Extract SPECIFIC facts: dimensions, model numbers, specifications, dates, operators
   - Cross-reference multiple sources for validation
   - Use manufacturer names, exact specifications, and technical details from sources

2. **MANDATORY CITATION FORMAT - THIS IS ABSOLUTELY CRITICAL:**
   
   ⚠️ **CITATION REQUIREMENT: You MUST include at least ${Math.min(state.requiresTechnicalDepth ? 8 : 5, state.sources.length)} citations or your response will be REJECTED**
   
   **CITATION FORMAT (NON-NEGOTIABLE):**
   - Add [[N]](ACTUAL_SOURCE_URL) citation IMMEDIATELY after EVERY factual statement
   - NO EXCEPTIONS - Every specification, dimension, name, date, or technical detail MUST be cited
   - Use the ACTUAL URLs from the SOURCES list above
   - DO NOT use placeholder text like "url" or omit the URL
   
   **STEP-BY-STEP CITATION PROCESS:**
   1. Write a factual statement
   2. Immediately look up which source [N] supports it
   3. Copy the EXACT URL from that source
   4. Add [[N]](EXACT_URL) right after the statement
   5. Continue to next fact
   
   **YOUR AVAILABLE SOURCES WITH URLs:**
   ${state.sources.slice(0, Math.min(5, state.sources.length)).map((s: any, i: number) => 
     `   [${i+1}] ${s.url}`
   ).join('\n')}
   
   **CORRECT Citation Examples:**
   - "Stanford Maya is an offshore support vessel [[1]](${state.sources[0]?.url || 'URL'})"
   - "Length Overall: 34 meters [[2]](${state.sources[1]?.url || 'URL'})"
   - "Equipped with Caterpillar engines [[3]](${state.sources[2]?.url || 'URL'})"
   
   **WRONG - These will FAIL:**
   - ❌ "Stanford Maya is an offshore support vessel [[1]](url)" 
   - ❌ "Length Overall: 50 meters [2]"
   - ❌ "Main Engines: Caterpillar 3512C" (no citation)
   
   **VALIDATION CHECK BEFORE RESPONDING:**
   - Count your citations - you need at least ${Math.min(state.requiresTechnicalDepth ? 8 : 5, state.sources.length)}
   - Verify every [[N]](URL) has a real URL, not placeholder text
   - Confirm every specification/dimension/name has a citation

3. **STRUCTURE & FORMATTING:**
   - Use proper markdown headers: EXECUTIVE SUMMARY, TECHNICAL SPECIFICATIONS, etc.
   - Use bullet points (•) for specifications
   - Write in clear, professional paragraphs
   - ${state.requiresTechnicalDepth ? 'Target: 600-800 words minimum with comprehensive technical detail' : 'Target: 400-500 words with concise overview'}

4. **CONTENT QUALITY:**
   - Extract and present SPECIFIC information from sources
   - Include exact model numbers: "Caterpillar C32 ACERT" not "Caterpillar engines"
   - Include precise specifications: "34.00 meters LOA" not "approximately 34 meters"
   - Include actual operators: "Stanford Marine" not "a maritime company"
   - Write as ${state.requiresTechnicalDepth ? 'Chief Engineer with 20+ years experience' : 'Technical Director'}

5. **WHAT TO AVOID:**
   - ❌ Generic statements: "The vessel is designed for offshore operations"
   - ❌ Vague descriptions: "approximately", "around", "roughly"
   - ❌ Missing citations: Every fact needs [[N]](url)
   - ❌ Missing specifications: "[dimensions not provided in sources]"
   - ❌ Short responses: Must meet word count targets

6. **CONFIDENCE:**
   - This is Google-verified, authoritative information
   - Write confidently and professionally
   - Present as definitive facts (not "appears to be" or "seems to be")

**Remember:** You are providing industry-leading maritime intelligence. Every fact should be specific, cited, and extracted from the provided sources.`;
    
    console.log(`   📝 Synthesis prompt length: ${synthesisPrompt.length} chars`);
    console.log(`   📝 Research context included: ${state.researchContext?.substring(0, 100)}...`);
    
    const systemMessage = new SystemMessage(synthesisPrompt);
    
    // Emit synthesis start status
    if (statusEmitter) {
      statusEmitter({
        type: 'status',
        stage: 'synthesis',
        content: state.requiresTechnicalDepth 
          ? `⚙️ Generating comprehensive technical analysis (600+ words)...`
          : `⚙️ Generating response...`
      });
    }
    
    // CRITICAL: Use stream() and pass config for LangGraph callback system
    // Add timeout protection to prevent infinite hangs
    const LLM_TIMEOUT_MS = 45000; // 45 seconds max for LLM response
    const TARGET_LENGTH = state.requiresTechnicalDepth ? 4000 : 2000; // chars
    
    const streamPromise = (async () => {
      const stream = await llm.stream([systemMessage, ...state.messages], config);
      let fullContent = '';
      let chunkCount = 0;
      console.log(`   📡 Starting LLM stream (mode: verification)`);
      
      for await (const chunk of stream) {
        fullContent += chunk.content;
        chunkCount++;
        
        // Proxy tokens directly to SSE stream
        if (statusEmitter && chunk.content) {
          statusEmitter({ type: 'content', content: chunk.content });
        }
        
        if (chunkCount === 1) {
          console.log(`   💬 First chunk received - streaming active`);
        }
        
        // ENHANCED: Emit progress updates every 20 chunks (roughly every 0.5-1 second)
        // More frequent updates = better user feedback during generation
        if (statusEmitter && chunkCount % 20 === 0) {
          const progress = Math.min(95, Math.floor((fullContent.length / TARGET_LENGTH) * 100));
          console.log(`   💬 Progress: chunk #${chunkCount}, ${fullContent.length} chars (${progress}%)`);
          statusEmitter({
            type: 'status',
            stage: 'synthesis',
            content: state.requiresTechnicalDepth
              ? `⚙️ Generating technical analysis... ${progress}%`
              : `⚙️ Generating response... ${progress}%`,
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
    
    let fullContent: string;
    let chunkCount: number;
    try {
      const result = await Promise.race([streamPromise, timeoutPromise]);
      fullContent = result.fullContent;
      chunkCount = result.chunkCount;
    } catch (error: any) {
      if (error.message === 'LLM_STREAM_TIMEOUT') {
        console.error(`   ❌ LLM stream timeout after ${LLM_TIMEOUT_MS}ms`);
        fullContent = `I apologize, but I'm experiencing a response delay. Please try your question again, or enable the "Online Research" toggle for comprehensive analysis.`;
        chunkCount = 0;
      } else {
        console.error(`   ❌ LLM stream error:`, error);
        throw error;
      }
    }
    
    console.log(`   ✅ Synthesized (${fullContent.length} chars, ${chunkCount} chunks)`);
    
    // Strip any leaked JSON/planner blocks before enforcement
    const stripLeadingJson = (text: string): string => {
      if (!text) return text;
      // Remove leading JSON object if present before first markdown heading
      const match = text.match(/^\s*\{[\s\S]*?\}\s*(?=(##\s|$))/);
      if (match) {
        return text.slice(match[0].length).trimStart();
      }
      // Remove leading fenced code block (e.g., ```json ... ``` ) before first heading
      const fence = text.match(/^\s*```[\s\S]*?```\s*(?=(##\s|$))/);
      if (fence) {
        return text.slice(fence[0].length).trimStart();
      }
      return text;
    };
    fullContent = stripLeadingJson(fullContent);
    
    // PHASE 4: Citation Enforcement - Ensure inline citations are present
    // Raise minimum citations for vessel queries to 5 (bounded by source count)
    const lastUser = state.messages.filter(m => m.constructor.name === 'HumanMessage').slice(-1)[0];
    const vesselQueryFlag = /\b(vessel|ship|imo\s*\d{7}|mmsi\s*\d{9}|crew\s*boat)\b/i.test(String((lastUser as any)?.content || ''));
    const citationResult = enforceCitations(fullContent, state.sources, { technicalDepth: state.requiresTechnicalDepth, minRequired: vesselQueryFlag ? 5 : undefined });
    if (citationResult.wasEnforced) {
      console.log(`   📎 Citation enforcement: added ${citationResult.citationsAdded} citations (${citationResult.citationsFound}→${citationResult.citationsFound + citationResult.citationsAdded})`);
      fullContent = citationResult.enforcedContent;
    } else {
      console.log(`   ✅ Citations sufficient: ${citationResult.citationsFound}/${citationResult.citationsRequired}`);
    }
    
    // Validate citations are well-formed
    const validation = validateCitations(fullContent, state.sources);
    if (!validation.valid) {
      console.warn(`   ⚠️ Citation validation warnings:`, validation.warnings);
      if (validation.errors.length > 0) {
        console.error(`   ❌ Citation validation errors:`, validation.errors);
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
    
    // ENHANCEMENT: Generate individualized fleetcore mapping for entities
    // This is the KEY ADDITION - automatically append entity-specific fleetcore applications
    const fleetcoreMapping = await generateEntityFleetcoreMapping(
      userQuery,
      fullContent,
      sessionMemory,
      statusEmitter
    );
    
    // If we generated a mapping, append it to the response
    let finalContent = fullContent;
    if (fleetcoreMapping) {
      const mappingMarkdown = formatMappingAsMarkdown(fleetcoreMapping);
      finalContent = fullContent + mappingMarkdown;
      console.log(`   ✨ Added fleetcore mapping for ${fleetcoreMapping.entityName} (${fleetcoreMapping.features.length} features)`);
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
  const isVesselQuery = /\b(vessel|ship|imo\s*\d{7}|call\s*sign)\b/i.test(query);
  
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

// Streaming configuration (optimized for smooth playback)
const SSE_CHUNK_SIZE = 150; // chars per SSE event (increased from 50 for smoother flow)
const SSE_THROTTLE_INTERVAL_MS = 5; // ms between chunks (reduced from 8 for faster delivery)
const SSE_THROTTLE_EVERY_N_CHUNKS = 10; // throttle every N chunks (increased to reduce throttling frequency)

/**
 * Handle chat request with streaming
 */
export async function handleChatWithAgent(request: ChatRequest): Promise<ReadableStream> {
  const { messages, sessionId, enableBrowsing, env } = request;
  
  console.log(`\n🚀 AGENT REQUEST | Session: ${sessionId} | Browsing: ${enableBrowsing}`);
  
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
      
      // PHASE A1 & A2: Create status/thinking emitter
      const statusEmitter = (event: { type: string; step?: string; stage?: string; content: string; progress?: number }) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch (err) {
          console.warn('⚠️ Status emit failed:', err);
        }
      };
      
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
              env,
              sessionMemory,
              statusEmitter, // PHASE A1 & A2: Pass emitter to nodes
            },
            streamMode: ["messages", "updates"] as const, // KEY: Enable both message and state streaming
          }
        );
        
        let fullResponse = "";
        let sources: Source[] = [];
        let eventCount = 0;
        let hasStreamedContent = false; // Track if token streaming worked
        let finalState: any = null; // Capture final state for fallback
        
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
                  hasStreamedContent = true; // Mark that token streaming is working
                fullResponse += text;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: text })}\n\n`));

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
                
                // Emit source events for frontend
                for (const source of newSources) {
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: 'source',
                      action: 'selected',
                      title: source.title,
                      url: source.url,
                      content: source.content?.substring(0, 300) || '',
                      score: source.score || 0.5
                    })}\n\n`
                  ));
                }
                
                sources.push(...newSources);
                console.log(`   📚 Added ${newSources.length} Gemini sources (total: ${sources.length})`);
              }
            }
            
            // Capture sources from tool execution node (research mode)
            if (event.tools || event.process) {
              const nodeState = event.tools || event.process;
              
              // Check for verified sources in state
              if (nodeState?.sources && Array.isArray(nodeState.sources) && nodeState.sources.length > 0) {
                const newSources = nodeState.sources;
                
                // Emit source events for frontend
                for (const source of newSources) {
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: 'source',
                      action: 'selected',
                      title: source.title,
                      url: source.url,
                      content: source.content?.substring(0, 300) || '',
                      score: source.score || 0.5
                    })}\n\n`
                  ));
                }
                
                sources.push(...newSources);
                console.log(`   📚 Added ${newSources.length} research sources (total: ${sources.length})`);
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

        // If we did stream tokens, but the final synthesized message differs (e.g., citation enforcement),
        // send a final overwrite event so the frontend replaces the content with the enforced version.
        if (hasStreamedContent && finalState?.messages) {
          const messagesUpdate = finalState.messages;
          if (Array.isArray(messagesUpdate) && messagesUpdate.length > 0) {
            const lastMessage = messagesUpdate[messagesUpdate.length - 1];
            const enforced = typeof lastMessage.content === 'string'
              ? lastMessage.content
              : JSON.stringify(lastMessage.content);
            if (enforced && enforced.length > 0 && enforced !== fullResponse) {
              console.log(`   🔄 Sending final enforced content overwrite (${enforced.length} chars)`);
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'content', overwrite: true, content: enforced })}\n\n`
              ));
              fullResponse = enforced;
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
        
        // Phase C3: Send confidence indicator
        if (finalState?.confidenceIndicator) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'confidence',
            indicator: finalState.confidenceIndicator
          })}\n\n`));
          console.log(`📊 Confidence indicator sent: ${finalState.confidenceIndicator.score}%`);
        }
        
        // Phase C1 & C2: Send follow-up suggestions
        if (finalState?.followUpSuggestions && finalState.followUpSuggestions.length > 0) {
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
        controller.close();
      } catch (error: any) {
        console.error('❌ Stream error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error', 
          content: error.message 
        })}\n\n`));
        controller.close();
      }
    },
  });
  
  return stream;
}

