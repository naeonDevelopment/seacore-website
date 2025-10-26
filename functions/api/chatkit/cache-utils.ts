/**
 * Session Cache Utilities
 * Handles compression, serialization, and KV storage for chat sessions
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isThinking?: boolean;
  thinkingContent?: string;
}

export interface SessionCache {
  sessionId: string;
  messages: Message[];
  contextWindow?: string; // Compressed conversation summary
  metadata?: {
    researchUrls?: string[];
    entities?: string[];
    lastModel?: string;
  };
  createdAt: number;
  lastAccess: number;
  messageCount: number;
}

export interface ConversationContext {
  recentMessages: Message[]; // Last 10 messages
  condensedHistory?: string; // Summarized older messages
  keyEntities: string[];
  researchUrls: string[];
}

/**
 * Compress session data using simple JSON string compression
 * (Browser-compatible, no external libs needed)
 */
export function compressSession(session: SessionCache): string {
  try {
    // Remove redundant data and stringify
    const compressed = {
      id: session.sessionId,
      m: session.messages.map(msg => ({
        r: msg.role === 'user' ? 'u' : 'a',
        c: msg.content,
        t: msg.timestamp.getTime(),
      })),
      cw: session.contextWindow,
      md: session.metadata,
      ca: session.createdAt,
      la: session.lastAccess,
      mc: session.messageCount,
    };
    
    return JSON.stringify(compressed);
  } catch (error) {
    console.error('Session compression failed:', error);
    return JSON.stringify(session);
  }
}

/**
 * Decompress session data
 */
export function decompressSession(data: string): SessionCache | null {
  try {
    const parsed = JSON.parse(data);
    
    // Check if compressed format
    if (parsed.m && Array.isArray(parsed.m)) {
      return {
        sessionId: parsed.id,
        messages: parsed.m.map((msg: any) => ({
          role: msg.r === 'u' ? 'user' : 'assistant',
          content: msg.c,
          timestamp: new Date(msg.t),
        })),
        contextWindow: parsed.cw,
        metadata: parsed.md,
        createdAt: parsed.ca,
        lastAccess: parsed.la,
        messageCount: parsed.mc,
      };
    }
    
    // Already in full format
    return parsed as SessionCache;
  } catch (error) {
    console.error('Session decompression failed:', error);
    return null;
  }
}

/**
 * Generate condensed context window from messages
 * Keeps recent messages full, summarizes older ones
 */
export function generateContextWindow(messages: Message[]): ConversationContext {
  const RECENT_MESSAGE_COUNT = 10;
  const recentMessages = messages.slice(-RECENT_MESSAGE_COUNT);
  
  // Extract entities from conversation
  const keyEntities = extractEntities(messages);
  
  // Extract research URLs from assistant messages
  const researchUrls = extractResearchUrls(messages);
  
  // If conversation is long, condense older messages
  let condensedHistory: string | undefined;
  if (messages.length > RECENT_MESSAGE_COUNT) {
    const olderMessages = messages.slice(0, -RECENT_MESSAGE_COUNT);
    condensedHistory = summarizeMessages(olderMessages);
  }
  
  return {
    recentMessages,
    condensedHistory,
    keyEntities,
    researchUrls,
  };
}

/**
 * Extract key entities mentioned in conversation
 */
function extractEntities(messages: Message[]): string[] {
  const entities = new Set<string>();
  
  // Simple entity extraction - look for capitalized words/phrases
  for (const msg of messages) {
    if (msg.role === 'user') {
      // Extract company names, vessel names, equipment models
      const matches = msg.content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 3) entities.add(match);
        });
      }
    }
  }
  
  return Array.from(entities).slice(0, 20); // Keep top 20
}

/**
 * Extract research URLs from assistant responses
 */
function extractResearchUrls(messages: Message[]): string[] {
  const urls = new Set<string>();
  
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      // Extract markdown links [text](url)
      const markdownLinks = msg.content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
      if (markdownLinks) {
        markdownLinks.forEach(link => {
          const urlMatch = link.match(/\(([^)]+)\)/);
          if (urlMatch) urls.add(urlMatch[1]);
        });
      }
      
      // Extract plain URLs
      const plainUrls = msg.content.match(/https?:\/\/[^\s)]+/g);
      if (plainUrls) {
        plainUrls.forEach(url => urls.add(url));
      }
    }
  }
  
  return Array.from(urls).slice(0, 50); // Keep top 50
}

/**
 * Summarize older messages into compact format
 */
function summarizeMessages(messages: Message[]): string {
  // Simple summarization: extract main topics
  const summaryPoints: string[] = [];
  
  for (let i = 0; i < messages.length; i += 2) {
    const userMsg = messages[i];
    const assistantMsg = messages[i + 1];
    
    if (userMsg?.role === 'user') {
      // Extract first sentence of user question
      const question = userMsg.content.split(/[.!?]/)[0].trim().slice(0, 100);
      if (question) summaryPoints.push(`Q: ${question}`);
    }
  }
  
  return summaryPoints.join('\n');
}

/**
 * Build optimized prompt context from cached conversation
 */
export function buildPromptContext(context: ConversationContext): string {
  let prompt = '';
  
  // Add condensed history if exists
  if (context.condensedHistory) {
    prompt += `=== CONVERSATION HISTORY ===\n${context.condensedHistory}\n\n`;
  }
  
  // Add key entities for context
  if (context.keyEntities.length > 0) {
    prompt += `=== KEY ENTITIES ===\n${context.keyEntities.join(', ')}\n\n`;
  }
  
  // Add research URLs for reference
  if (context.researchUrls.length > 0) {
    prompt += `=== PREVIOUS RESEARCH SOURCES ===\n${context.researchUrls.slice(0, 10).join('\n')}\n\n`;
  }
  
  return prompt;
}

/**
 * Calculate cache size in bytes (approximate)
 */
export function calculateCacheSize(session: SessionCache): number {
  const compressed = compressSession(session);
  return new Blob([compressed]).size;
}

/**
 * Check if session should be evicted based on TTL
 */
export function shouldEvictSession(session: SessionCache, ttlMs: number = 7 * 24 * 60 * 60 * 1000): boolean {
  const now = Date.now();
  return (now - session.lastAccess) > ttlMs;
}

