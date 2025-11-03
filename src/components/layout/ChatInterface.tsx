import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Bot, User, Globe, RotateCcw, ChevronDown, ChevronUp, Sun, Moon, CheckCircle2, XCircle, FileText, Sparkles, Square } from 'lucide-react';
import { cn } from '@/utils/cn';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FleetCoreLogo } from '@/components/ui/FleetCoreLogo';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isThinking?: boolean;
  thinkingContent?: string;
  memoryNarrative?: string; // Conversation context (disappears when content starts)
}

// Research event types (same as in useSessions)
type ResearchEvent = { type: 'step' | 'tool' | 'source'; [key: string]: any };
type ResearchSession = {
  messageId: string;
  userMessageId: string;
  events: ResearchEvent[];
  verifiedSources: ResearchEvent[];
  transientAnalysis: string;
  isActive: boolean;
  timestamp: number;
};

interface ChatInterfaceProps {
  isFullscreen?: boolean;
  onClose?: () => void;
  className?: string;
  showHeader?: boolean;
  messages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
  darkMode?: boolean;
  toggleDarkMode?: () => void;
  // CRITICAL FIX: Accept research sessions from parent for persistence
  researchSessions?: Map<string, ResearchSession>;
  onResearchSessionsChange?: (sessions: Map<string, ResearchSession>) => void;
}

// Separate component for loading indicator to ensure proper reactivity
const LoadingIndicator: React.FC<{
  isResearching: boolean;
  useBrowsing: boolean;
  activeResearchId: string | null;
  researchSessions: Map<string, ResearchSession>;
}> = ({ isResearching, useBrowsing, activeResearchId, researchSessions }) => {
  // Use useMemo to get status message reactively
  const statusMessage = useMemo(() => {
    if (!activeResearchId) return '';
    const session = researchSessions.get(activeResearchId);
    return session?.transientAnalysis || '';
  }, [activeResearchId, researchSessions]);
  
  // Log status updates for debugging
  useEffect(() => {
    if (statusMessage) {
      console.log('🔄 [LoadingIndicator] Status updated:', statusMessage);
    }
  }, [statusMessage]);
  
  return (
    <motion.div
      key={statusMessage} // Force re-animation when status changes
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-2 sm:gap-4"
    >
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-maritime-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
        <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
      <div className="backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/30 rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg max-w-[80%]">
        <div className="flex items-start gap-3">
          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-maritime-600 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <AnimatePresence mode="wait">
              {statusMessage ? (
                // Show the actual status from backend
                <motion.div 
                  key="status"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="flex items-start gap-1.5"
                >
                  <span className="text-xs sm:text-sm text-maritime-700 dark:text-maritime-300 font-semibold leading-relaxed">
                    {statusMessage}
                  </span>
                </motion.div>
              ) : isResearching ? (
                <motion.div 
                  key="researching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-maritime-600 dark:text-maritime-400 font-semibold"
                >
                  <Globe className="w-3.5 h-3.5 animate-pulse" />
                  <span>Researching maritime intelligence...</span>
                </motion.div>
              ) : useBrowsing ? (
                <motion.div 
                  key="preparing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-maritime-600 dark:text-maritime-400 font-semibold"
                >
                  <Globe className="w-3.5 h-3.5 animate-pulse" />
                  <span>Preparing research...</span>
                </motion.div>
              ) : (
                <motion.div 
                  key="thinking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-maritime-600 dark:text-maritime-400 font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Thinking...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  isFullscreen = false, 
  onClose,
  className,
  showHeader = true,
  messages: externalMessages,
  onMessagesChange,
  darkMode,
  toggleDarkMode,
  researchSessions: externalResearchSessions,
  onResearchSessionsChange
}) => {
  const [internalMessages, setInternalMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `# Welcome to fleetcore's Maritime Intelligence Hub

I'm your **AI Maritime Maintenance Expert** – powered by specialized maritime intelligence from **100+ OEM manufacturers** and real-world fleet data.

## 💡 What Makes This Different:

**fleetcore Platform** • Agentic maintenance OS, vendor-neutral optimization, cross-fleet intelligence, and automation workflows

**Maritime Compliance** • SOLAS, MARPOL, ISM Code, MLC compliance tracking, regulatory updates, and certification management

**Expert Maintenance Guidance** • OEM procedures, safety protocols, predictive maintenance insights, and equipment specifications

---

## 🔎 How research works

- For questions about fleetcore (features, how-to), I answer from platform knowledge.
- For vessels, companies, and equipment, I automatically verify with trusted web sources and include citations.

**What would you like to know?**`,
      timestamp: new Date(),
    },
  ]);

  // Use external messages if provided, otherwise use internal state
  const messages = externalMessages || internalMessages;
  // Keep a ref to the latest messages to avoid stale closures when delegating to parent
  const latestMessagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);


  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    if (onMessagesChange) {
      if (typeof newMessages === 'function') {
        // Compute from the latest snapshot to avoid overwriting with stale arrays
        const updatedMessages = newMessages(latestMessagesRef.current);
        onMessagesChange(updatedMessages);
      } else {
        onMessagesChange(newMessages);
      }
    } else {
      setInternalMessages(newMessages as any);
    }
  };
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false); // NEW: Track research phase
  const [isStreaming, setIsStreaming] = useState(false); // Track active streaming
  // Context-aware browsing flag (computed per message)
  const [currentUseBrowsing, setCurrentUseBrowsing] = useState<boolean>(false);
  const currentUseBrowsingRef = useRef<boolean>(false);
  
  // Helper: simple client-side platform query detection
  const isPlatformQueryClient = (q: string) => {
    const query = (q || '').toLowerCase();
    const platformKeywords = [
      'fleetcore', 'seacore', 'fleet core', 'sea core',
      'system', 'systems', 'management', 'manager',
      'pms', 'planned maintenance', 'work order', 'maintenance scheduling',
      'inventory', 'spare parts', 'procurement', 'purchasing',
      'crew management', 'compliance', 'safety management system', 'sms',
      'budget', 'cost management', 'document management', 'dashboard',
      'analytics', 'reporting', 'login', 'account', 'subscription',
      'features', 'capabilities', 'integrations', 'mobile app', 'offline mode',
      'api', 'integration', 'data export', 'architecture'
    ];
    return platformKeywords.some(k => query.includes(k));
  };

  // Compute browsing: platform → false (knowledge), otherwise true (verification)
  const computeUseBrowsing = (q: string) => !isPlatformQueryClient(q);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const streamingIndexRef = useRef<number | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [, setCurrentThinkingStep] = useState<number>(0); // kept for future CoT animations
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const thinkingStartTimeRef = useRef<number | null>(null);
  const firstContentTimeRef = useRef<number | null>(null);
  
  // Tracking ref for source display logging (prevent log spam)
  const lastSourceDisplayLogRef = useRef<{ count: number; filter: string; messageId: string } | null>(null);
  
  // CRITICAL FIX: Use external research sessions if provided, otherwise use internal state
  const [internalResearchSessions, setInternalResearchSessions] = useState<Map<string, ResearchSession>>(new Map());
  const researchSessions = externalResearchSessions || internalResearchSessions;
  
  // Keep a ref to the latest research sessions to avoid stale closures
  const latestResearchSessionsRef = useRef<Map<string, ResearchSession>>(researchSessions);
  useEffect(() => {
    latestResearchSessionsRef.current = researchSessions;
  }, [researchSessions]);
  
  // Setter function that delegates to parent if callback provided
  const setResearchSessions = (newSessions: Map<string, ResearchSession> | ((prev: Map<string, ResearchSession>) => Map<string, ResearchSession>)) => {
    if (onResearchSessionsChange) {
      if (typeof newSessions === 'function') {
        const updatedSessions = newSessions(latestResearchSessionsRef.current);
        onResearchSessionsChange(updatedSessions);
      } else {
        onResearchSessionsChange(newSessions);
      }
    } else {
      setInternalResearchSessions(newSessions as any);
    }
  };
  
  const activeResearchIdRef = useRef<string | null>(null); // Currently streaming research
  
  // Transient analysis line shown briefly, then auto-hidden
  const [, setViewportHeight] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 0);
  const [, setViewportTop] = useState<number>(0);
  // Throttle streaming UI updates
  const lastStreamUpdateRef = useRef<number>(0);
  const isResearchingRef = useRef<boolean>(false); // Track research state in ref for callbacks
  // Filter for source display: 'all', 'accepted', 'rejected'
  // DEFAULT TO 'all' TO SEE ALL SOURCES INITIALLY
  const [sourceFilter, setSourceFilter] = useState<'all' | 'accepted' | 'rejected'>('all');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollInputIntoView = () => {
    setTimeout(() => {
      inputAreaRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'nearest'
      });
    }, 100);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsResearching(false);
    setIsStreaming(false);
    isResearchingRef.current = false;
    
    // Finalize any streaming message with a note that it was stopped
    setMessages((prev) => {
      const updated = [...prev];
      let idx = streamingIndexRef.current ?? updated.length - 1;
      
      if (idx >= 0 && idx < updated.length && updated[idx]?.role === 'assistant' && updated[idx]?.isStreaming) {
        updated[idx] = {
          ...updated[idx],
          isStreaming: false,
          isThinking: false,
        };
      }
      
      return updated;
    });
    
    streamingIndexRef.current = null;
    thinkingStartTimeRef.current = null;
    firstContentTimeRef.current = null;
    
    // Mark active research session as stopped
    if (activeResearchIdRef.current) {
      setResearchSessions((prev) => {
        const updated = new Map(prev);
        const session = updated.get(activeResearchIdRef.current!);
        if (session) {
          session.isActive = false;
          updated.set(activeResearchIdRef.current!, session);
        }
        return updated;
      });
    }
  };

  const resetChat = () => {
    // Stop any ongoing generation first
    if (isStreaming || isLoading) {
      stopGeneration();
    }
    
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm your maritime maintenance expert. I can help you understand fleetcore's features, maritime regulations, and answer questions about maintenance management. What would you like to know?",
        timestamp: new Date(),
      },
    ]);
    setInput('');
    streamingIndexRef.current = null;
    lastMessageCountRef.current = 1;
    setCurrentThinkingStep(0);
    thinkingStartTimeRef.current = null;
    setExpandedSources(new Set());
    setResearchSessions(new Map()); // Clear all research sessions
    activeResearchIdRef.current = null;
  };

  const extractThinkingSteps = (thinking: string): string[] => {
    if (!thinking) return [];
    
    const cleaned = thinking
      .replace(/\*\*THINKING:\*\*/gi, '')
      .replace(/\*\*ANSWER:\*\*/gi, '')
      .trim();
    
    const stepLabels = ['Understanding:', 'Analysis:', 'Source Review:', 'Cross-Reference:', 'Synthesis:', 'Conclusion:'];
    const steps: string[] = [];
    const hasLabels = stepLabels.some(label => cleaned.includes(label));
    
    if (hasLabels) {
      for (let i = 0; i < stepLabels.length; i++) {
        const currentLabel = stepLabels[i];
        const labelIndex = cleaned.indexOf(currentLabel);
        
        if (labelIndex !== -1) {
          let nextLabelIndex = cleaned.length;
          for (let j = 0; j < stepLabels.length; j++) {
            if (i === j) continue;
            const nextIndex = cleaned.indexOf(stepLabels[j], labelIndex + currentLabel.length);
            if (nextIndex !== -1 && nextIndex < nextLabelIndex) {
              nextLabelIndex = nextIndex;
            }
          }
          
          const stepContent = cleaned.substring(labelIndex + currentLabel.length, nextLabelIndex).trim();
          if (stepContent.length > 5) steps.push(stepContent);
        }
      }
    }
    
    if (steps.length === 0 && cleaned.length > 0) {
      let fallbackSteps = cleaned.split(/\n+/).map(s => s.trim()).filter(s => s.length > 20);
      
      if (fallbackSteps.length < 2) {
        fallbackSteps = cleaned.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 20);
      }
      
      if (fallbackSteps.length < 2 && cleaned.length > 200) {
        const words = cleaned.split(' ');
        fallbackSteps = [];
        let currentChunk = '';
        
        for (const word of words) {
          if (currentChunk.length + word.length > 100 && currentChunk.length > 0) {
            fallbackSteps.push(currentChunk.trim());
            currentChunk = word;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + word;
          }
        }
        if (currentChunk) fallbackSteps.push(currentChunk.trim());
      }
      
      return fallbackSteps.slice(0, 6);
    }
    
    return steps;
  };

  // Remove any inline CoT markers from assistant message content so thoughts
  // are only shown in the dedicated animated CoT UI, never inside the answer.
  const sanitizeAssistantContent = (raw: string | undefined): string => {
    if (!raw) return '';
    let s = String(raw);
    // Remove any THINKING → ANSWER preface blocks if present
    const removeCotBlock = (text: string): string => {
      const lower = text.toLowerCase();
      const thinkingMarkers = ['**thinking:**', 'thinking:'];
      const answerMarkers = ['**answer:**', 'answer:'];
      let start = -1;
      for (const m of thinkingMarkers) {
        const idx = lower.indexOf(m);
        if (idx !== -1 && (start === -1 || idx < start)) start = idx;
      }
      if (start !== -1) {
        let end = -1;
        for (const m of answerMarkers) {
          const idx = lower.indexOf(m, start + 1);
          if (idx !== -1 && (end === -1 || idx < end)) end = idx;
        }
        if (end !== -1) {
          // Drop content from THINKING start up to ANSWER marker
          text = text.slice(0, start) + text.slice(end);
        } else {
          // No ANSWER marker; drop the THINKING label line(s)
          text = text.replace(/\*\*THINKING:\*\*[\s\S]*/i, '').replace(/THINKING:[\s\S]*/i, '');
        }
      }
      return text;
    };
    s = removeCotBlock(s);
    // Strip residual ANSWER labels if any
    s = s.replace(/\*\*ANSWER:\*\*\s*/i, '').replace(/^ANSWER:\s*/i, '');
    
    // Remove "Sources:" section at end since research panel shows them
    // Match variations: **Sources:**, Sources:, ## Sources, ### Sources
    s = s.replace(/\n\s*(#{1,3}\s*)?(\*\*)?Sources:?(\*\*)?\s*[\s\S]*$/i, '');
    
    // Strip any leading JSON block (e.g., leaked planner output) before first markdown header
    s = s.replace(/^\s*\{[\s\S]*?\}\s*(?=(##\s|$))/, '');
    
    return s.trim();
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage?.role === 'assistant' && lastMessage?.thinkingContent && lastMessage?.isThinking) {
      const steps = extractThinkingSteps(lastMessage.thinkingContent);
      
      if (steps.length > 1) {
        const interval = setInterval(() => {
          setCurrentThinkingStep((prev) => (prev + 1) % steps.length);
        }, 1500);
        
        return () => clearInterval(interval);
      }
    } else {
      setCurrentThinkingStep(0);
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > lastMessageCountRef.current && lastMessageCountRef.current > 0) {
      scrollToBottom();
      lastMessageCountRef.current = messages.length;
    } else if (lastMessageCountRef.current === 0) {
      // Initialize without scrolling on mount
      lastMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  useEffect(() => {
    // Skip body scroll lock if showHeader is false (means parent page is handling it)
    if (!showHeader) return;
    
    if (typeof window !== 'undefined' && window.innerWidth < 640 && isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.overflow = originalOverflow;
        window.scrollTo(0, scrollY);
      };
    } else if (isFullscreen) {
      inputRef.current?.focus();
    }
  }, [isFullscreen, showHeader]);

  useEffect(() => {
    // Skip viewport tracking if showHeader is false (means parent page is handling it)
    if (!isFullscreen || !showHeader) return;

    const updateViewportDimensions = () => {
      if (typeof window === 'undefined') return;
      
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        setViewportHeight(visualViewport.height);
        setViewportTop(visualViewport.offsetTop);
        
        if (document.activeElement === inputRef.current) {
          scrollInputIntoView();
        }
      } else {
        setViewportHeight(window.innerHeight);
        setViewportTop(0);
      }
    };

    updateViewportDimensions();

    const handleFocus = () => {
      scrollInputIntoView();
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportDimensions);
      window.visualViewport.addEventListener('scroll', updateViewportDimensions);
    } else {
      window.addEventListener('resize', updateViewportDimensions);
    }

    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('focus', handleFocus);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportDimensions);
        window.visualViewport.removeEventListener('scroll', updateViewportDimensions);
      } else {
        window.removeEventListener('resize', updateViewportDimensions);
      }

      if (inputElement) {
        inputElement.removeEventListener('focus', handleFocus);
      }
    };
  }, [isFullscreen, showHeader]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Compute context-aware browsing decision for this query
    const computed = computeUseBrowsing(userMessage.content);
    setCurrentUseBrowsing(computed);
    currentUseBrowsingRef.current = computed;
    
    // Store the user message ID for linking to assistant response
    const userMessageId = userMessage.timestamp.getTime().toString();

    // CRITICAL FIX: Add user message and wait for state to settle
    // This ensures the message is persisted before any async operations
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    
    // CRITICAL FIX: Force a synchronous flush to ensure message is saved
    // Use a microtask to allow React to batch the state update and persist it
    await new Promise(resolve => setTimeout(resolve, 0));
    
    setIsLoading(true);
    setIsStreaming(true);
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    // CRITICAL FIX: Create research session for ALL queries (verification + research mode)
    // This ensures events arriving before assistant message are captured
    // Clean up any previous pending sessions
    if (activeResearchIdRef.current && activeResearchIdRef.current.startsWith('pending-')) {
      setResearchSessions((prev) => {
        const updated = new Map(prev);
        updated.delete(activeResearchIdRef.current!);
        return updated;
      });
    }
    
    const pendingResearchId = `pending-${Date.now()}`;
    activeResearchIdRef.current = pendingResearchId;
    console.log('📊 Creating research session for query:', pendingResearchId, '| Browsing:', currentUseBrowsingRef.current);
    
    setResearchSessions((prev) => {
      const updated = new Map(prev);
      updated.set(pendingResearchId, {
        messageId: pendingResearchId, // Will be updated when assistant message created
        userMessageId: userMessageId,
        events: [],
        verifiedSources: [],
        transientAnalysis: '',
        isActive: true,
        timestamp: Date.now(),
      });
      return updated;
    });

    try {
      
      // Get session ID from parent or generate default
      const sessionId = (window as any).__activeSessionId || 'default-session';
      
      // Log what we're sending to backend
      console.log('📤 [Sending to Backend]', {
        enableBrowsing: currentUseBrowsingRef.current,
        enableChainOfThought: false,
        messageCount: messages.length + 1,
        query: userMessage.content.substring(0, 100)
      });
      
      const response = await fetch('/api/chatkit/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          enableBrowsing: currentUseBrowsingRef.current,
          enableChainOfThought: false,
          researchComplexity: 'simple',
          sessionId, // Include session ID for cache management
        }),
        signal: abortControllerRef.current?.signal, // Add abort signal
      });

      if (!response.ok) throw new Error('Failed to send message');

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // ignore model header
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        let streamedContent = '';
        let streamedThinking = '';
        let memoryNarrative = ''; // Conversation context from session memory
        let hasReceivedContent = false;
        let answerReadyToShow = false;
        
        streamingIndexRef.current = null;
        // Start thinking timer only when we actually receive thinking content
        thinkingStartTimeRef.current = null;
        
        // Do NOT create the assistant bubble yet; show research timeline first
        // Keep loading spinner visible during research phase
        // Will be cleared when first content arrives or research_start is received

        if (reader) {
          let buffer = '';
          // Stream safety timeouts
          const streamStartTime = Date.now();
          // Conditional timeout: 3 minutes for deep research (browsing enabled), 2 minutes for normal queries
          const STREAM_TIMEOUT = currentUseBrowsingRef.current ? 180000 : 120000; // 3 min for research, 2 min for normal
          let lastChunkTime = Date.now();
          const CHUNK_TIMEOUT = 30000; // 30 seconds
          while (true) {
            // Check timeouts
            const nowTs = Date.now();
            if (nowTs - streamStartTime > STREAM_TIMEOUT) {
              const timeoutMin = Math.floor(STREAM_TIMEOUT / 60000);
              console.error(`❌ [ChatInterface] Stream timeout (${timeoutMin}m)`);
              throw new Error('Stream timeout');
            }
            if (nowTs - lastChunkTime > CHUNK_TIMEOUT) {
              console.error('❌ [ChatInterface] Chunk timeout (30s)');
              throw new Error('Stream stalled');
            }
            const { done, value } = await reader.read();
            if (done) break;
            lastChunkTime = Date.now();
            buffer += decoder.decode(value, { stream: true });

            let newlineIndex = buffer.indexOf('\n');
            while (newlineIndex !== -1) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              newlineIndex = buffer.indexOf('\n');

              // Be tolerant of CRLF and missing space after colon
              const cleanLine = line.replace(/\r$/, '');
              if (!cleanLine.startsWith('data:')) continue;
              const data = cleanLine.slice(5).trimStart();
              const jsonStr = data.trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(jsonStr);
                
                  // Handle research_start event - show research loading state
                if (parsed?.type === 'research_start') {
                  console.log('🔬 [Research Started]', { mode: parsed.mode, browsing: currentUseBrowsingRef.current });
                  // Only show research indicator if browsing is enabled
                  if (currentUseBrowsingRef.current) {
                    setIsLoading(false); // Hide general loading
                    setIsResearching(true); // Show research-specific loading
                    isResearchingRef.current = true; // Sync ref
                  }
                  // If browsing is disabled, keep showing "Thinking..." with isLoading
                  continue;
                }
                
                // Capture structured research events (server emitted)
                if (parsed?.type === 'step' || parsed?.type === 'tool' || parsed?.type === 'source') {
                  // Log source events (grouped)
                  if (parsed?.type === 'source') {
                    // Only log first and last few sources to avoid spam
                    const sourceCount = (researchSessions.get(activeResearchIdRef.current!)?.events.filter(e => e.type === 'source').length || 0);
                    if (sourceCount <= 2 || sourceCount % 5 === 0) {
                      console.log(`🔍 [Source ${sourceCount}]`, parsed.action, parsed.url?.substring(0, 50));
                    }
                    
                    // Once sources appear in research panel, hide loading indicator
                    // The research panel itself shows the research happening
                    if (isResearchingRef.current) {
                      console.log('🎯 [Research Panel Active] Hiding loading indicator');
                      setIsLoading(false);
                      setIsResearching(false);
                      isResearchingRef.current = false;
                    }
                  }
                  
                  // CRITICAL FIX: Accept sources from BOTH verification and research mode
                  if (activeResearchIdRef.current) {
                    // Update the active research session
                    setResearchSessions((prev) => {
                      const updated = new Map(prev);
                      const session = updated.get(activeResearchIdRef.current!);
                      if (session) {
                        session.events.push(parsed);
                        // Track verified sources
                        if (parsed.type === 'source' && parsed.action === 'selected') {
                          session.verifiedSources.push(parsed);
                          // Keep max 28 verified sources
                          if (session.verifiedSources.length > 28) {
                            session.verifiedSources = session.verifiedSources.slice(-28);
                          }
                        }
                        updated.set(activeResearchIdRef.current!, session);
                        
                        // GROUPED LOGGING: Only log every 5th source event to reduce spam
                        if (parsed.type === 'source' && session.events.filter(e => e.type === 'source').length % 5 === 0) {
                          console.log('📊 [Session Update]', {
                            sources: session.events.filter(e => e.type === 'source').length,
                            verified: session.verifiedSources.length,
                            browsing: currentUseBrowsingRef.current
                          });
                        }
                      } else {
                        console.warn('⚠️ No active session found for:', activeResearchIdRef.current);
                      }
                      return updated;
                    });
                  } else {
                    if (parsed?.type === 'source') {
                      console.warn('⚠️ Source received but no activeResearchIdRef:', { useBrowsing: currentUseBrowsingRef.current, activeResearchIdRef: activeResearchIdRef.current });
                    }
                  }
                  // Do not treat as content/thinking; continue
                  continue;
                }
                if (parsed.type === 'memory') {
                  // Capture conversation memory narrative (will be cleared when content starts)
                  memoryNarrative = parsed.content || '';
                  console.log('📖 [ChatInterface] Memory narrative received:', memoryNarrative.substring(0, 100));
                } else if (parsed.type === 'status') {
                  // PHASE A1: Handle status events (tool execution progress)
                  // CRITICAL FIX: Show status for ALL modes (verification + research)
                  streamedThinking += '\n' + parsed.content;
                  if (activeResearchIdRef.current) {
                    setResearchSessions((prev) => {
                      const updated = new Map(prev);
                      const session = updated.get(activeResearchIdRef.current!);
                      if (session) {
                        session.transientAnalysis = parsed.content;
                        updated.set(activeResearchIdRef.current!, session);
                      }
                      return updated;
                    });
                  }
                } else if (parsed.type === 'thinking') {
                  // CRITICAL FIX: Show thinking for ALL modes (verification + research)
                  streamedThinking += parsed.content;
                  if (!thinkingStartTimeRef.current && streamedThinking.length > 0) {
                    thinkingStartTimeRef.current = Date.now();
                  }
                  // Update transient analysis in active research session
                  if (activeResearchIdRef.current) {
                    const snippet = String(parsed.content || '')
                      .replace(/\*\*THINKING:\*\*/i, '')
                      .split(/\n|\.\s/)[0]
                      .trim()
                      .slice(0, 240);
                    if (snippet) {
                      setResearchSessions((prev) => {
                        const updated = new Map(prev);
                        const session = updated.get(activeResearchIdRef.current!);
                        if (session && !session.transientAnalysis) {
                          session.transientAnalysis = snippet;
                          updated.set(activeResearchIdRef.current!, session);
                        }
                        return updated;
                      });
                    }
                  }
                } else if (parsed.type === 'confidence') {
                  // PHASE 3: Handle confidence indicator
                  if (activeResearchIdRef.current && parsed.data) {
                    console.log('📊 [ChatInterface] Confidence received:', parsed.data);
                    setResearchSessions((prev) => {
                      const updated = new Map(prev);
                      const session = updated.get(activeResearchIdRef.current!);
                      if (session) {
                        (session as any).confidence = parsed.data;
                        updated.set(activeResearchIdRef.current!, session);
                      }
                      return updated;
                    });
                  }
                } else if (parsed.type === 'content') {
                  // CRITICAL FIX: Create assistant message BEFORE any throttling
                  // This ensures message exists before any updates try to modify it
                  if (!hasReceivedContent) {
                    hasReceivedContent = true;
                    if (!firstContentTimeRef.current) firstContentTimeRef.current = Date.now();
                    
                    // CLEAR MEMORY NARRATIVE when content starts (user only sees it briefly)
                    memoryNarrative = '';
                    
                    // CRITICAL FIX: Clear transient analysis status when content starts streaming
                    if (activeResearchIdRef.current) {
                      setResearchSessions((prev) => {
                        const updated = new Map(prev);
                        const session = updated.get(activeResearchIdRef.current!);
                        if (session) {
                          session.transientAnalysis = ''; // Clear stuck status
                          updated.set(activeResearchIdRef.current!, session);
                        }
                        return updated;
                      });
                    }
                    
                    // Clear any remaining loading states (research state already cleared by source events)
                    setIsLoading(false);
                    
                    // Create assistant message IMMEDIATELY - NO NESTED STATE UPDATES
                    // This MUST happen before throttling to prevent race conditions
                    if (streamingIndexRef.current === null) {
                      let newMessageIndex: number = -1;
                      let assistantMessageId: string = '';
                      
                      // STEP 1: Create message synchronously WITHOUT nested state updates
                      setMessages((prev) => {
                        const updated = [...prev];
                        newMessageIndex = updated.length;
                        streamingIndexRef.current = newMessageIndex;
                        
                        const assistantMessage = {
                          role: 'assistant' as const,
                          content: '',
                          thinkingContent: streamedThinking, // CRITICAL FIX: Show thinking for all modes
                          memoryNarrative: memoryNarrative || '',
                          timestamp: new Date(),
                          isStreaming: true,
                          isThinking: false,
                        };
                        assistantMessageId = assistantMessage.timestamp.getTime().toString();
                        updated.push(assistantMessage);
                        
                        console.log(`💬 [ChatInterface] Assistant message created (idx: ${newMessageIndex})`);
                        return updated;
                      });
                      
                      // STEP 2: Link research session AFTER message is created (separate state update)
                      // CRITICAL FIX: Link for ALL modes (verification + research)
                      if (activeResearchIdRef.current && assistantMessageId) {
                        const pendingId = activeResearchIdRef.current;
                        
                        setResearchSessions((prev) => {
                          const updated = new Map(prev);
                          const pendingSession = updated.get(pendingId);
                          
                          if (pendingSession) {
                            const newSession = {
                              ...pendingSession,
                              messageId: assistantMessageId,
                            };
                            updated.set(assistantMessageId, newSession);
                          }
                          
                          return updated;
                        });
                        
                        // STEP 3: Expand sources panel (separate state update)
                        setExpandedSources((prev) => {
                          const ns = new Set(prev);
                          ns.add(newMessageIndex);
                          return ns;
                        });
                      }
                    }
                    
                    // CRITICAL FIX: Delay showing answer to let sources display first
                    // Give 1000ms for sources to render in the research panel before answer appears
                    setTimeout(() => {
                      answerReadyToShow = true;
                    }, 1000);
                    
                    // NOTE: transientAnalysis is now cleared immediately above (line 707)
                    // No need for delayed clearing - status disappears when content starts
                  }
                  
                  // Handle final overwrite (enforced citations) vs incremental streaming
                  if (parsed.overwrite) {
                    // Replace entire content with final enforced version
                    streamedContent = parsed.content || '';
                  } else {
                    // Accumulate incremental content
                    streamedContent += parsed.content;
                  }
                }

                // Throttle UI updates to ~100ms AFTER message creation
                // This prevents excessive re-renders while ensuring message exists
                const now = Date.now();
                const UPDATE_THROTTLE = 100;
                if (now - lastStreamUpdateRef.current < UPDATE_THROTTLE) {
                  // Skip this update but content is already accumulated in streamedContent
                  continue;
                }
                lastStreamUpdateRef.current = now;

                // Brief thinking then a short overlap after answer starts
                const MINIMUM_THINKING_TIME = 800;
                const OVERLAP_AFTER_CONTENT = 1500; // keep steps visible briefly after answer begins
                const thinkingElapsedTime = thinkingStartTimeRef.current ? Date.now() - thinkingStartTimeRef.current : 0;
                const hasThinking = streamedThinking.length > 0;
                const overlapActive = firstContentTimeRef.current ? (Date.now() - firstContentTimeRef.current) < OVERLAP_AFTER_CONTENT : false;
                // CRITICAL FIX: Show thinking for ALL modes (not just browsing)
                const shouldShowThinking = hasThinking && (
                  (!answerReadyToShow && thinkingElapsedTime < MINIMUM_THINKING_TIME) || (answerReadyToShow && overlapActive)
                );

                // Update the assistant message with new content
                // CRITICAL: Pre-validate before entering setState to avoid error logs
                const idx = streamingIndexRef.current as number | null;
                if (idx == null || idx >= latestMessagesRef.current.length) {
                  // Message not created yet or not committed - skip this update silently
                  // Content is accumulated in streamedContent and will be applied in next cycle
                  continue;
                }
                
                setMessages((prev) => {
                  const updated = [...prev];
                  
                  // idx is guaranteed valid here due to pre-validation
                  // Just update the message directly
                  updated[idx] = {
                    ...updated[idx],
                    content: streamedContent,
                    thinkingContent: streamedThinking, // CRITICAL FIX: Show for all modes
                    isStreaming: true,
                    isThinking: shouldShowThinking,
                  };
                  
                  return updated;
                });
              } catch (e) {
                // Skip malformed/incomplete chunk; next read will bring more data
                continue;
              }
            }
          }
        }

        // Graceful transition: if thinking showed, ensure it stayed briefly
        const MINIMUM_THINKING_TIME = 800;
        const thinkingElapsedTime = thinkingStartTimeRef.current ? Date.now() - thinkingStartTimeRef.current : MINIMUM_THINKING_TIME;
        const remainingThinkingTime = Math.max(0, MINIMUM_THINKING_TIME - thinkingElapsedTime);
        // CRITICAL FIX: Show thinking for ALL modes
        if (remainingThinkingTime > 0 && streamedThinking) {
          await new Promise(resolve => setTimeout(resolve, remainingThinkingTime));
        }
        
        // CRITICAL FIX: Check if we actually received content before finalizing
        if (!hasReceivedContent && !streamedContent) {
          console.error('❌ [ChatInterface] Stream ended without receiving any content');
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: "⚠️ **Streaming Error**\n\nI couldn't receive a response from the AI. This may be due to:\n- Network connectivity issues\n- Server streaming compatibility\n- API timeout or error\n\n**Please try again.** If the issue persists, check the browser console and server logs for details.",
            timestamp: new Date(),
            isStreaming: false,
            isThinking: false,
          }]);
          return;
        }
        
        setMessages((prev) => {
          const updated = [...prev];
          let idx = streamingIndexRef.current ?? updated.length - 1;
          
          // Try to find the assistant message to finalize
          if (idx < 0 || idx >= updated.length || updated[idx]?.role !== 'assistant') {
            const found = [...updated].reverse().findIndex((m) => m.role === 'assistant' && m.isStreaming);
            if (found !== -1) {
              idx = updated.length - 1 - found;
              streamingIndexRef.current = idx;
            }
          }
          
          // If still invalid but we have content, create new message
          if (idx < 0 || idx >= updated.length || updated[idx]?.role !== 'assistant') {
            console.warn('⚠️ [ChatInterface] No streaming message found, creating new assistant message');
            return [...prev, {
              role: 'assistant',
              content: streamedContent || "I received a response but couldn't display it correctly. Please try again.",
              thinkingContent: streamedThinking, // CRITICAL FIX: Show for all modes
              memoryNarrative: '', // Memory already cleared by this point
              timestamp: new Date(),
              isStreaming: false,
              isThinking: false,
            }];
          }
          
          // Finalize the existing streaming message
          updated[idx] = {
            ...updated[idx],
            content: streamedContent,
            thinkingContent: streamedThinking, // CRITICAL FIX: Show for all modes
            memoryNarrative: '', // Memory already cleared by this point
            isStreaming: false,
            isThinking: false,
          };
          console.log('🏁 [ChatInterface] finalize', { idx, contentLen: streamedContent.length, thinkingLen: streamedThinking.length });
          return updated;
        });
        
        thinkingStartTimeRef.current = null;
        firstContentTimeRef.current = null;
        
        // Mark active research session as complete
        if (activeResearchIdRef.current) {
          const pendingResearchId = activeResearchIdRef.current;
          const completedIdx: number | null = streamingIndexRef.current;
          
          // Get the assistant message ID for final session
          const assistantMessageId = completedIdx !== null && messages[completedIdx] 
            ? messages[completedIdx].timestamp?.getTime?.()?.toString()
            : null;
          
          setResearchSessions((prev) => {
            const updated = new Map(prev);
            
            // CRITICAL FIX: Finalize session under BOTH IDs (pending and assistant)
            // Sources were received under pending ID during streaming
            const pendingSession = updated.get(pendingResearchId);
            
            if (pendingSession && assistantMessageId) {
              // Mark session as complete
              pendingSession.isActive = false;
              
              // Ensure assistant message ID has the complete session
              updated.set(assistantMessageId, {
                ...pendingSession,
                messageId: assistantMessageId,
              });
              
              // Clean up pending session if it's different from assistant ID
              if (pendingResearchId !== assistantMessageId) {
                updated.delete(pendingResearchId);
              }
              
              console.log('✅ Research complete:', assistantMessageId, 'Sources:', pendingSession.verifiedSources.length);
            } else if (pendingSession) {
              // Fallback: just mark pending as complete
              pendingSession.isActive = false;
              updated.set(pendingResearchId, pendingSession);
              console.log('✅ Research complete (pending):', pendingResearchId, 'Sources:', pendingSession.verifiedSources.length);
            } else {
              console.warn('⚠️ No session found to finalize:', pendingResearchId);
            }
            
            return updated;
          });
          
          // AUTO-COLLAPSE: Close the panel 2 seconds after answer finishes streaming
          // This keeps the chat clean while allowing users to see sources during research
          if (completedIdx !== null) {
            setTimeout(() => {
              setExpandedSources((prev) => {
                const ns = new Set(prev);
                ns.delete(completedIdx as number);
                return ns;
              });
            }, 2000); // 2 seconds after answer completes
          }
          
          // DON'T reset activeResearchIdRef yet - keep for potential follow-ups
          // It will be reset on next sendMessage
        }
      } else {
        const data = await response.json();
        
        const content = data.message || data.error || 'An error occurred';
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: content,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      // Check if the error is due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted by user');
        // Don't show error message, just stop gracefully
        return;
      }
      
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment or contact us directly.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsResearching(false); // Clear research state on completion or error
      setIsStreaming(false);
      isResearchingRef.current = false; // Sync ref
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (typeof window !== 'undefined' && window.innerWidth < 640) {
        inputRef.current?.blur();
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 100);
      }
      sendMessage();
    }
  };

  return (
    <div 
      className={cn(
        "flex flex-col overflow-hidden",
        isFullscreen ? "h-full" : "h-screen",
        className
      )}
      style={{ maxHeight: '100vh' }}
    >
      {/* Header - Full Width Background - Match website header h-16 */}
      {showHeader && (
        <div className="relative bg-gradient-to-r from-maritime-600 via-blue-600 to-indigo-600 w-full flex-shrink-0 h-16">
          <div className="container mx-auto px-4 h-full">
            <div className="flex items-center justify-between h-full">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <FleetCoreLogo 
                  variant="dark"
                  className="transition-all duration-300"
                />
              </div>

              {/* Center Title */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <h1 className="text-lg lg:text-xl font-bold text-white enterprise-heading whitespace-nowrap">
                  AI Maritime Expert
                </h1>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-4">
                {toggleDarkMode && (
                  <button
                    onClick={toggleDarkMode}
                    className="w-10 h-10 rounded-xl hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    aria-label="Toggle theme"
                  >
                    {darkMode ? (
                      <Sun className="w-5 h-5 text-white" />
                    ) : (
                      <Moon className="w-5 h-5 text-white" />
                    )}
                  </button>
                )}
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                    aria-label="Close chat"
                  >
                    <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 lg:p-6 space-y-3 md:space-y-4 lg:space-y-5 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 relative min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(59 130 246) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        <div className="relative z-10 space-y-3 md:space-y-4 lg:space-y-5 max-w-5xl mx-auto w-full px-2 sm:px-0">
          {messages.map((message, index) => {
            // Get research session for this message if it's an assistant message
            const messageId = message.timestamp?.getTime?.()?.toString() || '';
            const researchSession = message.role === 'assistant' ? researchSessions.get(messageId) : null;
            
            // PHASE 3 FIX: Only show research panel when we have actual sources loaded
            // Don't show it just because research is active - prevents empty panel flash
            const hasActualResearch = researchSession && researchSession.verifiedSources.length > 0;
            
            return (
            <div key={`${message.timestamp?.toString?.() || index}-${index}`}>
              {/* User message bubble */}
              {message.role === 'user' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex gap-2 sm:gap-4 justify-end"
                >
                  <div
                    className="max-w-[95%] sm:max-w-[90%] rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 bg-gradient-to-r from-maritime-600 via-blue-600 to-indigo-600 text-white border border-blue-500/20"
                  >
                    <div className="text-sm sm:text-base leading-relaxed font-medium whitespace-pre-wrap text-white !text-white [&_*]:!text-white">
                      {message.content}
                    </div>
                    <p className="text-xs mt-2 font-semibold text-white/90">
                      {message.timestamp?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </motion.div>
              )}
              
              {/* Research Panel - positioned between user and assistant */}
              {hasActualResearch && message.role === 'assistant' && (
                <motion.div 
                  key={`research-${messageId}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 mb-3 ml-14 mr-auto max-w-[85%]"
                >
                  {/* Panel Header */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-maritime-50 to-blue-50 dark:from-maritime-900/30 dark:to-blue-900/30 border border-maritime-200 dark:border-maritime-700 hover:shadow-md transition-all group"
                      onClick={() => {
                        const newSet = new Set(expandedSources);
                        if (newSet.has(index)) newSet.delete(index); else newSet.add(index);
                        setExpandedSources(newSet);
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-maritime-600 dark:text-maritime-400 animate-pulse" />
                      <span className="text-sm font-bold text-maritime-700 dark:text-maritime-300">
                        AI Research
                      </span>
                      {expandedSources.has(index) ? (
                        <ChevronUp className="w-4 h-4 text-maritime-600 dark:text-maritime-400 group-hover:-translate-y-0.5 transition-transform" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-maritime-600 dark:text-maritime-400 group-hover:translate-y-0.5 transition-transform" />
                      )}
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {researchSession && researchSession.verifiedSources.length > 0 && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            {researchSession.verifiedSources.length} {researchSession.verifiedSources.length === 1 ? 'Source' : 'Sources'} Verified
                          </span>
                        </motion.div>
                      )}
                      
                      {/* PHASE 3: Confidence Indicator */}
                      {researchSession && (researchSession as any).confidence && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border",
                            (researchSession as any).confidence.label === 'high' && "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
                            (researchSession as any).confidence.label === 'medium' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                            (researchSession as any).confidence.label === 'low' && "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                          )}
                          title={(researchSession as any).confidence.reasoning}
                        >
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wide",
                            (researchSession as any).confidence.label === 'high' && "text-emerald-700 dark:text-emerald-300",
                            (researchSession as any).confidence.label === 'medium' && "text-blue-700 dark:text-blue-300",
                            (researchSession as any).confidence.label === 'low' && "text-amber-700 dark:text-amber-300"
                          )}>
                            {(researchSession as any).confidence.label} confidence
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            ({(researchSession as any).confidence.score}/100)
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                  {expandedSources.has(index) && researchSession && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-lg">
                          
                          {/* Current Analysis */}
                      {researchSession.transientAnalysis && (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="mb-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-500"
                            >
                              <div className="flex items-start gap-2">
                                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                          {researchSession.transientAnalysis}
                        </div>
                              </div>
                            </motion.div>
                          )}

                          {/* Research Steps Timeline */}
                          {(() => {
                            const recent = researchSession.events.slice(-30);
                            const steps = recent.filter(e => e.type === 'step');
                            
                            return (
                              <>
                                {/* Active Steps */}
                                {steps.length > 0 && (
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Research Steps</h4>
                                    </div>
                                    <div className="space-y-2">
                                      {steps.slice(-3).map((step, idx) => (
                                        <motion.div
                                          key={idx}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: idx * 0.1 }}
                                          className="flex items-center gap-2 text-xs"
                                        >
                                <div className={cn(
                                            "w-2 h-2 rounded-full flex-shrink-0",
                                            step.status === 'end' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'
                                          )} />
                                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {step.title}
                                          </span>
                                          {step.status === 'start' && (
                                            <span className="text-slate-500 dark:text-slate-400">processing...</span>
                                          )}
                                          {step.status === 'end' && (
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                          )}
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              </>
                            );
                          })()}

                          {/* Unified Source Evaluation - Dynamic Badges with Click-through */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Globe className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                  Source Evaluation {researchSession.verifiedSources.length > 0 && `(${researchSession.verifiedSources.length} Verified)`}
                                </h4>
                              </div>
                              <div className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                                <button
                                  onClick={() => setSourceFilter('accepted')}
                                  className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-md transition-all",
                                    sourceFilter === 'accepted' 
                                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" 
                                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  )}
                                >
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="font-medium">Accepted</span>
                                </button>
                                <button
                                  onClick={() => setSourceFilter('rejected')}
                                  className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-md transition-all",
                                    sourceFilter === 'rejected' 
                                      ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" 
                                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  )}
                                >
                                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                                  <span className="font-medium">Rejected</span>
                                </button>
                                </div>
                            </div>

                            {/* Animated Source Badges - Simple Fade In/Out */}
                            <div className="relative min-h-[140px] p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                              <AnimatePresence mode="popLayout">
                                {(() => {
                                  // Get all sources from this research session
                                  const allSources = researchSession.events.filter(e => e.type === 'source');
                                  // CRITICAL FIX: Show ALL sources, not just last 20
                                  // Selected sources come FIRST, so slice(-20) was hiding them!
                                  const recentSources = allSources; // Show all sources
                                  
                                  // GROUPED LOGGING: Only log when source count or filter changes (prevents 60+ logs)
                                  const currentLogKey = `${messageId}-${allSources.length}-${sourceFilter}`;
                                  const lastLogKey = lastSourceDisplayLogRef.current 
                                    ? `${lastSourceDisplayLogRef.current.messageId}-${lastSourceDisplayLogRef.current.count}-${lastSourceDisplayLogRef.current.filter}`
                                    : null;
                                  
                                  if (currentLogKey !== lastLogKey && allSources.length > 0) {
                                    console.log('🎯 [Source Display]', {
                                      totalSources: allSources.length,
                                      currentFilter: sourceFilter,
                                      selectedCount: recentSources.filter(s => s.action === 'selected').length,
                                      rejectedCount: recentSources.filter(s => s.action === 'rejected').length,
                                      messageId: messageId.substring(0, 13) + '...'
                                    });
                                    lastSourceDisplayLogRef.current = { 
                                      count: allSources.length, 
                                      filter: sourceFilter,
                                      messageId 
                                    };
                                  }
                                  
                                  // Filter based on selected filter
                                  const filteredSources = recentSources.filter(source => {
                                    // CRITICAL FIX: Check multiple possible action values
                                    // Backend might emit 'selected', 'accepted', or other variants
                                    const action = String(source.action || '').toLowerCase();
                                    const isAccepted = action === 'selected' || action === 'accepted' || action === 'verified';
                                    const isRejected = action === 'rejected' || action === 'discarded' || action === 'filtered';
                                    
                                    if (sourceFilter === 'accepted') return isAccepted;
                                    if (sourceFilter === 'rejected') return isRejected;
                                    return true; // 'all'
                                  });
                                  
                                  // Improved loading state detection
                                  if (filteredSources.length === 0 && allSources.length === 0) {
                                    return (
                                      <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center justify-center h-[100px] text-xs text-slate-500 dark:text-slate-400"
                                      >
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        <span>{researchSession.isActive ? 'Sources loading...' : 'No sources found'}</span>
                                      </motion.div>
                                    );
                                  }
                                  
                                  if (filteredSources.length === 0) {
                                    const message = sourceFilter === 'accepted' 
                                      ? `No sources accepted (${allSources.length} total found)`
                                      : sourceFilter === 'rejected'
                                      ? `No sources rejected (${allSources.length} total found)`
                                      : 'No sources found';
                                    
                                    return (
                                      <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center h-[100px] text-xs text-slate-500 dark:text-slate-400 gap-2"
                                      >
                                        <span>{message}</span>
                                        {allSources.length > 0 && (
                                          <button
                                            onClick={() => setSourceFilter('all')}
                                            className="text-blue-500 hover:text-blue-600 underline"
                                          >
                                            View all sources
                                          </button>
                                        )}
                                      </motion.div>
                                    );
                                  }
                                  
                                  return filteredSources.map((source, idx) => {
                                    // CRITICAL FIX: Check multiple possible action values
                                    const action = String(source.action || '').toLowerCase();
                                    const isAccepted = action === 'selected' || action === 'accepted' || action === 'verified';
                                    const url = String(source.url || '');
                                    const domain = url.replace(/^https?:\/\//, '').split('/')[0];
                                    const path = url.replace(/^https?:\/\/[^/]+/, '').slice(0, 50);
                                    
                                    // Rejected sources - not clickable, just display
                                    if (!isAccepted) {
                                      return (
                                        <motion.div
                                          key={`${source.url}-${idx}-reject`}
                                          layout
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          exit={{ opacity: 0 }}
                                          transition={{ duration: 0.3 }}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium m-1 bg-rose-100 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200"
                                        >
                                          <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                          <span className="truncate max-w-[150px]">{domain}</span>
                                        </motion.div>
                                      );
                                    }
                                    
                                    // Accepted sources - clickable links
                                    return (
                                      <motion.a
                                        key={`${source.url}-${idx}-accept`}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium m-1 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer group"
                                        title={url}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                        <div className="flex flex-col items-start min-w-0">
                                          <span className="truncate max-w-[150px] font-semibold">{domain}</span>
                                          {path && (
                                            <span className="truncate max-w-[150px] text-[10px] opacity-70">
                                              {path}
                                            </span>
                                          )}
                                        </div>
                                        <svg className="w-2.5 h-2.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </motion.a>
                                    );
                                  });
                          })()}
                              </AnimatePresence>
                      </div>
                    </div>
                </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Assistant message bubble */}
              {message.role === 'assistant' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex gap-2 sm:gap-4 justify-start"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-maritime-500 via-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
                  <img
                    src="/assets/avatar/Generated Image October 24, 2025 - 8_11PM.png"
                    alt="AI"
                    className="w-full h-full object-cover object-center transform scale-125"
                    loading="lazy"
                  />
                </div>
                
                <div
                  className="max-w-[95%] sm:max-w-[90%] rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/30 text-slate-900 dark:text-slate-100 overflow-x-auto"
                >
                  {message.role === 'assistant' && message.isThinking && !message.content && !message.thinkingContent && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        Thinking<motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >...</motion.span>
                      </span>
                    </motion.div>
                  )}
                
                  {/* Memory narrative - conversation context (subtle, greyed, disappears when answer starts) */}
                  {message.memoryNarrative && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs text-slate-400 dark:text-slate-500 italic mb-3 leading-relaxed"
                    >
                      {message.memoryNarrative}
                    </motion.div>
                  )}
                
                  {/* Always render content area; show streaming cursor even if empty */}
                  <>
                    <div className="text-sm sm:text-base leading-relaxed enterprise-body prose prose-slate dark:prose-invert max-w-none prose-a:text-maritime-600 prose-a:dark:text-maritime-400 prose-a:font-semibold prose-a:no-underline prose-a:hover:underline">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              // P1 FIX: Custom citation link renderer for [[N]](url) format
                              a: ({ node, href, children, ...props }) => {
                                // Convert children to string - handle arrays and React nodes
                                let childText = '';
                                if (Array.isArray(children)) {
                                  childText = children.map(c => String(c)).join('');
                                } else {
                                  childText = String(children || '');
                                }
                                
                                // Detect citation format: [1], [12], etc.
                                // Markdown [[1]](url) renders as link with text "[1]"
                                const trimmed = childText.trim();
                                const isCitation = /^\[\d+\]$/.test(trimmed);
                                
                                if (isCitation && href) {
                                  // Extract citation number (strip brackets)
                                  const num = trimmed.replace(/\[|\]/g, '');
                                  return (
                                    <a 
                                      href={href} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="citation-link inline-flex items-baseline text-maritime-600 dark:text-maritime-400 hover:text-maritime-700 dark:hover:text-maritime-300 no-underline hover:underline font-semibold transition-colors duration-200 text-sm"
                                      title={href}
                                      {...props}
                                    >
                                      [{num}]
                                    </a>
                                  );
                                }
                                
                                // Regular link - open in new tab
                                return (
                                  <a 
                                    href={href} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-maritime-600 dark:text-maritime-400 hover:text-maritime-700 dark:hover:text-maritime-300 underline font-semibold"
                                    {...props}
                                  >
                                    {children}
                                  </a>
                                );
                              },
                              p: ({ node, children, ...props }) => {
                                const content = String(children);
                                if (content.trim().match(/^\*\*Sources:\*\*$/i) || content.trim().match(/^Sources:$/i)) {
                                  const isExpanded = expandedSources.has(index);
                                  return (
                                    <>
                                      <button
                                        onClick={() => {
                                          const newExpanded = new Set(expandedSources);
                                          if (isExpanded) {
                                            newExpanded.delete(index);
                                          } else {
                                            newExpanded.add(index);
                                          }
                                          setExpandedSources(newExpanded);
                                        }}
                                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-maritime-50/50 dark:bg-maritime-900/20 border border-maritime-200/50 dark:border-maritime-800/40 hover:bg-maritime-100/50 dark:hover:bg-maritime-900/30 transition-colors text-left my-4"
                                      >
                                        {isExpanded ? (
                                          <ChevronUp className="w-4 h-4 text-maritime-600 dark:text-maritime-400 flex-shrink-0" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4 text-maritime-600 dark:text-maritime-400 flex-shrink-0" />
                                        )}
                                        <span className="text-sm font-semibold text-maritime-700 dark:text-maritime-300">
                                          Sources {isExpanded ? '(hide)' : '(show)'}
                                        </span>
                                      </button>
                                      {!isExpanded && <div data-sources-collapsed="true" className="hidden" />}
                                    </>
                                  );
                                }
                                
                                const lowerContent = message.content.toLowerCase();
                                const sourcesIndex = lowerContent.indexOf('**sources:**');
                                if (sourcesIndex === -1) {
                                  return <p {...props} className="my-2 leading-relaxed">{children}</p>;
                                }
                                
                                const contentAfterSources = message.content.substring(sourcesIndex);
                                const isAfterSources = contentAfterSources.includes(content.substring(0, Math.min(50, content.length)));
                                const isCollapsed = !expandedSources.has(index);
                                
                                if (isAfterSources && isCollapsed && !content.trim().match(/^\*\*Sources:\*\*$/i)) {
                                  return null;
                                }
                                
                                return <p {...props} className="my-2 leading-relaxed">{children}</p>;
                              },
                              a: ({ node, ...props }) => (
                                <a
                                  {...props}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-baseline gap-1 text-maritime-600 dark:text-maritime-400 hover:text-maritime-700 dark:hover:text-maritime-300 font-semibold border-b-2 border-maritime-300 dark:border-maritime-600 hover:border-maritime-600 dark:hover:border-maritime-400 transition-colors break-words"
                                >
                                  {props.children}
                                  <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              ),
                              strong: ({ node, ...props }) => (
                                <strong {...props} className="font-bold text-maritime-700 dark:text-maritime-300" />
                              ),
                              code: ({ node, inline, ...props }: any) => 
                                inline ? (
                                  <code {...props} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-sm font-mono" />
                                ) : (
                                  <code {...props} className="block px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-mono overflow-x-auto" />
                                ),
                              ul: ({ node, ...props }) => (
                                <ul {...props} className="list-disc list-inside space-y-1 my-2" />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol {...props} className="list-decimal list-outside space-y-2 my-3 ml-6" />
                              ),
                              li: ({ node, ...props }) => (
                                <li {...props} className="leading-relaxed" />
                              ),
                              h1: ({ node, ...props }) => (
                                <h1 {...props} className="text-xl font-bold mt-4 mb-2 text-maritime-900 dark:text-maritime-100" />
                              ),
                              h2: ({ node, ...props }) => (
                                <h2 {...props} className="text-lg font-bold mt-3 mb-2 text-maritime-800 dark:text-maritime-200" />
                              ),
                              h3: ({ node, ...props }) => (
                                <h3 {...props} className="text-base font-bold mt-2 mb-1 text-maritime-800 dark:text-maritime-200" />
                              ),
                            }}
                          >
                            {sanitizeAssistantContent(message.content)}
                          </ReactMarkdown>
                          {message.isStreaming && (
                            <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse align-baseline" />
                          )}
                    </div>
                  </>
                  <p className="text-xs mt-2 font-semibold text-slate-500 dark:text-slate-400">
                    {message.timestamp?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
                  </p>
                </div>
              </motion.div>
              )}
            </div>
          );
          })}
          
          {(isLoading || isResearching) && (
            <LoadingIndicator 
              isResearching={isResearching}
              useBrowsing={currentUseBrowsing}
              activeResearchId={activeResearchIdRef.current}
              researchSessions={researchSessions}
            />
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div 
        ref={inputAreaRef}
        className="px-3 pt-3 pb-3 md:p-5 lg:p-6 border-t border-white/20 dark:border-slate-700/30 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 flex-shrink-0 z-20 shadow-lg"
      >
        <div className="flex gap-2 md:gap-3 max-w-5xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 640) {
                window.scrollTo(0, 0);
              }
            }}
            placeholder="Ask about maritime maintenance, SOLAS..."
            disabled={isLoading}
            className="flex-1 px-3 md:px-5 lg:px-6 py-2.5 md:py-3 lg:py-4 rounded-xl lg:rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-maritime-500 focus:border-maritime-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base font-medium transition-all shadow-sm hover:shadow-md enterprise-body"
            style={{ 
              fontSize: '16px',
              WebkitAppearance: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          />
          {isStreaming ? (
            <button
              onClick={stopGeneration}
              className="px-3 md:px-5 lg:px-7 py-2.5 md:py-3 lg:py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl lg:rounded-2xl transition-all transform hover:scale-105 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 shadow-lg flex items-center justify-center min-w-[50px] md:min-w-[60px] lg:min-w-[70px] group"
              title="Stop generation"
            >
              <Square className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-3 md:px-5 lg:px-7 py-2.5 md:py-3 lg:py-4 bg-gradient-to-r from-maritime-600 via-blue-600 to-indigo-600 hover:from-maritime-700 hover:via-blue-700 hover:to-indigo-700 text-white rounded-xl lg:rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 shadow-lg flex items-center justify-center min-w-[50px] md:min-w-[60px] lg:min-w-[70px] group"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                <Send className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 md:mt-3 lg:mt-4 gap-2 md:gap-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            {/* Removed Online Research toggle; browsing is now context-aware */}
            {toggleDarkMode && (
              <button
                type="button"
                onClick={toggleDarkMode}
                className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                aria-label="Toggle theme"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                )}
              </button>
            )}
          </div>
          
          <button
            type="button"
            onClick={resetChat}
            disabled={isLoading}
            className={cn(
              'group inline-flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all flex-shrink-0',
              'text-slate-600 dark:text-slate-400',
              'hover:text-slate-900 dark:hover:text-slate-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Reset chat"
          >
            <RotateCcw className="w-5 h-5 md:w-5 md:h-5 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-xs md:text-sm font-semibold whitespace-nowrap">Reset Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

