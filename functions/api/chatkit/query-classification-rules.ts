/**
 * Query Classification Rules for Maritime Intelligence Agent
 * 
 * Defines rules for detecting knowledge mode queries (platform/system questions)
 * vs. queries that require external research or verification.
 * 
 * Knowledge Mode: Questions about fleetcore platform, features, and capabilities
 * Verification Mode: Questions about specific entities (vessels, companies, equipment)
 * Research Mode: Complex queries requiring multi-source research (enabled by user toggle)
 * 
 * ENHANCED: Now includes entity context resolution for follow-up queries
 */

import { extractMaritimeEntities } from './utils/entity-utils';
import { resolveQueryContext, type ResolvedQuery } from './utils/entity-resolver';

// =====================
// PLATFORM KEYWORDS
// =====================

/**
 * Comprehensive keyword list for detecting fleetcore platform/system queries
 * These queries should be answered from training data without external tools
 */
export const PLATFORM_KEYWORDS = [
  // Core platform brand terms
  'fleetcore', 'seacore', 'fleet core', 'sea core',
  
  // Core system/management terms (CRITICAL for detecting system queries)
  'system', 'systems', 
  'management', 'manager',
  'organization', 'organisation',  // Support both spellings
  'organizational', 'organisational',
  
  // Maintenance features
  'pms', 'planned maintenance system', 'planned maintenance',
  'work order', 'work orders', 'maintenance scheduling',
  'job card', 'job cards',
  'maintenance schedule', 'maintenance tasks',
  'maintenance management', 'maintenance system',
  
  // Inventory & procurement
  'inventory management', 'spare parts management',
  'procurement', 'purchasing system',
  'parts management', 'stock management',
  'inventory system', 'parts tracking',
  
  // Crew & personnel
  'crew management', 'crew scheduling', 'crew roster',
  'personnel management', 'staff scheduling',
  'crew system', 'personnel system',
  
  // Compliance & safety
  'compliance tracking', 'compliance management',
  'safety management system', 'sms system',
  'audit trail', 'regulatory compliance',
  'certificate tracking', 'certification management',
  'compliance system', 'safety system',
  
  // Financial & budgeting
  'budget tracking', 'cost management',
  'financial management', 'expense tracking',
  'budget system', 'financial system',
  
  // Documentation
  'document management', 'digital documentation',
  'paperless', 'digital twin',
  'document system', 'documentation system',
  
  // Platform UI/UX
  'dashboard', 'analytics', 'reporting', 'reports',
  'user interface', 'ui', 'ux',
  'how to use', 'tutorial', 'guide',
  'navigation', 'menu',
  
  // Account & access
  'login', 'account', 'subscription', 'pricing',
  'user account', 'authentication',
  'access control', 'permissions',
  
  // Platform capabilities
  'features', 'capabilities', 'integrations',
  'mobile app', 'offline mode', 'sync',
  'real-time', 'notifications', 'alerts',
  'functionality', 'modules',
  
  // Technical platform terms
  'api', 'integration', 'data export',
  'architecture', 'database',
  'implementation', 'deployment',
  
  // Workflow & processes
  'workflow', 'process', 'automation',
  'task management', 'scheduling',
  'approval process', 'review process',
  
  // Data & analytics
  'data management', 'data visualization',
  'business intelligence', 'kpi',
  'performance metrics', 'reporting system',
];

// =====================
// ENTITY KEYWORDS
// =====================

/**
 * Keywords that indicate a query is about specific maritime entities
 * These queries typically require verification mode (Gemini) or research mode
 */
export const ENTITY_KEYWORDS = [
  'vessel', 'ship', 'fleet',
  'company', 'operator', 'owner',
  'equipment', 'manufacturer', 'oem',
  'imo', 'mmsi', 'flag',
  'port', 'shipyard', 'classification society',
];

// =====================
// TECHNICAL DEPTH KEYWORDS
// =====================

/**
 * Keywords that indicate a query requires TECHNICAL DEPTH (not generic overview)
 * These queries should trigger deep research for detailed maintenance, OEM specs, real-world data
 */
export const TECHNICAL_DEPTH_KEYWORDS = [
  // Maintenance-specific
  'maintenance', 'service', 'overhaul', 'inspection', 'service interval',
  'maintenance schedule', 'maintenance interval', 'service schedule',
  'pm schedule', 'preventive maintenance', 'corrective maintenance',
  
  // Equipment technical details
  'engine', 'engines', 'propulsion', 'generator', 'auxiliary',
  'pump', 'compressor', 'separator', 'purifier',
  'specifications', 'specs', 'technical data', 'technical details',
  'model number', 'part number', 'serial number',
  
  // OEM and manufacturer
  'oem', 'manufacturer', 'caterpillar', 'wartsila', 'man', 'cummins',
  'oem recommendation', 'manufacturer recommendation',
  'factory specs', 'technical manual', 'service manual',
  
  // Real-world operational data
  'failure', 'breakdown', 'malfunction', 'issue', 'problem',
  'common issues', 'known issues', 'failure modes', 'failure rate',
  'wear', 'degradation', 'performance', 'efficiency',
  'operating hours', 'running hours', 'service life',
  
  // Reports and documentation
  'report', 'reports', 'data', 'history', 'records',
  'inspection report', 'survey report', 'condition report',
  'performance data', 'operational data', 'maintenance history',
  
  // Technical procedures
  'procedure', 'procedures', 'protocol', 'checklist',
  'how to maintain', 'how to service', 'maintenance procedure',
  'troubleshooting', 'diagnostics', 'testing',
  
  // Specific technical requests
  'oil change', 'filter change', 'bearing inspection', 'valve adjustment',
  'fuel consumption', 'oil consumption', 'coolant', 'lubrication',
  'overhaul interval', 'rebuild', 'replacement parts',
  
  // Warnings and tips
  'warning', 'caution', 'critical', 'alert',
  'recommendation', 'tip', 'best practice', 'avoid',
  'watch out', 'pay attention', 'monitor',
  
  // Depth indicators
  'more details', 'detailed', 'comprehensive', 'in-depth', 'specifics',
  'tell me more', 'give me more', 'elaborate', 'explain in detail',
  'deep dive', 'technical analysis', 'full specifications',
  
  // Real-world scenarios
  'scenario', 'case study', 'example', 'real-world',
  'actual', 'practical', 'operational experience', 'field data',
];

/**
 * Phrases that explicitly request deeper technical information
 */
export const TECHNICAL_DEPTH_PHRASES = [
  /more\s+(details|information|info|data|specifics)/i,
  /tell\s+me\s+more/i,
  /give\s+me\s+more/i,
  /elaborate\s+on/i,
  /explain\s+in\s+detail/i,
  /detailed\s+(information|analysis|breakdown)/i,
  /technical\s+(details|specifications|data)/i,
  /maintenance\s+(recommendations|procedures|schedule)/i,
  /oem\s+(recommendations|specs|requirements)/i,
  /real[\s-]world\s+(scenarios?|data|examples)/i,
  /common\s+(issues?|problems?|failures?)/i,
  /service\s+(intervals?|schedules?|procedures?)/i,
];

// =====================
// DETECTION FUNCTIONS
// =====================

/**
 * Detect if query is about fleetcore platform/features
 * Uses enhanced keyword matching with word boundary detection
 * 
 * @param query - User query string
 * @returns true if query is about platform features
 */
export function isPlatformQuery(query: string): boolean {
  const queryLower = query.toLowerCase().trim();
  
  // Check for platform keywords with proper word boundary matching
  return PLATFORM_KEYWORDS.some(keyword => {
    const words = keyword.split(' ');
    
    if (words.length === 1) {
      // Single word - require word boundary to avoid false positives
      // e.g., "system" matches "system management" but not "ecosystem"
      return new RegExp(`\\b${keyword}\\b`, 'i').test(query);
    } else {
      // Multi-word phrase - check if full phrase exists
      return queryLower.includes(keyword);
    }
  });
}

/**
 * Detect if query mentions specific maritime entities
 * Uses comprehensive entity extraction to detect vessel names, companies, etc.
 * 
 * @param query - User query string
 * @returns true if query mentions entities like vessels, companies, equipment
 */
export function hasEntityMention(query: string): boolean {
  const queryLower = query.toLowerCase();
  
  // Check for entity keywords
  const hasEntityKeyword = ENTITY_KEYWORDS.some(keyword => 
    new RegExp(`\\b${keyword}\\b`, 'i').test(query)
  );
  
  // Check for vessel name patterns (MV, MS, MT, etc.)
  const hasVesselPattern = /\b(MV|MS|MT|SS|HMS)\s+[A-Z]/i.test(query);
  
  // Check for IMO/MMSI patterns
  const hasIdentifierPattern = /\b(IMO|MMSI)[\s:]?\d+/i.test(query);
  
  // CRITICAL: Use comprehensive entity extraction
  // This catches patterns like "Dynamic 17", "MSC Michel Cappellini", "Ever Given", etc.
  const extractedEntities = extractMaritimeEntities(query);
  const hasExtractedEntity = extractedEntities.length > 0;
  
  if (hasExtractedEntity) {
    console.log(`   🔍 Detected entities: ${extractedEntities.join(', ')}`);
  }
  
  return hasEntityKeyword || hasVesselPattern || hasIdentifierPattern || hasExtractedEntity;
}

/**
 * Detect if query is asking "how to" use the system
 * These should always be answered from training data
 * 
 * @param query - User query string
 * @returns true if query is a "how to" question
 */
export function isHowToQuery(query: string): boolean {
  const queryLower = query.toLowerCase();
  
  const howToPatterns = [
    /\bhow\s+(do|can|to|does)\s+(i|we|you|users?)\b/i,
    /\bwhat\s+is\s+the\s+(process|workflow|procedure)\b/i,
    /\bhow\s+to\s+/i,
    /\bsteps?\s+to\b/i,
    /\bguide\s+(for|to|on)\b/i,
  ];
  
  return howToPatterns.some(pattern => pattern.test(query));
}

/**
 * Detect if query is about system organization/structure
 * These queries often use abstract terms like "organization", "management", "structure"
 * 
 * @param query - User query string
 * @returns true if query is about system organization
 */
export function isSystemOrganizationQuery(query: string): boolean {
  const queryLower = query.toLowerCase();
  
  const organizationPatterns = [
    // Direct mentions
    /\b(system|systems)\s+(organization|organisation|structure|management)/i,
    /\b(organizational|organisational)\s+(structure|management)/i,
    
    // Abstract system questions
    /\bhow\s+(is|are)\s+.*(organized|organised|structured)/i,
    /\bwhat\s+(is|are)\s+the\s+(organization|organisation|structure)/i,
    
    // Management structure questions
    /\bmanagement\s+(structure|hierarchy|system)/i,
    /\bhierarchy\s+of\s+systems?/i,
  ];
  
  return organizationPatterns.some(pattern => pattern.test(query));
}

/**
 * Detect if query requires TECHNICAL DEPTH (not generic overview)
 * These queries should trigger deep research for maintenance data, OEM specs, real-world scenarios
 * 
 * CRITICAL: This is the key to acting as the world's best vertical maritime expert
 * 
 * @param query - User query string
 * @returns true if query requires detailed technical response
 */
export function requiresTechnicalDepth(query: string): boolean {
  const queryLower = query.toLowerCase().trim();
  
  // Check for explicit depth request phrases
  const hasDepthPhrase = TECHNICAL_DEPTH_PHRASES.some(pattern => pattern.test(query));
  if (hasDepthPhrase) {
    console.log(`   🔬 TECHNICAL DEPTH: Explicit depth phrase detected`);
    return true;
  }
  
  // Check for technical depth keywords
  const technicalKeywordCount = TECHNICAL_DEPTH_KEYWORDS.filter(keyword => {
    const words = keyword.split(' ');
    
    if (words.length === 1) {
      // Single word - require word boundary
      return new RegExp(`\\b${keyword}\\b`, 'i').test(query);
    } else {
      // Multi-word phrase
      return queryLower.includes(keyword.toLowerCase());
    }
  }).length;
  
  // Require at least 2 technical keywords for technical depth
  // Example: "engines" + "maintenance" = technical depth
  // But just "engines" alone = generic overview
  if (technicalKeywordCount >= 2) {
    console.log(`   🔬 TECHNICAL DEPTH: ${technicalKeywordCount} technical keywords detected`);
    return true;
  }
  
  // Special case: Follow-up queries that reference previous entity context
  // Example: "ok tell me more details about the engines"
  // This should be treated as technical depth when entity context exists
  const isFollowUpTechnical = (
    /^(ok|okay|yes|right|sure|alright),?\s+(tell|give|show)/i.test(query) &&
    (queryLower.includes('detail') || queryLower.includes('more') || queryLower.includes('specific'))
  );
  
  if (isFollowUpTechnical) {
    console.log(`   🔬 TECHNICAL DEPTH: Follow-up technical query detected`);
    return true;
  }
  
  return false;
}

/**
 * Query classification result with mode and context metadata
 * ENHANCED: Now includes resolved query information AND technical depth detection
 */
export interface QueryClassification {
  mode: 'none' | 'verification' | 'research';
  preserveFleetcoreContext: boolean;
  enrichQuery: boolean;
  isHybrid: boolean;
  /** Resolved query information (original, resolved, context) */
  resolvedQuery: ResolvedQuery;
  /** Technical depth requirement - triggers detailed maintenance/OEM analysis */
  requiresTechnicalDepth: boolean;
  /** Technical depth score (0-10) - higher = more technical detail needed */
  technicalDepthScore: number;
}

/**
 * Main query classification function (Enhanced from legacy agent)
 * Determines the appropriate mode and context preservation strategy
 * 
 * NOW CONTEXT-AWARE: Resolves pronouns and entity references before classification
 * 
 * @param query - User query string
 * @param enableBrowsing - Whether user enabled online research toggle
 * @param sessionMemory - Optional session memory for context-aware classification
 * @returns Classification object with mode and metadata flags
 */
export function classifyQuery(
  query: string,
  enableBrowsing: boolean,
  sessionMemory?: {
    accumulatedKnowledge?: {
      fleetcoreFeatures?: Array<{ name: string; explanation: string }>;
      vesselEntities?: Record<string, any>;
      companyEntities?: Record<string, any>;
    };
    userIntent?: string;
    messageCount?: number;
    recentMessages?: Array<{ role: string; content: string; timestamp: number }>;
    conversationSummary?: string;
  }
): QueryClassification {
  
  // STEP 1: Resolve entity context (pronouns → actual entity names)
  // This handles "its engines", "the vessel", "that company", etc.
  const resolvedQuery = resolveQueryContext(query, sessionMemory as any);
  
  if (resolvedQuery.hasContext) {
    console.log(`   🔍 Entity context resolved:`);
    console.log(`      Original: "${resolvedQuery.originalQuery}"`);
    console.log(`      Resolved: "${resolvedQuery.resolvedQuery}"`);
    console.log(`      Entity: ${resolvedQuery.activeEntity?.name} (${resolvedQuery.activeEntity?.type})`);
  }
  
  // Use resolved query for classification (contains actual entity names)
  const queryForClassification = resolvedQuery.resolvedQuery;
  
  // STEP 2: Detect technical depth requirement
  const needsTechnicalDepth = requiresTechnicalDepth(queryForClassification);
  
  // Calculate technical depth score (0-10)
  let technicalDepthScore = 0;
  if (needsTechnicalDepth) {
    // Count technical keywords
    const keywordMatches = TECHNICAL_DEPTH_KEYWORDS.filter(keyword => {
      const words = keyword.split(' ');
      if (words.length === 1) {
        return new RegExp(`\\b${keyword}\\b`, 'i').test(queryForClassification);
      }
      return queryForClassification.toLowerCase().includes(keyword.toLowerCase());
    }).length;
    
    // Count depth phrases
    const phraseMatches = TECHNICAL_DEPTH_PHRASES.filter(pattern => 
      pattern.test(queryForClassification)
    ).length;
    
    // Score: 2 points per keyword (max 6), 4 points per phrase (max 4)
    technicalDepthScore = Math.min(10, (keywordMatches * 2) + (phraseMatches * 4));
  }
  
  console.log(`\n🎯 === MODE CLASSIFICATION START ===`);
  console.log(`   Original Query: "${query}"`);
  console.log(`   Resolved Query: "${queryForClassification}"`);
  console.log(`   Enable Browsing: ${enableBrowsing}`);
  console.log(`   Technical Depth Required: ${needsTechnicalDepth} (score: ${technicalDepthScore}/10)`);
  
  // PRIORITY 1: User explicitly enabled online research toggle → research mode
  if (enableBrowsing) {
    console.log(`   ✅ PRIORITY 1: Research toggle enabled`);
    console.log(`   🔬 RESEARCH MODE: User enabled browsing (Tavily deep research)`);
    console.log(`   === MODE CLASSIFICATION END: RESEARCH ===\n`);
    return {
      mode: 'research',
      preserveFleetcoreContext: true,
      enrichQuery: true,
      isHybrid: false,
      resolvedQuery,
      requiresTechnicalDepth: needsTechnicalDepth,
      technicalDepthScore
    };
  }
  
  // PRIORITY 2: System organization queries → knowledge mode (LLM training data)
  if (isSystemOrganizationQuery(queryForClassification)) {
    console.log(`   ✅ PRIORITY 2: System organization query detected`);
    console.log(`   🎯 KNOWLEDGE MODE: Training data (system organization)`);
    console.log(`   === MODE CLASSIFICATION END: KNOWLEDGE ===\n`);
    return {
      mode: 'none',
      preserveFleetcoreContext: false,
      enrichQuery: false,
      isHybrid: false,
      resolvedQuery,
      requiresTechnicalDepth: false,
      technicalDepthScore: 0
    };
  }
  
  // PRIORITY 3: "How to" queries → knowledge mode (LLM training data)
  if (isHowToQuery(queryForClassification)) {
    console.log(`   ✅ PRIORITY 3: How-to query detected`);
    console.log(`   🎯 KNOWLEDGE MODE: Training data (how-to)`);
    console.log(`   === MODE CLASSIFICATION END: KNOWLEDGE ===\n`);
    return {
      mode: 'none',
      preserveFleetcoreContext: false,
      enrichQuery: false,
      isHybrid: false,
      resolvedQuery,
      requiresTechnicalDepth: false,
      technicalDepthScore: 0
    };
  }
  
  // PRIORITY 4: Check for platform vs entity queries
  // CRITICAL: Use resolved query AND check if we have entity context from memory
  const isPlatform = isPlatformQuery(queryForClassification);
  const hasEntity = hasEntityMention(queryForClassification) || resolvedQuery.hasContext;
  
  console.log(`   🔍 PRIORITY 4: Platform/Entity Detection`);
  console.log(`      Platform Query: ${isPlatform}`);
  console.log(`      Has Entity: ${hasEntity}`);
  
  // Pure platform query without entities → knowledge mode
  if (isPlatform && !hasEntity) {
    console.log(`   ✅ Pure platform query (no entities)`);
    console.log(`   🎯 KNOWLEDGE MODE: Training data (platform only)`);
    console.log(`   === MODE CLASSIFICATION END: KNOWLEDGE ===\n`);
    return {
      mode: 'none',
      preserveFleetcoreContext: false,
      enrichQuery: false,
      isHybrid: false,
      resolvedQuery,
      requiresTechnicalDepth: false,
      technicalDepthScore: 0
    };
  }
  
  // CRITICAL: Technical depth + entity → Consider forcing research mode for comprehensive analysis
  // Example: "tell me more details about the engines - maintenance, reports and specifics"
  if (needsTechnicalDepth && hasEntity && technicalDepthScore >= 6) {
    console.log(`   ✅ HIGH TECHNICAL DEPTH with entity (score: ${technicalDepthScore}/10)`);
    console.log(`   🔬 FORCING RESEARCH MODE: Technical depth requires comprehensive analysis`);
    console.log(`   === MODE CLASSIFICATION END: RESEARCH (TECHNICAL DEPTH) ===\n`);
    return {
      mode: 'research',
      preserveFleetcoreContext: true,
      enrichQuery: true,
      isHybrid: false,
      resolvedQuery,
      requiresTechnicalDepth: true,
      technicalDepthScore
    };
  }
  
  // HYBRID MODE: Platform + entity → verification with context injection
  // Example: "How can fleetcore PMS support vessel Dynamic 17?"
  if (isPlatform && hasEntity) {
    console.log(`   ✅ HYBRID QUERY: Platform + Entity detected`);
    console.log(`   🔮 VERIFICATION MODE: Gemini grounding (hybrid - will inject fleetcore context)`);
    console.log(`   === MODE CLASSIFICATION END: VERIFICATION (HYBRID) ===\n`);
    return {
      mode: 'verification',
      preserveFleetcoreContext: true,
      enrichQuery: true,
      isHybrid: true,
      resolvedQuery,
      requiresTechnicalDepth: needsTechnicalDepth,
      technicalDepthScore
    };
  }
  
  // Check if user is evaluating fleetcore (from session memory)
  const isEvaluationIntent = sessionMemory?.userIntent?.includes('evaluating fleetcore') || false;
  
  if (isEvaluationIntent && hasEntity) {
    console.log(`   ✅ Evaluation intent detected with entity`);
    console.log(`   🔮 VERIFICATION MODE: Gemini grounding (evaluation context)`);
    console.log(`   === MODE CLASSIFICATION END: VERIFICATION (EVALUATION) ===\n`);
    return {
      mode: 'verification',
      preserveFleetcoreContext: true,
      enrichQuery: true,
      isHybrid: true,
      resolvedQuery,
      requiresTechnicalDepth: needsTechnicalDepth,
      technicalDepthScore
    };
  }
  
  // DEFAULT: Maritime entity queries → verification mode (Gemini grounding)
  // Check if conversation already has fleetcore context
  const hasFleetcoreContext = (sessionMemory?.accumulatedKnowledge?.fleetcoreFeatures?.length || 0) > 0;
  
  console.log(`   ✅ DEFAULT: Entity query (no platform keywords)`);
  console.log(`   🔮 VERIFICATION MODE: Default for entity queries (Gemini grounding)`);
  console.log(`   Fleetcore context available: ${hasFleetcoreContext}`);
  console.log(`   Will preserve context: ${hasFleetcoreContext}`);
  console.log(`   Technical depth: ${needsTechnicalDepth} (score: ${technicalDepthScore}/10)`);
  console.log(`   === MODE CLASSIFICATION END: VERIFICATION (DEFAULT) ===\n`);
  
  return {
    mode: 'verification',
    preserveFleetcoreContext: hasFleetcoreContext,
    enrichQuery: hasFleetcoreContext && hasEntity,
    isHybrid: false,
    resolvedQuery,
    requiresTechnicalDepth: needsTechnicalDepth,
    technicalDepthScore
  };
}

// =====================
// CONTEXT ENRICHMENT HELPERS
// =====================

/**
 * Build fleetcore context section for verification/research queries
 * Injects previously discussed features and entities into queries
 * (Replicated from legacy agent)
 * 
 * @param sessionMemory - Session memory with accumulated knowledge
 * @returns Context string to prepend to queries
 */
export function buildFleetcoreContext(
  sessionMemory?: {
    accumulatedKnowledge?: {
      fleetcoreFeatures?: Array<{ name: string; explanation: string }>;
      vesselEntities?: Record<string, any>;
      companyEntities?: Record<string, any>;
    };
    conversationTopic?: string;
    userIntent?: string;
  }
): string {
  if (!sessionMemory?.accumulatedKnowledge?.fleetcoreFeatures?.length) {
    return '';
  }
  
  const knowledge = sessionMemory.accumulatedKnowledge;
  let context = '\n\n=== CONVERSATION CONTEXT ===\n';
  
  // Add fleetcore features discussed
  if (knowledge.fleetcoreFeatures && knowledge.fleetcoreFeatures.length > 0) {
    context += `\nFleetcore features discussed:\n`;
    knowledge.fleetcoreFeatures.slice(0, 5).forEach((feature, idx) => {
      context += `${idx + 1}. ${feature.name}: ${feature.explanation}\n`;
    });
  }
  
  // Add vessel entities
  const vesselNames = Object.keys(knowledge.vesselEntities || {});
  if (vesselNames.length > 0) {
    context += `\nVessels discussed: ${vesselNames.join(', ')}\n`;
  }
  
  // Add company entities
  const companyNames = Object.keys(knowledge.companyEntities || {});
  if (companyNames.length > 0) {
    context += `\nCompanies discussed: ${companyNames.join(', ')}\n`;
  }
  
  // Add conversation topic if available
  if (sessionMemory.conversationTopic) {
    context += `\nConversation topic: ${sessionMemory.conversationTopic}\n`;
  }
  
  // Add user intent if available
  if (sessionMemory.userIntent) {
    context += `\nUser intent: ${sessionMemory.userIntent}\n`;
  }
  
  return context;
}

/**
 * Enrich query with fleetcore context for better search results
 * Used in hybrid queries to inject fleetcore knowledge into Gemini searches
 * (Replicated from legacy agent)
 * 
 * @param query - Original user query
 * @param sessionMemory - Session memory with accumulated knowledge
 * @returns Enriched query string
 */
export function enrichQueryWithContext(
  query: string,
  sessionMemory?: {
    accumulatedKnowledge?: {
      fleetcoreFeatures?: Array<{ name: string; explanation: string }>;
      vesselEntities?: Record<string, any>;
      companyEntities?: Record<string, any>;
    };
  }
): string {
  if (!sessionMemory?.accumulatedKnowledge?.fleetcoreFeatures?.length) {
    return query;
  }
  
  const features = sessionMemory.accumulatedKnowledge.fleetcoreFeatures
    .map((f: any) => f.name)
    .slice(0, 5)
    .join(', ');
  
  // Build enriched query with context prefix
  const contextPrefix = `[Context: User is evaluating fleetcore maritime maintenance system with features: ${features}] `;
  
  return contextPrefix + query;
}

// =====================
// LOGGING HELPERS
// =====================

/**
 * Generate detailed classification log for debugging
 * 
 * @param query - User query string
 * @param classification - Classification result object
 * @param enableBrowsing - Whether browsing is enabled
 * @returns Formatted log string
 */
export function generateClassificationLog(
  query: string,
  classification: QueryClassification,
  enableBrowsing: boolean
): string {
  const isPlatform = isPlatformQuery(query);
  const hasEntity = hasEntityMention(query);
  const isHowTo = isHowToQuery(query);
  const isSystemOrg = isSystemOrganizationQuery(query);
  
  const modeEmoji = {
    'none': '🎯',
    'verification': '🔮',
    'research': '📚'
  };
  
  const modeDescription = {
    'none': 'KNOWLEDGE MODE - Training data',
    'verification': 'VERIFICATION MODE - Gemini grounding',
    'research': 'RESEARCH MODE - Deep multi-source'
  };
  
  let log = `\n${modeEmoji[classification.mode]} MODE CLASSIFICATION\n`;
  log += `   Query: "${query.substring(0, 80)}${query.length > 80 ? '...' : ''}"\n`;
  log += `   Mode: ${modeDescription[classification.mode]}\n`;
  log += `   \n`;
  log += `   Detection Flags:\n`;
  log += `   - Browsing enabled: ${enableBrowsing}\n`;
  log += `   - Platform query: ${isPlatform}\n`;
  log += `   - Entity mention: ${hasEntity}\n`;
  log += `   - How-to query: ${isHowTo}\n`;
  log += `   - System organization: ${isSystemOrg}\n`;
  log += `   \n`;
  log += `   Context Flags:\n`;
  log += `   - Preserve fleetcore context: ${classification.preserveFleetcoreContext}\n`;
  log += `   - Enrich query: ${classification.enrichQuery}\n`;
  log += `   - Is hybrid query: ${classification.isHybrid}\n`;
  
  return log;
}

