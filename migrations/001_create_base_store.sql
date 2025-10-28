-- =====================================================
-- MARITIME INTELLIGENCE BASE STORE SCHEMA
-- Cloudflare D1 Database for Cross-Session Memory
-- =====================================================

-- User-level persistent profiles
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    last_active INTEGER NOT NULL,
    
    -- User preferences (JSON)
    preferences TEXT DEFAULT '{}',
    
    -- Usage statistics
    total_interactions INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    
    -- Expertise tracking
    domain_focus TEXT, -- e.g., "crew_boats", "container_vessels"
    technical_level TEXT DEFAULT 'standard' -- 'basic', 'standard', 'expert'
);

-- Entity memory across all sessions (vessels, companies, equipment)
CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    
    -- Entity identification
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'vessel', 'company', 'equipment', 'location'
    
    -- Core attributes (JSON)
    -- For vessels: { imo, mmsi, type, operator, flag, built, specs: {...} }
    -- For companies: { fleet_size, headquarters, vessels: [...] }
    attributes TEXT NOT NULL DEFAULT '{}',
    
    -- Temporal tracking
    first_mentioned INTEGER NOT NULL,
    last_mentioned INTEGER NOT NULL,
    mention_count INTEGER DEFAULT 1,
    
    -- Session tracking (JSON array)
    sessions TEXT DEFAULT '[]',
    
    -- Vector search reference
    embedding_id TEXT, -- References Vectorize index
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Conversation summaries for context maintenance
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    
    -- Summary content
    summary TEXT NOT NULL,
    
    -- Structured metadata (JSON)
    topics TEXT DEFAULT '[]', -- ["vessel specifications", "maintenance procedures"]
    entities_discussed TEXT DEFAULT '[]', -- ["Dynamic 17", "Stanford Marine"]
    user_intent TEXT, -- "evaluating fleetcore for specific vessel"
    
    -- Temporal data
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    message_count INTEGER NOT NULL,
    
    -- Research mode tracking
    research_mode_used BOOLEAN DEFAULT FALSE,
    verification_mode_used BOOLEAN DEFAULT FALSE,
    
    -- Vector search reference
    embedding_id TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- LangGraph-compatible memory store (namespace + key-value)
CREATE TABLE IF NOT EXISTS memory_store (
    namespace TEXT NOT NULL,
    key TEXT NOT NULL,
    
    -- Value (JSON)
    value TEXT NOT NULL,
    
    -- Metadata
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    -- TTL support (NULL = no expiration)
    expires_at INTEGER,
    
    PRIMARY KEY (namespace, key)
);

-- User-level preferences and learned behaviors
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    
    -- Response preferences
    preferred_detail_level TEXT DEFAULT 'comprehensive', -- 'concise', 'standard', 'comprehensive'
    preferred_format TEXT DEFAULT 'technical_briefing', -- 'technical_briefing', 'executive_summary'
    
    -- Feature usage
    uses_research_mode BOOLEAN DEFAULT FALSE,
    prefers_technical_depth BOOLEAN DEFAULT TRUE,
    
    -- Language/terminology
    preferred_terminology TEXT DEFAULT 'maritime_technical', -- 'simplified', 'maritime_technical', 'expert'
    
    -- Fleetcore context
    is_fleetcore_evaluator BOOLEAN DEFAULT FALSE,
    fleetcore_features_discussed TEXT DEFAULT '[]', -- JSON array
    
    -- Update tracking
    updated_at INTEGER NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Entity relationships (e.g., vessel -> operator company)
CREATE TABLE IF NOT EXISTS entity_relationships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    
    -- Relationship
    from_entity_id TEXT NOT NULL,
    to_entity_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL, -- 'operates', 'owns', 'manufactures', 'services'
    
    -- Metadata
    confidence REAL DEFAULT 1.0, -- 0.0 to 1.0
    source TEXT, -- 'gemini', 'research', 'user_stated'
    
    created_at INTEGER NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (from_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (to_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    
    UNIQUE(user_id, from_entity_id, to_entity_id, relationship_type)
);

-- =====================================================
-- INDEXES FOR FAST QUERIES
-- =====================================================

-- Entity queries
CREATE INDEX IF NOT EXISTS idx_entities_user_type ON entities(user_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(entity_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_entities_mentioned ON entities(user_id, last_mentioned DESC);
CREATE INDEX IF NOT EXISTS idx_entities_sessions ON entities(user_id, sessions);

-- Summary queries
CREATE INDEX IF NOT EXISTS idx_summaries_user ON conversation_summaries(user_id, end_time DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_session ON conversation_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_summaries_topics ON conversation_summaries(user_id, topics);

-- Memory store queries
CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory_store(namespace);
CREATE INDEX IF NOT EXISTS idx_memory_expires ON memory_store(expires_at);

-- Relationship queries
CREATE INDEX IF NOT EXISTS idx_relationships_from ON entity_relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON entity_relationships(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON entity_relationships(relationship_type);

-- User activity
CREATE INDEX IF NOT EXISTS idx_users_active ON users(last_active DESC);

