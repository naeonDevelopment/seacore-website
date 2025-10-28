/**
 * BASESTORE INTEGRATION LAYER
 * Connects CloudflareBaseStore with LangGraph agent
 * Manages session<->persistent memory synchronization
 */

import { CloudflareBaseStore } from './cloudflare-store';
import type { SessionMemory } from '../session-memory';

export interface StoreIntegrationConfig {
  store: CloudflareBaseStore;
  sessionMemory: SessionMemory;
  userId: string;
  sessionId: string;
}

/**
 * Sync session memory to persistent store
 * Called after each conversation turn
 */
export async function syncSessionToStore(config: StoreIntegrationConfig): Promise<void> {
  const { store, sessionMemory, userId, sessionId } = config;
  
  console.log(`🔄 Syncing session ${sessionId} to persistent store...`);
  
  try {
    // 1. Store vessel entities
    const vesselEntities = sessionMemory.accumulatedKnowledge?.vesselEntities || {};
    for (const [key, vessel] of Object.entries(vesselEntities)) {
      if (!vessel || typeof vessel !== 'object') continue;
      
      await store.put(
        [userId, 'entities'],
        `vessel:${key}`,
        {
          name: vessel.name || key,
          type: 'vessel',
          imo: vessel.imo,
          operator: vessel.operator,
          vesselType: vessel.type,
          specs: vessel.specs,
          sessionId,
          sessions: [sessionId],
        }
      );
    }
    
    // 2. Store company entities
    const companyEntities = sessionMemory.accumulatedKnowledge?.companyEntities || {};
    for (const [key, company] of Object.entries(companyEntities)) {
      if (!company || typeof company !== 'object') continue;
      
      await store.put(
        [userId, 'entities'],
        `company:${key}`,
        {
          name: company.name || key,
          type: 'company',
          companyType: company.companyContext || 'maritime',
          fleet: company.fleet,
          sessionId,
          sessions: [sessionId],
        }
      );
    }
    
    // 3. Store conversation summary (if substantial)
    if (sessionMemory.messageCount && sessionMemory.messageCount >= 5) {
      await store.put(
        [userId, 'memories'],
        sessionId,
        {
          session_id: sessionId,
          summary: sessionMemory.conversationSummary || '',
          topics: sessionMemory.accumulatedKnowledge?.discussedTopics || [],
          entities: [
            ...Object.keys(vesselEntities),
            ...Object.keys(companyEntities)
          ],
          start_time: Date.now() - (sessionMemory.messageCount * 60000), // Approximate
          end_time: Date.now(),
          message_count: sessionMemory.messageCount,
        }
      );
    }
    
    console.log(`   ✅ Session synced successfully`);
    console.log(`   Vessels: ${Object.keys(vesselEntities).length}`);
    console.log(`   Companies: ${Object.keys(companyEntities).length}`);
    
  } catch (error) {
    console.error('❌ Failed to sync session to store:', error);
    // Non-critical failure, continue
  }
}

/**
 * Load cross-session context for current query
 * Enriches session memory with relevant past conversations
 */
export async function loadCrossSessionContext(
  store: CloudflareBaseStore,
  userId: string,
  currentQuery: string,
  sessionMemory: SessionMemory
): Promise<{
  relevantEntities: any[];
  relevantMemories: any[];
  contextEnrichment: string;
}> {
  
  console.log(`🔍 Loading cross-session context for: "${currentQuery}"`);
  
  try {
    // 1. Search for relevant entities
    const entityResults = await store.search(
      [userId, 'entities'],
      { query: currentQuery, limit: 3, minScore: 0.75 }
    );
    
    // 2. Search for relevant past conversations
    const memoryResults = await store.search(
      [userId, 'memories'],
      { query: currentQuery, limit: 2, minScore: 0.75 }
    );
    
    console.log(`   Found ${entityResults.length} relevant entities from past sessions`);
    console.log(`   Found ${memoryResults.length} relevant past conversations`);
    
    // 3. Build context enrichment string
    const contextParts: string[] = [];
    
    if (entityResults.length > 0) {
      contextParts.push('ENTITIES FROM PAST SESSIONS:');
      for (const result of entityResults) {
        const entity = result.value;
        if (entity.type === 'vessel') {
          contextParts.push(
            `- ${entity.name} (Vessel)${entity.imo ? ` | IMO: ${entity.imo}` : ''}` +
            `${entity.operator ? ` | Operator: ${entity.operator}` : ''}`
          );
        } else if (entity.type === 'company') {
          contextParts.push(`- ${entity.name} (${entity.companyType || 'Company'})`);
        }
      }
    }
    
    if (memoryResults.length > 0) {
      contextParts.push('\nRELEVANT PAST CONVERSATIONS:');
      for (const result of memoryResults) {
        const memory = result.value;
        contextParts.push(`- ${memory.summary}`);
        if (memory.topics && memory.topics.length > 0) {
          contextParts.push(`  Topics: ${memory.topics.join(', ')}`);
        }
      }
    }
    
    return {
      relevantEntities: entityResults.map(r => r.value),
      relevantMemories: memoryResults.map(r => r.value),
      contextEnrichment: contextParts.join('\n'),
    };
    
  } catch (error) {
    console.error('❌ Failed to load cross-session context:', error);
    return {
      relevantEntities: [],
      relevantMemories: [],
      contextEnrichment: '',
    };
  }
}

/**
 * Initialize user profile if doesn't exist
 */
export async function initializeUser(
  store: CloudflareBaseStore,
  userId: string
): Promise<void> {
  
  try {
    const d1 = (store as any).d1;
    if (!d1) return;
    
    await d1
      .prepare(`
        INSERT INTO users (user_id, created_at, last_active, total_interactions, total_sessions)
        VALUES (?, ?, ?, 0, 0)
        ON CONFLICT(user_id) DO UPDATE SET
          last_active = excluded.last_active,
          total_interactions = total_interactions + 1
      `)
      .bind(userId, Date.now(), Date.now())
      .run();
    
    console.log(`👤 User ${userId} initialized/updated`);
    
  } catch (error) {
    console.error('❌ Failed to initialize user:', error);
  }
}

/**
 * Update session count for user
 */
export async function updateSessionCount(
  store: CloudflareBaseStore,
  userId: string
): Promise<void> {
  
  try {
    const d1 = (store as any).d1;
    if (!d1) return;
    
    await d1
      .prepare(`
        UPDATE users 
        SET total_sessions = total_sessions + 1, last_active = ?
        WHERE user_id = ?
      `)
      .bind(Date.now(), userId)
      .run();
    
  } catch (error) {
    console.error('❌ Failed to update session count:', error);
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(
  store: CloudflareBaseStore,
  userId: string
): Promise<{
  totalInteractions: number;
  totalSessions: number;
  entityCount: number;
  lastActive: number;
} | null> {
  
  try {
    const d1 = (store as any).d1;
    if (!d1) return null;
    
    const user = await d1
      .prepare('SELECT * FROM users WHERE user_id = ?')
      .bind(userId)
      .first();
    
    if (!user) return null;
    
    const entityCount = await d1
      .prepare('SELECT COUNT(*) as count FROM entities WHERE user_id = ?')
      .bind(userId)
      .first();
    
    return {
      totalInteractions: user.total_interactions || 0,
      totalSessions: user.total_sessions || 0,
      entityCount: (entityCount as any)?.count || 0,
      lastActive: user.last_active || 0,
    };
    
  } catch (error) {
    console.error('❌ Failed to get user stats:', error);
    return null;
  }
}

