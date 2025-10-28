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
  
  // Chain of Thought - ALWAYS emit entity resolution (if applicable)
  if (classification.resolvedQuery.hasContext && statusEmitter) {
    statusEmitter({
      type: 'thinking',
      step: 'entity_resolution',
      content: `"${classification.resolvedQuery.originalQuery}" → ${classification.resolvedQuery.activeEntity?.name}`
    });
  }
  
  // Chain of Thought - ALWAYS emit mode selection
  if (statusEmitter) {
    const modeDescription = {
      'none': 'Using knowledge base',
      'verification': 'Verifying with Google Search',
      'research': 'Deep research mode'
    };
    const modeText = modeDescription[classification.mode];
    const hybridText = classification.isHybrid ? ' + platform context' : '';
    statusEmitter({
      type: 'thinking',
      step: 'mode_selection',
      content: `${modeText}${hybridText}`
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
      
      // Emit status BEFORE calling Gemini (fixes 30s silence!)
      if (statusEmitter) {
        statusEmitter({
          type: 'status',
          stage: 'searching',
          content: `🔍 Searching Google for: ${queryToSend.substring(0, 60)}${queryToSend.length > 60 ? '...' : ''}`,
          progress: 0
        });
      }
      
      // Call Gemini tool directly (not via LLM) with timeout
      const GEMINI_TIMEOUT = 30000; // 30 seconds
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini timeout after 30s')), GEMINI_TIMEOUT)
      );
      
      const result = await Promise.race([
        geminiTool.invoke({ 
          query: queryToSend,
          entityContext: entityContext || undefined
        }, config),
        timeoutPromise
      ]);
      
      // Emit status AFTER Gemini completes
      if (statusEmitter) {
        statusEmitter({
          type: 'status',
          stage: 'analyzing',
          content: '✓ Search complete, analyzing results...',
          progress: 50
        });
      }
      
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      
      console.log(`   ✅ Gemini complete: ${parsed.sources?.length || 0} sources`);
      
      // Extract sources
      const sources = (parsed.sources || []).map((s: any) => ({
        title: s.title || '',
        url: s.url || '',
        content: s.content || '',
        score: s.score || 0.5,
      }));
      
      if (parsed.sources?.length > 0) {
        parsed.sources.forEach((s: any, i: number) => {
          console.log(`      [${i+1}] ${s.title?.substring(0, 60)}`);
        });
      }
      
      // Build research context from Gemini answer
      let researchContext = '';
      if (sources.length > 0 || parsed.answer) {
        researchContext = `=== GEMINI GROUNDING RESULTS ===\n\n`;
        researchContext += `ANSWER:\n${parsed.answer || 'No answer provided.'}\n\n`;
        researchContext += `SOURCES (${sources.length}):\n`;
        sources.forEach((s: any, idx: number) => {
          researchContext += `[${idx + 1}] ${s.title}\n${s.url}\n${s.content?.substring(0, 200)}...\n\n`;
        });
        
        // Add fleetcore context if hybrid query or context preservation is enabled
        if (classification.preserveFleetcoreContext) {
          const fleetcoreContext = buildFleetcoreContext(sessionMemory || undefined);
          if (fleetcoreContext) {
            researchContext += fleetcoreContext;
            console.log(`   ✨ Added fleetcore context to research`);
          }
        }
      } else {
        // Even if no sources, create minimal context so synthesizer knows we tried
        console.warn(`   ⚠️ Gemini returned no sources or answer`);
        researchContext = `=== GEMINI GROUNDING RESULTS ===\n\nNo specific information found. Please answer from general maritime knowledge or suggest enabling deep research.`;
      }
      
      return {
        mode: classification.mode,
        geminiAnswer: parsed.answer || null,
        sources,
        researchContext,
      };
    } catch (error: any) {
      console.error(`   ❌ Gemini failed:`, error.message);
      
      // Create fallback research context indicating the error
      const fallbackContext = `=== GEMINI GROUNDING RESULTS ===\n\nGemini search encountered an error: ${error.message}\n\nPlease answer from general maritime knowledge or suggest the user enable online research for comprehensive information.`;
      
      return { 
        mode: classification.mode, // Keep verification mode
        geminiAnswer: null,
        sources: [],
        researchContext: fallbackContext,
      };
    }
  }
  
  // Other modes (none/research) just set the mode
  return { mode: classification.mode };
}

/**
 * Synthesizer Node - Streams answer based on mode
 * Replicated from legacy agent architecture
 */
async function synthesizerNode(state: State, config: any): Promise<Partial<State>> {
  const env = config.configurable?.env;
  const sessionMemory = config.configurable?.sessionMemory as SessionMemory | null;
  const statusEmitter = config.configurable?.statusEmitter;
  
  console.log(`\n🎨 SYNTHESIZER NODE`);
  console.log(`   Mode: ${state.mode}`);
  console.log(`   Has Gemini answer: ${!!state.geminiAnswer}`);
  
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
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: state.researchContext ? 0.4 : 0.3,
    openAIApiKey: env.OPENAI_API_KEY,
    streaming: true, // Enable token streaming for all modes
  });
  
  // MODE: NONE - Answer from training data
  if (state.mode === 'none') {
    console.log(`   🎯 Synthesizing NONE mode - training data only`);
    
    const platformContext = `\n\n=== PLATFORM QUERY ===
Answer comprehensively from your training knowledge about fleetcore.
DO NOT suggest using external research - provide detailed information directly.

**DEBUG INFO (REMOVE IN PRODUCTION):** Add this line at the very end of your response:
"_[Mode: KNOWLEDGE | Training data only]_"`;
    
    const systemMessage = new SystemMessage(MARITIME_SYSTEM_PROMPT + contextAddition + platformContext);
    
    // CRITICAL: Use stream() and pass config for LangGraph callback system
    // The for-await loop allows node to complete, but LangGraph intercepts chunks via callbacks
    const stream = await llm.stream([systemMessage, ...state.messages], config);
    let fullContent = '';
    for await (const chunk of stream) {
      fullContent += chunk.content;
    }
    
    console.log(`   ✅ Synthesized (${fullContent.length} chars)`);
    return { messages: [new AIMessage(fullContent)] };
  }
  
  // MODE: VERIFICATION - Synthesize from Gemini answer with optional verification pipeline
  if (state.mode === 'verification') {
    // Check if we have research context from Gemini
    if (!state.researchContext) {
      console.warn(`   ⚠️ VERIFICATION mode but no research context - answering from training`);
      const fallbackPrompt = `${MARITIME_SYSTEM_PROMPT}${contextAddition}

=== FALLBACK MODE ===
Gemini search was unavailable. Answer from your maritime knowledge base.
If you don't have specific information, be honest and suggest the user enable online research.`;
      
      const systemMessage = new SystemMessage(fallbackPrompt);
      const stream = await llm.stream([systemMessage, ...state.messages], config);
      let fullContent = '';
      for await (const chunk of stream) {
        fullContent += chunk.content;
      }
      
      console.log(`   ✅ Synthesized fallback (${fullContent.length} chars)`);
      return { messages: [new AIMessage(fullContent)] };
    }
    
    console.log(`   🔮 Synthesizing VERIFICATION mode from Gemini result`);
    
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
    
    // Build source URL mapping for clickable citations
    const sourceUrlMapping = state.sources.map((s, i) => `[${i + 1}]: ${s.url}`).join('\n');
    
    const synthesisPrompt = `${MARITIME_SYSTEM_PROMPT}${contextAddition}

${state.researchContext}

=== SYNTHESIS INSTRUCTIONS FOR MARITIME EXPERTS ===

AUDIENCE: Technical officers, captains, marine superintendents, and maritime professionals
REQUIREMENT: Deliver precise, technical, actionable intelligence with CLICKABLE source citations

**CITATION FORMAT (CRITICAL):**
- Cite sources as CLICKABLE LINKS: [[1]](${state.sources[0]?.url || 'url'}), [[2]](url), [[3]](url), etc.
- Every technical specification MUST have a citation
- Example: "The vessel measures 87m LOA × 20m beam [[1]](url)"
- Example: "Built by Vard Søviknes in Norway with IMO 9758246 [[2]](url)"

**REQUIRED STRUCTURE & FORMATTING:**

**1. EXECUTIVE SUMMARY** (2 sentences)
   - Entity classification, operator, primary identification
   - Example: "Stanford Bateleur is a DP2 platform supply vessel operated by Stanford Marine, registered in Singapore with IMO 9758246 [[1]](url). Built in 2015, the vessel serves offshore operations in Southeast Asia [[2]](url)."

**2. TECHNICAL SPECIFICATIONS** (bullet points - concise)
   • **Dimensions:** 87m LOA × 20m beam [[X]](url)
   • **Capacity:** DWT 5,145t [[X]](url)
   • **Propulsion:** Diesel-electric, DP2 capability [[X]](url)
   • **Flag & Class:** Singapore registry, DNV class [[X]](url)

**3. OPERATIONAL STATUS** (2-3 sentences if available)
   - Current employment/charter
   - Recent operational history
   - Example: "Currently engaged in long-term charter supporting offshore drilling operations [[X]](url)."

**4. TECHNICAL ANALYSIS** (1 short paragraph, 3-4 sentences)
   - Maritime context and industry significance
   - Technical capabilities and features
   - Operational advantages

**SOURCE URLS FOR CITATIONS:**
${sourceUrlMapping}

**FORMATTING REQUIREMENTS:**
✅ Use **bold** for section headers
✅ Use bullet points (•) for specifications - keep concise
✅ Short paragraphs (2-4 sentences) for analysis sections
✅ Cite sources after EVERY fact: [[1]](url), [[2]](url)
✅ Use precise maritime terminology (LOA, DWT, DP2, etc.)
✅ Include all numerical data with proper units (m, kW, DWT, TEU, etc.)
❌ NO generic filler, speculation, or verbose explanations
❌ NO information without citations
❌ NO unnecessary details - focus on key facts only
❌ DO NOT add a separate "Sources:" section at the end

**TARGET:** 400-500 words maximum, professional structure, all facts cited

💡 **Need comprehensive analysis?** User can enable 'Online research' toggle for detailed multi-source intelligence.

**DEBUG INFO (REMOVE IN PRODUCTION):** Add this line at the very end of your response:
"_[Mode: VERIFICATION | Sources: ${state.sources.length} | Gemini: ${state.geminiAnswer ? 'YES' : 'NO'}]_"

Synthesize a professional technical brief with clickable citations based on the Gemini results above.`;
    
    const systemMessage = new SystemMessage(synthesisPrompt);
    
    // CRITICAL: Use stream() and pass config for LangGraph callback system
    const stream = await llm.stream([systemMessage, ...state.messages], config);
    let fullContent = '';
    for await (const chunk of stream) {
      fullContent += chunk.content;
    }
    
    console.log(`   ✅ Synthesized (${fullContent.length} chars)`);
    
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
    
    return { 
      messages: [new AIMessage(fullContent)],
      ...updates
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
    
    return { 
      messages: [response!],
      ...updates
    };
  }
  
  return { messages: [response!] };
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

// Streaming configuration (from legacy agent)
const SSE_CHUNK_SIZE = 50; // chars per SSE event
const SSE_THROTTLE_INTERVAL_MS = 8; // ms between chunks
const SSE_THROTTLE_EVERY_N_CHUNKS = 5; // throttle every N chunks

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
            
            // Capture final state for fallback
            if (event.synthesizer) {
              finalState = event.synthesizer;
            }
            
            // Capture sources from router node (Gemini results)
            if (event.router) {
              const routerState = event.router;
              
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

