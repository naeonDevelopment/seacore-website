import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Bot, User, Brain, Globe, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean; // Currently being streamed
  isThinking?: boolean; // Showing thinking animation
  thinkingContent?: string; // Chain-of-thought reasoning
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your maritime maintenance expert. I can help you understand fleetcore's features, maritime regulations, and answer questions about maintenance management. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelName, setModelName] = useState<string>('GPT');
  const [useBrowsing, setUseBrowsing] = useState<boolean>(false);
  // Chain of Thought is now ALWAYS enabled for better research quality
  const useChainOfThought = true; // Always on
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  // Track the index of the currently streaming assistant message reliably
  const streamingIndexRef = useRef<number | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  
  // Progressive thinking display state
  const [currentThinkingStep, setCurrentThinkingStep] = useState<number>(0);
  
  // Track expanded sources per message
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  
  // Track when thinking started to enforce minimum display time
  const thinkingStartTimeRef = useRef<number | null>(null);
  
  // Track viewport dimensions for mobile keyboard handling
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
  const [viewportTop, setViewportTop] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollInputIntoView = () => {
    // Use a small delay to ensure keyboard is fully shown
    setTimeout(() => {
      inputAreaRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'nearest'
      });
    }, 100);
  };

  const resetChat = () => {
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
  };

  // Extract clean thinking steps WITHOUT labels (Understanding:, Analysis:, etc.)
  const extractThinkingSteps = (thinking: string): string[] => {
    if (!thinking) return [];
    
    // Remove markers and split into sentences
    const cleaned = thinking
      .replace(/\*\*THINKING:\*\*/g, '')
      .replace(/\*\*ANSWER:\*\*/g, '')
      .replace(/THINKING:/g, '')
      .replace(/ANSWER:/g, '')
      .trim();
    
    // Split by the standard thinking step labels
    const stepLabels = ['Understanding:', 'Analysis:', 'Source Review:', 'Cross-Reference:', 'Synthesis:', 'Conclusion:'];
    const steps: string[] = [];
    
    stepLabels.forEach(label => {
      const regex = new RegExp(label + '\\s*(.+?)(?=' + stepLabels.filter(l => l !== label).join('|') + '|$)', 's');
      const match = cleaned.match(regex);
      if (match && match[1]) {
        const cleanStep = match[1].trim();
        if (cleanStep.length > 10) {
          steps.push(cleanStep);
        }
      }
    });
    
    // Fallback: if no structured steps found, split by sentences
    if (steps.length === 0 && cleaned.length > 0) {
      const sentences = cleaned.split(/\.\s+/).filter(s => s.trim().length > 10);
      return sentences.slice(0, 6); // Max 6 thoughts
    }
    
    return steps;
  };

  // Progressive thinking step cycling - like o1/Perplexity/Cursor
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    
    // Only cycle if: assistant message, has thinking, is streaming, AND thinking not complete
    if (lastMessage?.role === 'assistant' && lastMessage?.thinkingContent && lastMessage?.isThinking) {
      const steps = extractThinkingSteps(lastMessage.thinkingContent);
      
      if (steps.length > 1) {
        // Cycle through steps every 1.5 seconds
        const interval = setInterval(() => {
          setCurrentThinkingStep((prev) => {
            const next = (prev + 1) % steps.length;
            return next;
          });
        }, 1500); // Slightly slower for readability
        
        return () => clearInterval(interval);
      }
    } else {
      // Reset step counter when not thinking
      setCurrentThinkingStep(0);
    }
  }, [messages]);

  // Only scroll when a NEW message is added, not during streaming updates
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      scrollToBottom();
      lastMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  // Mobile-only: Lock body scroll to prevent confusion with chat scroll
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && window.innerWidth < 640) {
      // Store original styles and scroll position
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      // Lock body scroll on mobile only
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      
      // Don't auto-focus on mobile to avoid keyboard popping up unexpectedly
      // User can tap the input when ready
      
      return () => {
        // Restore original styles
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.overflow = originalOverflow;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    } else if (isOpen) {
      // Desktop: just focus input
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Handle mobile viewport changes (keyboard appearance)
  useEffect(() => {
    if (!isOpen) return;

    const updateViewportDimensions = () => {
      if (typeof window === 'undefined') return;
      
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        // Use Visual Viewport API for accurate dimensions
        setViewportHeight(visualViewport.height);
        setViewportTop(visualViewport.offsetTop);
        
        // Scroll input into view when keyboard appears
        if (document.activeElement === inputRef.current) {
          scrollInputIntoView();
        }
      } else {
        // Fallback for browsers without Visual Viewport API
        setViewportHeight(window.innerHeight);
        setViewportTop(0);
      }
    };

    // Initial update
    updateViewportDimensions();

    // Handle input focus - ensure input is visible
    const handleFocus = () => {
      scrollInputIntoView();
    };

    // Add event listeners
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

    // Cleanup
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
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Show visual feedback for online research
      if (useBrowsing) {
        console.log('🌐 Online research enabled - fetching fresh data...');
      }
      
      const response = await fetch('/api/chatkit/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          enableBrowsing: useBrowsing,
          enableChainOfThought: useChainOfThought,
          researchComplexity: 'simple', // Default to Perplexity-style
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      // Check if streaming response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // Capture model name (if provided by server) for header UI
        const hdrModel = response.headers.get('x-model');
        if (hdrModel) setModelName(hdrModel);
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        let streamedContent = '';
        let streamedThinking = '';
        let hasReceivedContent = false;
        let answerReadyToShow = false;
        // Add empty streaming message with thinking indicator
        streamingIndexRef.current = null;
        
        // Start thinking timer
        thinkingStartTimeRef.current = Date.now();
        
        setMessages((prev) => {
          const index = prev.length;
          streamingIndexRef.current = index;
          return [...prev, {
            role: 'assistant',
            content: '',
            thinkingContent: '',
            timestamp: new Date(),
            isStreaming: true,
            isThinking: true, // Show thinking animation initially
          }];
        });

        if (reader) {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let newlineIndex = buffer.indexOf('\n');
            while (newlineIndex !== -1) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              newlineIndex = buffer.indexOf('\n');

              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'thinking') {
                  streamedThinking += parsed.content;
                  console.log('🧠 Received thinking section, length:', parsed.content.length);
                } else if (parsed.type === 'content') {
                  // First content received = answer is ready
                  if (!hasReceivedContent) {
                    hasReceivedContent = true;
                    answerReadyToShow = true;
                    console.log('✅ Answer content received, enforcing minimum thinking display time...');
                  }
                  streamedContent += parsed.content;
                }

                // Calculate if minimum thinking time has elapsed (9 seconds for 6 steps)
                const MINIMUM_THINKING_TIME = 9000; // 9 seconds
                const thinkingElapsedTime = thinkingStartTimeRef.current ? Date.now() - thinkingStartTimeRef.current : 0;
                const shouldHideThinking = answerReadyToShow && (thinkingElapsedTime >= MINIMUM_THINKING_TIME || !streamedThinking);

                setMessages((prev) => {
                  const updated = [...prev];
                  const idx = streamingIndexRef.current ?? updated.length - 1;
                  updated[idx] = {
                    role: 'assistant',
                    content: streamedContent,
                    thinkingContent: streamedThinking,
                    timestamp: new Date(),
                    isStreaming: true,
                    isThinking: !shouldHideThinking, // Only hide thinking after minimum time
                  };
                  return updated;
                });
              } catch (_) {
                // wait for more data
                buffer = line + '\n' + buffer;
                break;
              }
            }
          }
        }

        // Finalize message - ensure thinking displays for minimum time
        const MINIMUM_THINKING_TIME = 9000;
        const thinkingElapsedTime = thinkingStartTimeRef.current ? Date.now() - thinkingStartTimeRef.current : MINIMUM_THINKING_TIME;
        const remainingThinkingTime = Math.max(0, MINIMUM_THINKING_TIME - thinkingElapsedTime);
        
        if (remainingThinkingTime > 0 && streamedThinking) {
          console.log(`⏰ Waiting ${remainingThinkingTime}ms for thinking to complete display cycle...`);
          await new Promise(resolve => setTimeout(resolve, remainingThinkingTime));
        }
        
        setMessages((prev) => {
          const updated = [...prev];
          const idx = streamingIndexRef.current ?? updated.length - 1;
          updated[idx] = {
            ...updated[idx],
            isStreaming: false,
            isThinking: false, // Remove thinking indicator after minimum time
          };
          return updated;
        });
        
        // Reset thinking timer
        thinkingStartTimeRef.current = null;
      } else {
        // Fallback to non-streaming or error response
        const data = await response.json();
        if (data?.model) setModelName(data.model);
        
        // Check if this is an error response with helpful information
        const content = data.message || data.error || 'An error occurred';
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: content,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        
        // Log helpful debug info if model failed
        if (data.attempted_model) {
          console.log('⚠️ Model failed:', data.attempted_model);
          console.log('✅ Available models:', data.available_models);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment or contact us directly.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Blur input immediately on mobile to reset zoom and hide keyboard
      if (typeof window !== 'undefined' && window.innerWidth < 640) {
        inputRef.current?.blur();
        // Small delay to let keyboard hide before scrolling
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 100);
      }
      sendMessage();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop - transparent on desktop, blocks on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[2147483600] pointer-events-none sm:pointer-events-none max-sm:pointer-events-auto max-sm:bg-black/10"
            style={{
              background: typeof window !== 'undefined' && window.innerWidth < 640 ? undefined : 'transparent'
            }}
          />

          {/* Modal - Mobile: full viewport, Desktop: centered with max-width */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.32, 0.72, 0, 1],
              opacity: { duration: 0.3 }
            }}
            style={{
              // On mobile, use Visual Viewport dimensions to fit above keyboard
              ...(typeof window !== 'undefined' && window.innerWidth < 640 ? {
                position: 'fixed',
                top: `${viewportTop}px`,
                left: 0,
                right: 0,
                height: `${viewportHeight}px`,
                maxHeight: `${viewportHeight}px`
              } : {})
            }}
            className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:left-auto sm:top-auto sm:w-[min(36rem,90vw)] sm:h-[min(80vh,44rem)] backdrop-blur-2xl bg-white/85 dark:bg-slate-900/85 border border-white/20 dark:border-slate-700/30 rounded-none sm:rounded-3xl shadow-2xl z-[2147483601] flex flex-col overflow-hidden max-w-[100vw]"
          >
            {/* Header with Maritime Gradient - matching home page style */}
            <div className="relative flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-maritime-600 via-blue-600 to-indigo-600">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg overflow-hidden">
                  <img
                    src="/assets/avatar/Generated Image October 24, 2025 - 8_11PM.png"
                    alt="fleetcore AI avatar"
                    className="w-full h-full object-cover object-center transform scale-125"
                    loading="lazy"
                  />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-white enterprise-heading">fleetcore AI Assistant</h2>
                  <p className="text-xs sm:text-sm text-white/95 font-semibold hidden sm:block">Maritime Maintenance Expert • {modelName} Powered</p>
                  <p className="text-xs text-white/95 font-semibold sm:hidden">Maritime Expert</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group flex-shrink-0"
                aria-label="Close chat"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>
              
              {/* Decorative gradient bar - matching home page cards */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>

            {/* Messages Area - matching home page background patterns */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 space-y-4 sm:space-y-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 relative">
              {/* Subtle background pattern like home page */}
              <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, rgb(59 130 246) 1px, transparent 0)`,
                  backgroundSize: '40px 40px'
                }}></div>
              </div>
              
              <div className="relative z-10 space-y-4 sm:space-y-6">
                {messages.map((message, index) => (
                  <div key={index}>
                    {/* Separate Thinking Component - Appears ABOVE message ONLY while thinking */}
                    {message.role === 'assistant' && message.thinkingContent && message.isThinking && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          'flex gap-2 sm:gap-4 mb-2',
                          'justify-start'
                        )}
                      >
                        {/* Spacer to align with assistant avatar */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
                        
                        {/* Thinking Display - Minimalist Cursor/o1 Style */}
                        <div className="max-w-[85%] sm:max-w-[80%] px-4 py-2 rounded-xl backdrop-blur-md bg-purple-50/60 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-800/40">
                          <div className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                              <Brain className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                            </motion.div>
                            <AnimatePresence mode="wait">
                              {(() => {
                                const steps = extractThinkingSteps(message.thinkingContent);
                                if (steps.length > 0) {
                                  const currentStep = steps[currentThinkingStep % steps.length];
                                  return (
                                    <motion.div
                                      key={currentThinkingStep}
                                      initial={{ opacity: 0, x: 10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -10 }}
                                      transition={{ duration: 0.4, ease: "easeOut" }}
                                      className="text-xs text-purple-700 dark:text-purple-300 font-medium leading-relaxed"
                                    >
                                      {currentStep}
                                    </motion.div>
                                  );
                                }
                                return null;
                              })()}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Message Bubble */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={cn(
                        'flex gap-2 sm:gap-4',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-maritime-500 via-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
                          <img
                            src="/assets/avatar/Generated Image October 24, 2025 - 8_11PM.png"
                            alt="AI"
                            className="w-full h-full object-cover object-center transform scale-125"
                            loading="lazy"
                          />
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          'max-w-[95%] sm:max-w-[90%] rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300',
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-maritime-600 via-blue-600 to-indigo-600 text-white border border-blue-500/20'
                            : 'backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/30 text-slate-900 dark:text-slate-100 overflow-x-auto'
                        )}
                      >
                        {/* Initial thinking animation - shows before ANY content */}
                        {message.role === 'assistant' && message.isThinking && !message.content && !message.thinkingContent && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2"
                          >
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <Brain className="w-5 h-5 text-maritime-600 dark:text-maritime-400" />
                            </motion.div>
                            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                              Thinking<motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                              >...</motion.span>
                            </span>
                          </motion.div>
                        )}
                      
                      {/* Message content - SEPARATE rendering for user vs assistant */}
                      {/* Only show content when thinking is complete OR if it's a user message */}
                      {message.content && (message.role === 'user' || !message.isThinking) && (
                        <>
                          {message.role === 'assistant' ? (
                            // Assistant messages: Use prose styles for markdown rendering
                            <div className="text-sm sm:text-base leading-relaxed enterprise-body prose prose-slate dark:prose-invert max-w-none prose-a:text-maritime-600 prose-a:dark:text-maritime-400 prose-a:font-semibold prose-a:no-underline prose-a:hover:underline">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  // Custom wrapper to detect and make Sources section collapsible
                                  p: ({ node, children, ...props }) => {
                                    const content = String(children);
                                    // Check if this paragraph contains "Sources:" heading
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
                                          {/* When collapsed, return marker div that children can check */}
                                          {!isExpanded && <div data-sources-collapsed="true" className="hidden" />}
                                        </>
                                      );
                                    }
                                    
                                    // Check if we're inside a collapsed sources section
                                    // Look for the Sources heading in the message and check if we're after it
                                    const lowerContent = message.content.toLowerCase();
                                    const sourcesIndex = lowerContent.indexOf('**sources:**');
                                    if (sourcesIndex === -1) {
                                      return <p {...props} className="my-2 leading-relaxed">{children}</p>;
                                    }
                                    
                                    // Find where this paragraph appears in the full content
                                    const contentAfterSources = message.content.substring(sourcesIndex);
                                    
                                    // Check if current content is in the "after sources" section
                                    const isAfterSources = contentAfterSources.includes(content.substring(0, Math.min(50, content.length)));
                                    const isCollapsed = !expandedSources.has(index);
                                    
                                    if (isAfterSources && isCollapsed && !content.trim().match(/^\*\*Sources:\*\*$/i)) {
                                      return null; // Hide content when sources is collapsed
                                    }
                                    
                                    return <p {...props} className="my-2 leading-relaxed">{children}</p>;
                                  },
                                  // Make links highly visible and clickable
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
                                  // Style strong/bold (including **fleetcore**)
                                  strong: ({ node, ...props }) => (
                                    <strong {...props} className="font-bold text-maritime-700 dark:text-maritime-300" />
                                  ),
                                  // Style code blocks
                                  code: ({ node, inline, ...props }: any) => 
                                    inline ? (
                                      <code {...props} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-sm font-mono" />
                                    ) : (
                                      <code {...props} className="block px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-mono overflow-x-auto" />
                                    ),
                                  // Style lists - cleaner nested list handling
                                  ul: ({ node, ...props }) => (
                                    <ul {...props} className="list-disc list-inside space-y-1 my-2" />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol {...props} className="list-decimal list-outside space-y-2 my-3 ml-6" />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li {...props} className="leading-relaxed" />
                                  ),
                                  // Style headings
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
                                {message.content}
                              </ReactMarkdown>
                              {message.isStreaming && <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />}
                            </div>
                          ) : (
                            // User messages: NO prose classes, explicit white text with !important to override any inherited styles
                            <div className="text-sm sm:text-base leading-relaxed font-medium whitespace-pre-wrap text-white !text-white [&_*]:!text-white">
                              {message.content}
                            </div>
                          )}
                        </>
                        )}
                        <p className={cn(
                          'text-xs mt-2 font-semibold',
                          message.role === 'user' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
                        )}>
                          {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {message.role === 'user' && (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                      )}
                    </motion.div>
                  </div>
                ))}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2 sm:gap-4"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-maritime-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                      <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/30 rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-maritime-600" />
                        {useBrowsing && (
                          <div className="flex items-center gap-1.5 text-xs text-maritime-600 dark:text-maritime-400 font-semibold">
                            <Globe className="w-3.5 h-3.5 animate-pulse" />
                            <span>Researching...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area - matching home page card style */}
            <div 
              ref={inputAreaRef}
              className="p-4 sm:p-6 border-t border-white/20 dark:border-slate-700/30 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80"
            >
              <div className="flex gap-2 sm:gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onBlur={() => {
                    // Force blur to reset zoom on mobile after submit
                    if (typeof window !== 'undefined' && window.innerWidth < 640) {
                      window.scrollTo(0, 0);
                    }
                  }}
                  placeholder="Ask about maritime maintenance, SOLAS..."
                  disabled={isLoading}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-maritime-500 focus:border-maritime-500 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium transition-all shadow-sm hover:shadow-md enterprise-body"
                  style={{ 
                    fontSize: '16px',
                    touchAction: 'manipulation'
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="px-4 sm:px-7 py-3 sm:py-4 bg-gradient-to-r from-maritime-600 via-blue-600 to-indigo-600 hover:from-maritime-700 hover:via-blue-700 hover:to-indigo-700 text-white rounded-xl sm:rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 shadow-lg flex items-center justify-center min-w-[60px] sm:min-w-[70px] group"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
                  )}
                </button>
              </div>
              <div className="flex items-center mt-3 sm:mt-4 gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={useBrowsing}
                  onClick={() => setUseBrowsing((v) => !v)}
                  className={cn(
                    'group inline-flex items-center gap-3 px-3 py-2 rounded-xl border transition-all',
                    useBrowsing
                      ? 'bg-maritime-50 border-maritime-200 text-maritime-700'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  )}
                >
                  <span className={cn(
                    'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
                    useBrowsing ? 'bg-maritime-600' : 'bg-slate-300 dark:bg-slate-700'
                  )}>
                    <span
                      className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow ring-1 ring-black/5 transition-transform',
                        useBrowsing ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold">Online research</span>
                </button>
                
                <button
                  type="button"
                  onClick={resetChat}
                  disabled={isLoading}
                  className={cn(
                    'group inline-flex items-center gap-2 px-2 py-2 rounded-xl transition-all',
                    'text-slate-600 dark:text-slate-400',
                    'hover:text-slate-900 dark:hover:text-slate-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  aria-label="Reset chat"
                >
                  <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="text-xs sm:text-sm font-semibold">Reset Chat</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatModal;

