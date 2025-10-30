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
            researchContext += `[${idx + 1}] ${s.title}\n${s.url}\n${s.content?.substring(0, 200)}...\n\n`;
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
      
      // Query Planning (long operation - emit status to prevent QUIC timeout)
      if (statusEmitter) {
        statusEmitter({
          type: 'status',
          stage: 'planning',
          content: `🔍 Analyzing query and planning search strategy...`,
          progress: 5
        });
      }
      
      const queryPlan = await planQuery(queryToSend, entityContext, env.OPENAI_API_KEY);
      
      if (statusEmitter) {
        // ENHANCED: Emit detailed query plan breakdown as chain of thought
        statusEmitter({
          type: 'thinking',
          step: 'query_planning',
          content: `Planning search strategy: ${queryPlan.strategy}`
        });
        
        // Emit each sub-query as a separate thinking step for visual clarity
        queryPlan.subQueries.forEach((subQuery, index) => {
          const priorityIcon = subQuery.priority === 'high' ? '🔴' : subQuery.priority === 'medium' ? '🟡' : '🟢';
          statusEmitter({
            type: 'thinking',
            step: `subquery_${index + 1}`,
            content: `${priorityIcon} ${subQuery.purpose || 'Searching'}: "${subQuery.query}"`
          });
        });
        
        statusEmitter({
          type: 'status',
          stage: 'searching',
          content: `⚡ Executing ${queryPlan.subQueries.length} parallel searches...`,
          progress: 25
        });
      }
      
      // Parallel Execution (long operation - statusEmitter sends periodic updates)
      // The executeParallelQueries function already uses statusEmitter internally
      // This ensures heartbeat messages during the search phase
      const allSources = await executeParallelQueries(
        queryPlan.subQueries,
        env.GEMINI_API_KEY,
        entityContext,
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
      
      const rankedSources = aggregateAndRank(allSources);
      
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
      }
      
      // Build research context (CRITICAL: No raw JSON - only human-readable summary)
      let researchContext = `=== GEMINI GROUNDING RESULTS (PARALLEL SEARCH) ===\n\n`;
      researchContext += `SEARCH STRATEGY: ${queryPlan.strategy} (${queryPlan.subQueries.length} targeted searches)\n`;
      researchContext += `SOURCES FOUND: ${allSources.length} → ${rankedSources.length} (ranked by authority)\n\n`;
      
      if (rankedSources.length > 0) {
        researchContext += `SOURCES (ranked by authority):\n`;
        rankedSources.forEach((s: any, idx: number) => {
          researchContext += `[${idx + 1}] [${s.tier}] ${s.title}\n${s.url}\n${s.content?.substring(0, 200)}...\n\n`;
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
        fullContent = `I apologize, but I'm experiencing a response delay. Please try your question again, or enable the "Online Research" toggle for comprehensive analysis.`;
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
    const shouldRunVerificationPipeline = 
      state.sources.length >= 3 && // Multiple sources available
      (userQuery.match(/\b(largest|biggest|smallest|compare|versus|vs|which|best)\b/i) || // Comparative query
       state.sources.length >= 5); // Rich source set
    
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

**MANDATORY SECTIONS FOR TECHNICAL QUERIES (ALL REQUIRED - PROPER MARKDOWN FORMATTING):**
1. **## EXECUTIVE SUMMARY** 
   [2-3 sentences focused on the technical aspect being asked about - engines, equipment, systems]
   For engines: "Dynamic 17's propulsion system comprises three Caterpillar C32 ACERT marine engines, each rated at 1,450 BHP at 2,300 RPM [[1]](url). These engines are known for robust performance in offshore crew boat operations, with specific maintenance requirements and known service considerations [[2]](url)."

2. **## TECHNICAL SPECIFICATIONS**
   [EXTENSIVE detailed specs - include EVERY technical detail found in sources]
   **MANDATORY DETAILS FOR EQUIPMENT/ENGINES:**
   • **Engine Model:** [Full OEM name] [Model] [Configuration] [[N]](url)
   • **Displacement:** [exact value] liters per engine [[N]](url)
   • **Power Output:** [number] × [power] [units] at [rpm] RPM [[N]](url)
   • **Fuel System:** [type with details] [[N]](url)
   • **Cooling:** [type - heat exchanger, aftercooled, etc.] [[N]](url)
   • **Dry Weight:** Approximately [weight] [units] per engine [[N]](url)
   • **Turbocharging:** [number and type] [[N]](url)
   • Include ALL technical specifications found - be comprehensive

3. **## MAINTENANCE ANALYSIS** (CRITICAL - REQUIRED)
   [DETAILED maintenance information - this section is MANDATORY and must be extensive]
   **OEM Service Intervals:**
   • Oil & Filter Change: Every [hours] operating hours [[N]](url)
   • Air Filter Service: Every [hours] hours or [frequency] [[N]](url)
   • Fuel Filter Replacement: Every [hours] hours (primary), [hours] hours (secondary) [[N]](url)
   • Coolant System Service: Every [hours] hours or [time period] [[N]](url)
   • Turbocharger Inspection: Every [hours] hours [[N]](url)
   • Major Overhaul: [hours]-[hours] hours (depending on operating conditions) [[N]](url)
   
   **Common Failure Modes:**
   • [Failure mode] (typical cause) - typically manifests at [hours]-[hours] hours [[N]](url)
   • [Failure mode] accelerated by [cause] [[N]](url)
   • [Failure mode] if [condition] not met [[N]](url)
   
   **Critical Maintenance Points:**
   • Monitor [parameter] for [indication] (indicates [issue]) [[N]](url)
   • [Component] replacement every [hours] hours critical for [system] integrity [[N]](url)
   • [Component] replacement typically required at [hours]-[hours] hour intervals [[N]](url)
   • [Procedure] every [hours] hours to prevent [issue] [[N]](url)

4. **## OPERATIONAL RECOMMENDATIONS** (CRITICAL - REQUIRED)
   [DETAILED operational guidance with specific numbers and thresholds]
   **Performance Optimization:**
   • Maintain [system] between [%]-[%] for optimal [benefit] and component life [[N]](url)
   • Avoid [condition] (>[time]) to prevent [issue] [[N]](url)
   • Operating at [condition] reduces [metric] by [%] vs [baseline] [[N]](url)
   
   **Warning Signs & Monitoring:**
   • [Parameter] >[value] indicates potential [issue] or [failure] [[N]](url)
   • [Parameter] <[value] at [condition] requires immediate investigation [[N]](url)
   • [Parameter] variance >[value] between [components] indicates [issue] [[N]](url)
   • [Observation] suggests [condition] or [problem] [[N]](url)
   
   **Best Practices:**
   • Pre-[action] to [temperature] before [condition] in [environment] [[N]](url)
   • Use [OEM]-approved [specification] or higher [standard] [[N]](url)
   • Implement [procedure] every [frequency] for [benefit] [[N]](url)
   • Maintain detailed [records] for [compliance/benefit] [[N]](url)

5. **## REAL-WORLD SCENARIOS** (CRITICAL - REQUIRED)
   [Field experience, operational context, industry knowledge]
   **Operational Context:**
   • [Vessel/Equipment] operates in [environment] where [system] is [importance] [[N]](url)
   • Typical duty cycle involves [description] which [impact] [[N]](url)
   
   **Field Experience:**
   • Similar [equipment] operating [conditions] report optimal [metric] when [condition] [[N]](url)
   • Operators note that [factor] is the primary factor affecting [metric], with [impact] [[N]](url)
   
   **Industry Best Practices:**
   • Implementing [method] using [tools] has [outcome] across [scope] [[N]](url)
   • Critical monitoring parameters include [list] with [thresholds] [[N]](url)

6. **## MARITIME CONTEXT** (regulatory/industry perspective - with citations)
   [Strategic importance, compliance, industry standards]

**MANDATORY MARKDOWN FORMATTING:**
- Use ## Header Name (h2 markdown headers) for all main sections
- Use ### Subheader (h3 markdown headers) for subsections if needed
- Use bullet points (•) for specifications and lists
- Use **bold** for emphasis within text
- Each section must start with ## header, NEVER use plain text headers

**WRITING STYLE FOR TECHNICAL QUERIES:**
- Write as a Chief Engineer with 20+ years hands-on experience
- **MANDATORY DETAIL LEVEL**: Include EVERY specific number found: service intervals (hours), temperatures (°C), pressures (PSI), hours, model numbers, power ratings (BHP/kW), dimensions, weights
- **MANDATORY**: Mention OEM manufacturers by FULL name (Caterpillar, Wartsila, MAN, Cummins, etc.) - look for this in sources
- **MANDATORY**: Include exact model numbers with full designation (e.g., "Caterpillar C32 ACERT" not just "C32")
- **MANDATORY**: Include configuration details (V-12, inline-6, twin turbo, etc.)
- **MANDATORY**: Cross-reference multiple sources - if one source says "3,000 kW" and another says "2,800 kW", mention both with citations
- **MANDATORY**: Add specific operational thresholds: "Maintain engine load between 60-85%", "Coolant temperature >85°C indicates..."
- **MANDATORY**: Include failure modes with specific hour intervals when available: "Aftercooler core corrosion typically manifests at 8,000-12,000 hours"
- Add practical warnings, tips, and real-world operational knowledge
- Use professional maritime terminology throughout
- Target length: 800-1,200 words minimum for technical queries (be comprehensive, not brief)

**SOURCE UTILIZATION FOR TECHNICAL QUERIES:**
- You have ${state.sources.length} sources available - USE MULTIPLE SOURCES
- Different sources may have different technical details - synthesize information from multiple sources
- If Source [1] mentions "twin diesel engines" and Source [2] mentions "Caterpillar C32", combine them: "twin Caterpillar C32 diesel engines"
- Don't rely on just one source - cross-verify specifications across sources
- If sources conflict, mention the conflict and cite both sources

**FAILURE TO INCLUDE MAINTENANCE ANALYSIS, OPERATIONAL RECOMMENDATIONS, AND REAL-WORLD SCENARIOS SECTIONS IS UNACCEPTABLE.**
` : `
**This is an OVERVIEW query - user needs executive summary:**
- Provide comprehensive, detailed information
- Write as a Technical Director with deep maritime knowledge
- Target length: 500-700 words (be thorough, not brief)
- **MANDATORY FORMAT**: Use proper markdown headers and structure with EXTENSIVE detail

**REQUIRED STRUCTURE FOR VESSEL OVERVIEW QUERIES:**
1. ## EXECUTIVE SUMMARY
   [2-3 sentences with: built year, builder, classification society, current operator, flag state, primary use]
   Example format: "Dynamic 17 is a high-speed crew boat designed for offshore operations, primarily used for transporting personnel and light cargo to and from offshore installations. Built in 2009 by NGV TECH SITIAWAN in Malaysia, this vessel is classified under Bureau Veritas with the notation of a Fast Crew Boat, CAT-A. It is currently operated by Dynamic Marine Services FZE, based in Dubai, UAE [[1]](url)."

2. ## TECHNICAL SPECIFICATIONS
   [COMPREHENSIVE bullet point list - include ALL available specs from sources]
   **MANDATORY SPECIFICATIONS TO INCLUDE:**
   • **Length Overall (LOA):** [exact value in meters] [[N]](url)
   • **Breadth Moulded:** [exact value in meters] [[N]](url)
   • **Depth Moulded:** [exact value in meters] [[N]](url)
   • **Draft Moulded:** [exact value in meters] [[N]](url)
   • **Gross Tonnage (GRT):** [value] [[N]](url)
   • **Net Tonnage (NRT):** [value] [[N]](url)
   • **Deadweight Tonnage (DWT):** [value] [[N]](url)
   • **Main Engines:** [number] x [OEM name] [model] [type] [[N]](url)
   • **Power Output:** [exact power rating with units] [[N]](url)
   • **Propulsion:** [type - fixed pitch, controllable pitch, waterjet, etc.] [[N]](url)
   • **Generators:** [number and capacity] [[N]](url)
   • **Speed:** Maximum [knots], Economical [knots] [[N]](url)
   • **Passenger Capacity:** [number] persons [[N]](url)
   • **Crew Accommodation:** [number] [[N]](url)
   • **Flag & Class:** [flag state], [classification society] [[N]](url)
   - Include EVERY specification found in sources - be comprehensive, not selective

3. ## OPERATIONAL STATUS
   [2-3 sentences about current flag state, registration, active region, primary operations]
   Example format: "Dynamic 17 is registered under St. Kitts & Nevis, although some sources indicate a recent flag change to Panama. It is actively used in the Middle East region, supporting offshore oil and gas operations by providing reliable crew transfer services [[3]](url)."

4. ## TECHNICAL ANALYSIS
   [1 paragraph analyzing key design features, propulsion system advantages, operational capabilities]
   Example: "The vessel's propulsion system, featuring Caterpillar C32 engines, is optimized for high-speed operations, providing robust performance and reliability in challenging offshore environments. The use of fixed pitch propellers enhances maneuverability and efficiency, crucial for quick crew transfers. The onboard generators ensure sufficient power supply for all operational needs, including navigation and communication systems [[4]](url)."

5. ## MARITIME CONTEXT
   [1 paragraph about strategic importance, industry role, operator context]
   Example: "Dynamic 17 plays a critical role in supporting offshore operations, particularly in the oil and gas sector. Its capacity to transport a significant number of personnel safely and efficiently makes it a valuable asset in the region. The vessel's design and capabilities align with the industry's need for fast, reliable crew transfer solutions, enhancing operational efficiency and safety [[5]](url)."

**CRITICAL FORMATTING REQUIREMENTS**: 
- Start with ## EXECUTIVE SUMMARY (markdown h2 header with ##)
- Use ## for ALL main section headers
- Use bullet points (•) for ALL specifications - be exhaustive, include every spec found
- Include citations [[N]](url) after EVERY factual claim
- For TECHNICAL SPECIFICATIONS: List EVERY specification available - dimensions, tonnage, engines, generators, speed, capacity
- Write in professional maritime language with precise terminology
- Proper markdown formatting is REQUIRED - never use plain text headers
`}`;

    const synthesisPrompt = `${MARITIME_SYSTEM_PROMPT}${contextAddition}

${state.researchContext}

${technicalDepthFlag}

**USER QUERY**: ${userQuery}

**CRITICAL: ABSOLUTELY DO NOT INCLUDE SEARCH PLAN OR JSON IN YOUR RESPONSE**
- **NEVER** output JSON structures with "strategy" or "subQueries" fields
- **NEVER** show the search plan details - they are internal processing only
- Users already see thinking steps automatically - you don't need to show them
- **ONLY** provide the final synthesized answer with citations
- **DO NOT** echo back the search strategy or query structure
- If you see JSON structures in the context, ignore them completely - they are not for user display
- Start directly with your answer using markdown header: ## EXECUTIVE SUMMARY or ## TECHNICAL SPECIFICATIONS
- **NEVER** start with plain text like "SUMMARY" or "EXECUTIVE SUMMARY" without the ## markdown header
- **NEVER** use plain text headers - ALWAYS use markdown ## Header Name format
- Use proper markdown structure throughout your response

**CRITICAL CITATION REQUIREMENTS:**
1. **MANDATORY**: Add inline citations after EVERY factual claim using [[N]](url) format
2. **MINIMUM CITATIONS**: 
   ${state.requiresTechnicalDepth ? 
     `- Technical queries: Include citations from AT LEAST ${Math.min(5, state.sources.length)} different sources
   - Cross-verify technical specifications (manufacturer, model, ratings) across multiple sources
   - If you have ${state.sources.length} sources available, use ${Math.min(5, state.sources.length)}-${Math.min(8, state.sources.length)} of them` :
     `- Standard queries: Include at least ${Math.min(3, state.sources.length)} citations`}
3. **CITATION FORMAT**: Use exactly [[N]](url) where N is source number and url is the full URL
   - Example: "The vessel is 250 meters long [[1]](${state.sources[0]?.url || 'url'})"
   - Example: "Operated by Maersk [[2]](${state.sources[1]?.url || 'url'})"
4. **TECHNICAL QUERIES**: Different sections should cite different sources when possible
5. **FREQUENCY**: Add citations after:
   - Technical specifications (dimensions, tonnage, speed, power, capacity)
   - Engine/equipment model numbers and OEM names
   - Service intervals and maintenance schedules
   - Company/operator names
   - IMO numbers and classifications
   - Current status and locations
   - Historical facts and dates
   - Operational recommendations and thresholds
   - Failure modes and warning signs
   - Field experience and best practices

**INSTRUCTIONS:**
- Use the "=== GEMINI GROUNDING RESULTS ===" section above to answer the user's query
- The SOURCES section contains Google-grounded information - use it as your primary source
- Follow the format specified in the TECHNICAL DEPTH flag above
- **MANDATORY FORMATTING**: 
  - Use markdown headers: ## EXECUTIVE SUMMARY, ## TECHNICAL SPECIFICATIONS, etc.
  - Use bullet points for specifications: • **Dimension:** value [[N]](url)
  - Write in clear paragraphs with proper spacing
  - Include citations [[N]](url) after EVERY factual claim
- Be confident - this is Google-verified information
- **DO NOT FORGET THE CITATIONS** - they are mandatory for verification mode
- **DO NOT** include a "Sources:" section at the end - all citations should be inline`;
    
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
    
    // PHASE 4: Citation Enforcement - Ensure inline citations are present
    const citationResult = enforceCitations(fullContent, state.sources);
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
    response.content = fullContent;
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
  
  if (isPurePlatformQuery) {
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
  
  // Extract sources from all tool results
  const allSources: Source[] = [];
  let hasResearch = false;
  
  for (const toolMsg of toolMessages) {
    const content = typeof toolMsg.content === 'string' ? toolMsg.content : JSON.stringify(toolMsg.content);
    
    try {
      const data = JSON.parse(content);
      
      if (data.sources && Array.isArray(data.sources)) {
        allSources.push(...data.sources);
        hasResearch = true;
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
  
  // Build research context if we have sources
  let researchContext: string | null = null;
  if (hasResearch && allSources.length > 0) {
    researchContext = `=== RESEARCH CONTEXT ===\nFound ${allSources.length} sources:\n\n`;
    allSources.forEach((source, idx) => {
      researchContext += `[${idx + 1}] ${source.title}\n${source.url}\n${source.content?.substring(0, 300)}...\n\n`;
    });
  }
  
  console.log(`   Sources extracted: ${allSources.length}`);
  console.log(`   Research context: ${hasResearch ? 'YES' : 'NO'}`);
  
  return {
    sources: allSources,
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
      let pendingPlanBuffer: string | null = null; // Buffer for JSON query plans that arrive in multiple chunks

      const chunkHasToolCalls = (msg: any): boolean => {
        if (!msg) return false;

        const directToolCalls = Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0;
        const additionalToolCalls = Array.isArray(msg?.additional_kwargs?.tool_calls) && msg.additional_kwargs.tool_calls.length > 0;
        const additionalToolCallChunks = Array.isArray(msg?.additional_kwargs?.tool_call_chunks) && msg.additional_kwargs.tool_call_chunks.length > 0;

        if (directToolCalls || additionalToolCalls || additionalToolCallChunks) {
          return true;
        }

        if (Array.isArray(msg.content)) {
          const nonTextParts = msg.content.some((part: any) => part && part.type && part.type !== 'text');
          if (nonTextParts) return true;
        }

        return false;
      };

      const parseQueryPlan = (text: string) => {
        if (!text) return null;
        const trimmed = text.trim();
        if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

        try {
          const parsed = JSON.parse(trimmed);
          if (!parsed || typeof parsed !== 'object') return null;

          const hasStrategy = typeof parsed.strategy === 'string';
          const hasSubQueries = Array.isArray(parsed.subQueries);
          if (hasStrategy && hasSubQueries) {
            return parsed as { strategy: string; subQueries: Array<{ query: string; purpose?: string; priority?: string }> };
          }
        } catch (_) {
          return null;
        }

        return null;
      };

      const formatQueryPlanForDisplay = (plan: { strategy: string; subQueries: Array<{ query: string; purpose?: string; priority?: string }> }) => {
        const header = `Thinking — Search Plan (${plan.strategy})`;
        const body = plan.subQueries
          .map((sq, index) => {
            const label = sq.priority ? sq.priority.toUpperCase() : 'UNRATED';
            const purpose = sq.purpose ? ` — ${sq.purpose}` : '';
            return `${index + 1}. [${label}] ${sq.query}${purpose}`;
          })
          .join('\n');

        return `${header}\n${body}`;
      };

      const extractTextContent = (msg: any): string => {
        if (!msg) return '';

        const content = msg.content;

        if (typeof content === 'string') {
          return content;
        }

        if (Array.isArray(content)) {
          // CRITICAL: Join array content intelligently to preserve word boundaries
          // LLM may return content as array of tokens that need proper spacing
          const textParts = content
            .filter((part: any) => part && part.type === 'text' && typeof part.text === 'string')
            .map((part: any) => part.text);
          
          if (textParts.length === 0) return '';
          
          // Smart join: add space only when needed (if parts don't already have spacing)
          let result = textParts[0];
          for (let i = 1; i < textParts.length; i++) {
            const prevPart = textParts[i - 1];
            const currPart = textParts[i];
            
            // Check if space is needed (both parts are alphanumeric and no existing space/punctuation)
            const needsSpace = (
              prevPart.length > 0 && currPart.length > 0 &&
              /[a-zA-Z0-9]$/.test(prevPart) &&
              /^[a-zA-Z0-9]/.test(currPart) &&
              !prevPart.endsWith(' ') &&
              !currPart.startsWith(' ')
            );
            
            result += (needsSpace ? ' ' : '') + currPart;
          }
          
          return result;
        }

        return '';
      };
      
      // PHASE A1 & A2: Create status/thinking emitter
      const statusEmitter = (event: { type: string; step?: string; stage?: string; content: string; progress?: number }) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch (err) {
          console.warn('⚠️ Status emit failed:', err);
        }
      };
      
      // CRITICAL: Declare keep-alive interval outside try-catch for cleanup
      let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
      
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
        
        // CRITICAL: Add keep-alive mechanism to prevent QUIC timeouts during long async operations
        // QUIC may timeout if no data is sent for >30 seconds, so send heartbeat every 20 seconds
        const KEEP_ALIVE_INTERVAL = 20000; // 20 seconds
        keepAliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`)); // SSE comment (no-op but keeps connection alive)
          } catch (e) {
            // Connection may be closed, clear interval
            if (keepAliveInterval) {
              clearInterval(keepAliveInterval);
              keepAliveInterval = null;
            }
          }
        }, KEEP_ALIVE_INTERVAL);
        
        // Stream events using [streamType, event] tuple pattern
        for await (const [streamType, event] of agentStream) {
          eventCount++;
          
          // Handle token-level streaming from "messages" mode
          if (streamType === 'messages') {
            const messages = event as BaseMessage[] | BaseMessage;
            const messageArray = Array.isArray(messages) ? messages : [messages];
            
            for (const msg of messageArray) {
              if (msg.constructor.name === 'AIMessageChunk') {
                if (chunkHasToolCalls(msg)) {
                  continue;
                }

                let text = extractTextContent(msg);
                if (!text) {
                  continue;
                }

                const tryEmitPlan = (raw: string) => {
                  const queryPlan = parseQueryPlan(raw);
                  if (!queryPlan) return false;

                  // CRITICAL FIX: Don't emit query plan as content - it's already emitted as thinking steps
                  // in router node. This prevents JSON from appearing in content stream.
                  // If this code path is reached, it means JSON leaked through somehow - just filter it
                  console.warn(`⚠️ [Backend] Filtered out JSON query plan that leaked to LLM stream`);
                  statusEmitter?.({
                    type: 'thinking',
                    step: 'query_plan_filtered',
                    content: `Filtered leaked query plan JSON`
                  });
                  pendingPlanBuffer = null;
                  return true; // Return true so it doesn't get emitted as content
                };

                if (pendingPlanBuffer !== null) {
                  pendingPlanBuffer += text;
                  if (tryEmitPlan(pendingPlanBuffer)) {
                    continue;
                  }
                  continue;
                }

                const trimmed = text.trimStart();
                
                // CRITICAL: Detect CONCATENATED query plan patterns FIRST (before JSON bracket check)
                // This catches the broken streaming case where query plan leaks as concatenated text
                // Pattern: "strategy" + "Queries" + "query" + [text] + "purpose" + [text] + "priority"
                const concatenatedPlanPattern = /strategy\w*Queries.*?query\w+.*?purpose\w+.*?priority/i;
                if (concatenatedPlanPattern.test(text)) {
                  console.error(`❌ [Backend] CRITICAL: Detected CONCATENATED query plan in stream - REJECTING`);
                  console.error(`   Sample: "${text.substring(0, 150)}..."`);
                  // Don't emit this at all - it's definitely query plan leakage
                  continue;
                }
                
                // Also detect query plan structure keywords in suspicious context
                const hasPlanKeywords = /strategy/i.test(text) && 
                                      (/Queries|subQueries/i.test(text) || /query\w+.*?purpose/i.test(text));
                if (hasPlanKeywords && text.length < 500 && 
                    !text.includes('EXECUTIVE') && !text.includes('TECHNICAL') && 
                    !text.includes('Summary') && !text.includes('Specifications')) {
                  // Short text with query plan keywords and no legitimate content markers = reject
                  console.error(`❌ [Backend] Detected query plan keywords in suspicious short chunk - REJECTING`);
                  console.error(`   Content: "${text.substring(0, 200)}..."`);
                  continue;
                }
                
                const looksLikePlanStart = trimmed.startsWith('{') && trimmed.includes('subQueries');

                if (looksLikePlanStart) {
                  // Try to parse and format as thinking step
                  if (!tryEmitPlan(text)) {
                    // If parsing failed, buffer it for potential multi-chunk JSON
                    pendingPlanBuffer = text;
                    continue;
                  }
                  // If parsing succeeded, the formatted plan was already emitted as thinking
                  // Don't emit the raw JSON as content
                  continue;
                }

                // CRITICAL: Filter out any remaining JSON query plan artifacts
                // Check if text is still a JSON query plan (even if incomplete)
                if (pendingPlanBuffer !== null) {
                  const combined = pendingPlanBuffer + text;
                  // Check combined buffer for concatenated pattern too
                  if (concatenatedPlanPattern.test(combined)) {
                    console.error(`❌ [Backend] Combined buffer contains concatenated query plan - REJECTING`);
                    pendingPlanBuffer = null; // Clear buffer and skip
                    continue;
                  }
                  if (tryEmitPlan(combined)) {
                    // Successfully parsed combined buffer, don't emit raw JSON
                    continue;
                  }
                }
                
                // CRITICAL: Detect query plan patterns (with spaces OR concatenated)
                // Pattern: "strategy focused Queries query ... purpose ... priority" (with spaces)
                const spacedQueryPlanPattern = /strategy\s*(focused\s+)?Queries.*?query\s+\w+.*?purpose\s+\w+.*?priority/i;
                const concatenatedPlanPattern = /strategy\w*Queries.*?query\w+.*?purpose\w+.*?priority/i;
                const repeatedQueryPurposePattern = /query\s+\w+.*?purpose\s+\w+.*?priority.*?query\s+\w+.*?purpose/i;
                
                if (spacedQueryPlanPattern.test(text) || concatenatedPlanPattern.test(text) || repeatedQueryPurposePattern.test(text)) {
                  console.error(`❌ [Backend] CRITICAL: Detected QUERY PLAN pattern (spaced/concatenated) in stream - REJECTING`);
                  console.error(`   Sample: "${text.substring(0, 150)}..."`);
                  continue; // Don't emit - it's definitely query plan leakage
                }
                
                // Also check for query plan structure keywords in sequence
                const hasStrategyQueries = /strategy\s+(focused\s+)?(Queries|queries)/i.test(text);
                const hasQueryPurpose = /query\s+\w+\s+purpose\s+\w+/i.test(text);
                const hasQueryPriority = /query\s+\w+.*?priority/i.test(text);
                
                if ((hasStrategyQueries || hasQueryPurpose) && 
                    (hasQueryPurpose || hasQueryPriority) &&
                    text.length < 600 &&
                    !text.includes('EXECUTIVE') && 
                    !text.includes('TECHNICAL') &&
                    !text.includes('## EXECUTIVE') &&
                    !text.includes('## TECHNICAL')) {
                  console.error(`❌ [Backend] Detected query plan keyword sequence - REJECTING`);
                  console.error(`   Sample: "${text.substring(0, 200)}..."`);
                  continue;
                }
                
                // Check for JSON query plan patterns
                const containsJsonPlan = trimmed.includes('"strategy"') && trimmed.includes('"subQueries"');
                if (containsJsonPlan) {
                  console.warn(`⚠️ [Backend] Detected JSON query plan in LLM response: "${text.substring(0, 100)}..."`);
                  // Remove JSON patterns from the text before emitting
                  const jsonPlanPattern = /\{[^{]*"strategy"[\s\S]*?"subQueries"[\s\S]*?\}/g;
                  text = text.replace(jsonPlanPattern, '');
                  
                  // If after removal the text is empty or just whitespace, skip this chunk
                  if (!text.trim() || text.trim().length < 10) {
                    continue;
                  }
                  
                  // Emit the cleaned text (without JSON)
                  console.log(`   ✓ Cleaned JSON from chunk, emitting ${text.length} chars`);
                }
                
                // Also check if starting with JSON bracket - buffer for complete JSON detection
                if (trimmed.startsWith('{') && (trimmed.includes('"strategy"') || trimmed.includes('"subQueries"'))) {
                  console.warn(`⚠️ [Backend] Filtered out JSON query plan starting chunk from stream`);
                  if (pendingPlanBuffer === null) {
                    pendingPlanBuffer = text;
                  } else {
                    const combined: string = pendingPlanBuffer + text;
                    pendingPlanBuffer = combined;
                    // Try to parse the combined buffer
                    if (tryEmitPlan(combined)) {
                      continue; // Successfully filtered
                    }
                  }
                  continue;
                }

                hasStreamedContent = true;
                fullResponse += text;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: text })}\n\n`));

                if (eventCount <= 5) {
                  console.log(`   💬 Token #${eventCount}: "${text.substring(0, 30)}..."`);
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
        
        // FALLBACK: If token streaming didn't work, chunk the complete response
        // This is the proven pattern from legacy agent
        if (!hasStreamedContent && finalState?.messages) {
          console.log(`⚠️ No token streaming occurred, using fallback chunking`);
          
          const messagesUpdate = finalState.messages;
          if (Array.isArray(messagesUpdate) && messagesUpdate.length > 0) {
            const lastMessageWithText = [...messagesUpdate].reverse().find((msg: any) => {
              if (!msg) return false;
              if (chunkHasToolCalls(msg)) return false;
              const text = extractTextContent(msg);
              if (!text) return false;
              return !parseQueryPlan(text);
            });

            const content = extractTextContent(lastMessageWithText);

            if (content && content.length > 0 && !parseQueryPlan(content)) {
              console.log(`   📦 Chunking ${content.length} chars in ${SSE_CHUNK_SIZE}-char chunks`);

              for (let i = 0; i < content.length; i += SSE_CHUNK_SIZE) {
                const chunk = content.slice(i, i + SSE_CHUNK_SIZE);
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`
                ));

                if ((i / SSE_CHUNK_SIZE) % SSE_THROTTLE_EVERY_N_CHUNKS === 0) {
                  await new Promise(resolve => setTimeout(resolve, SSE_THROTTLE_INTERVAL_MS));
                }
              }

              fullResponse = content;
              console.log(`   ✅ Fallback chunking complete: ${content.length} chars sent`);
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
        
        // Clear keep-alive interval before closing
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
        
        // Done
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error: any) {
        console.error('❌ Stream error:', error);
        
        // Clear keep-alive interval on error
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
        
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

