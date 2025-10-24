import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Bot, User, Brain, Globe, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean; // Currently being streamed
  isThinking?: boolean; // Showing thinking animation
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  // Track the index of the currently streaming assistant message reliably
  const streamingIndexRef = useRef<number | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  
  // Track keyboard visibility for mobile
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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
  };

  // Only scroll when a NEW message is added, not during streaming updates
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      scrollToBottom();
      lastMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Handle mobile keyboard visibility and viewport changes
  useEffect(() => {
    if (!isOpen) return;

    // Visual Viewport API for precise keyboard detection
    const handleViewportResize = () => {
      if (typeof window === 'undefined') return;
      
      const visualViewport = window.visualViewport;
      if (!visualViewport) return;

      // Calculate keyboard height
      const windowHeight = window.innerHeight;
      const viewportHeight = visualViewport.height;
      const heightDiff = windowHeight - viewportHeight;

      // Keyboard is likely visible if there's significant height difference
      const keyboardVisible = heightDiff > 100;
      
      setIsKeyboardVisible(keyboardVisible);
      setKeyboardHeight(keyboardVisible ? heightDiff : 0);

      // Scroll input into view when keyboard appears
      if (keyboardVisible && document.activeElement === inputRef.current) {
        scrollInputIntoView();
      }
    };

    // Fallback for browsers without visualViewport API
    const handleResize = () => {
      if (typeof window === 'undefined' || window.visualViewport) return;
      
      const windowHeight = window.innerHeight;
      const screenHeight = window.screen.height;
      const heightDiff = screenHeight - windowHeight;
      
      const keyboardVisible = heightDiff > 200;
      setIsKeyboardVisible(keyboardVisible);
      setKeyboardHeight(keyboardVisible ? heightDiff : 0);
    };

    // Handle input focus - ensure input is visible
    const handleFocus = () => {
      setIsKeyboardVisible(true);
      scrollInputIntoView();
    };

    // Handle input blur - reset keyboard state
    const handleBlur = () => {
      // Small delay to allow keyboard to fully hide
      setTimeout(() => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }, 100);
    };

    // Add event listeners
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('focus', handleFocus);
      inputElement.addEventListener('blur', handleBlur);
    }

    // Cleanup
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }

      if (inputElement) {
        inputElement.removeEventListener('focus', handleFocus);
        inputElement.removeEventListener('blur', handleBlur);
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
        let hasReceivedContent = false;
        // Add empty streaming message with thinking indicator
        streamingIndexRef.current = null;
        
        setMessages((prev) => {
          const index = prev.length;
          streamingIndexRef.current = index;
          return [...prev, {
            role: 'assistant',
            content: '',
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
                if (parsed.type === 'content') {
                  streamedContent += parsed.content;
                  
                  // On first content, hide thinking indicator
                  if (!hasReceivedContent && streamedContent.length > 0) {
                    hasReceivedContent = true;
                  }
                }

                setMessages((prev) => {
                  const updated = [...prev];
                  const idx = streamingIndexRef.current ?? updated.length - 1;
                  updated[idx] = {
                    role: 'assistant',
                    content: streamedContent,
                    timestamp: new Date(),
                    isStreaming: true,
                    isThinking: !hasReceivedContent, // Hide thinking once content starts
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

        // Finalize message
        setMessages((prev) => {
          const updated = [...prev];
          const idx = streamingIndexRef.current ?? updated.length - 1;
          updated[idx] = {
            ...updated[idx],
            isStreaming: false,
            isThinking: false, // Remove thinking indicator
          };
          return updated;
        });
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
      sendMessage();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop with maritime gradient overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[2147483600] pointer-events-none"
            style={{
              background: 'transparent'
            }}
          />

          {/* Modal - Mobile: full screen with margins, Desktop: centered with max-width */}
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
              // On mobile, adjust height when keyboard is visible
              height: isKeyboardVisible && window.innerWidth < 640 
                ? `calc(100vh - ${keyboardHeight}px)` 
                : undefined
            }}
            className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:left-auto sm:top-auto sm:w-[min(36rem,90vw)] sm:h-[min(80vh,44rem)] backdrop-blur-2xl bg-white/85 dark:bg-slate-900/85 border border-white/20 dark:border-slate-700/30 rounded-none sm:rounded-3xl shadow-2xl z-[2147483601] flex flex-col overflow-hidden"
          >
            {/* Header with Maritime Gradient - matching home page style */}
            <div className="relative flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-maritime-600 via-blue-600 to-indigo-600">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg overflow-hidden">
                  <img
                    src="/assets/avatar/Generated Image October 24, 2025 - 5_31PM.png"
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 relative">
              {/* Subtle background pattern like home page */}
              <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, rgb(59 130 246) 1px, transparent 0)`,
                  backgroundSize: '40px 40px'
                }}></div>
              </div>
              
              <div className="relative z-10 space-y-4 sm:space-y-6">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
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
                          src="/assets/avatar/Generated Image October 24, 2025 - 5_31PM.png"
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
                          ? 'bg-gradient-to-r from-maritime-600 via-blue-600 to-indigo-600 text-white/70 dark:text-white/90 border border-blue-500/20'
                          : 'backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/30 text-slate-900 dark:text-slate-100 overflow-x-auto'
                      )}
                    >
                      {/* Thinking animation - shows before content starts */}
                      {message.role === 'assistant' && message.isThinking && !message.content && (
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
                      
                      {/* Message content with markdown support */}
                      {message.content && (
                        <div className="text-sm sm:text-base leading-relaxed font-medium enterprise-body prose prose-slate dark:prose-invert max-w-none">
                          {message.role === 'assistant' ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                // Make links clickable and styled
                                a: ({ node, ...props }) => (
                                  <a
                                    {...props}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-maritime-600 dark:text-maritime-400 hover:text-maritime-700 dark:hover:text-maritime-300 underline font-semibold break-words"
                                  />
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
                                // Style lists
                                ul: ({ node, ...props }) => (
                                  <ul {...props} className="list-disc list-inside space-y-1 my-2" />
                                ),
                                ol: ({ node, ...props }) => (
                                  <ol {...props} className="list-decimal list-inside space-y-1 my-2" />
                                ),
                                // Style paragraphs
                                p: ({ node, ...props }) => (
                                  <p {...props} className="my-2 leading-relaxed" />
                                ),
                                // Style headings
                                h1: ({ node, ...props }) => (
                                  <h1 {...props} className="text-xl font-bold mt-4 mb-2" />
                                ),
                                h2: ({ node, ...props }) => (
                                  <h2 {...props} className="text-lg font-bold mt-3 mb-2" />
                                ),
                                h3: ({ node, ...props }) => (
                                  <h3 {...props} className="text-base font-bold mt-2 mb-1" />
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <div className="whitespace-pre-wrap">{message.content}</div>
                          )}
                          {message.isStreaming && <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />}
                        </div>
                      )}
                      <p className={cn(
                        'text-xs mt-2 font-semibold',
                        message.role === 'user' ? 'text-white/60 dark:text-white/75' : 'text-slate-500 dark:text-slate-400'
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
                  placeholder="Ask about maritime maintenance, SOLAS..."
                  disabled={isLoading}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-maritime-500 focus:border-maritime-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium transition-all shadow-sm hover:shadow-md enterprise-body"
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
              <div className="flex items-center justify-between mt-3 sm:mt-4 gap-2">
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
                    'group inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all',
                    'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                    'text-slate-600 dark:text-slate-400',
                    'hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  aria-label="Reset chat"
                >
                  <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="text-[11px] sm:text-xs font-semibold">Reset</span>
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

