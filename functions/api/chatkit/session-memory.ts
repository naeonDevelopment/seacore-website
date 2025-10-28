/**
 * CLOUDFLARE KV SESSION MEMORY MANAGER
 * Persistent conversation context across all modes (System Intelligence, Verification, Research)
 * 
 * Architecture:
 * - Store conversation topic, user intent, accumulated knowledge
 * - Persist mode history for context-aware routing
 * - Enable cross-mode knowledge integration
 */

import { BaseMessage } from "@langchain/core/messages";

// Cloudflare Workers types
declare global {
  interface KVNamespace {
    get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
    put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
  }
}

// =====================
// TYPE DEFINITIONS
// =====================

export interface FleetcoreFeature {
  name: string;
  explanation: string;
  messageIndex: number;
  timestamp: number;
}

export interface VesselEntity {
  name: string;
  imo?: string;
  type?: string;
  operator?: string;  // Operator/owner/management company
  specs?: Record<string, any>;
  discussed: boolean;
  firstMentioned: number;
}

export interface ConversationConnection {
  from: string;
  to: string;
  relationship: string;
  messageIndex: number;
}

export interface ModeTransition {
  mode: 'verification' | 'research' | 'none';
  query: string;
  timestamp: number;
  contextSnapshot: string;
  entitiesDiscussed: string[];
}

export interface SessionMemory {
  sessionId: string;
  
  // NATURAL LANGUAGE CONTEXT (GPT-readable narrative)
  conversationSummary: string;  // Free-form summary GPT can understand
  // Example: "User is learning about fleetcore PMS features (schedule tracking, dual-interval logic).
  //           Then asked about Dynamic 17 vessel (crew boat, IMO 9562752, operated by ABC Marine).
  //           Now exploring how to apply fleetcore to this specific vessel."
  
  // RECENT CHAT HISTORY (last 5-10 messages for immediate context)
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  
  // STRUCTURED KNOWLEDGE (for programmatic access - optional)
  accumulatedKnowledge: {
    fleetcoreFeatures: FleetcoreFeature[];
    vesselEntities: Record<string, VesselEntity>;
    companyEntities: Record<string, any>;
    connections: ConversationConnection[];
    discussedTopics: string[];
  };
  
  // Legacy fields (keep for backward compatibility)
  conversationTopic: string;          // "fleetcore PMS → vessel Dynamic 17"
  userIntent: string;                 // "evaluate PMS for specific vessel"
  modeHistory: ModeTransition[];
  currentMode: 'verification' | 'research' | 'none';
  
  // NEW: Conversation state tracking (Phase 2)
  conversationState?: string;         // ConversationState enum value
  intentHistory?: Array<any>;         // IntentEvolution tracking
  stateTransitions?: Array<any>;      // StateTransition tracking
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

// =====================
// SESSION MEMORY MANAGER
// =====================

export class SessionMemoryManager {
  private kv: KVNamespace;
  private cache: Map<string, SessionMemory> = new Map();
  
  constructor(kvNamespace: KVNamespace) {
    this.kv = kvNamespace;
  }
  
  /**
   * Load session memory from KV
   * Returns existing session or creates new one
   */
  async load(sessionId: string): Promise<SessionMemory> {
    console.log(`📦 Loading session memory: ${sessionId}`);
    
    // Check in-memory cache first
    if (this.cache.has(sessionId)) {
      console.log(`   ✅ Found in cache`);
      return this.cache.get(sessionId)!;
    }
    
    // Load from KV
    try {
      const data = await this.kv.get(`session:${sessionId}`, 'json') as SessionMemory | null;
      
      if (data) {
        console.log(`   ✅ Loaded from KV`);
        console.log(`      Topic: ${data.conversationTopic || 'none'}`);
        console.log(`      Intent: ${data.userIntent || 'none'}`);
        console.log(`      Messages: ${data.messageCount}`);
        console.log(`      Features: ${data.accumulatedKnowledge.fleetcoreFeatures.length}`);
        console.log(`      Vessels: ${Object.keys(data.accumulatedKnowledge.vesselEntities).length}`);
        
        this.cache.set(sessionId, data);
        return data;
      }
    } catch (error) {
      console.error(`   ❌ Error loading from KV:`, error);
    }
    
    // Create new session
    console.log(`   🆕 Creating new session memory`);
    const newMemory = this.createNew(sessionId);
    this.cache.set(sessionId, newMemory);
    return newMemory;
  }
  
  /**
   * Save session memory to KV
   */
  async save(sessionId: string, memory: SessionMemory): Promise<void> {
    memory.updatedAt = Date.now();
    
    // Update cache
    this.cache.set(sessionId, memory);
    
    // Save to KV with 7-day expiration
    try {
      await this.kv.put(
        `session:${sessionId}`,
        JSON.stringify(memory),
        {
          expirationTtl: 86400 * 7, // 7 days
        }
      );
      
      console.log(`💾 Saved session memory: ${sessionId}`);
      console.log(`   Topic: ${memory.conversationTopic}`);
      console.log(`   Intent: ${memory.userIntent}`);
      console.log(`   Message count: ${memory.messageCount}`);
    } catch (error) {
      console.error(`❌ Error saving to KV:`, error);
    }
  }
  
  /**
   * Update conversation topic (merges with existing)
   */
  updateTopic(memory: SessionMemory, newTopic: string): SessionMemory {
    if (!newTopic) return memory;
    
    const oldTopic = memory.conversationTopic;
    memory.conversationTopic = this.mergeTopic(oldTopic, newTopic);
    
    if (oldTopic !== memory.conversationTopic) {
      console.log(`📝 Topic updated: "${oldTopic}" → "${memory.conversationTopic}"`);
    }
    
    return memory;
  }
  
  /**
   * Update user intent
   */
  updateIntent(memory: SessionMemory, newIntent: string): SessionMemory {
    if (!newIntent || memory.userIntent === newIntent) return memory;
    
    console.log(`🎯 Intent updated: "${memory.userIntent}" → "${newIntent}"`);
    memory.userIntent = newIntent;
    
    return memory;
  }
  
  /**
   * Update conversation state (Phase 2)
   */
  updateConversationState(memory: SessionMemory, newState: string): void {
    if (memory.conversationState !== newState) {
      console.log(`🔄 State updated: "${memory.conversationState}" → "${newState}"`);
      memory.conversationState = newState;
    }
  }
  
  /**
   * Add intent evolution to history (Phase 2)
   */
  addIntentEvolution(memory: SessionMemory, intent: any): void {
    if (!memory.intentHistory) {
      memory.intentHistory = [];
    }
    memory.intentHistory.push(intent);
    // Keep last 10 intents
    if (memory.intentHistory.length > 10) {
      memory.intentHistory = memory.intentHistory.slice(-10);
    }
  }
  
  /**
   * Add state transition to history (Phase 2)
   */
  addStateTransition(memory: SessionMemory, transition: any): void {
    if (!memory.stateTransitions) {
      memory.stateTransitions = [];
    }
    memory.stateTransitions.push(transition);
    // Keep last 10 transitions
    if (memory.stateTransitions.length > 10) {
      memory.stateTransitions = memory.stateTransitions.slice(-10);
    }
  }
  
  /**
   * Update conversation summary with natural language context
   * Builds a GPT-readable narrative of what's been discussed
   */
  updateConversationSummary(memory: SessionMemory): SessionMemory {
    const parts: string[] = [];
    
    // Add topic evolution
    if (memory.conversationTopic) {
      parts.push(`Conversation has covered: ${memory.conversationTopic}.`);
    }
    
    // Add user intent
    if (memory.userIntent) {
      parts.push(`User's goal: ${memory.userIntent}.`);
    }
    
    // Add fleetcore features discussed
    const features = memory.accumulatedKnowledge.fleetcoreFeatures;
    if (features.length > 0) {
      const featureNames = features.slice(0, 5).map(f => f.name).join(', ');
      parts.push(`Discussed fleetcore features: ${featureNames}.`);
    }
    
    // Add vessels mentioned
    const vessels = Object.values(memory.accumulatedKnowledge.vesselEntities);
    if (vessels.length > 0) {
      const vesselSummaries = vessels.map((v: any) => {
        let summary = v.name;
        if (v.type) summary += ` (${v.type})`;
        if (v.imo) summary += ` IMO: ${v.imo}`;
        if (v.operator) summary += ` operated by ${v.operator}`;
        return summary;
      });
      parts.push(`Vessels discussed: ${vesselSummaries.join('; ')}.`);
    }
    
    // Add companies mentioned
    const companies = Object.values(memory.accumulatedKnowledge.companyEntities);
    if (companies.length > 0) {
      const companyNames = companies.map((c: any) => c.name).join(', ');
      parts.push(`Companies mentioned: ${companyNames}.`);
    }
    
    // Add general topics
    const topics = memory.accumulatedKnowledge.discussedTopics;
    if (topics.length > 0) {
      parts.push(`Other topics: ${topics.join(', ')}.`);
    }
    
    // Build the summary
    memory.conversationSummary = parts.join(' ');
    
    if (memory.conversationSummary) {
      console.log(`📝 Conversation summary updated: ${memory.conversationSummary.substring(0, 150)}...`);
    }
    
    return memory;
  }
  
  /**
   * Add fleetcore feature to accumulated knowledge
   */
  addFleetcoreFeature(
    memory: SessionMemory, 
    name: string, 
    explanation: string,
    messageIndex: number
  ): SessionMemory {
    // Check if already exists
    const exists = memory.accumulatedKnowledge.fleetcoreFeatures.some(
      f => f.name.toLowerCase() === name.toLowerCase()
    );
    
    if (!exists) {
      memory.accumulatedKnowledge.fleetcoreFeatures.push({
        name,
        explanation,
        messageIndex,
        timestamp: Date.now(),
      });
      
      console.log(`✨ Added fleetcore feature: ${name}`);
    }
    
    return memory;
  }
  
  /**
   * Add vessel entity to accumulated knowledge
   */
  addVesselEntity(
    memory: SessionMemory,
    name: string,
    details: Partial<VesselEntity>
  ): SessionMemory {
    const vesselKey = name.toLowerCase();
    
    if (!memory.accumulatedKnowledge.vesselEntities[vesselKey]) {
      memory.accumulatedKnowledge.vesselEntities[vesselKey] = {
        name,
        discussed: true,
        firstMentioned: Date.now(),
        ...details,
      };
      
      console.log(`🚢 Added vessel entity: ${name}`);
    } else {
      // Update existing
      memory.accumulatedKnowledge.vesselEntities[vesselKey] = {
        ...memory.accumulatedKnowledge.vesselEntities[vesselKey],
        ...details,
        discussed: true,
      };
      
      console.log(`🔄 Updated vessel entity: ${name}`);
    }
    
    return memory;
  }
  
  /**
   * Add company entity to accumulated knowledge
   */
  addCompanyEntity(
    memory: SessionMemory,
    name: string,
    details: Record<string, any>
  ): SessionMemory {
    const companyKey = name.toLowerCase();
    
    if (!memory.accumulatedKnowledge.companyEntities[companyKey]) {
      memory.accumulatedKnowledge.companyEntities[companyKey] = {
        name,
        discussed: true,
        firstMentioned: Date.now(),
        ...details,
      };
      
      console.log(`🏢 Added company entity: ${name}`);
    } else {
      // Update existing
      memory.accumulatedKnowledge.companyEntities[companyKey] = {
        ...memory.accumulatedKnowledge.companyEntities[companyKey],
        ...details,
        discussed: true,
      };
      
      console.log(`🔄 Updated company entity: ${name}`);
    }
    
    return memory;
  }
  
  /**
   * Add connection between topics
   */
  addConnection(
    memory: SessionMemory,
    from: string,
    to: string,
    relationship: string,
    messageIndex: number
  ): SessionMemory {
    // Check if connection already exists
    const exists = memory.accumulatedKnowledge.connections.some(
      c => c.from === from && c.to === to
    );
    
    if (!exists) {
      memory.accumulatedKnowledge.connections.push({
        from,
        to,
        relationship,
        messageIndex,
      });
      
      console.log(`🔗 Added connection: ${from} → ${to} (${relationship})`);
    }
    
    return memory;
  }
  
  /**
   * Add mode transition to history
   */
  addModeTransition(
    memory: SessionMemory,
    mode: 'verification' | 'research' | 'none',
    query: string,
    contextSnapshot: string,
    entitiesDiscussed: string[]
  ): SessionMemory {
    memory.modeHistory.push({
      mode,
      query,
      timestamp: Date.now(),
      contextSnapshot,
      entitiesDiscussed,
    });
    
    // Keep only last 5 transitions
    if (memory.modeHistory.length > 5) {
      memory.modeHistory = memory.modeHistory.slice(-5);
    }
    
    memory.currentMode = mode;
    
    console.log(`📊 Mode transition: ${mode} (history: ${memory.modeHistory.length})`);
    
    return memory;
  }
  
  /**
   * Add message to recent history
   */
  addMessage(
    memory: SessionMemory,
    role: 'user' | 'assistant',
    content: string
  ): SessionMemory {
    memory.recentMessages.push({
      role,
      content,
      timestamp: Date.now(),
    });
    
    // Keep only last 10 messages
    if (memory.recentMessages.length > 10) {
      memory.recentMessages = memory.recentMessages.slice(-10);
    }
    
    memory.messageCount++;
    
    return memory;
  }
  
  /**
   * Get fleetcore context summary for injection
   */
  getFleetcoreContext(memory: SessionMemory): string {
    if (memory.accumulatedKnowledge.fleetcoreFeatures.length === 0) {
      return '';
    }
    
    const features = memory.accumulatedKnowledge.fleetcoreFeatures
      .map(f => `- ${f.name}: ${f.explanation}`)
      .join('\n');
    
    const connections = memory.accumulatedKnowledge.connections
      .filter(c => c.from.toLowerCase().includes('fleetcore') || c.to.toLowerCase().includes('fleetcore'))
      .map(c => `- ${c.from} → ${c.to}: ${c.relationship}`)
      .join('\n');
    
    return `
=== PREVIOUSLY DISCUSSED FLEETCORE CONTEXT ===

Features Explained:
${features}

${connections ? `\nConnections:\n${connections}` : ''}

=== END FLEETCORE CONTEXT ===
`.trim();
  }
  
  /**
   * Check if conversation is about fleetcore
   */
  isFleetcoreConversation(memory: SessionMemory): boolean {
    const topicHasFleetcore = memory.conversationTopic.toLowerCase().includes('fleetcore') ||
                              memory.conversationTopic.toLowerCase().includes('pms') ||
                              memory.conversationTopic.toLowerCase().includes('maintenance');
    
    const hasFleetcoreFeatures = memory.accumulatedKnowledge.fleetcoreFeatures.length > 0;
    
    const recentFleetcoreMessages = memory.recentMessages
      .slice(-3)
      .some(m => 
        m.content.toLowerCase().includes('fleetcore') ||
        m.content.toLowerCase().includes('pms') ||
        m.content.toLowerCase().includes('maintenance')
      );
    
    return topicHasFleetcore || hasFleetcoreFeatures || recentFleetcoreMessages;
  }
  
  /**
   * Get vessel entities discussed
   */
  getVesselEntities(memory: SessionMemory): string[] {
    return Object.values(memory.accumulatedKnowledge.vesselEntities)
      .filter(v => v.discussed)
      .map(v => v.name);
  }
  
  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Create new session memory
   */
  private createNew(sessionId: string): SessionMemory {
    const now = Date.now();
    
    return {
      sessionId,
      conversationSummary: '', // Will be built as conversation progresses
      recentMessages: [],
      conversationTopic: '',
      userIntent: '',
      accumulatedKnowledge: {
        fleetcoreFeatures: [],
        vesselEntities: {},
        companyEntities: {},
        connections: [],
        discussedTopics: [],
      },
      modeHistory: [],
      currentMode: 'none',
      
      // NEW: Initialize conversation state tracking (Phase 2)
      conversationState: 'cold_start',
      intentHistory: [],
      stateTransitions: [],
      
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };
  }
  
  /**
   * Merge topics intelligently
   */
  private mergeTopic(current: string, update: string): string {
    if (!current) return update;
    if (!update) return current;
    if (current.includes(update)) return current;
    
    // Check if update extends current topic
    const currentLower = current.toLowerCase();
    const updateLower = update.toLowerCase();
    
    // If update is completely new topic, append with arrow
    if (!updateLower.includes(currentLower.split(' ')[0])) {
      return `${current} → ${update}`;
    }
    
    // If update extends current, replace
    return update;
  }
}

/**
 * Extract conversation topic from recent messages
 */
export function extractTopicFromMessages(messages: BaseMessage[]): string {
  if (messages.length === 0) return '';
  
  // Look at last 3 user messages
  const userMessages = messages
    .filter(m => m.constructor.name === 'HumanMessage')
    .slice(-3)
    .map(m => m.content as string);
  
  if (userMessages.length === 0) return '';
  
  // Extract key topics
  const topics: string[] = [];
  
  for (const msg of userMessages) {
    const msgLower = msg.toLowerCase();
    
    // Fleetcore features
    if (msgLower.includes('pms')) topics.push('PMS');
    if (msgLower.includes('maintenance')) topics.push('maintenance');
    if (msgLower.includes('scheduling')) topics.push('scheduling');
    if (msgLower.includes('fleetcore')) topics.push('fleetcore');
    
    // Vessels
    const vesselMatch = msg.match(/vessel\s+([A-Z][a-z]+\s*\d*)/i) || 
                        msg.match(/ship\s+([A-Z][a-z]+\s*\d*)/i) ||
                        msg.match(/\b([A-Z][a-z]+\s+\d+)\b/);
    if (vesselMatch) topics.push(vesselMatch[1]);
  }
  
  // Remove duplicates and join
  const uniqueTopics = [...new Set(topics)];
  return uniqueTopics.join(' → ');
}

