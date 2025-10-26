import { useState, useCallback, useEffect } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isThinking?: boolean;
  thinkingContent?: string;
}

export interface Session {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  lastActive: Date;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: `# Welcome to Fleetcore's Intelligence Hub

I'm your **AI Maritime Maintenance Expert**, designed to provide comprehensive support for all your maritime operations needs.

## How I Can Help You:

### 💡 Fleetcore System Expertise
- Navigate platform features and capabilities
- Understand system workflows and integrations
- Get technical guidance and best practices

### 📚 Maritime Knowledge Base
- SOLAS regulations and compliance requirements
- International maritime standards (ISM, MLC, MARPOL)
- Maintenance management procedures
- Safety protocols and certifications

### 🌐 Online Research Mode
Enable **Online Research** below to access real-time information from maritime industry sources, regulatory updates, and technical documentation.

---

**What would you like to explore today?**`,
  timestamp: new Date(),
};

const STORAGE_KEY = 'fleetcore_chat_sessions';
const CACHE_VERSION = '2.0'; // Bumped to clear old sessions with old welcome message
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Load sessions from cache
function loadCachedSessions(): Session[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;
    
    const { version, timestamp, data } = JSON.parse(cached);
    
    // Check version and expiry
    if (version !== CACHE_VERSION || Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    // Parse dates back to Date objects
    return data.map((session: any) => ({
      ...session,
      createdAt: new Date(session.createdAt),
      lastActive: new Date(session.lastActive),
      messages: session.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }));
  } catch (error) {
    console.error('Failed to load cached sessions:', error);
    return null;
  }
}

// Save sessions to cache
function saveSessions(sessions: Session[]) {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      data: sessions
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to save sessions:', error);
  }
}

// Generate smart session name from user query
function generateSessionName(userMessage: string): string {
  if (!userMessage || userMessage.trim().length === 0) return 'New Chat';
  
  // Clean and truncate
  let name = userMessage.trim();
  
  // Remove common prefixes
  name = name.replace(/^(what|how|when|where|why|who|tell me|explain|show me)\s+/i, '');
  
  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1);
  
  // Truncate smartly at word boundary
  if (name.length > 40) {
    const truncated = name.slice(0, 40);
    const lastSpace = truncated.lastIndexOf(' ');
    name = lastSpace > 20 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
  }
  
  return name;
}

export function useSessions() {
  // Initialize with cached sessions or default
  const cachedSessions = loadCachedSessions();
  const initialSessions = cachedSessions || [
    {
      id: crypto.randomUUID(),
      name: 'New Chat',
      messages: [INITIAL_MESSAGE],
      createdAt: new Date(),
      lastActive: new Date(),
    },
  ];
  
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialSessions[0].id);
  
  // Auto-save sessions to cache whenever they change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const createSession = useCallback(() => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      name: `Chat ${sessions.length + 1}`,
      messages: [{ ...INITIAL_MESSAGE, timestamp: new Date() }],
      createdAt: new Date(),
      lastActive: new Date(),
    };
    
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    
    return newSession.id;
  }, [sessions.length]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      
      // If deleting active session, switch to another
      if (sessionId === activeSessionId && filtered.length > 0) {
        setActiveSessionId(filtered[filtered.length - 1].id);
      }
      
      // Always keep at least one session
      if (filtered.length === 0) {
        const newSession: Session = {
          id: crypto.randomUUID(),
          name: 'New Chat',
          messages: [{ ...INITIAL_MESSAGE, timestamp: new Date() }],
          createdAt: new Date(),
          lastActive: new Date(),
        };
        setActiveSessionId(newSession.id);
        return [newSession];
      }
      
      return filtered;
    });
  }, [activeSessionId]);

  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    
    // Update last active time
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, lastActive: new Date() }
        : s
    ));
  }, []);

  const updateSessionMessages = useCallback((sessionId: string, messages: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      
      // Auto-name session based on first user message (if still default name)
      const shouldAutoName = s.name.startsWith('Chat ') || s.name === 'New Chat';
      const firstUserMessage = messages.find(m => m.role === 'user');
      const newName = shouldAutoName && firstUserMessage
        ? generateSessionName(firstUserMessage.content)
        : s.name;
      
      return {
        ...s,
        messages,
        lastActive: new Date(),
        name: newName
      };
    }));
  }, []);

  const renameSession = useCallback((sessionId: string, newName: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, name: newName }
        : s
    ));
  }, []);

  return {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    deleteSession,
    switchSession,
    updateSessionMessages,
    renameSession,
  };
}

