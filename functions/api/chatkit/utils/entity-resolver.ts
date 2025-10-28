/**
 * Entity Context Resolution System
 * Resolves pronouns and contextual references to actual entities
 * 
 * Extracted from legacy agent (proven patterns) and enhanced
 */

import type { SessionMemory } from '../session-memory';

/**
 * Resolved query with entity context
 */
export interface ResolvedQuery {
  /** Original query as entered by user */
  originalQuery: string;
  /** Resolved query with pronouns replaced by actual entities */
  resolvedQuery: string;
  /** Entity context string for tool invocation */
  entityContext: string | null;
  /** Whether resolution was successful */
  hasContext: boolean;
  /** Active entity being discussed */
  activeEntity: {
    name: string;
    type: 'vessel' | 'company' | 'equipment' | 'unknown';
    imo?: string;
    specs?: Record<string, any>;
  } | null;
}

/**
 * Check if query is a follow-up with referential pronouns
 * Ported from legacy agent (lines 581-643) - PROVEN PATTERN
 */
export function isFollowUpQuery(
  query: string,
  sessionMemory: SessionMemory | null
): boolean {
  if (!sessionMemory) return false;
  
  const queryLower = query.toLowerCase().trim();
  
  // Pattern 1: Very short queries (likely follow-ups)
  const isShortQuery = query.split(/\s+/).length <= 4;
  const hasQuestionWord = /\b(what|how|why|when|where|which|who|can|could|would|should)\b/i.test(query);
  const isVeryShort = query.length < 20;
  
  if (isVeryShort && (hasQuestionWord || isShortQuery)) {
    return true;
  }
  
  // Pattern 2: Referential pronouns (CRITICAL for "its engines" queries)
  // Includes possessive pronouns: its, their, his, her
  const hasReferentialPronouns = /\b(it|its|that|this|those|these|them|their|his|her|the above|mentioned|one|same|the vessel|the ship|the company)\b/i.test(query);
  
  // Pattern 3: Follow-up phrases
  const hasFollowUpPhrases = /\b(tell me|show me|what about|how about|what if|can you|could you|also|and|but|so|ok|cool)\b/i.test(query);
  
  // Pattern 4: Action words without explicit subject
  const hasActionWithoutSubject = /\b(use|apply|works?|implement|integrate|handle|manage|track|monitor|find|show|give)\b/i.test(query) && 
                                  !/(fleetcore|pms|system|platform|vessel name|ship name|company name)/i.test(query);
  
  // Pattern 5: Check if previous messages exist (indicates ongoing conversation)
  const hasPreviousMessages = sessionMemory.messageCount > 0 && sessionMemory.recentMessages.length > 0;
  
  // LIBERAL follow-up detection (optimized for human conversation)
  const isFollowUp = 
    (isShortQuery && hasPreviousMessages) ||
    (hasReferentialPronouns && hasPreviousMessages) ||
    (hasFollowUpPhrases && hasPreviousMessages) ||
    (hasActionWithoutSubject && hasPreviousMessages);
  
  return isFollowUp;
}

/**
 * Get the most relevant active entity from session memory
 * Prioritizes: most recently discussed entity
 */
export function getActiveEntity(sessionMemory: SessionMemory | null): {
  name: string;
  type: 'vessel' | 'company' | 'equipment' | 'unknown';
  imo?: string;
  specs?: Record<string, any>;
} | null {
  if (!sessionMemory) return null;
  
  const knowledge = sessionMemory.accumulatedKnowledge;
  
  // Priority 1: Most recent vessel
  const vessels = Object.entries(knowledge.vesselEntities || {});
  if (vessels.length > 0) {
    const [key, vessel] = vessels[vessels.length - 1]; // Most recent
    return {
      name: (vessel as any).name || key,
      type: 'vessel',
      imo: (vessel as any).imo,
      specs: (vessel as any).specs,
    };
  }
  
  // Priority 2: Most recent company
  const companies = Object.entries(knowledge.companyEntities || {});
  if (companies.length > 0) {
    const [key, company] = companies[companies.length - 1]; // Most recent
    return {
      name: (company as any).name || key,
      type: 'company',
      specs: (company as any).specs,
    };
  }
  
  // Priority 3: Check recent messages for equipment mentions
  const recentText = sessionMemory.recentMessages
    .slice(-3)
    .map((m: any) => m.content)
    .join(' ');
  
  const equipmentMatch = recentText.match(/\b([A-Z][a-z]+\s+\d+[A-Z0-9-]+)\b/);
  if (equipmentMatch) {
    return {
      name: equipmentMatch[1],
      type: 'equipment',
    };
  }
  
  return null;
}

/**
 * Build rich entity context string for tool invocation
 * Ported from legacy agent Gemini tool (lines 951-975)
 */
export function buildEntityContext(
  activeEntity: ReturnType<typeof getActiveEntity>,
  sessionMemory: SessionMemory | null
): string | null {
  if (!activeEntity) return null;
  
  const contextParts: string[] = [];
  
  // Add entity identification
  contextParts.push(`ACTIVE ENTITY: ${activeEntity.name}`);
  
  if (activeEntity.type === 'vessel') {
    contextParts.push(`Type: Vessel`);
    if (activeEntity.imo) {
      contextParts.push(`IMO: ${activeEntity.imo}`);
    }
    if (activeEntity.specs) {
      const specs = Object.entries(activeEntity.specs)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      contextParts.push(`Specs: ${specs}`);
    }
  } else if (activeEntity.type === 'company') {
    contextParts.push(`Type: Maritime Company/Operator`);
  } else if (activeEntity.type === 'equipment') {
    contextParts.push(`Type: Equipment/Machinery`);
  }
  
  // Add conversation summary if available
  if (sessionMemory?.conversationSummary) {
    contextParts.push(`\nCONVERSATION SUMMARY:\n${sessionMemory.conversationSummary}`);
  }
  
  // Add fleetcore context if user is evaluating platform
  const hasFleetcoreContext = (sessionMemory?.accumulatedKnowledge?.fleetcoreFeatures?.length || 0) > 0;
  if (hasFleetcoreContext) {
    const features = sessionMemory!.accumulatedKnowledge.fleetcoreFeatures
      .slice(0, 3)
      .map((f: any) => f.name)
      .join(', ');
    contextParts.push(`\nFLEETCORE CONTEXT: User is evaluating fleetcore platform (features discussed: ${features})`);
  }
  
  return contextParts.join('\n');
}

/**
 * Resolve pronouns in query to actual entity names
 * Example: "what about its engines?" → "what about Dynamic 17's engines?"
 */
export function resolvePronouns(
  query: string,
  activeEntity: ReturnType<typeof getActiveEntity>
): string {
  if (!activeEntity) return query;
  
  let resolved = query;
  
  // Replace possessive pronouns
  resolved = resolved.replace(/\bits\b/gi, activeEntity.name);
  resolved = resolved.replace(/\btheir\b/gi, `${activeEntity.name}'s`);
  
  // Replace referential pronouns
  resolved = resolved.replace(/\bit\b/gi, activeEntity.name);
  resolved = resolved.replace(/\bthis\b/gi, activeEntity.name);
  resolved = resolved.replace(/\bthat\b/gi, activeEntity.name);
  
  // Replace "the vessel", "the ship", "the company"
  if (activeEntity.type === 'vessel') {
    resolved = resolved.replace(/\bthe vessel\b/gi, activeEntity.name);
    resolved = resolved.replace(/\bthe ship\b/gi, activeEntity.name);
  } else if (activeEntity.type === 'company') {
    resolved = resolved.replace(/\bthe company\b/gi, activeEntity.name);
    resolved = resolved.replace(/\bthe operator\b/gi, activeEntity.name);
  }
  
  return resolved;
}

/**
 * MAIN: Resolve query context with entity awareness
 * Combines all resolution steps into single function
 */
export function resolveQueryContext(
  query: string,
  sessionMemory: SessionMemory | null
): ResolvedQuery {
  // Check if this is a follow-up query
  const isFollowUp = isFollowUpQuery(query, sessionMemory);
  
  if (!isFollowUp) {
    // Not a follow-up - return as-is
    return {
      originalQuery: query,
      resolvedQuery: query,
      entityContext: null,
      hasContext: false,
      activeEntity: null,
    };
  }
  
  // Get active entity from conversation
  const activeEntity = getActiveEntity(sessionMemory);
  
  if (!activeEntity) {
    // Follow-up detected but no entity in memory - return as-is
    console.log(`   ⚠️ Follow-up detected but no active entity in memory`);
    return {
      originalQuery: query,
      resolvedQuery: query,
      entityContext: null,
      hasContext: false,
      activeEntity: null,
    };
  }
  
  // Resolve pronouns to entity names
  const resolvedQuery = resolvePronouns(query, activeEntity);
  
  // Build entity context string
  const entityContext = buildEntityContext(activeEntity, sessionMemory);
  
  console.log(`   ✅ Query resolved: "${query}" → "${resolvedQuery}"`);
  console.log(`   🎯 Active entity: ${activeEntity.name} (${activeEntity.type})`);
  
  return {
    originalQuery: query,
    resolvedQuery,
    entityContext,
    hasContext: true,
    activeEntity,
  };
}

