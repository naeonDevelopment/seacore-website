/**
 * ENTITY RESOLUTION SERVICE
 * Unified system for resolving pronouns and vague references to entities
 */

export interface Entity {
  id: string;
  name: string;
  type: 'vessel' | 'company' | 'equipment' | 'location';
  lastMentioned: number;
  mentionCount: number;
  attributes?: Record<string, any>;
}

export interface EntityContext {
  entities: Entity[];
  conversationFlow: string[]; // Ordered list of entity mentions
  currentFocus?: Entity; // Most likely referent for "it"
}

/**
 * Entity Resolver - Manages entity context graph
 */
export class EntityResolver {
  private entities: Map<string, Entity> = new Map();
  private conversationFlow: string[] = [];
  private pronounMap: Map<string, string[]> = new Map(); // pronoun -> possible entities
  
  /**
   * Add entity to resolution context
   */
  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
    this.conversationFlow.push(entity.id);
    
    // Update pronoun mappings
    this.updatePronounMappings(entity);
    
    console.log(`🔗 EntityResolver: Added ${entity.type} "${entity.name}"`);
  }
  
  /**
   * Update entity mention
   */
  updateEntity(entityId: string, updates: Partial<Entity>): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;
    
    Object.assign(entity, updates);
    entity.lastMentioned = Date.now();
    entity.mentionCount = (entity.mentionCount || 0) + 1;
    
    this.conversationFlow.push(entityId);
    this.updatePronounMappings(entity);
  }
  
  /**
   * Resolve pronoun/vague reference to specific entity
   */
  resolve(query: string): Entity | null {
    const queryLower = query.toLowerCase();
    
    // Direct pronoun resolution
    if (this.isPronoun(queryLower)) {
      return this.resolvePronoun(queryLower);
    }
    
    // Vague references like "the vessel", "that ship"
    if (this.isVagueReference(queryLower)) {
      return this.resolveVagueReference(queryLower);
    }
    
    // Entity name matching (fuzzy)
    return this.fuzzyMatch(query);
  }
  
  /**
   * Get most recent entity (default for "it")
   */
  getMostRecent(type?: string): Entity | null {
    // Reverse search through conversation flow
    for (let i = this.conversationFlow.length - 1; i >= 0; i--) {
      const entityId = this.conversationFlow[i];
      const entity = this.entities.get(entityId);
      
      if (entity && (!type || entity.type === type)) {
        return entity;
      }
    }
    
    return null;
  }
  
  /**
   * Get all entities of a specific type
   */
  getByType(type: string): Entity[] {
    return Array.from(this.entities.values())
      .filter(e => e.type === type)
      .sort((a, b) => b.lastMentioned - a.lastMentioned);
  }
  
  /**
   * Build entity context string for LLM
   */
  buildContextString(): string {
    const recentEntities = Array.from(this.entities.values())
      .sort((a, b) => b.lastMentioned - a.lastMentioned)
      .slice(0, 5);
    
    if (recentEntities.length === 0) return '';
    
    const lines: string[] = ['PREVIOUSLY DISCUSSED ENTITIES:'];
    
    for (const entity of recentEntities) {
      const attrs = entity.attributes || {};
      
      if (entity.type === 'vessel') {
        lines.push(
          `- ${entity.name} | Type: ${attrs.vesselType || 'Vessel'} | ` +
          `${attrs.imo ? `IMO: ${attrs.imo} | ` : ''}` +
          `${attrs.operator ? `Operator: ${attrs.operator}` : ''}`
        );
      } else if (entity.type === 'company') {
        lines.push(
          `- ${entity.name} | Type: ${attrs.companyType || 'Company'} | ` +
          `${attrs.fleet ? `Fleet: ${attrs.fleet} vessels` : ''}`
        );
      } else {
        lines.push(`- ${entity.name} (${entity.type})`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Get focused entity (for "it", "this", etc.)
   */
  getFocusEntity(): Entity | null {
    return this.getMostRecent();
  }
  
  /**
   * Clear old entities (keep recent N)
   */
  prune(keepCount: number = 20): void {
    const sorted = Array.from(this.entities.values())
      .sort((a, b) => b.lastMentioned - a.lastMentioned);
    
    const toKeep = new Set(sorted.slice(0, keepCount).map(e => e.id));
    
    for (const [id, entity] of this.entities.entries()) {
      if (!toKeep.has(id)) {
        this.entities.delete(id);
      }
    }
    
    // Prune conversation flow
    this.conversationFlow = this.conversationFlow.filter(id => toKeep.has(id));
  }
  
  /**
   * Export state for persistence
   */
  export(): EntityContext {
    return {
      entities: Array.from(this.entities.values()),
      conversationFlow: this.conversationFlow,
      currentFocus: this.getFocusEntity() || undefined,
    };
  }
  
  /**
   * Import state from persistence
   */
  import(context: EntityContext): void {
    this.entities.clear();
    this.conversationFlow = context.conversationFlow;
    
    for (const entity of context.entities) {
      this.entities.set(entity.id, entity);
    }
  }
  
  // ========== PRIVATE METHODS ==========
  
  private isPronoun(text: string): boolean {
    const pronouns = ['it', 'its', 'this', 'that', 'these', 'those', 'they', 'them', 'their'];
    return pronouns.some(p => text.includes(p));
  }
  
  private isVagueReference(text: string): boolean {
    const vaguePatterns = [
      /\bthe (vessel|ship|boat|tanker|carrier)\b/i,
      /\bthe (company|operator|owner)\b/i,
      /\bthat (vessel|ship|company)\b/i,
      /\bthis (vessel|ship|company)\b/i,
    ];
    
    return vaguePatterns.some(pattern => pattern.test(text));
  }
  
  private resolvePronoun(pronoun: string): Entity | null {
    // For singular pronouns, return most recent
    if (/\b(it|its|this|that)\b/i.test(pronoun)) {
      return this.getMostRecent();
    }
    
    // For plural pronouns, return most recent of same type
    if (/\b(they|them|their|these|those)\b/i.test(pronoun)) {
      return this.getMostRecent();
    }
    
    return null;
  }
  
  private resolveVagueReference(text: string): Entity | null {
    // Extract type from vague reference
    if (/vessel|ship|boat|tanker|carrier/i.test(text)) {
      return this.getMostRecent('vessel');
    }
    
    if (/company|operator|owner/i.test(text)) {
      return this.getMostRecent('company');
    }
    
    return this.getMostRecent();
  }
  
  private fuzzyMatch(query: string): Entity | null {
    const queryLower = query.toLowerCase();
    
    // Exact match first
    for (const entity of this.entities.values()) {
      if (entity.name.toLowerCase() === queryLower) {
        return entity;
      }
    }
    
    // Partial match
    for (const entity of this.entities.values()) {
      if (entity.name.toLowerCase().includes(queryLower) ||
          queryLower.includes(entity.name.toLowerCase())) {
        return entity;
      }
    }
    
    return null;
  }
  
  private updatePronounMappings(entity: Entity): void {
    // Map pronouns to this entity based on type
    const pronouns = ['it', 'its', 'this', 'that'];
    
    for (const pronoun of pronouns) {
      if (!this.pronounMap.has(pronoun)) {
        this.pronounMap.set(pronoun, []);
      }
      
      const candidates = this.pronounMap.get(pronoun)!;
      candidates.unshift(entity.id);
      
      // Keep only recent 5 candidates
      if (candidates.length > 5) {
        candidates.pop();
      }
    }
  }
}

/**
 * Create entity resolver from session memory
 */
export function createEntityResolver(
  vesselEntities?: Record<string, any>,
  companyEntities?: Record<string, any>
): EntityResolver {
  
  const resolver = new EntityResolver();
  
  // Add vessels
  if (vesselEntities) {
    for (const [key, vessel] of Object.entries(vesselEntities)) {
      resolver.addEntity({
        id: key,
        name: vessel.name,
        type: 'vessel',
        lastMentioned: vessel.discussed || Date.now(),
        mentionCount: 1,
        attributes: vessel,
      });
    }
  }
  
  // Add companies
  if (companyEntities) {
    for (const [key, company] of Object.entries(companyEntities)) {
      resolver.addEntity({
        id: key,
        name: company.name,
        type: 'company',
        lastMentioned: company.discussed || Date.now(),
        mentionCount: 1,
        attributes: company,
      });
    }
  }
  
  return resolver;
}

