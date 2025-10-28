/**
 * Conversation State Management System
 * Tracks conversation flow, intent evolution, and context relevance
 * 
 * Enables intelligent mode switching and context preservation
 */

import type { SessionMemory } from './session-memory';

/**
 * Conversation states representing different interaction modes
 */
export enum ConversationState {
  /** Initial state - first query, no history */
  COLD_START = 'cold_start',
  
  /** User learning about specific maritime entities (vessels, companies) */
  ENTITY_DISCOVERY = 'entity_discovery',
  
  /** User learning about fleetcore platform features */
  PLATFORM_EXPLORATION = 'platform_exploration',
  
  /** User asking about applying fleetcore to specific entities */
  HYBRID_CONSULTATION = 'hybrid_consultation',
  
  /** User comparing multiple entities or options */
  COMPARATIVE_MODE = 'comparative_mode',
  
  /** User troubleshooting or problem-solving */
  TROUBLESHOOTING = 'troubleshooting',
}

/**
 * Intent types representing user's high-level goal
 */
export enum IntentType {
  /** Learning about fleetcore capabilities */
  LEARNING_PLATFORM = 'learning_platform',
  
  /** Gathering information about maritime entities */
  INFORMATION_GATHERING = 'information_gathering',
  
  /** Evaluating fleetcore for specific use case */
  EVALUATION = 'evaluation',
  
  /** Comparing multiple options */
  COMPARISON = 'comparison',
  
  /** Seeking solution to problem */
  PROBLEM_SOLVING = 'problem_solving',
  
  /** Initial exploration */
  EXPLORATORY = 'exploratory',
}

/**
 * State transition with metadata
 */
export interface StateTransition {
  from: ConversationState;
  to: ConversationState;
  trigger: string; // What caused the transition
  timestamp: number;
  query: string; // User query that triggered transition
}

/**
 * Intent evolution tracking
 */
export interface IntentEvolution {
  intent: IntentType;
  confidence: number;
  timestamp: number;
  query: string;
  context: string; // Why this intent was detected
}

/**
 * Detect conversation state from query and session memory
 */
export function detectConversationState(
  query: string,
  sessionMemory: SessionMemory | null,
  currentState: ConversationState = ConversationState.COLD_START
): ConversationState {
  
  if (!sessionMemory || sessionMemory.messageCount === 0) {
    return ConversationState.COLD_START;
  }
  
  const queryLower = query.toLowerCase();
  const knowledge = sessionMemory.accumulatedKnowledge;
  
  // Check for fleetcore features in memory
  const hasFleetcoreKnowledge = (knowledge.fleetcoreFeatures?.length || 0) > 0;
  
  // Check for entities in memory
  const hasVessels = Object.keys(knowledge.vesselEntities || {}).length > 0;
  const hasCompanies = Object.keys(knowledge.companyEntities || {}).length > 0;
  const hasEntities = hasVessels || hasCompanies;
  
  // Count entities
  const entityCount = Object.keys(knowledge.vesselEntities || {}).length + 
                     Object.keys(knowledge.companyEntities || {}).length;
  
  // COMPARATIVE MODE: Multiple entities + comparison keywords
  if (entityCount >= 2 && /\b(compare|versus|vs|difference|between|which|better|best|largest|biggest)\b/i.test(query)) {
    return ConversationState.COMPARATIVE_MODE;
  }
  
  // HYBRID CONSULTATION: Has both platform knowledge and entities
  if (hasFleetcoreKnowledge && hasEntities) {
    // Check if query mentions both platform and entity concepts
    const mentionsPlatform = /\b(fleetcore|pms|maintenance|system|platform)\b/i.test(query);
    const mentionsAction = /\b(use|apply|implement|support|help|work|handle|manage|compatible|suitable)\b/i.test(query);
    
    if (mentionsPlatform || mentionsAction) {
      return ConversationState.HYBRID_CONSULTATION;
    }
  }
  
  // TROUBLESHOOTING: Problem-solving language
  if (/\b(issue|problem|error|fix|solve|help|why|not work|fail|wrong|broken)\b/i.test(query)) {
    return ConversationState.TROUBLESHOOTING;
  }
  
  // PLATFORM EXPLORATION: Questions about fleetcore
  const platformIndicators = [
    /\b(what is|tell me about|explain|how does)\b.*\b(fleetcore|pms|system|platform)\b/i,
    /\b(fleetcore|pms)\b.*\b(feature|capability|function|work|price|cost)\b/i,
    /\bhow to\b.*\b(use|implement|set up|configure)\b/i,
  ];
  
  if (platformIndicators.some(pattern => pattern.test(query))) {
    return ConversationState.PLATFORM_EXPLORATION;
  }
  
  // ENTITY DISCOVERY: Questions about specific entities
  const entityIndicators = [
    /\b(vessel|ship|company|equipment|manufacturer)\b/i,
    /\b(tell me about|what is|information about|details about)\b.*\b(vessel|ship|company)\b/i,
    /\bIMO\b|\bMMSI\b/i,
  ];
  
  if (entityIndicators.some(pattern => pattern.test(query)) || hasEntities) {
    return ConversationState.ENTITY_DISCOVERY;
  }
  
  // Default: Stay in current state if no clear transition
  return currentState;
}

/**
 * Detect user intent from query and conversation context
 */
export function detectUserIntent(
  query: string,
  sessionMemory: SessionMemory | null
): IntentEvolution {
  
  const queryLower = query.toLowerCase();
  const knowledge = sessionMemory?.accumulatedKnowledge;
  
  // Pattern 1: EVALUATION - Combining platform knowledge with entities
  const hasFleetcoreKnowledge = (knowledge?.fleetcoreFeatures?.length || 0) > 0;
  const hasEntities = 
    Object.keys(knowledge?.vesselEntities || {}).length > 0 ||
    Object.keys(knowledge?.companyEntities || {}).length > 0;
  
  const actionWords = /\b(use|apply|implement|integrate|work|help|support|handle|manage|track|compatible|suitable)\b/i;
  
  if (hasFleetcoreKnowledge && (hasEntities || actionWords.test(query))) {
    return {
      intent: IntentType.EVALUATION,
      confidence: 0.9,
      timestamp: Date.now(),
      query,
      context: 'User has learned about fleetcore and is now asking about specific application'
    };
  }
  
  // Pattern 2: COMPARISON
  if (/\b(compare|versus|vs|difference|between|which one|better|best|largest|biggest|smallest)\b/i.test(query)) {
    return {
      intent: IntentType.COMPARISON,
      confidence: 0.95,
      timestamp: Date.now(),
      query,
      context: 'User is comparing multiple options or entities'
    };
  }
  
  // Pattern 3: PROBLEM SOLVING
  if (/\b(issue|problem|error|fix|solve|help|why|not work|fail|wrong)\b/i.test(query)) {
    return {
      intent: IntentType.PROBLEM_SOLVING,
      confidence: 0.9,
      timestamp: Date.now(),
      query,
      context: 'User is troubleshooting or seeking solution'
    };
  }
  
  // Pattern 4: LEARNING PLATFORM
  const platformLearning = [
    /\b(what is|tell me about|explain|how does)\b.*\b(fleetcore|pms)\b/i,
    /\b(feature|capability|function|price|cost)\b/i,
    /\bhow to\b.*\b(use|implement|configure)\b/i,
  ];
  
  if (platformLearning.some(pattern => pattern.test(query))) {
    return {
      intent: IntentType.LEARNING_PLATFORM,
      confidence: 0.85,
      timestamp: Date.now(),
      query,
      context: 'User is learning about fleetcore capabilities'
    };
  }
  
  // Pattern 5: INFORMATION GATHERING (about entities)
  if (/\b(vessel|ship|company|equipment|what is|who is|tell me about)\b/i.test(query)) {
    return {
      intent: IntentType.INFORMATION_GATHERING,
      confidence: 0.8,
      timestamp: Date.now(),
      query,
      context: 'User is gathering information about maritime entities'
    };
  }
  
  // Default: EXPLORATORY
  return {
    intent: IntentType.EXPLORATORY,
    confidence: 0.6,
    timestamp: Date.now(),
    query,
    context: 'Initial exploration or unclear intent'
  };
}

/**
 * Detect state transition and determine if context should be preserved
 */
export function detectStateTransition(
  currentState: ConversationState,
  newState: ConversationState,
  query: string
): StateTransition | null {
  
  if (currentState === newState) {
    return null; // No transition
  }
  
  // Determine what triggered the transition
  let trigger = 'query_shift';
  
  if (currentState === ConversationState.COLD_START) {
    trigger = 'conversation_start';
  } else if (newState === ConversationState.HYBRID_CONSULTATION) {
    trigger = 'combined_context_detected';
  } else if (newState === ConversationState.COMPARATIVE_MODE) {
    trigger = 'comparison_requested';
  } else if (currentState === ConversationState.PLATFORM_EXPLORATION && newState === ConversationState.ENTITY_DISCOVERY) {
    trigger = 'shifted_to_entity_focus';
  } else if (currentState === ConversationState.ENTITY_DISCOVERY && newState === ConversationState.PLATFORM_EXPLORATION) {
    trigger = 'shifted_to_platform_focus';
  }
  
  return {
    from: currentState,
    to: newState,
    trigger,
    timestamp: Date.now(),
    query
  };
}

/**
 * Determine if context from previous state should be preserved
 */
export function shouldPreserveContext(
  transition: StateTransition | null
): boolean {
  
  if (!transition) {
    return true; // No transition, keep context
  }
  
  // ALWAYS preserve context for these transitions
  const preserveTransitions = [
    [ConversationState.PLATFORM_EXPLORATION, ConversationState.HYBRID_CONSULTATION],
    [ConversationState.ENTITY_DISCOVERY, ConversationState.HYBRID_CONSULTATION],
    [ConversationState.ENTITY_DISCOVERY, ConversationState.COMPARATIVE_MODE],
  ];
  
  for (const [from, to] of preserveTransitions) {
    if (transition.from === from && transition.to === to) {
      return true;
    }
  }
  
  // CLEAR context for complete topic shifts
  if (transition.from === ConversationState.TROUBLESHOOTING && 
      transition.to === ConversationState.COLD_START) {
    return false;
  }
  
  // Default: preserve context
  return true;
}

/**
 * Get relevant context window based on current state
 * Returns number of previous turns to include
 */
export function getContextWindow(state: ConversationState): number {
  switch (state) {
    case ConversationState.COLD_START:
      return 0; // No previous context
    
    case ConversationState.PLATFORM_EXPLORATION:
      return 3; // Last 3 turns for platform learning
    
    case ConversationState.ENTITY_DISCOVERY:
      return 3; // Last 3 turns for entity context
    
    case ConversationState.HYBRID_CONSULTATION:
      return 5; // More context for hybrid queries
    
    case ConversationState.COMPARATIVE_MODE:
      return 7; // Even more context for comparisons
    
    case ConversationState.TROUBLESHOOTING:
      return 5; // Context for problem understanding
    
    default:
      return 3;
  }
}

/**
 * Build state summary for logging and debugging
 */
export function buildStateSummary(
  state: ConversationState,
  intent: IntentEvolution,
  transition: StateTransition | null
): string {
  
  let summary = `State: ${state} | Intent: ${intent.intent} (${(intent.confidence * 100).toFixed(0)}%)`;
  
  if (transition) {
    summary += `\n   Transition: ${transition.from} → ${transition.to} (${transition.trigger})`;
  }
  
  summary += `\n   Context: ${intent.context}`;
  
  return summary;
}

