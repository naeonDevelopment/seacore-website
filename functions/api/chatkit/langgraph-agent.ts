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
import { SessionMemoryManager, extractTopicFromMessages, type SessionMemory, type VesselEntity } from './session-memory';

// Cloudflare Workers types
declare global {
  interface KVNamespace {
    get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
    put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
  }
}

// =====================
// CONFIGURATION CONSTANTS
// =====================

/** Session memory TTL in seconds (7 days) */
const SESSION_MEMORY_TTL = 86400 * 7;

/** Maximum number of mode transitions to keep in history */
const MAX_MODE_HISTORY = 5;

/** Maximum number of recent messages to store in session */
const MAX_RECENT_MESSAGES = 10;

/** Source selection limits */
const SOURCES_LIMIT_BASIC = 10;
const SOURCES_LIMIT_ADVANCED = 15;

/** Response length requirements */
const MIN_RESPONSE_LENGTH_COMPREHENSIVE = 2000;
const MAX_RESPONSE_LENGTH_COMPREHENSIVE = 3000;

/** SSE streaming configuration */
const SSE_CHUNK_SIZE = 50;
const SSE_THROTTLE_INTERVAL_MS = 10;
const SSE_THROTTLE_EVERY_N_CHUNKS = 5;

/** Confidence thresholds */
const CONFIDENCE_THRESHOLD_LOW = 0.7;
const CONFIDENCE_THRESHOLD_MIN_SOURCES = 5;

/** Multi-query orchestration limits */
const MAX_MULTI_QUERIES = 5;

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
  /** Agent operation mode: verification (Gemini), research (Tavily), or system intelligence */
  researchMode: Annotation<'verification' | 'research' | 'none'>({
    reducer: (_, next) => next,
    default: () => 'none',
  }),
  researchContext: Annotation<string>({
    reducer: (_, next) => next ?? "", // Use nullish coalescing to allow empty string override
    default: () => "",
  }),
  verifiedSources: Annotation<Source[]>({
    reducer: (current, update) => update, // Replace instead of accumulate for fresh queries
    default: () => [],
  }),
  rejectedSources: Annotation<Source[]>({
    reducer: (current, update) => update, // Replace instead of accumulate for fresh queries
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
  /** Persistent entity memory: stores mentioned vessels, companies across conversation */
  conversationEntities: Annotation<Record<string, string>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
  needsRefinement: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  
  // ========================================
  // UNIVERSAL CONTEXT MANAGEMENT
  // Persistent conversation state across all modes
  // ========================================
  
  /** 
   * Conversation topic evolution tracker
   * Example: "PMS" → "PMS + scheduling" → "PMS for vessel Dynamic 17"
   */
  conversationTopic: Annotation<string>({
    reducer: (current, update) => {
      if (!update) return current;
      if (!current) return update;
      // Merge topics intelligently
      if (current.includes(update)) return current;
      return `${current} → ${update}`;
    },
    default: () => "",
  }),
  
  /** 
   * User intent detection: high-level goal inferred from conversation
   * Example: "evaluating PMS for vessel", "learning about regulations"
   */
  userIntent: Annotation<string>({
    reducer: (_, next) => next || "", // Replace with new intent
    default: () => "",
  }),
  
  /**
   * Accumulated knowledge: persistent facts discovered during conversation
   * Structured storage of fleetcore features, vessel specs, connections
   * Never cleared - only extended
   */
  accumulatedKnowledge: Annotation<Record<string, any>>({
    reducer: (current, update) => {
      // Deep merge knowledge domains
      const merged = { ...current };
      
      // Merge arrays by domain
      if (update.fleetcoreFeatures) {
        merged.fleetcoreFeatures = [
          ...(merged.fleetcoreFeatures || []),
          ...update.fleetcoreFeatures
        ];
      }
      
      if (update.vesselEntities) {
        merged.vesselEntities = {
          ...(merged.vesselEntities || {}),
          ...update.vesselEntities
        };
      }
      
      if (update.connections) {
        merged.connections = [
          ...(merged.connections || []),
          ...update.connections
        ];
      }
      
      if (update.discussedTopics) {
        merged.discussedTopics = [
          ...new Set([
            ...(merged.discussedTopics || []),
            ...update.discussedTopics
          ])
        ];
      }
      
      return merged;
    },
    default: () => ({
      fleetcoreFeatures: [],
      vesselEntities: {},
      connections: [],
      discussedTopics: [],
    }),
  }),
  
  /**
   * Mode transition history for context-aware routing
   * Keeps last 5 mode switches with context snapshots
   */
  modeHistory: Annotation<Array<{
    mode: 'verification' | 'research' | 'none';
    query: string;
    timestamp: number;
    entities: string[];
  }>>({
    reducer: (current, update) => {
      const history = [...current, ...update];
      return history.slice(-MAX_MODE_HISTORY);
    },
    default: () => [],
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
 * Initialize LangGraph state from persistent session memory
 * Converts KV-stored session data into agent state format
 * @param sessionMemory - Session memory from Cloudflare KV or null for new sessions
 * @returns Partial state update with conversation context and accumulated knowledge
 */
function initializeStateFromMemory(sessionMemory: SessionMemory | null): Partial<AgentState> {
  if (!sessionMemory) {
    return {};
  }
  
  console.log(`📋 Initializing state from session memory`);
  
  // Convert session memory to state format
  const stateUpdate: Partial<AgentState> = {
    conversationTopic: sessionMemory.conversationTopic,
    userIntent: sessionMemory.userIntent,
    accumulatedKnowledge: sessionMemory.accumulatedKnowledge,
    modeHistory: sessionMemory.modeHistory.map(m => ({
      mode: m.mode,
      query: m.query,
      timestamp: m.timestamp,
      entities: m.entitiesDiscussed,
    })),
  };
  
  // Extract entities from accumulated knowledge
  const vesselNames = Object.values(sessionMemory.accumulatedKnowledge.vesselEntities)
    .map(v => v.name);
  
  if (vesselNames.length > 0) {
    stateUpdate.maritimeEntities = vesselNames;
    stateUpdate.conversationEntities = vesselNames.reduce((acc, name) => {
      acc[name.toLowerCase()] = name;
      return acc;
    }, {} as Record<string, string>);
  }
  
  console.log(`   Topic: ${stateUpdate.conversationTopic}`);
  console.log(`   Intent: ${stateUpdate.userIntent}`);
  console.log(`   Fleetcore features: ${sessionMemory.accumulatedKnowledge.fleetcoreFeatures.length}`);
  console.log(`   Vessels: ${vesselNames.length}`);
  
  return stateUpdate;
}

/**
 * Synchronize agent state back to session memory for persistence
 * Extracts new knowledge, features, and entities discovered during conversation
 * @param state - Current LangGraph agent state
 * @param sessionMemory - Session memory object to update
 * @param manager - Session memory manager for structured updates
 * @returns Updated session memory (mutated in place)
 */
function syncStateToMemory(
  state: AgentState,
  sessionMemory: SessionMemory,
  manager: SessionMemoryManager
): SessionMemory {
  console.log(`🔄 Syncing state to session memory`);
  
  // Update topic if changed
  if (state.conversationTopic && state.conversationTopic !== sessionMemory.conversationTopic) {
    manager.updateTopic(sessionMemory, state.conversationTopic);
  }
  
  // Update intent if changed
  if (state.userIntent && state.userIntent !== sessionMemory.userIntent) {
    manager.updateIntent(sessionMemory, state.userIntent);
  }
  
  // Sync accumulated knowledge
  if (state.accumulatedKnowledge) {
    const knowledge = state.accumulatedKnowledge;
    
    // Add fleetcore features
    if (knowledge.fleetcoreFeatures && Array.isArray(knowledge.fleetcoreFeatures)) {
      knowledge.fleetcoreFeatures.forEach((feature: any) => {
        if (feature.name && feature.explanation) {
          manager.addFleetcoreFeature(
            sessionMemory,
            feature.name,
            feature.explanation,
            feature.messageIndex || 0
          );
        }
      });
    }
    
    // Add vessel entities
    if (knowledge.vesselEntities && typeof knowledge.vesselEntities === 'object') {
      Object.entries(knowledge.vesselEntities).forEach(([key, vessel]: [string, any]) => {
        manager.addVesselEntity(sessionMemory, vessel.name || key, vessel);
      });
    }
    
    // Add connections
    if (knowledge.connections && Array.isArray(knowledge.connections)) {
      knowledge.connections.forEach((conn: any) => {
        if (conn.from && conn.to && conn.relationship) {
          manager.addConnection(
            sessionMemory,
            conn.from,
            conn.to,
            conn.relationship,
            conn.messageIndex || 0
          );
        }
      });
    }
  }
  
  // Add mode transition
  if (state.researchMode) {
    const lastMessage = state.messages[state.messages.length - 1];
    const query = typeof lastMessage?.content === 'string' ? lastMessage.content : '';
    
    manager.addModeTransition(
      sessionMemory,
      state.researchMode,
      query,
      state.researchContext || '',
      state.maritimeEntities || []
    );
  }
  
  // CRITICAL: Update natural language conversation summary
  // This builds a GPT-readable narrative from the structured data
  manager.updateConversationSummary(sessionMemory);
  
  console.log(`   ✅ State synced to memory`);
  
  return sessionMemory;
}

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
  
  // Pattern 4: Vessel names with numbers (case-insensitive) - "dynamic 17", "ever given", etc.
  // Matches word(s) followed by number, capturing the full name
  const vesselWithNumberMatch = text.match(/\b([a-z]+(?:\s+[a-z]+)*\s+\d+)\b/gi);
  if (vesselWithNumberMatch) {
    // Capitalize each word for consistency
    entities.push(...vesselWithNumberMatch.map(v => 
      v.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
    ));
  }
  
  return [...new Set(entities)];
}

/**
 * Extract entity context from research answer text
 * Generic extraction for ANY maritime entity (vessels, companies, equipment, regulations, etc.)
 * Returns structured context about the entity based on what's found in the answer
 */
function extractEntityContextFromAnswer(answer: string, entityName: string): Record<string, any> {
  const context: Record<string, any> = {
    name: entityName,
    mentionedAt: Date.now(),
  };
  
  // Build a focused section around the entity name
  const entityPattern = new RegExp(`${entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*?[.!?]`, 'gi');
  const entityMentions = answer.match(entityPattern);
  
  if (entityMentions && entityMentions.length > 0) {
    // Store the most relevant context snippet (first 2 sentences mentioning entity)
    context.contextSnippet = entityMentions.slice(0, 2).join(' ').substring(0, 300);
  }
  
  // VESSEL-SPECIFIC: Extract IMO, type, specs
  const imoMatch = answer.match(/IMO[:\s]+(\d{7})/i);
  if (imoMatch) {
    context.imo = imoMatch[1];
    context.entityType = 'vessel';
  }
  
  const vesselTypePatterns = [
    /(container ship|tanker|bulk carrier|crew boat|supply vessel|high-speed craft|offshore vessel|cargo ship|research vessel|fishing vessel)/i
  ];
  for (const pattern of vesselTypePatterns) {
    const match = answer.match(pattern);
    if (match) {
      context.vesselType = match[1].trim();
      context.entityType = 'vessel';
      break;
    }
  }
  
  // COMPANY-SPECIFIC: Detect if it's a company
  if (/\b(company|corporation|group|lines|shipping|marine|maritime|services|operator)\b/i.test(answer)) {
    const companyContext = answer.match(new RegExp(`${entityName}[^.]*?(?:is|operates|specializes|provides)[^.]*?[.]`, 'i'));
    if (companyContext) {
      context.entityType = context.entityType || 'company';
      context.companyContext = companyContext[0].substring(0, 200);
    }
  }
  
  // EQUIPMENT-SPECIFIC: Detect equipment/systems
  if (/\b(engine|system|equipment|machinery|component|device|sensor|pump|valve|generator)\b/i.test(answer)) {
    const equipmentContext = answer.match(new RegExp(`${entityName}[^.]*?(?:specification|model|capacity|power|type)[^.]*?[.]`, 'i'));
    if (equipmentContext) {
      context.entityType = context.entityType || 'equipment';
      context.equipmentContext = equipmentContext[0].substring(0, 200);
    }
  }
  
  // REGULATION-SPECIFIC: Detect regulations/standards
  if (/\b(regulation|standard|requirement|compliance|SOLAS|MARPOL|ISM|code|convention)\b/i.test(answer)) {
    const regulationContext = answer.match(new RegExp(`${entityName}[^.]*?(?:requires|mandates|specifies|states)[^.]*?[.]`, 'i'));
    if (regulationContext) {
      context.entityType = context.entityType || 'regulation';
      context.regulationContext = regulationContext[0].substring(0, 200);
    }
  }
  
  // Extract any key-value pairs near the entity
  const specs: Record<string, string> = {};
  
  // Year
  const yearMatch = answer.match(new RegExp(`${entityName}[^.]*?(?:built|established|founded|year)[^.]*?(\\d{4})`, 'i'));
  if (yearMatch) specs.year = yearMatch[1];
  
  // Location/Flag
  const locationMatch = answer.match(new RegExp(`${entityName}[^.]*?(?:flag|based|located|registered)[^.]*?in ([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'i'));
  if (locationMatch) specs.location = locationMatch[1];
  
  if (Object.keys(specs).length > 0) {
    context.specs = specs;
  }
  
  // CRITICAL: Extract operator/owner information (for vessels)
  // Patterns: "operated by X", "owned by X", "managed by X", "operated under X"
  const operatorPatterns = [
    /(?:operated|owned|managed|chartered)\s+(?:by|under)\s+([A-Z][A-Za-z\s&.,-]+?)(?:\s+(?:and|,|\.|;|$))/i,
    /operator[:\s]+([A-Z][A-Za-z\s&.,-]+?)(?:\s+(?:and|,|\.|;|$))/i,
    /owner[:\s]+([A-Z][A-Za-z\s&.,-]+?)(?:\s+(?:and|,|\.|;|$))/i
  ];
  
  for (const pattern of operatorPatterns) {
    const operatorMatch = answer.match(pattern);
    if (operatorMatch) {
      context.operator = operatorMatch[1].trim();
      console.log(`   🏢 Extracted operator: ${context.operator}`);
      break;
    }
  }
  
  // Also check for management company mentions
  const managementMatch = answer.match(/management[:\s]+([A-Z][A-Za-z\s&.,-]+?)(?:\s+(?:and|,|\.|;|$))/i);
  if (managementMatch && !context.operator) {
    context.operator = managementMatch[1].trim();
    console.log(`   🏢 Extracted management: ${context.operator}`);
  }
  
  console.log(`   🔍 Extracted context for ${entityName}:`, JSON.stringify(context, null, 2).substring(0, 300));
  
  return context;
}

/**
 * Check if query is a follow-up question
 * HUMAN-FRIENDLY: Handles vague references, incomplete sentences, conversational style
 */
function isFollowUpQuery(query: string, previousMessages: BaseMessage[], entities: string[]): boolean {
  const queryLower = query.toLowerCase().trim();
  
  // Pattern 1: Very short queries (likely follow-ups)
  // "ok", "cool", "and?", "how?", "why?", "what about it", "tell me more"
  const isShortQuery = query.split(/\s+/).length <= 4;
  const hasQuestionWord = /\b(what|how|why|when|where|which|who|can|could|would|should)\b/i.test(query);
  const isVeryShort = query.length < 20;
  
  if (isVeryShort && (hasQuestionWord || isShortQuery)) {
    console.log(`   ✅ Follow-up detected: Very short query with question pattern`);
    return true;
  }
  
  // Pattern 2: Referential pronouns (human conversational style)
  // CRITICAL: Include possessive pronouns for queries like "give me its engines", "show me their specs"
  const hasReferentialPronouns = /\b(it|its|that|this|those|these|them|their|his|her|the above|mentioned|one|same)\b/i.test(query);
  
  // Pattern 3: Follow-up phrases (casual human language)
  const hasFollowUpPhrases = /\b(tell me|show me|what about|how about|what if|can you|could you|also|and|but|so|ok|cool|nice|interesting|use|apply|relate|connect)\b/i.test(query);
  
  // Pattern 4: Action words on implicit subject
  // "how can i use", "apply to", "use it for", "works with", "compatible with"
  const hasActionWithoutSubject = /\b(use|apply|works?|implement|integrate|handle|manage|track|monitor)\b/i.test(query) && 
                                  !/(fleetcore|pms|system|platform|vessel|ship|company)/i.test(query);
  
  // Pattern 5: Fuzzy entity matching (handles typos, partial names)
  const mentionsPreviousEntity = entities.length > 0 && entities.some(entity => {
    const entityLower = entity.toLowerCase();
    const entityWords = entityLower.split(/\s+/);
    
    // Full match
    if (queryLower.includes(entityLower)) return true;
    
    // Partial match (at least one significant word from entity name)
    return entityWords.some(word => {
      if (word.length < 4) return false; // Skip short words like "17", "ms"
      return queryLower.includes(word);
    });
  });
  
  // Pattern 6: Check if previous message had substantial content (indicates ongoing conversation)
  const hasPreviousContext = previousMessages.length > 0 && previousMessages.slice(-2).some(msg => {
    if (!msg.content || typeof msg.content !== 'string') return false;
    const content = msg.content;
    // Assistant message with substantial content (> 200 chars)
    return content.length > 200 && msg.constructor.name.includes('AI');
  });
  
  // LIBERAL follow-up detection (optimized for human conversation)
  const isFollowUp = 
    (isShortQuery && hasPreviousContext) ||
    (hasReferentialPronouns && hasPreviousContext) ||
    (hasFollowUpPhrases && hasPreviousContext) ||
    (hasActionWithoutSubject && hasPreviousContext) ||
    mentionsPreviousEntity;
  
  if (isFollowUp) {
    console.log(`   ✅ Follow-up detected: short=${isShortQuery}, pronoun=${hasReferentialPronouns}, action=${hasActionWithoutSubject}, entity=${mentionsPreviousEntity}`);
  }
  
  return isFollowUp;
}

/**
 * Detect user intent from conversation context
 * HUMAN-FRIENDLY: Infers intent from vague, conversational language
 * @returns Intent string like "evaluating fleetcore for specific entity", "learning about maintenance"
 */
function detectUserIntent(
  query: string,
  conversationTopic: string,
  accumulatedKnowledge: Record<string, any>,
  modeHistory: Array<any>
): string {
  const queryLower = query.toLowerCase().trim();
  
  // Pattern 1: Evaluation/Application intent
  // Combining product knowledge with specific entity
  const hasFleetcoreKnowledge = accumulatedKnowledge.fleetcoreFeatures?.length > 0;
  const hasAnyEntities = 
    Object.keys(accumulatedKnowledge.vesselEntities || {}).length > 0 ||
    Object.keys(accumulatedKnowledge.companyEntities || {}).length > 0 ||
    (accumulatedKnowledge.discussedTopics || []).length > 0;
  
  // Action words suggesting application/evaluation
  const hasActionIntent = /\b(use|apply|implement|integrate|work|help|support|handle|manage|track|monitor|compatible|suitable)\b/i.test(query);
  
  if (hasFleetcoreKnowledge && (hasAnyEntities || hasActionIntent)) {
    return "evaluating how to apply fleetcore";
  }
  
  // Pattern 2: Learning/Discovery intent
  // Sequential questions, building knowledge
  if (conversationTopic) {
    const topicChain = conversationTopic.split(/\s*→\s*/);
    if (topicChain.length >= 2) {
      // Deepening understanding
      return `exploring ${topicChain[topicChain.length - 1]}`;
    }
  }
  
  // Pattern 3: Information-seeking about product
  // Questions about fleetcore capabilities
  const isProductQuery = /\b(how does|what is|what are|tell me about|explain|feature|capability|function)\b/i.test(query) &&
                        /\b(fleetcore|pms|system|platform|maintenance)\b/i.test(query);
  
  if (isProductQuery) {
    return "learning about fleetcore capabilities";
  }
  
  // Pattern 4: Comparison/Research intent
  if (/\b(compare|versus|vs|difference|between|better|best|largest|biggest|which one|alternative)\b/i.test(query)) {
    return "comparing options or entities";
  }
  
  // Pattern 5: Troubleshooting/Problem-solving
  if (/\b(issue|problem|error|fix|solve|help|why|not work|fail|wrong)\b/i.test(query)) {
    return "seeking solution or troubleshooting";
  }
  
  // Pattern 6: Multi-entity research pattern
  const entityCount = 
    Object.keys(accumulatedKnowledge.vesselEntities || {}).length +
    Object.keys(accumulatedKnowledge.companyEntities || {}).length;
  
  if (entityCount >= 2) {
    return "researching multiple maritime entities";
  }
  
  // Default: Exploratory (first message or vague query)
  return modeHistory.length === 0 ? "initial exploration" : "continuing conversation";
}

/**
 * Context-aware query mode detection with intelligent routing
 * 
 * Routing Logic:
 * - User enabled browsing → RESEARCH (deep Tavily multi-source intelligence)
 * - Pure fleetcore platform queries → NONE (system intelligence from training)
 * - Fleetcore + entity query → VERIFICATION with context injection
 * - Everything else → VERIFICATION (Gemini grounding)
 * 
 * @returns Object with mode, preserveFleetcoreContext flag, and enriched query
 */
function detectQueryMode(
  query: string,
  enableBrowsing: boolean,
  conversationTopic: string,
  userIntent: string,
  accumulatedKnowledge: Record<string, any>
): {
  mode: 'verification' | 'research' | 'none';
  preserveFleetcoreContext: boolean;
  enrichQuery: boolean;
} {
  const queryLower = query.toLowerCase();
  
  // PRIORITY 1: User explicitly enabled online research toggle
  if (enableBrowsing) {
    console.log(`   Mode: RESEARCH (user enabled browsing - deep multi-source research)`);
    return { mode: 'research', preserveFleetcoreContext: true, enrichQuery: true };
  }
  
  // PRIORITY 2: Fleetcore platform/system queries (ONLY exclusion)
  // These should be answered from training data about our product
  const platformKeywords = [
    // Core platform terms
    'fleetcore', 'seacore', 'fleet core', 'sea core',
    
    // Platform features
    'pms', 'planned maintenance system', 'planned maintenance',
    'work order', 'work orders', 'maintenance scheduling',
    'inventory management', 'spare parts management',
    'crew management', 'crew scheduling', 'crew roster',
    'compliance tracking', 'compliance management',
    'safety management system', 'sms system',
    'procurement', 'purchasing system',
    'budget tracking', 'cost management',
    'document management', 'digital documentation',
    
    // Platform UI/UX
    'dashboard', 'analytics', 'reporting', 'reports',
    'user interface', 'how to use', 'tutorial',
    'login', 'account', 'subscription', 'pricing',
    
    // Platform capabilities
    'features', 'capabilities', 'integrations',
    'mobile app', 'offline mode', 'sync',
  ];
  
  // Check for platform queries with word boundary matching
  const isPlatformQuery = platformKeywords.some(keyword => {
    // Split multi-word keywords and check each combination
    const words = keyword.split(' ');
    if (words.length === 1) {
      // Single word - require word boundary
      return new RegExp(`\\b${keyword}\\b`, 'i').test(queryLower);
    } else {
      // Multi-word - check if phrase exists
      return queryLower.includes(keyword);
    }
  });
  
  // Check if query mentions specific entity (vessel, company, equipment)
  const hasEntityMention = /vessel|ship|fleet|company|equipment|manufacturer/i.test(query) ||
                          extractMaritimeEntities(query).length > 0;
  
  // HYBRID MODE: Platform knowledge + entity lookup
  // Example: "How can fleetcore PMS support vessel Dynamic 17?"
  if (isPlatformQuery && hasEntityMention) {
    console.log(`   Mode: VERIFICATION (hybrid - platform + entity lookup)`);
    console.log(`   Will inject fleetcore context into verification`);
    return { mode: 'verification', preserveFleetcoreContext: true, enrichQuery: true };
  }
  
  // Pure platform query without entities
  if (isPlatformQuery) {
    console.log(`   Mode: NONE (Pure fleetcore platform query - training data)`);
    return { mode: 'none', preserveFleetcoreContext: false, enrichQuery: false };
  }
  
  // Check if user is evaluating fleetcore for a specific entity
  const isEvaluationIntent = userIntent.includes('evaluating fleetcore');
  
  if (isEvaluationIntent && hasEntityMention) {
    console.log(`   Mode: VERIFICATION (evaluation context - preserve fleetcore knowledge)`);
    return { mode: 'verification', preserveFleetcoreContext: true, enrichQuery: true };
  }
  
  // DEFAULT TO VERIFICATION for real-time data
  // All maritime queries, vessel lookups, regulations, companies, equipment, etc.
  // Use Gemini grounding for fresh, accurate information
  const hasFleetcoreContext = accumulatedKnowledge.fleetcoreFeatures?.length > 0;
  
  console.log(`   Mode: VERIFICATION (default - Gemini grounding for real-time data)`);
  console.log(`   Fleetcore context available: ${hasFleetcoreContext}`);
  
  return {
    mode: 'verification',
    preserveFleetcoreContext: hasFleetcoreContext,
    enrichQuery: hasFleetcoreContext && hasEntityMention
  };
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
          systemInstruction: {
            parts: [{
              text: `You are a maritime intelligence expert. When answering:
- Provide DIRECT answers immediately - no meta-commentary about searching
- NEVER say "I'll search", "I'll look up", "hold on", or "let me find"
- Start with the factual information right away
- Use Google Search results to provide accurate, up-to-date information
- Keep responses concise and factual`
            }]
          },
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
 * Deep Research Tool - Comprehensive maritime intelligence with context-aware multi-query orchestration
 * 
 * Powered by Tavily Search API with advanced features:
 * - Parallel multi-query execution for comprehensive coverage
 * - Context-aware query generation (includes fleetcore-specific variants)
 * - Multi-tiered content intelligence analysis
 * - Raw content extraction for deep analysis
 * - Quality filtering with authority scoring
 * 
 * @param query - Main search query
 * @param search_depth - 'basic' (10 sources) or 'advanced' (15 sources with full content)
 * @param use_multi_query - Enable multi-query orchestration for complex research
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
    
    // Extract conversation context from session memory
    const sessionMemory = (config?.configurable as any)?.sessionMemory;
    const preserveFleetcoreContext = sessionMemory?.accumulatedKnowledge?.fleetcoreFeatures?.length > 0;
    const accumulatedKnowledge = sessionMemory?.accumulatedKnowledge || {};
    
    console.log(`🔬 Deep Research: "${query}" (${search_depth}, multi-query: ${use_multi_query})`);
    if (preserveFleetcoreContext) {
      console.log(`   🎯 Fleetcore context available: ${accumulatedKnowledge.fleetcoreFeatures?.length || 0} features`);
    }
    
    try {
      // Multi-Query Orchestration: Generate multiple search angles including context-aware variants
      const queries = use_multi_query && search_depth === 'advanced' 
        ? generateMultipleQueries(query, preserveFleetcoreContext, accumulatedKnowledge)
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
        search_depth === 'advanced' ? SOURCES_LIMIT_ADVANCED : SOURCES_LIMIT_BASIC,
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
        needs_refinement: confidence < CONFIDENCE_THRESHOLD_LOW && selected.length < CONFIDENCE_THRESHOLD_MIN_SOURCES,
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
 * Multi-query generation for comprehensive research
 * Generates multiple search angles for complex queries to ensure comprehensive coverage
 * 
 * Query Generation Strategy:
 * - Always includes original query
 * - Adds technical specifications variant for vessels
 * - Adds operational/owner variant for entities
 * - Context-aware: includes maintenance system queries if fleetcore context exists
 * - Handles superlatives with comparison data queries
 * 
 * @param originalQuery - User's original search query
 * @param preserveFleetcoreContext - Whether to include fleetcore-specific query variants
 * @param accumulatedKnowledge - Session accumulated knowledge for context
 * @returns Array of search queries (typically 2-5 queries)
 */
function generateMultipleQueries(
  originalQuery: string,
  preserveFleetcoreContext: boolean = false,
  accumulatedKnowledge: Record<string, any> = {}
): string[] {
  const queries: string[] = [originalQuery]; // Always include original
  
  const queryLower = originalQuery.toLowerCase();
  
  // Superlatives (biggest, largest, best) require comparison data
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
      
      // Context-aware: Add maintenance system query if user is evaluating fleetcore
      if (preserveFleetcoreContext && accumulatedKnowledge.fleetcoreFeatures?.length > 0) {
        queries.push(`${vesselName} vessel maintenance system requirements`);
      }
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
  
  // PHASE 4: Add context-aware query variant if fleetcore context exists
  if (preserveFleetcoreContext && accumulatedKnowledge.fleetcoreFeatures?.length > 0) {
    // Extract entity from query
    const entities = extractMaritimeEntities(originalQuery);
    
    if (entities.length > 0) {
      const mainEntity = entities[0];
      
      // Check if this is a vessel/ship query
      if (/vessel|ship|fleet/i.test(originalQuery)) {
        queries.push(`maritime maintenance management systems for ${mainEntity} type vessels`);
      }
      
      // Check if asking about specific vessel
      if (entities.some(e => /\d/.test(e))) { // Has number in entity name
        queries.push(`${mainEntity} maintenance requirements and operational systems`);
      }
    }
  }
  
  // Limit to 4 queries max (increased from 3 to accommodate context queries)
  return queries.slice(0, 4);
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
// ROUTER MODE HANDLERS
// =====================

/**
 * Extract fleetcore features mentioned in query for accumulation
 * Pattern-based extraction for common fleetcore PMS features
 */
function extractFleetcoreFeatures(userQuery: string, messageIndex: number): Array<{name: string; explanation: string; messageIndex: number}> {
  const features: any[] = [];
  
  const featurePatterns = [
    {
      pattern: /schedule-specific hours|schedule specific hours/i,
      name: "schedule-specific hours",
      explanation: "Each maintenance schedule tracks its own working hours independently"
    },
    {
      pattern: /dual-interval|dual interval/i,
      name: "dual-interval logic",
      explanation: "Supports both hours-based and time-based maintenance intervals"
    },
    {
      pattern: /task management|task workflow/i,
      name: "task management workflow",
      explanation: "Tracks maintenance tasks from pending to completed with real-time updates"
    },
    {
      pattern: /scheduling.*pms|pms.*scheduling|schedule connection|schedule integration/i,
      name: "PMS-scheduling integration",
      explanation: "Scheduling system drives maintenance timing and precision alerts"
    },
  ];
  
  for (const { pattern, name, explanation } of featurePatterns) {
    if (pattern.test(userQuery)) {
      features.push({ name, explanation, messageIndex });
    }
  }
  
  return features;
}

/**
 * Extract discussed topics from query for knowledge tracking
 */
function extractDiscussedTopics(userQuery: string): string[] {
  const topicKeywords = ['PMS', 'maintenance', 'scheduling', 'fleetcore', 'compliance', 'inspection'];
  return topicKeywords.filter(topic => new RegExp(`\\b${topic}\\b`, 'i').test(userQuery));
}

/**
 * Handle System Intelligence mode (no external tools)
 * Answers from maritime expertise and accumulates fleetcore features
 */
function handleSystemIntelligenceMode(
  userQuery: string,
  state: AgentState,
  stateUpdates: Partial<AgentState>
): Partial<AgentState> {
  console.log(`💬 Expert mode: Answering from maritime expertise`);
  
  // Extract fleetcore features for knowledge accumulation
  const fleetcoreFeatures = extractFleetcoreFeatures(userQuery, state.messages.length);
  const discussedTopics = extractDiscussedTopics(userQuery);
  
  const knowledgeUpdate: any = {};
  
  if (fleetcoreFeatures.length > 0) {
    console.log(`   ✨ Storing ${fleetcoreFeatures.length} fleetcore features`);
    knowledgeUpdate.fleetcoreFeatures = fleetcoreFeatures;
  }
  
  if (discussedTopics.length > 0) {
    knowledgeUpdate.discussedTopics = discussedTopics;
  }
  
  return {
    ...stateUpdates,
    accumulatedKnowledge: knowledgeUpdate,
    researchMode: 'none',
    // No messages - goes directly to synthesizer
  };
}

/**
 * Build fleetcore context section for verification/research modes
 * Injects previously discussed features AND all entity types into research context
 * GENERIC: Handles vessels, companies, equipment, regulations, etc.
 */
function buildFleetcoreContextSection(
  preserveFleetcoreContext: boolean,
  accumulatedKnowledge: Record<string, any>,
  detectedIntent: string,
  conversationTopic: string
): string {
  if (!preserveFleetcoreContext || !accumulatedKnowledge.fleetcoreFeatures?.length) {
    return '';
  }
  
  console.log(`   ✨ Adding accumulated context to research query`);
  
  const featuresList = accumulatedKnowledge.fleetcoreFeatures
    .map((f: any, i: number) => `${i + 1}. **${f.name}**: ${f.explanation}`)
    .join('\n');
  
  const connections = accumulatedKnowledge.connections || [];
  const connectionsText = connections.length > 0
    ? `\n\n**Previously Discussed Connections:**\n${connections.map((c: any) => `- ${c.from} → ${c.to}: ${c.relationship}`).join('\n')}`
    : '';
  
  // CRITICAL: Include ALL previously discussed entities (vessels, companies, topics)
  let entitiesText = '';
  
  // Vessels
  const vesselEntities = Object.values(accumulatedKnowledge.vesselEntities || {});
  if (vesselEntities.length > 0) {
    entitiesText += `\n\n**Vessels Previously Discussed:**\n${vesselEntities.map((v: any, i: number) => {
      let line = `${i + 1}. **${v.name}**`;
      if (v.type) line += ` (${v.type})`;
      if (v.imo) line += ` - IMO: ${v.imo}`;
      if (v.operator) line += ` - Operator: ${v.operator}`;
      return line;
    }).join('\n')}`;
  }
  
  // Companies
  const companyEntities = Object.values(accumulatedKnowledge.companyEntities || {});
  if (companyEntities.length > 0) {
    entitiesText += `\n\n**Companies/Organizations Previously Discussed:**\n${companyEntities.map((c: any, i: number) => {
      let line = `${i + 1}. **${c.name}**`;
      if (c.companyContext) line += ` - ${c.companyContext.substring(0, 100)}`;
      return line;
    }).join('\n')}`;
  }
  
  // General topics/entities
  const discussedTopics = accumulatedKnowledge.discussedTopics || [];
  if (discussedTopics.length > 0) {
    entitiesText += `\n\n**Other Topics Discussed:** ${discussedTopics.join(', ')}`;
  }
  
  return `\n\n=== PREVIOUSLY DISCUSSED CONTEXT ===

**User Intent:** ${detectedIntent}
**Conversation Topic:** ${conversationTopic}

**Fleetcore PMS Features Already Discussed:**
${featuresList}${connectionsText}${entitiesText}

**YOUR TASK:** Integrate the entity/information below with the context above.
Show how the new information relates to what we've already discussed, especially fleetcore's capabilities.

=== END PREVIOUS CONTEXT ===\n\n`;
}

/**
 * Handle Verification mode (Gemini grounding)
 * Calls Gemini directly for real-time entity verification with context injection
 */
async function handleVerificationMode(
  userQuery: string,
  entityContext: string,
  entities: string[],
  preserveFleetcoreContext: boolean,
  accumulatedKnowledge: Record<string, any>,
  detectedIntent: string,
  conversationTopic: string,
  stateUpdates: Partial<AgentState>,
  config: any
): Promise<Partial<AgentState>> {
  console.log(`🔮 VERIFICATION MODE: Calling Gemini directly`);
  console.log(`   Query: "${userQuery}"`);
  console.log(`   Entity context: "${entityContext}"`);
  
  // Build enriched query with fleetcore context
  let enrichedQuery = userQuery + entityContext;
  let fleetcoreContextPrefix = '';
  
  if (preserveFleetcoreContext && accumulatedKnowledge.fleetcoreFeatures?.length > 0) {
    console.log(`   🎯 ENRICHING QUERY with fleetcore context`);
    
    const features = accumulatedKnowledge.fleetcoreFeatures
      .map((f: any) => f.name)
      .slice(0, 5)
      .join(', ');
    
    fleetcoreContextPrefix = `[CONTEXT: User is evaluating fleetcore PMS with features: ${features}] `;
    console.log(`   Fleetcore features: ${features}`);
  }
  
  const finalQuery = fleetcoreContextPrefix + enrichedQuery;
  console.log(`   Full query to Gemini: "${finalQuery.substring(0, 150)}..."`);
  
  try {
    // Call Gemini grounding tool directly
    const geminiResult = await geminiGroundingTool.invoke({ query: finalQuery }, config);
    
    console.log(`   ✅ Gemini direct call complete`);
    
    // Parse the result
    const parsed = typeof geminiResult === 'string' ? JSON.parse(geminiResult) : geminiResult;
    
    console.log(`   Sources count: ${parsed.sources?.length || 0}`);
    console.log(`   Has answer: ${!!parsed.answer}`);
    
    if (parsed.sources?.length > 0) {
      parsed.sources.forEach((s: any, i: number) => {
        console.log(`      [${i+1}] ${s.title} - ${s.url}`);
      });
    } else {
      console.log(`   ⚠️ WARNING: Gemini returned 0 sources!`);
    }
    
    const sources = parsed.sources || [];
    const geminiAnswer = parsed.answer || null;
    
    // CRITICAL: Extract entity context from answer and store in accumulated knowledge
    const discussedEntities: Record<string, any> = {};
    if (geminiAnswer && entities.length > 0) {
      console.log(`   🔍 Extracting entity context from research answer`);
      entities.forEach(entityName => {
        const extractedContext = extractEntityContextFromAnswer(geminiAnswer, entityName);
        if (extractedContext.contextSnippet || extractedContext.entityType) {
          const entityKey = entityName.toLowerCase();
          discussedEntities[entityKey] = extractedContext;
          console.log(`   ✅ Stored context for ${entityName}: Type=${extractedContext.entityType || 'general'}`);
        }
      });
    }
    
    // Build research context with fleetcore integration
    let researchContext = '';
    if (sources.length > 0 || geminiAnswer) {
      const fleetcoreContextSection = buildFleetcoreContextSection(
        preserveFleetcoreContext,
        accumulatedKnowledge,
        detectedIntent,
        conversationTopic
      );
      
      researchContext = `${fleetcoreContextSection}=== GEMINI GROUNDING RESULTS (Direct Call) ===

${geminiAnswer ? `Google-verified Answer:\n${geminiAnswer}\n\n` : ''}${sources.length > 0 ? `Google Sources (${sources.length}):\n\n${sources.map((s: any, i: number) => `[${i + 1}] ${s.title} (${new URL(s.url).hostname})
   ${s.content.substring(0, 300)}...`).join('\n\n')}` : 'Direct answer from Google\'s knowledge base'}

=== END GEMINI GROUNDING ===

**CRITICAL INSTRUCTIONS - MARITIME EXPERT TECHNICAL BRIEFING:**

**Writing Style & Tone:**
- Write as a **Technical Director / Maritime Industry Consultant**
- Professional, authoritative, technically precise
- Target length: **400-500 words maximum**
- Use proper maritime terminology throughout

**Citation Format:**
- Cite sources as CLICKABLE LINKS: [[1]](URL), [[2]](URL), etc.
- Every technical specification MUST have a citation
- Example: "The vessel measures 399m LOA × 60m beam [[1]](url)"

**Required Structure & Formatting:**

**1. EXECUTIVE SUMMARY** (2 sentences)
   - Entity classification, operator, primary identification
   - Example: "MSC Loreto is a Post-Suezmax container ship operated by Mediterranean Shipping Company, registered in Liberia with IMO 9934735 [[1]](url). Built in 2023, the vessel represents MSC's latest generation of ultra-large container ships [[2]](url)."

**2. TECHNICAL SPECIFICATIONS** (bullet points - concise)
   • **Dimensions:** 399m LOA × 60m beam [[X]](url)
   • **Capacity:** 24,346 TEU, DWT 281,456t, GT 236,184 [[X]](url)
   • **Flag & Class:** Liberian registry, built 2023 [[X]](url)

**3. OPERATIONAL STATUS** (2-3 sentences)
   - Current position/route with citations
   - Example: "As of [date], the vessel was en route to Singapore from Cai Mep at position 001°14'41"N / 103°38'06"E [[X]](url)."

**4. TECHNICAL ANALYSIS** (1 short paragraph, 3-4 sentences)
   - Key design features and capabilities
   - Regulatory compliance (SOLAS, MARPOL)
   - Fleet positioning

**5. MARITIME CONTEXT** (1 paragraph, 2-3 sentences)
   - Strategic importance
   - Operator strategy and market positioning

**Source URLs for Citations:**
${sources.map((s: any, i: number) => `[${i + 1}]: ${s.url}`).join('\n')}

**Formatting Requirements:**
✅ Use **bold** for section headers (EXECUTIVE SUMMARY, TECHNICAL SPECIFICATIONS, etc.)
✅ Use bullet points (•) for specifications - keep concise
✅ Short paragraphs (2-4 sentences) for analysis sections
✅ Cite sources after EVERY fact: [[1]](url), [[2]](url)
❌ NO generic filler, speculation, or verbose explanations
❌ NO information without citations
❌ NO unnecessary details - focus on key facts only

**User Query:** "${userQuery}"
**Target:** 400-500 words maximum, professional structure, all facts cited

💡 **Need comprehensive analysis?** Enable 'Online research' for detailed multi-source intelligence.`;
      
      console.log(`   📝 Research context built: ${researchContext.length} chars`);
    }
    
    // Return state update with extracted entity contexts
    // Intelligently route entities to correct storage based on detected type
    const updatedKnowledge = {
      ...accumulatedKnowledge,
      vesselEntities: { ...(accumulatedKnowledge.vesselEntities || {}) },
      companyEntities: { ...(accumulatedKnowledge.companyEntities || {}) },
      discussedTopics: [...(accumulatedKnowledge.discussedTopics || [])],
    };
    
    // Route entities to appropriate storage based on type
    Object.entries(discussedEntities).forEach(([key, context]) => {
      if (context.entityType === 'vessel' || context.imo) {
        updatedKnowledge.vesselEntities[key] = {
          name: context.name,
          imo: context.imo,
          type: context.vesselType,
          operator: context.operator,  // CRITICAL: Store operator/owner info
          specs: context.specs,
          discussed: true,
          firstMentioned: context.mentionedAt,
        };
      } else if (context.entityType === 'company') {
        updatedKnowledge.companyEntities[key] = context;
      } else {
        // Store as discussed topic for general entities
        if (!updatedKnowledge.discussedTopics.includes(context.name)) {
          updatedKnowledge.discussedTopics.push(context.name);
        }
      }
    });
    
    return {
      ...stateUpdates,
      researchMode: 'verification' as const,
      conversationEntities: entities.reduce((acc, e) => ({ ...acc, [e.toLowerCase()]: e }), {}),
      researchContext,
      verifiedSources: sources,
      rejectedSources: [],
      confidence: parsed.confidence || 0.9,
      accumulatedKnowledge: updatedKnowledge,
      modeHistory: [{
        mode: 'verification' as const,
        query: userQuery,
        timestamp: Date.now(),
        entities: entities,
      }],
    };
  } catch (error: any) {
    console.error(`❌ Direct Gemini call failed:`, error.message);
    // Fall back to expert mode
    return {
      maritimeEntities: entities,
      researchMode: 'none',
    };
  }
}

// =====================
// AGENT NODES
// =====================

/**
 * Router Node - Intelligent query routing with context-aware mode selection
 * 
 * Routes queries to appropriate mode based on:
 * - User intent (evaluation, learning, research)
 * - Conversation context and topic history
 * - Accumulated knowledge (fleetcore features, entities)
 * - Query type (platform-specific vs entity lookup)
 * 
 * Responsibilities:
 * - Extract and accumulate fleetcore features (System Intelligence mode)
 * - Enrich queries with context for verification/research modes
 * - Inject accumulated knowledge into tool contexts
 * - Update conversation topic and intent
 * - Track mode transitions
 */
async function routerNode(state: AgentState, config?: any): Promise<Partial<AgentState>> {
  const lastMessage = state.messages[state.messages.length - 1];
  const userQuery = lastMessage.content as string;
  
  console.log(`🎯 Router analyzing: "${userQuery.substring(0, 100)}..."`);
  
  // Extract conversation context from state
  const conversationTopic = state.conversationTopic || "";
  const userIntent = state.userIntent || "";
  const accumulatedKnowledge = state.accumulatedKnowledge || { fleetcoreFeatures: [], vesselEntities: {}, connections: [], discussedTopics: [] };
  const modeHistory = state.modeHistory || [];
  
  console.log(`📋 Conversation Context:`);
  console.log(`   Topic: ${conversationTopic || 'none'}`);
  console.log(`   Intent: ${userIntent || 'detecting...'}`);
  console.log(`   Fleetcore features accumulated: ${accumulatedKnowledge.fleetcoreFeatures?.length || 0}`);
  console.log(`   Vessel entities: ${Object.keys(accumulatedKnowledge.vesselEntities || {}).length}`);
  
  // Detect or update user intent
  const detectedIntent = detectUserIntent(
    userQuery,
    conversationTopic,
    accumulatedKnowledge,
    modeHistory
  );
  
  if (!userIntent || detectedIntent !== userIntent) {
    console.log(`🎯 Intent detected: "${detectedIntent}"`);
  }
  
  // Extract entities from current query
  const entities = extractMaritimeEntities(userQuery);
  
  // Get ALL entities from conversation history (persistent memory)
  const allConversationEntities = [...entities, ...state.maritimeEntities];
  
  // Check if follow-up (now considers all conversation entities)
  const isFollowUp = isFollowUpQuery(userQuery, state.messages, allConversationEntities);
  
  // Context-aware mode detection
  const modeDecision = detectQueryMode(
    userQuery,
    state.enableBrowsing,
    conversationTopic,
    detectedIntent,
    accumulatedKnowledge
  );
  
  const queryMode = modeDecision.mode;
  const preserveFleetcoreContext = modeDecision.preserveFleetcoreContext;
  const shouldEnrichQuery = modeDecision.enrichQuery;
  
  console.log(`   Entities: ${entities.length ? entities.join(', ') : 'none'}`);
  console.log(`   Follow-up: ${isFollowUp}`);
  console.log(`   User enabled browsing: ${state.enableBrowsing}`);
  console.log(`   Detected mode: ${queryMode}`);
  console.log(`   Preserve fleetcore context: ${preserveFleetcoreContext}`);
  console.log(`   Enrich query: ${shouldEnrichQuery}`);
  
  // Prepare base state updates (before mode routing)
  const stateUpdates: Partial<AgentState> = {
    maritimeEntities: entities,
    userIntent: detectedIntent,
  };
  
  // Update topic if entities found
  if (entities.length > 0) {
    const newTopic = entities.join(', ');
    stateUpdates.conversationTopic = conversationTopic ? `${conversationTopic} → ${newTopic}` : newTopic;
  }
  
  // CRITICAL: Build comprehensive context for vague/follow-up queries
  // Handles: "how can i use it", "what about that vessel", "ok use for dynamic 17"
  let entityContext = '';
  let contextEnrichedQuery = userQuery;
  
  if (isFollowUp) {
    console.log(`📋 Follow-up query detected - building context enrichment`);
    
    // Build context components
    const contextParts: string[] = [];
    
    // 1. Add conversation topic if available
    if (conversationTopic) {
      const latestTopic = conversationTopic.split(' → ').pop();
      contextParts.push(`Current topic: ${latestTopic}`);
    }
    
    // 2. Add fleetcore features if discussed (handles "it", "this", "the system")
    if (accumulatedKnowledge.fleetcoreFeatures?.length > 0) {
      const topFeatures = accumulatedKnowledge.fleetcoreFeatures
        .slice(0, 3)
        .map((f: any) => f.name)
        .join(', ');
      contextParts.push(`Previously discussed: fleetcore PMS (${topFeatures})`);
    }
    
    // 3. Add entities (vessels, companies) if discussed
    const allEntities = [
      ...Object.values(accumulatedKnowledge.vesselEntities || {}).map((v: any) => v.name),
      ...Object.values(accumulatedKnowledge.companyEntities || {}).map((c: any) => c.name),
      ...(accumulatedKnowledge.discussedTopics || [])
    ];
    
    if (allEntities.length > 0) {
      const recentEntities = allEntities.slice(-3).join(', ');
      contextParts.push(`Previous entities: ${recentEntities}`);
    }
    
    // 4. Reconstruct implicit subjects ("it", "this", "that")
    const hasImplicitSubject = /\b(it|this|that|these|those|them)\b/i.test(userQuery);
    const hasPossessivePronoun = /\b(its|their|his|her)\b/i.test(userQuery);
    const hasActionVerb = /\b(use|apply|works?|implement|integrate|handle)\b/i.test(userQuery);
    
    if (hasImplicitSubject && hasActionVerb && accumulatedKnowledge.fleetcoreFeatures?.length > 0) {
      // Replace implicit "it" with explicit "fleetcore PMS"
      contextEnrichedQuery = userQuery.replace(/\b(it|this|that)\b/gi, 'fleetcore PMS');
      console.log(`   🔄 Resolved implicit subject: "${userQuery}" → "${contextEnrichedQuery}"`);
    }
    
    // 4b. Handle possessive pronouns ("its engines", "their specs")
    // CRITICAL: Queries like "give me its engines" need entity context
    if (hasPossessivePronoun && allEntities.length > 0) {
      const recentEntity = allEntities[allEntities.length - 1];
      // Replace possessive with explicit entity name
      contextEnrichedQuery = userQuery.replace(/\b(its|their|his|her)\b/gi, `${recentEntity}'s`);
      console.log(`   🔄 Resolved possessive pronoun: "${userQuery}" → "${contextEnrichedQuery}"`);
    }
    
    // 5. Add entity if query mentions action but missing explicit entity
    const needsEntityAddition = 
      allConversationEntities.length > 0 &&
      /\b(use|apply|for|with|on|about|regarding)\b/i.test(userQuery) &&
      !allConversationEntities.some(e => userQuery.toLowerCase().includes(e.toLowerCase()));
    
    if (needsEntityAddition && entities.length > 0) {
      // New entity mentioned in vague way - use it
      const newEntity = entities[0];
      contextParts.push(`User is asking about applying previous discussion to: ${newEntity}`);
    } else if (needsEntityAddition && allConversationEntities.length > 0) {
      // No new entity, reference previous
      const mainEntity = allConversationEntities[allConversationEntities.length - 1];
      contextParts.push(`Focus on: ${mainEntity}`);
    }
    
    // Build final context injection
    if (contextParts.length > 0) {
      entityContext = `\n\n**CONVERSATION CONTEXT**:\n${contextParts.map(p => `- ${p}`).join('\n')}\n\n**USER QUERY**: ${contextEnrichedQuery}`;
      console.log(`   ✨ Enriched query with ${contextParts.length} context elements`);
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
        // Keep existing context
      };
    } else {
      console.log(`🔄 Follow-up needs NEW technical research - clearing old context`);
      // CRITICAL: Clear old research context for fresh query
      // This will be replaced with new context from Gemini/Tavily
    }
  }
  
  // Route based on detected mode
  if (queryMode === 'none') {
    // Expert mode - no external queries needed
    const systemModeResult = handleSystemIntelligenceMode(userQuery, state, stateUpdates);
    
    return {
      ...systemModeResult,
      modeHistory: [{
        mode: 'none' as const,
        query: userQuery,
        timestamp: Date.now(),
        entities: entities,
      }],
    };
  }
  
  // VERIFICATION MODE: Direct Gemini call with enriched query
  if (queryMode === 'verification') {
    return await handleVerificationMode(
      contextEnrichedQuery,  // Use enriched query that resolves "it", "this", etc.
      entityContext,
      entities,
      preserveFleetcoreContext,
      accumulatedKnowledge,
      detectedIntent,
      conversationTopic,
      stateUpdates,
      config
    );
  }
  
  // RESEARCH MODE: Use deep_research tool via LangGraph with enriched query
  console.log(`📋 Invoking research mode planner with context enrichment...`);
  
  // Build comprehensive context for planner
  let contextSection = '';
  if (preserveFleetcoreContext && accumulatedKnowledge.fleetcoreFeatures?.length > 0) {
    console.log(`   🎯 Adding fleetcore context to research planning`);
    
    const features = accumulatedKnowledge.fleetcoreFeatures
      .map((f: any) => f.name)
      .slice(0, 5)
      .join(', ');
    
    contextSection = `

**CONVERSATION CONTEXT:**
- User Intent: ${detectedIntent}
- Topic: ${conversationTopic}
- Fleetcore Features Discussed: ${features}

**IMPORTANT:** User is evaluating fleetcore in context of this entity.
Your research should find information that helps assess fleetcore's fit for this specific use case.`;
  }
  
  // Use enriched query for better research planning
  const researchQuery = contextEnrichedQuery !== userQuery ? contextEnrichedQuery : userQuery;
  
  const planningPrompt = `You are a maritime intelligence researcher. The user's query may be vague or conversational.

User Query (original): "${userQuery}"
${contextEnrichedQuery !== userQuery ? `Enriched Query: "${contextEnrichedQuery}"` : ''}
Detected Entities: ${entities.length > 0 ? entities.join(', ') : 'none detected'}${entityContext}${contextSection}

Your task: Use the deep_research tool for comprehensive intelligence.
- For COMPLEX queries (comparisons, analysis, multiple entities):
  * Use search_depth='advanced'
  * Enable use_multi_query=true for parallel multi-angle research
- For FOCUSED queries (single entity, simple specs):
  * Use search_depth='basic'
  * Keep use_multi_query=false
- You can also use maritime_knowledge for internal fleetcore information

${preserveFleetcoreContext ? `REMINDER: Consider how your research findings relate to the fleetcore features the user has been discussing.` : ''}

**IMPORTANT**: If query is vague (uses "it", "this", "that"), use the enriched query and context above to understand what the user is asking about.

Call deep_research now with appropriate parameters.`;
  
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.1,
    apiKey: (config?.configurable as any)?.env?.OPENAI_API_KEY,
  }).bindTools(tools);
  
  const response = await model.invoke([
    new SystemMessage(planningPrompt),
    new HumanMessage(researchQuery)  // Use enriched query for better context understanding
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
    // Clear old research state for fresh query
    verifiedSources: [],
    rejectedSources: [],
    researchContext: "",
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
    
    // Check for fleetcore context
    const hasFleetcoreContext = state.accumulatedKnowledge?.fleetcoreFeatures?.length > 0;
    
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
    
    // PHASE 4: Add fleetcore context section if available
    let fleetcoreContextSection = '';
    if (hasFleetcoreContext) {
      console.log(`   ✨ Adding fleetcore context to deep research results`);
      
      const features = state.accumulatedKnowledge.fleetcoreFeatures
        .map((f: any, i: number) => `${i + 1}. **${f.name}**: ${f.explanation}`)
        .join('\n');
      
      const connections = state.accumulatedKnowledge.connections || [];
      const connectionsText = connections.length > 0
        ? `\n\n**Previously Discussed Connections:**\n${connections.map((c: any) => `- ${c.from} → ${c.to}: ${c.relationship}`).join('\n')}`
        : '';
      
      fleetcoreContextSection = `

=== PREVIOUSLY DISCUSSED FLEETCORE CONTEXT ===

**User Intent:** ${state.userIntent || 'exploring topic'}
**Conversation Topic:** ${state.conversationTopic || 'maritime operations'}

**Fleetcore PMS Features Already Discussed:**
${features}${connectionsText}

**YOUR TASK (IMPORTANT):** 
After providing the comprehensive research findings below, add a section that shows:
- How fleetcore's capabilities specifically support this entity's requirements
- Which fleetcore features are most relevant to this entity type
- How fleetcore addresses the specific operational needs identified

=== END FLEETCORE CONTEXT ===
`;
    }
    
    researchContext = `=== RESEARCH INTELLIGENCE ===${fleetcoreContextSection}
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
    verifiedSources: allSources, // Will replace via reducer
    rejectedSources: allRejected, // Will replace via reducer
    confidence: confidenceScore,
    needsRefinement,
  };
}

/**
 * Synthesizer Node - Generate final answer with accumulated context integration
 */
async function synthesizerNode(state: AgentState, config?: any): Promise<Partial<AgentState>> {
  console.log(`\n🎨 SYNTHESIZER NODE`);
  console.log(`   Sources: ${state.verifiedSources.length}`);
  console.log(`   Research context: ${state.researchContext ? 'YES' : 'NO'}`);
  console.log(`   Messages in state: ${state.messages.length}`);
  
  // PHASE 5: Extract accumulated knowledge from state
  const conversationTopic = state.conversationTopic || "";
  const userIntent = state.userIntent || "";
  const accumulatedKnowledge = state.accumulatedKnowledge || {
    fleetcoreFeatures: [],
    vesselEntities: {},
    connections: [],
    discussedTopics: []
  };
  
  const hasAccumulatedKnowledge = 
    accumulatedKnowledge.fleetcoreFeatures?.length > 0 ||
    Object.keys(accumulatedKnowledge.vesselEntities || {}).length > 0 ||
    conversationTopic.length > 0;
  
  console.log(`   📋 Accumulated Context:`);
  console.log(`      Topic: ${conversationTopic || 'none'}`);
  console.log(`      Intent: ${userIntent || 'none'}`);
  console.log(`      Fleetcore features: ${accumulatedKnowledge.fleetcoreFeatures?.length || 0}`);
  console.log(`      Vessel entities: ${Object.keys(accumulatedKnowledge.vesselEntities || {}).length}`);
  console.log(`      Has context: ${hasAccumulatedKnowledge}`);
  
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
  
  // Add accumulated context BEFORE research context
  if (hasAccumulatedKnowledge) {
    console.log(`   ✨ Injecting accumulated conversation context`);
    
    let accumulatedContextSection = `=== CONVERSATION CONTEXT ===\n\n`;
    
    // PREFERRED: Use natural language summary (GPT-readable)
    const sessionMemory = (config?.configurable as any)?.sessionMemory as SessionMemory | undefined;
    if (sessionMemory?.conversationSummary) {
      console.log(`   📖 Using natural language summary from session memory`);
      accumulatedContextSection += `**Conversation Summary:**\n${sessionMemory.conversationSummary}\n\n`;
      
      // Also include recent chat messages for immediate context
      if (sessionMemory.recentMessages && sessionMemory.recentMessages.length > 0) {
        accumulatedContextSection += `**Recent Messages (last ${Math.min(5, sessionMemory.recentMessages.length)}):**\n`;
        sessionMemory.recentMessages.slice(-5).forEach((msg: any, i: number) => {
          const role = msg.role === 'user' ? 'User' : 'Assistant';
          const preview = msg.content.substring(0, 150);
          accumulatedContextSection += `${role}: ${preview}${msg.content.length > 150 ? '...' : ''}\n`;
        });
        accumulatedContextSection += '\n';
      }
    } else {
      // FALLBACK: Use structured format (backward compatibility)
      console.log(`   📋 Using structured format (legacy)`)  ;
      
      // Add conversation topic
      if (conversationTopic) {
        accumulatedContextSection += `**Conversation Topic Evolution:**\n${conversationTopic}\n\n`;
      }
      
      // Add user intent
      if (userIntent) {
        accumulatedContextSection += `**User Intent:** ${userIntent}\n\n`;
      }
      
      // Add fleetcore features
      if (accumulatedKnowledge.fleetcoreFeatures?.length > 0) {
        accumulatedContextSection += `**Previously Discussed Fleetcore Features:**\n`;
        accumulatedKnowledge.fleetcoreFeatures.forEach((f: any, i: number) => {
          accumulatedContextSection += `${i + 1}. **${f.name}**: ${f.explanation}\n`;
        });
        accumulatedContextSection += '\n';
      }
    }
    
    // Add ALL previously discussed entities (vessels, companies, general topics)
    const vesselEntities = Object.values(accumulatedKnowledge.vesselEntities || {});
    if (vesselEntities.length > 0) {
      accumulatedContextSection += `**Vessels Previously Discussed:**\n`;
      vesselEntities.forEach((v: any, i: number) => {
        accumulatedContextSection += `${i + 1}. ${v.name}`;
        if (v.type) accumulatedContextSection += ` (${v.type})`;
        if (v.imo) accumulatedContextSection += ` - IMO: ${v.imo}`;
        if (v.operator) accumulatedContextSection += ` - Operator: ${v.operator}`;
        accumulatedContextSection += '\n';
      });
      accumulatedContextSection += '\n';
    }
    
    const companyEntities = Object.values(accumulatedKnowledge.companyEntities || {});
    if (companyEntities.length > 0) {
      accumulatedContextSection += `**Companies/Organizations Previously Discussed:**\n`;
      companyEntities.forEach((c: any, i: number) => {
        accumulatedContextSection += `${i + 1}. ${c.name}`;
        if (c.companyContext) accumulatedContextSection += ` - ${c.companyContext.substring(0, 100)}`;
        accumulatedContextSection += '\n';
      });
      accumulatedContextSection += '\n';
    }
    
    const discussedTopics = accumulatedKnowledge.discussedTopics || [];
    if (discussedTopics.length > 0) {
      accumulatedContextSection += `**Other Topics Discussed:** ${discussedTopics.join(', ')}\n\n`;
    }
    
    // Add connections
    if (accumulatedKnowledge.connections?.length > 0) {
      accumulatedContextSection += `**Topic Connections Identified:**\n`;
      accumulatedKnowledge.connections.forEach((c: any, i: number) => {
        accumulatedContextSection += `${i + 1}. ${c.from} → ${c.to}: ${c.relationship}\n`;
      });
      accumulatedContextSection += '\n';
    }
    
    accumulatedContextSection += `=== END ACCUMULATED CONTEXT ===\n\n`;
    accumulatedContextSection += `**CRITICAL INSTRUCTION:**\n`;
    accumulatedContextSection += `Your answer MUST acknowledge and integrate the accumulated context above.\n`;
    
    // Generic instruction for any entity type + fleetcore context
    const hasAnyEntities = vesselEntities.length > 0 || companyEntities.length > 0 || discussedTopics.length > 0;
    if (accumulatedKnowledge.fleetcoreFeatures?.length > 0 && hasAnyEntities) {
      accumulatedContextSection += `The user has been learning about fleetcore PMS and now is asking about a related entity/topic.\n`;
      accumulatedContextSection += `Your answer should naturally explain how fleetcore's features relate to or support this query.\n`;
    }
    
    // If no research context, remind to use accumulated knowledge
    if (!state.researchContext) {
      accumulatedContextSection += `\nSince no external research was performed, use the accumulated context to provide a comprehensive answer.\n`;
    }
    
    accumulatedContextSection += '\n';
    
    synthesisMessages.push(
      new SystemMessage(accumulatedContextSection)
    );
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
  
  if (state.researchContext && fullContent.length < MIN_RESPONSE_LENGTH_COMPREHENSIVE) {
    console.warn(`⚠️ WARNING: Response is too short! Only ${fullContent.length} chars (target: ${MIN_RESPONSE_LENGTH_COMPREHENSIVE}-${MAX_RESPONSE_LENGTH_COMPREHENSIVE})`);
    console.warn(`   Sources available: ${state.verifiedSources.length}`);
    console.warn(`   This indicates the LLM is not following the comprehensive response requirement!`);
  } else if (state.researchContext) {
    console.log(`✅ Response length meets requirement: ${fullContent.length} chars`);
  }
  
  return {
    messages: [new AIMessage(fullContent)],
  };
}

/**
 * Validate conversation flow and context acknowledgment
 */
async function validateContextAcknowledgment(
  answer: string,
  state: AgentState
): Promise<{ valid: boolean; reason?: string }> {
  
  const conversationTopic = state.conversationTopic || "";
  const accumulatedKnowledge = state.accumulatedKnowledge || {
    fleetcoreFeatures: [],
    vesselEntities: {},
    connections: [],
    discussedTopics: []
  };
  
  // If no accumulated context, validation passes
  if (!conversationTopic && accumulatedKnowledge.fleetcoreFeatures?.length === 0) {
    return { valid: true };
  }
  
  // Check if answer acknowledges conversation topic
  const hasTopicMention = conversationTopic.split('→').some(topic => 
    answer.toLowerCase().includes(topic.trim().toLowerCase())
  );
  
  // Check if answer mentions fleetcore when features were discussed
  const hasFleetcoreMention = accumulatedKnowledge.fleetcoreFeatures?.length > 0
    ? answer.toLowerCase().includes('fleetcore')
    : true;
  
  // Check if answer integrates features
  const mentionsFeatures = accumulatedKnowledge.fleetcoreFeatures?.some((f: any) =>
    answer.toLowerCase().includes(f.name.toLowerCase().split(' ')[0])
  ) || accumulatedKnowledge.fleetcoreFeatures?.length === 0;
  
  // Validation logic
  if (!hasFleetcoreMention && accumulatedKnowledge.fleetcoreFeatures?.length > 0) {
    return {
      valid: false,
      reason: "Answer doesn't mention fleetcore despite features being discussed"
    };
  }
  
  if (!hasTopicMention && conversationTopic.length > 10) {
    return {
      valid: false,
      reason: `Answer doesn't acknowledge conversation topic: ${conversationTopic}`
    };
  }
  
  // Passes all checks
  return { valid: true };
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
  
  // Iterative Refinement - If confidence is low and we haven't refined yet, go back to router
  // This enables automatic follow-up queries to improve results
  if (state.needsRefinement && state.confidence < CONFIDENCE_THRESHOLD_LOW && state.verifiedSources.length > 0 && state.verifiedSources.length < CONFIDENCE_THRESHOLD_MIN_SOURCES) {
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
    CHAT_SESSIONS?: KVNamespace; // Cloudflare KV for persistent session memory
  };
}

/**
 * Handle chat request with LangGraph agent
 * Returns SSE stream for real-time updates
 */
export async function handleChatWithLangGraph(request: ChatRequest): Promise<ReadableStream> {
  const { messages, sessionId, enableBrowsing, env } = request;
  
  console.log(`\n🚀 LangGraph Agent Request | Session: ${sessionId} | Browsing: ${enableBrowsing}`);
  
  // Initialize Session Memory Manager with Cloudflare KV
  let sessionMemoryManager: SessionMemoryManager | null = null;
  let sessionMemory: SessionMemory | null = null;
  
  if (env.CHAT_SESSIONS) {
    try {
      sessionMemoryManager = new SessionMemoryManager(env.CHAT_SESSIONS);
      sessionMemory = await sessionMemoryManager.load(sessionId);
      
      // CRITICAL: Generate conversation summary from accumulated knowledge
      // This makes the summary available for the current turn
      sessionMemory = sessionMemoryManager.updateConversationSummary(sessionMemory);
      
      console.log(`📦 Session Memory Loaded:`);
      console.log(`   Topic: ${sessionMemory.conversationTopic || 'none'}`);
      console.log(`   Intent: ${sessionMemory.userIntent || 'none'}`);
      console.log(`   Summary: ${sessionMemory.conversationSummary ? sessionMemory.conversationSummary.substring(0, 100) + '...' : 'none'}`);
      console.log(`   Fleetcore features: ${sessionMemory.accumulatedKnowledge.fleetcoreFeatures.length}`);
      console.log(`   Vessel entities: ${Object.keys(sessionMemory.accumulatedKnowledge.vesselEntities).length}`);
      console.log(`   Mode history: ${sessionMemory.modeHistory.length}`);
    } catch (error) {
      console.error(`❌ Failed to load session memory:`, error);
      // Continue without session memory
    }
  } else {
    console.warn(`⚠️ CHAT_SESSIONS KV not available - session memory disabled`);
  }
  
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
      sessionMemory, // Pass session memory to nodes
      sessionMemoryManager, // Pass manager for saving
    },
    // Add metadata for LangSmith tracing
    metadata: {
      session_id: sessionId,
      enable_browsing: enableBrowsing,
      user_query: messages[messages.length - 1]?.content?.substring(0, 100),
      has_session_memory: !!sessionMemory,
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
        
        // CRITICAL: Emit conversation memory narrative for thinking panel
        // Shows user what context AI is working with
        if (sessionMemory?.conversationSummary) {
          console.log(`📖 Emitting conversation memory narrative to thinking panel`);
          
          // Split summary into sentences for progressive reveal
          const sentences = sessionMemory.conversationSummary
            .split(/(?<=[.!?])\s+/)
            .filter(s => s.trim().length > 0);
          
          // Emit as special "memory" event type
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ 
              type: 'memory',
              content: sessionMemory.conversationSummary,
              sentences: sentences,
              hasRecentMessages: sessionMemory.recentMessages?.length > 0,
              messageCount: sessionMemory.recentMessages?.length || 0
            })}\n\n`
          ));
          
          console.log(`   ✅ Sent memory narrative (${sentences.length} sentences)`);
        }
        
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
        
        // Initialize state from session memory
        const initialState = initializeStateFromMemory(sessionMemory);
        
        // Stream events from agent
        // Use "messages" mode to get token-by-token streaming
        let stream;
        try {
          stream = await agent.stream(
            {
              messages: baseMessages,
              sessionId,
              enableBrowsing,
              ...initialState, // Inject session memory into initial state
            },
            {
              ...config,
              streamMode: ["messages", "updates"] as const,
            }
          );
          console.log(`📡 SSE Stream: Agent stream created successfully`);
          console.log(`   Initial state loaded from session memory`);
        } catch (streamError: any) {
          console.error(`❌ Failed to create agent stream:`, streamError);
          throw new Error(`Agent stream creation failed: ${streamError.message}`);
        }
        
        let sourcesEmitted = false;
        let eventCount = 0;
        
        console.log(`📡 SSE Stream: Entering event loop`);
        
        let hasStreamedContent = false;
        let hasError = false;
        
        // Track final state for syncing back to session memory
        let finalState: AgentState | null = null;
        
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
          
          // PHASE 2: Capture state updates for syncing
          if (event && typeof event === 'object') {
            const stateUpdate = event[eventKey];
            if (stateUpdate && typeof stateUpdate === 'object') {
              // Merge state updates
              finalState = { ...finalState, ...stateUpdate } as AgentState;
            }
          }
          
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
        
        // Sync state to session memory and save to KV
        if (sessionMemoryManager && sessionMemory) {
          try {
            // Add this conversation to recent messages
            const userMessage = messages[messages.length - 1];
            if (userMessage) {
              const role = userMessage.role === 'assistant' ? 'assistant' : 'user';
              sessionMemoryManager.addMessage(sessionMemory, role, userMessage.content);
            }
            
            // Extract and update topic from conversation
            const extractedTopic = extractTopicFromMessages(baseMessages);
            if (extractedTopic) {
              sessionMemoryManager.updateTopic(sessionMemory, extractedTopic);
            }
            
            // Sync final state back to session memory
            if (finalState) {
              console.log(`🔄 Syncing final state to session memory`);
              syncStateToMemory(finalState, sessionMemory, sessionMemoryManager);
              
              // Add assistant's response to recent messages
              const lastMessage = finalState.messages[finalState.messages.length - 1];
              if (lastMessage && typeof lastMessage.content === 'string') {
                sessionMemoryManager.addMessage(sessionMemory, 'assistant', lastMessage.content);
                
                // Validate context acknowledgment in final answer
                const validation = await validateContextAcknowledgment(lastMessage.content, finalState);
                
                if (!validation.valid) {
                  console.warn(`⚠️ PHASE 6: Context validation failed - ${validation.reason}`);
                  console.warn(`   This indicates the synthesizer didn't properly integrate accumulated context.`);
                  console.warn(`   Consider: Re-running with explicit context injection or adjusting synthesis prompts.`);
                } else {
                  console.log(`✅ PHASE 6: Context validation passed - answer acknowledges previous discussion`);
                }
              }
            }
            
            // Save to KV
            await sessionMemoryManager.save(sessionId, sessionMemory);
            console.log(`💾 Session memory saved successfully`);
          } catch (error) {
            console.error(`❌ Failed to save session memory:`, error);
          }
        }
        
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

