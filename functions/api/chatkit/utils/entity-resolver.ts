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
 * Check if query is a follow-up with referential pronouns or contextual references
 * 
 * COMPREHENSIVE FOLLOW-UP DETECTION ENGINE
 * ========================================
 * 
 * Based on deep technical research of maritime vessel systems and business operations.
 * Detects implicit references across ALL vessel domains:
 * 
 * TECHNICAL SYSTEMS (9 categories):
 * - Propulsion: main engines, propellers, shafts, gearboxes, thrust bearings
 * - Auxiliaries: generators, compressors, pumps, separators, purifiers, boilers
 * - Electrical: switchboards, batteries, shore connections, emergency generators
 * - Navigation: radar, GPS, AIS, ECDIS, gyro, autopilot, echo sounders
 * - Safety: firefighting, CO2 systems, lifeboats, life rafts, emergency equipment
 * - Cargo: cranes, winches, derricks, hatches, cargo pumps, manifolds
 * - Piping: fuel, ballast, bilge, cooling, freshwater, seawater, hydraulic
 * - HVAC: air conditioning, ventilation, refrigeration, galley, accommodation
 * - Hull: structure, plating, frames, decks, bulkheads, coatings, rudders
 * 
 * BUSINESS & OPERATIONS (7 categories):
 * - Operations: routes, schedules, voyages, charters, contracts, performance
 * - Certifications: certificates, surveys, inspections, class, classification
 * - Management: maintenance, repairs, overhauls, service history, documentation
 * - Financial: costs, value, pricing, earnings, revenue, expenses, insurance
 * - Commercial: charter rates, freight, hire, purchase, sale, valuation
 * - Compliance: incidents, accidents, detentions, deficiencies, violations
 * - Modifications: upgrades, conversions, retrofits, installations, replacements
 * 
 * EXAMPLES OF DETECTED FOLLOW-UPS:
 * - "give me details about the auxiliary system" (after discussing vessel)
 * - "what's the maintenance schedule?" (implicit reference to previous equipment)
 * - "any incidents?" (asking about vessel from previous context)
 * - "how much does it cost?" (asking about charter/operation costs)
 * - "who operates it?" (asking about vessel operator)
 * - "what about the crew?" (asking about manning)
 * - "compliance status?" (asking about certificates/surveys)
 * - "tell me about the engines" (implicit reference to vessel)
 * 
 * Ported from legacy agent (lines 581-643) and MASSIVELY ENHANCED for production use.
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
  // COMPREHENSIVE: Based on deep technical research of vessel systems and business operations
  // Covers: propulsion, auxiliaries, navigation, safety, cargo, accommodation, electrical, piping, hull, communications
  const hasReferentialPronouns = /\b(it|its|that|this|those|these|them|their|his|her|the above|mentioned|one|same)\b/i.test(query) ||
    // Vessel/Entity references
    /\b(the vessel|the ship|the boat|the craft|the company|the operator|the owner|the fleet|the organization)\b/i.test(query) ||
    
    // PROPULSION SYSTEM components
    /\b(the engine|the engines|the propulsion|the main engine|the propeller|the shaft|the gearbox|the reduction gear|the thrust bearing)\b/i.test(query) ||
    
    // AUXILIARY SYSTEM components  
    /\b(the auxiliary|the generator|the generators|the aux engine|the compressor|the pump|the separator|the purifier|the alternator|the boiler|the incinerator)\b/i.test(query) ||
    
    // ELECTRICAL SYSTEM components
    /\b(the electrical|the switchboard|the distribution|the battery|the shore connection|the emergency generator|the power supply)\b/i.test(query) ||
    
    // NAVIGATION & COMMUNICATION systems
    /\b(the navigation|the radar|the gps|the ais|the ecdis|the gyro|the autopilot|the echo sounder|the radio|the communication|the satellite)\b/i.test(query) ||
    
    // SAFETY & FIREFIGHTING systems
    /\b(the safety|the fire|the firefighting|the fire pump|the sprinkler|the co2 system|the foam system|the lifeboat|the life raft|the emergency)\b/i.test(query) ||
    
    // CARGO HANDLING systems
    /\b(the cargo|the crane|the winch|the derrick|the hatch|the loading|the discharge|the cargo pump|the manifold|the mooring)\b/i.test(query) ||
    
    // PIPING SYSTEMS
    /\b(the piping|the fuel system|the ballast|the bilge|the cooling|the freshwater|the seawater|the hydraulic|the pneumatic|the steam)\b/i.test(query) ||
    
    // HVAC & ACCOMMODATION
    /\b(the hvac|the air conditioning|the ventilation|the refrigeration|the galley|the accommodation|the sanitary|the sewage)\b/i.test(query) ||
    
    // HULL & STRUCTURAL
    /\b(the hull|the structure|the plating|the frames|the deck|the bulkhead|the coating|the paint|the anodes|the rudder)\b/i.test(query) ||
    
    // EQUIPMENT & MACHINERY (general)
    /\b(the equipment|the machinery|the system|the systems|the installation|the unit|the component|the part|the assembly)\b/i.test(query) ||
    
    // TECHNICAL SPECIFICATIONS
    /\b(the specifications|the specs|the capacity|the rating|the power|the performance|the efficiency|the consumption)\b/i.test(query) ||
    
    // BUSINESS & OPERATIONS
    /\b(the operation|the operations|the performance|the efficiency|the route|the schedule|the voyage|the charter|the contract)\b/i.test(query) ||
    /\b(the crew|the manning|the certification|the certificate|the survey|the inspection|the class|the classification)\b/i.test(query) ||
    /\b(the management|the maintenance|the repair|the overhaul|the service|the history|the records|the documentation)\b/i.test(query) ||
    /\b(the cost|the value|the price|the earnings|the revenue|the expenses|the insurance|the flag|the registry)\b/i.test(query) ||
    
    // COMMERCIAL & FINANCIAL
    /\b(the market|the rate|the charter rate|the freight|the hire|the purchase|the sale|the valuation)\b/i.test(query) ||
    
    // INCIDENTS & COMPLIANCE
    /\b(the incident|the accident|the casualty|the detention|the deficiency|the compliance|the violation|the penalty)\b/i.test(query) ||
    
    // MODIFICATIONS & UPGRADES
    /\b(the modification|the conversion|the upgrade|the retrofit|the installation|the replacement|the renewal)\b/i.test(query);
  
  // Pattern 3: Follow-up phrases (COMPREHENSIVE: business + technical)
  const hasFollowUpPhrases = 
    // General continuation
    /\b(tell me|show me|give me|what about|how about|what if|can you|could you|would you|also|and|but|so|ok|okay|cool|right|sure|yes|alright)\b/i.test(query) ||
    
    // Information requests (business)
    /\b(what's|what is|whats|who's|who is|whos|where's|where is|wheres|when's|when is|whens|how's|how is|hows)\b/i.test(query) ||
    /\b(how much|how many|how often|how long|what kind|what type|which one|any |some |more |additional |further |details?|info)\b/i.test(query) ||
    
    // Comparative & Analysis
    /\b(compare|comparison|versus|vs|difference|similar|like|better|worse|best|worst|typical|average|normal)\b/i.test(query) ||
    
    // Technical queries
    /\b(specs?|specifications?|capacity|rating|power|performance|efficiency|consumption|interval|schedule|procedure)\b/i.test(query) ||
    /\b(maintenance|service|repair|overhaul|inspection|survey|test|check|monitor|track)\b/i.test(query) ||
    /\b(issue|issues|problem|problems|failure|failures|fault|faults|defect|defects|malfunction)\b/i.test(query) ||
    
    // Business/Commercial queries
    /\b(cost|costs|price|value|rate|charter|hire|freight|earnings|revenue|profit)\b/i.test(query) ||
    /\b(operator|owner|manager|charterer|flag|registry|class|survey|certificate)\b/i.test(query) ||
    /\b(history|record|past|previous|former|current|latest|recent|update)\b/i.test(query) ||
    
    // Status & Condition
    /\b(status|condition|state|situation|position|location|where|when built|age|year)\b/i.test(query) ||
    /\b(operational|working|functioning|running|active|inactive|laid up|scrapped)\b/i.test(query) ||
    
    // Compliance & Safety
    /\b(compliant|compliance|certified|certificate|inspection|survey|audit|detention|deficiency)\b/i.test(query) ||
    /\b(incident|accident|casualty|damage|injury|pollution|spill|grounding|collision)\b/i.test(query) ||
    
    // Modifications & Changes
    /\b(upgrade|upgraded|modify|modified|retrofit|retrofitted|convert|converted|change|changed|replace|replaced)\b/i.test(query) ||
    
    // Crew & Manning
    /\b(crew|manning|officers|engineers|captain|master|chief engineer|staff|personnel)\b/i.test(query);
  
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

