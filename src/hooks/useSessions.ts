import { useState, useCallback } from 'react';

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
  content: "Hi! I'm your maritime maintenance expert. I can help you understand fleetcore's features, maritime regulations, and answer questions about maintenance management. What would you like to know?",
  timestamp: new Date(),
};

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: crypto.randomUUID(),
      name: 'New Chat',
      messages: [INITIAL_MESSAGE],
      createdAt: new Date(),
      lastActive: new Date(),
    },
  ]);
  
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0].id);

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
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { 
            ...s, 
            messages,
            lastActive: new Date(),
            // Auto-name session based on first user message
            name: s.name.startsWith('Chat ') || s.name === 'New Chat'
              ? (messages.find(m => m.role === 'user')?.content.slice(0, 30) + '...' || s.name)
              : s.name
          }
        : s
    ));
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

