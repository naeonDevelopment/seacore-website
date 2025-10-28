/**
 * Query Classification Rules for Maritime Intelligence Agent
 * 
 * Defines rules for detecting knowledge mode queries (platform/system questions)
 * vs. queries that require external research or verification.
 * 
 * Knowledge Mode: Questions about fleetcore platform, features, and capabilities
 * Verification Mode: Questions about specific entities (vessels, companies, equipment)
 * Research Mode: Complex queries requiring multi-source research (enabled by user toggle)
 */

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
  
  return hasEntityKeyword || hasVesselPattern || hasIdentifierPattern;
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
 * Query classification result with mode and context metadata
 */
export interface QueryClassification {
  mode: 'none' | 'verification' | 'research';
  preserveFleetcoreContext: boolean;
  enrichQuery: boolean;
  isHybrid: boolean;
}

/**
 * Main query classification function (Enhanced from legacy agent)
 * Determines the appropriate mode and context preservation strategy
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
  }
): QueryClassification {
  
  // PRIORITY 1: User explicitly enabled online research → deep research mode
  if (enableBrowsing) {
    return {
      mode: 'research',
      preserveFleetcoreContext: true,
      enrichQuery: true,
      isHybrid: false
    };
  }
  
  // PRIORITY 2: System organization queries → knowledge mode
  if (isSystemOrganizationQuery(query)) {
    return {
      mode: 'none',
      preserveFleetcoreContext: false,
      enrichQuery: false,
      isHybrid: false
    };
  }
  
  // PRIORITY 3: "How to" queries → knowledge mode
  if (isHowToQuery(query)) {
    return {
      mode: 'none',
      preserveFleetcoreContext: false,
      enrichQuery: false,
      isHybrid: false
    };
  }
  
  // PRIORITY 4: Check for platform vs entity queries
  const isPlatform = isPlatformQuery(query);
  const hasEntity = hasEntityMention(query);
  
  // Pure platform query without entities → knowledge mode
  if (isPlatform && !hasEntity) {
    return {
      mode: 'none',
      preserveFleetcoreContext: false,
      enrichQuery: false,
      isHybrid: false
    };
  }
  
  // HYBRID MODE: Platform + entity → verification with context injection
  // Example: "How can fleetcore PMS support vessel Dynamic 17?"
  if (isPlatform && hasEntity) {
    return {
      mode: 'verification',
      preserveFleetcoreContext: true,
      enrichQuery: true,
      isHybrid: true
    };
  }
  
  // Check if user is evaluating fleetcore (from session memory)
  const isEvaluationIntent = sessionMemory?.userIntent?.includes('evaluating fleetcore') || false;
  
  if (isEvaluationIntent && hasEntity) {
    return {
      mode: 'verification',
      preserveFleetcoreContext: true,
      enrichQuery: true,
      isHybrid: true
    };
  }
  
  // DEFAULT: Maritime entity queries → verification mode
  // Check if conversation already has fleetcore context
  const hasFleetcoreContext = (sessionMemory?.accumulatedKnowledge?.fleetcoreFeatures?.length || 0) > 0;
  
  return {
    mode: 'verification',
    preserveFleetcoreContext: hasFleetcoreContext,
    enrichQuery: hasFleetcoreContext && hasEntity,
    isHybrid: false
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

