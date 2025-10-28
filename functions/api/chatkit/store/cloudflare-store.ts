/**
 * CLOUDFLARE BASE STORE
 * LangGraph-compatible semantic memory system using D1 + Vectorize
 * 
 * Features:
 * - Cross-session entity memory
 * - Semantic search with vector embeddings
 * - User-level persistent storage
 * - Namespace isolation for data organization
 */

// Cloudflare types
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<D1ExecResult>;
  }

  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run<T = unknown>(): Promise<D1Result<T>>;
    all<T = unknown>(): Promise<D1Result<T>>;
  }

  interface D1Result<T = unknown> {
    results?: T[];
    success: boolean;
    error?: string;
    meta: {
      duration: number;
      rows_read: number;
      rows_written: number;
    };
  }

  interface D1ExecResult {
    count: number;
    duration: number;
  }

  interface VectorizeIndex {
    query(vector: number[], options?: {
      topK?: number;
      namespace?: string;
      filter?: Record<string, any>;
    }): Promise<VectorizeMatches>;
    
    insert(vectors: Array<{
      id: string;
      values: number[];
      namespace?: string;
      metadata?: Record<string, any>;
    }>): Promise<{ count: number }>;
    
    upsert(vectors: Array<{
      id: string;
      values: number[];
      namespace?: string;
      metadata?: Record<string, any>;
    }>): Promise<{ count: number }>;
  }

  interface VectorizeMatches {
    matches: Array<{
      id: string;
      score: number;
      namespace?: string;
      metadata?: Record<string, any>;
    }>;
    count: number;
  }

  interface Ai {
    run(model: string, inputs: any): Promise<any>;
  }
}

export interface CloudflareStoreConfig {
  d1: D1Database;
  vectorize?: VectorizeIndex;
  ai?: Ai;
}

export interface StoreSearchOptions {
  query: string;
  limit?: number;
  filter?: Record<string, any>;
  minScore?: number;
}

export interface StoreItem {
  key: string;
  value: any;
  namespace: string[];
  score?: number;
  metadata?: {
    created_at?: number;
    updated_at?: number;
    mention_count?: number;
  };
}

export interface EntityAttributes {
  name: string;
  type: string;
  imo?: string;
  mmsi?: string;
  operator?: string;
  flag?: string;
  built?: number;
  specs?: Record<string, any>;
  [key: string]: any;
}

/**
 * Cloudflare-native BaseStore implementation
 * Compatible with LangGraph's BaseStore interface
 */
export class CloudflareBaseStore {
  private d1: D1Database;
  private vectorize?: VectorizeIndex;
  private ai?: Ai;
  
  constructor(config: CloudflareStoreConfig) {
    this.d1 = config.d1;
    this.vectorize = config.vectorize;
    this.ai = config.ai;
  }
  
  /**
   * SEMANTIC SEARCH - Core capability
   * Searches across user memories using vector similarity
   * 
   * @param namespace - [userId, category] e.g., ["user123", "entities"]
   * @param options - Search parameters with query string
   * @returns Array of matching items with similarity scores
   */
  async search(
    namespace: string[], 
    options: StoreSearchOptions
  ): Promise<StoreItem[]> {
    
    const [userId, category] = namespace;
    const limit = options.limit || 5;
    const minScore = options.minScore || 0.7;
    
    console.log(`🔍 CloudflareStore.search: ${category} for user ${userId}`);
    console.log(`   Query: "${options.query}"`);
    
    // If no Vectorize/AI, fall back to text search
    if (!this.vectorize || !this.ai) {
      console.warn('⚠️ Vectorize/AI not available, using text search fallback');
      return this.textSearch(namespace, options);
    }
    
    try {
      // Generate query embedding
      const embeddingResult = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
        text: [options.query]
      });
      
      const queryEmbedding = embeddingResult.data[0];
      
      console.log(`   Generated embedding (${queryEmbedding.length} dimensions)`);
      
      // Vector similarity search
      const vectorResults = await this.vectorize.query(queryEmbedding, {
        topK: limit * 2, // Get more for filtering
        namespace: `${userId}:${category}`,
      });
      
      console.log(`   Found ${vectorResults.matches.length} vector matches`);
      
      // Fetch full entities from D1
      const results: StoreItem[] = [];
      
      for (const match of vectorResults.matches) {
        if (match.score < minScore) continue;
        
        const entityId = match.id.split(':').pop(); // Extract entity ID from "userId:category:id"
        
        if (category === 'entities') {
          const entity = await this.d1
            .prepare('SELECT * FROM entities WHERE id = ? AND user_id = ?')
            .bind(entityId, userId)
            .first<any>();
          
          if (entity) {
            results.push({
              key: entity.id,
              value: JSON.parse(entity.attributes),
              namespace,
              score: match.score,
              metadata: {
                created_at: entity.first_mentioned,
                updated_at: entity.last_mentioned,
                mention_count: entity.mention_count,
              }
            });
          }
        } else if (category === 'memories') {
          const memory = await this.d1
            .prepare('SELECT * FROM conversation_summaries WHERE id = ? AND user_id = ?')
            .bind(entityId, userId)
            .first<any>();
          
          if (memory) {
            results.push({
              key: memory.id,
              value: {
                summary: memory.summary,
                topics: JSON.parse(memory.topics || '[]'),
                entities: JSON.parse(memory.entities_discussed || '[]'),
                session_id: memory.session_id,
              },
              namespace,
              score: match.score,
              metadata: {
                created_at: memory.start_time,
                updated_at: memory.end_time,
              }
            });
          }
        }
      }
      
      console.log(`   ✅ Returning ${results.length} results`);
      return results.slice(0, limit);
      
    } catch (error) {
      console.error('❌ Vector search failed:', error);
      // Fallback to text search
      return this.textSearch(namespace, options);
    }
  }
  
  /**
   * Fallback text search when vector search unavailable
   */
  private async textSearch(
    namespace: string[], 
    options: StoreSearchOptions
  ): Promise<StoreItem[]> {
    
    const [userId, category] = namespace;
    const limit = options.limit || 5;
    const searchQuery = `%${options.query.toLowerCase()}%`;
    
    if (category === 'entities') {
      const results = await this.d1
        .prepare(`
          SELECT * FROM entities 
          WHERE user_id = ? 
          AND (LOWER(entity_name) LIKE ? OR LOWER(attributes) LIKE ?)
          ORDER BY last_mentioned DESC
          LIMIT ?
        `)
        .bind(userId, searchQuery, searchQuery, limit)
        .all<any>();
      
      return (results.results || []).map(entity => ({
        key: entity.id,
        value: JSON.parse(entity.attributes),
        namespace,
        metadata: {
          created_at: entity.first_mentioned,
          updated_at: entity.last_mentioned,
          mention_count: entity.mention_count,
        }
      }));
    } else if (category === 'memories') {
      const results = await this.d1
        .prepare(`
          SELECT * FROM conversation_summaries 
          WHERE user_id = ? 
          AND (LOWER(summary) LIKE ? OR LOWER(topics) LIKE ?)
          ORDER BY end_time DESC
          LIMIT ?
        `)
        .bind(userId, searchQuery, searchQuery, limit)
        .all<any>();
      
      return (results.results || []).map(memory => ({
        key: memory.id,
        value: {
          summary: memory.summary,
          topics: JSON.parse(memory.topics || '[]'),
          entities: JSON.parse(memory.entities_discussed || '[]'),
          session_id: memory.session_id,
        },
        namespace,
        metadata: {
          created_at: memory.start_time,
          updated_at: memory.end_time,
        }
      }));
    }
    
    return [];
  }
  
  /**
   * PUT - Store entity/memory with automatic vectorization
   * 
   * @param namespace - [userId, category]
   * @param key - Unique identifier
   * @param value - Data to store (will be JSON serialized)
   */
  async put(
    namespace: string[], 
    key: string, 
    value: Record<string, any>
  ): Promise<void> {
    
    const [userId, category] = namespace;
    const now = Date.now();
    
    console.log(`💾 CloudflareStore.put: ${category}/${key} for user ${userId}`);
    
    if (category === 'entities') {
      await this.putEntity(userId, key, value as EntityAttributes, now);
    } else if (category === 'memories') {
      await this.putMemory(userId, key, value, now);
    } else {
      // Generic key-value store
      await this.d1
        .prepare(`
          INSERT INTO memory_store (namespace, key, value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(namespace, key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        `)
        .bind(
          namespace.join(':'),
          key,
          JSON.stringify(value),
          now,
          now
        )
        .run();
    }
    
    console.log(`   ✅ Stored successfully`);
  }
  
  /**
   * Store entity with vectorization
   */
  private async putEntity(
    userId: string,
    key: string,
    value: EntityAttributes,
    now: number
  ): Promise<void> {
    
    // Store in D1
    const sessionId = value.sessionId || 'unknown';
    const sessions = value.sessions || [sessionId];
    
    await this.d1
      .prepare(`
        INSERT INTO entities (
          id, user_id, entity_name, entity_type, attributes,
          first_mentioned, last_mentioned, sessions, mention_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(user_id, entity_name, entity_type) DO UPDATE SET
          attributes = excluded.attributes,
          last_mentioned = excluded.last_mentioned,
          mention_count = mention_count + 1,
          sessions = json_insert(sessions, '$[#]', ?)
      `)
      .bind(
        key,
        userId,
        value.name,
        value.type,
        JSON.stringify(value),
        now,
        now,
        JSON.stringify(sessions),
        sessionId
      )
      .run();
    
    // Generate and store vector embedding
    if (this.vectorize && this.ai) {
      await this.vectorizeEntity(userId, key, value);
    }
  }
  
  /**
   * Store conversation memory with vectorization
   */
  private async putMemory(
    userId: string,
    key: string,
    value: Record<string, any>,
    now: number
  ): Promise<void> {
    
    await this.d1
      .prepare(`
        INSERT INTO conversation_summaries (
          id, user_id, session_id, summary, topics, entities_discussed,
          start_time, end_time, message_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          summary = excluded.summary,
          topics = excluded.topics,
          entities_discussed = excluded.entities_discussed,
          end_time = excluded.end_time,
          message_count = excluded.message_count
      `)
      .bind(
        key,
        userId,
        value.session_id || 'unknown',
        value.summary || '',
        JSON.stringify(value.topics || []),
        JSON.stringify(value.entities || []),
        value.start_time || now,
        value.end_time || now,
        value.message_count || 0
      )
      .run();
    
    // Generate and store vector embedding
    if (this.vectorize && this.ai && value.summary) {
      await this.vectorizeMemory(userId, key, value.summary);
    }
  }
  
  /**
   * Generate and store vector embedding for entity
   */
  private async vectorizeEntity(
    userId: string,
    entityId: string,
    entity: EntityAttributes
  ): Promise<void> {
    
    try {
      // Build text representation for embedding
      const textParts: string[] = [
        entity.name,
        entity.type,
      ];
      
      if (entity.operator) textParts.push(`operated by ${entity.operator}`);
      if (entity.imo) textParts.push(`IMO ${entity.imo}`);
      if (entity.flag) textParts.push(`flag ${entity.flag}`);
      if (entity.specs) {
        textParts.push(Object.entries(entity.specs).map(([k, v]) => `${k}: ${v}`).join(', '));
      }
      
      const text = textParts.join(' ');
      
      // Generate embedding
      const result = await this.ai!.run('@cf/baai/bge-base-en-v1.5', {
        text: [text]
      });
      
      // Store in Vectorize
      await this.vectorize!.upsert([{
        id: `${userId}:entities:${entityId}`,
        values: result.data[0],
        namespace: `${userId}:entities`,
        metadata: {
          entity_name: entity.name,
          entity_type: entity.type,
        }
      }]);
      
      console.log(`   🔮 Vectorized entity: ${entity.name}`);
      
    } catch (error) {
      console.error('❌ Vectorization failed:', error);
      // Non-critical, continue without vector
    }
  }
  
  /**
   * Generate and store vector embedding for memory
   */
  private async vectorizeMemory(
    userId: string,
    memoryId: string,
    summary: string
  ): Promise<void> {
    
    try {
      const result = await this.ai!.run('@cf/baai/bge-base-en-v1.5', {
        text: [summary]
      });
      
      await this.vectorize!.upsert([{
        id: `${userId}:memories:${memoryId}`,
        values: result.data[0],
        namespace: `${userId}:memories`,
      }]);
      
      console.log(`   🔮 Vectorized memory summary`);
      
    } catch (error) {
      console.error('❌ Vectorization failed:', error);
    }
  }
  
  /**
   * GET - Retrieve specific item by key
   */
  async get(namespace: string[], key: string): Promise<StoreItem | null> {
    const [userId, category] = namespace;
    
    if (category === 'entities') {
      const entity = await this.d1
        .prepare('SELECT * FROM entities WHERE id = ? AND user_id = ?')
        .bind(key, userId)
        .first<any>();
      
      if (!entity) return null;
      
      return {
        key: entity.id,
        value: JSON.parse(entity.attributes),
        namespace,
        metadata: {
          created_at: entity.first_mentioned,
          updated_at: entity.last_mentioned,
          mention_count: entity.mention_count,
        }
      };
    } else if (category === 'memories') {
      const memory = await this.d1
        .prepare('SELECT * FROM conversation_summaries WHERE id = ? AND user_id = ?')
        .bind(key, userId)
        .first<any>();
      
      if (!memory) return null;
      
      return {
        key: memory.id,
        value: {
          summary: memory.summary,
          topics: JSON.parse(memory.topics || '[]'),
          entities: JSON.parse(memory.entities_discussed || '[]'),
        },
        namespace,
        metadata: {
          created_at: memory.start_time,
          updated_at: memory.end_time,
        }
      };
    } else {
      // Generic key-value
      const item = await this.d1
        .prepare('SELECT * FROM memory_store WHERE namespace = ? AND key = ?')
        .bind(namespace.join(':'), key)
        .first<any>();
      
      if (!item) return null;
      
      return {
        key: item.key,
        value: JSON.parse(item.value),
        namespace: item.namespace.split(':'),
        metadata: {
          created_at: item.created_at,
          updated_at: item.updated_at,
        }
      };
    }
  }
  
  /**
   * DELETE - Remove item by key
   */
  async delete(namespace: string[], key: string): Promise<void> {
    const [userId, category] = namespace;
    
    if (category === 'entities') {
      await this.d1
        .prepare('DELETE FROM entities WHERE id = ? AND user_id = ?')
        .bind(key, userId)
        .run();
    } else if (category === 'memories') {
      await this.d1
        .prepare('DELETE FROM conversation_summaries WHERE id = ? AND user_id = ?')
        .bind(key, userId)
        .run();
    } else {
      await this.d1
        .prepare('DELETE FROM memory_store WHERE namespace = ? AND key = ?')
        .bind(namespace.join(':'), key)
        .run();
    }
  }
  
  /**
   * LIST - Get all items in namespace
   */
  async list(namespace: string[], limit?: number): Promise<StoreItem[]> {
    const [userId, category] = namespace;
    const maxLimit = limit || 100;
    
    if (category === 'entities') {
      const results = await this.d1
        .prepare(`
          SELECT * FROM entities 
          WHERE user_id = ? 
          ORDER BY last_mentioned DESC
          LIMIT ?
        `)
        .bind(userId, maxLimit)
        .all<any>();
      
      return (results.results || []).map(entity => ({
        key: entity.id,
        value: JSON.parse(entity.attributes),
        namespace,
        metadata: {
          created_at: entity.first_mentioned,
          updated_at: entity.last_mentioned,
          mention_count: entity.mention_count,
        }
      }));
    } else if (category === 'memories') {
      const results = await this.d1
        .prepare(`
          SELECT * FROM conversation_summaries 
          WHERE user_id = ? 
          ORDER BY end_time DESC
          LIMIT ?
        `)
        .bind(userId, maxLimit)
        .all<any>();
      
      return (results.results || []).map(memory => ({
        key: memory.id,
        value: {
          summary: memory.summary,
          topics: JSON.parse(memory.topics || '[]'),
          entities: JSON.parse(memory.entities_discussed || '[]'),
        },
        namespace,
        metadata: {
          created_at: memory.start_time,
          updated_at: memory.end_time,
        }
      }));
    }
    
    return [];
  }
}

