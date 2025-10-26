import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Bot, User, Globe, RotateCcw, ChevronDown, ChevronUp, Sun, Moon } from 'lucide-react';
import { cn } from '@/utils/cn';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string; // Unique ID for stable React keys
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
  darkMode?: boolean;
  toggleDarkMode?: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, darkMode, toggleDarkMode }) => {
  // CRITICAL: Version check to verify new code is loaded
  const CHATMODAL_VERSION = '2.0.1-debug'; // Update this with each deploy
  console.log(`🔵 ChatModal component loaded - VERSION: ${CHATMODAL_VERSION}`);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: "Hi! I'm your maritime maintenance expert. I can help you understand fleetcore's features, maritime regulations, and answer questions about maintenance management. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  
  // Log messages state whenever it changes
  console.log(`📊 Current messages state: ${messages.length} messages`, messages.map(m => `${m.role}: ${m.content?.substring(0, 20)}...`));
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
        id: 'welcome-' + Date.now(),
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
  // Cursor-style: Extract individual thoughts for sequential display
  const extractThinkingSteps = (thinking: string): string[] => {
    if (!thinking) return [];
    
    // Remove markers
    const cleaned = thinking
      .replace(/\*\*THINKING:\*\*/gi, '')
      .replace(/\*\*ANSWER:\*\*/gi, '')
      .trim();
    
    if (cleaned.length === 0) return [];
    
    // Try to split by the standard thinking step labels (Cursor-style structured reasoning)
    const stepLabels = ['Understanding:', 'Analysis:', 'Source Review:', 'Cross-Reference:', 'Synthesis:', 'Conclusion:'];
    const steps: string[] = [];
    
    // Check if ANY labels exist
    const hasLabels = stepLabels.some(label => cleaned.includes(label));
    
    if (hasLabels) {
      // Parse by finding each label and extracting content until the next label
      for (let i = 0; i < stepLabels.length; i++) {
        const currentLabel = stepLabels[i];
        const labelIndex = cleaned.indexOf(currentLabel);
        
        if (labelIndex !== -1) {
          // Find the next label or end of text
          let nextLabelIndex = cleaned.length;
          for (let j = 0; j < stepLabels.length; j++) {
            if (i === j) continue;
            const nextIndex = cleaned.indexOf(stepLabels[j], labelIndex + currentLabel.length);
            if (nextIndex !== -1 && nextIndex < nextLabelIndex) {
              nextLabelIndex = nextIndex;
            }
          }
          
          // Extract the content between this label and the next
          const stepContent = cleaned.substring(labelIndex + currentLabel.length, nextLabelIndex).trim();
          
          if (stepContent.length > 5) {
            steps.push(stepContent);
          }
        }
      }
      
      if (steps.length > 0) return steps.slice(0, 6); // Max 6 thoughts
    }
    
    // Fallback: Split by double newlines first (paragraph breaks)
    let fallbackSteps = cleaned.split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 15);
    
    // If that gives us good steps, use them
    if (fallbackSteps.length >= 2) {
      return fallbackSteps.slice(0, 6);
    }
    
    // Otherwise split by single newlines
    fallbackSteps = cleaned.split(/\n+/).map(s => s.trim()).filter(s => s.length > 15);
    
    if (fallbackSteps.length >= 2) {
      return fallbackSteps.slice(0, 6);
    }
    
    // If only 1 step, split by sentences
    if (fallbackSteps.length < 2) {
      fallbackSteps = cleaned.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 15);
    }
    
    // If text is long but no breaks, create chunks
    if (fallbackSteps.length < 2 && cleaned.length > 150) {
      const words = cleaned.split(' ');
      fallbackSteps = [];
      let currentChunk = '';
      
      for (const word of words) {
        if (currentChunk.length + word.length > 80 && currentChunk.length > 0) {
          fallbackSteps.push(currentChunk.trim());
          currentChunk = word;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + word;
        }
      }
      if (currentChunk) fallbackSteps.push(currentChunk.trim());
    }
    
    return fallbackSteps.slice(0, 6); // Max 6 thoughts
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
      id: 'user-' + Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    console.log(`💬 ===== SENDING NEW MESSAGE =====`);
    console.log(`💬 User message:`, userMessage);
    console.log(`💬 Current messages count:`, messages.length);
    
    setMessages((prev) => {
      console.log(`💬 Adding user message to array. Prev length: ${prev.length}`);
      const newArray = [...prev, userMessage];
      console.log(`💬 New array length: ${newArray.length}`);
      console.log(`💬 New array:`, newArray.map((m, i) => `[${i}] ${m.role}: "${m.content?.substring(0, 30)}"`));
      return newArray;
    });
    setInput('');
    setIsLoading(true);

    try {
      console.log('🌐 Starting API request...');
      
      // Show visual feedback for online research
      if (useBrowsing) {
        console.log('🌐 Online research enabled - fetching fresh data...');
      }
      
      const requestBody = {
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        enableBrowsing: useBrowsing,
        enableChainOfThought: useChainOfThought,
        researchComplexity: 'simple', // Default to Perplexity-style
      };
      
      console.log('📤 Request body:', {
        messageCount: requestBody.messages.length,
        browsing: requestBody.enableBrowsing,
        chainOfThought: requestBody.enableChainOfThought
      });
      
      const response = await fetch('/api/chatkit/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }).catch(err => {
        console.error('🔴 Fetch error:', err);
        throw err;
      });

      console.log('📥 Response received:', {
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type')
      });
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        throw new Error(`Failed to send message: ${response.status}`);
      }

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
        
        // CRITICAL FIX: Calculate index using callback to get CURRENT state
        // This prevents overwriting user messages with assistant content
        let assistantMessageIndex = -1;
        
        // Start thinking timer only when we actually receive thinking content
        thinkingStartTimeRef.current = null; // Don't start timer yet
        
        setMessages((prev) => {
          // Calculate the index where the NEW assistant message will be
          assistantMessageIndex = prev.length;
          streamingIndexRef.current = assistantMessageIndex;
          console.log(`🚀 ===== STREAM STARTING =====`);
          console.log(`🔄 Stream starting: assistant message will be at index ${assistantMessageIndex}`);
          console.log(`📊 Current messages before adding assistant:`, prev.map((m, i) => `[${i}] ${m.role}(id:${m.id}): "${m.content?.substring(0, 30)}..."`));
          
          // CRITICAL CHECK: Verify user message is in the array
          const lastMessage = prev[prev.length - 1];
          if (!lastMessage || lastMessage.role !== 'user') {
            console.error(`❌ CRITICAL ERROR: Last message should be user but is:`, lastMessage);
            console.error(`📊 Full prev array:`, prev);
          }
          
          const newMessage = {
            id: 'assistant-' + Date.now(),
            role: 'assistant' as const,
            content: '',
            thinkingContent: '',
            timestamp: new Date(),
            isStreaming: true,
            isThinking: false, // Don't show thinking until we have content
          };
          
          console.log(`➕ Adding new assistant message:`, newMessage);
          console.log(`📍 streamingIndexRef.current set to:`, assistantMessageIndex);
          
          const newArray = [...prev, newMessage];
          console.log(`📊 New array length: ${newArray.length}, contents:`, newArray.map((m, i) => `[${i}] ${m.role}`));
          return newArray;
        });
        
        // Hide loading indicator immediately after streaming starts
        setIsLoading(false);

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
                  
                  // FIXED: Start thinking timer when we FIRST receive thinking content
                  if (!thinkingStartTimeRef.current && streamedThinking.length > 0) {
                    thinkingStartTimeRef.current = Date.now();
                    console.log('🧠 Thinking started - timer started');
                  }
                  
                  console.log(`🧠 Received thinking chunk (+${parsed.content.length}chars), total: ${streamedThinking.length}chars`);
                } else if (parsed.type === 'content') {
                  // First content received = answer is ready
                  if (!hasReceivedContent) {
                    hasReceivedContent = true;
                    answerReadyToShow = true;
                    console.log('✅ Answer content received, switching to answer display...');
                  }
                  streamedContent += parsed.content;
                  console.log(`📝 Received content chunk (+${parsed.content.length}chars), total: ${streamedContent.length}chars`);
                }

                // FIXED: Simplified thinking display logic
                // Show thinking if we have thinking content AND haven't received answer yet
                const hasThinking = streamedThinking.length > 0;
                const thinkingElapsedTime = thinkingStartTimeRef.current ? Date.now() - thinkingStartTimeRef.current : 0;
                const MINIMUM_THINKING_TIME = 800; // Shorter - 0.8 seconds to allow faster transition
                const shouldShowThinking = hasThinking && (!answerReadyToShow || thinkingElapsedTime < MINIMUM_THINKING_TIME);

                setMessages((prev) => {
                  const updated = [...prev];
                  const idx = streamingIndexRef.current ?? updated.length - 1;
                  
                  console.log(`🔄 Stream update: idx=${idx}, streamedContent=${streamedContent.length}chars, streamedThinking=${streamedThinking.length}chars`);
                  
                  // Defensive check
                  if (idx < 0 || idx >= updated.length) {
                    console.error(`❌ Invalid message index: ${idx}, length: ${updated.length}`);
                    console.error(`📊 Messages:`, prev.map((m, i) => `[${i}] ${m.role}`));
                    return prev;
                  }
                  
                  // CRITICAL SAFETY: Ensure we're updating an ASSISTANT message, not a user message
                  if (updated[idx]?.role !== 'assistant') {
                    console.error(`❌ Attempted to update non-assistant message at index ${idx}. Role: ${updated[idx]?.role}`);
                    console.error(`📊 All messages:`, prev.map((m, i) => `[${i}] ${m.role}: "${m.content?.substring(0, 20)}"`));
                    return prev;
                  }
                  
                  // CRITICAL FIX: Always use accumulated content, never clear it
                  // This ensures content is preserved even if updates are batched
                  updated[idx] = {
                    ...updated[idx],
                    content: streamedContent, // Always set from accumulator
                    thinkingContent: streamedThinking, // Always set from accumulator
                    isStreaming: true,
                    isThinking: shouldShowThinking,
                  };
                  
                  console.log(`✅ Updated [${idx}]: content=${updated[idx].content.length}chars, thinking=${updated[idx].thinkingContent?.length || 0}chars`);
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

        // FIXED: Finalize message - shorter transition for better UX
        const MINIMUM_THINKING_TIME = 800; // 0.8 seconds
        const thinkingElapsedTime = thinkingStartTimeRef.current ? Date.now() - thinkingStartTimeRef.current : 0;
        
        // Only wait if we have thinking AND it hasn't been shown for minimum time
        if (streamedThinking && thinkingStartTimeRef.current && thinkingElapsedTime < MINIMUM_THINKING_TIME) {
          const remainingTime = MINIMUM_THINKING_TIME - thinkingElapsedTime;
          console.log(`⏰ Graceful transition: waiting ${remainingTime}ms before hiding thinking...`);
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        setMessages((prev) => {
          const updated = [...prev];
          const idx = streamingIndexRef.current ?? updated.length - 1;
          
          console.log(`🏁 ===== FINALIZING STREAM =====`);
          console.log(`🏁 Finalizing stream at index ${idx}. Total messages: ${updated.length}`);
          console.log(`📊 Final state: content=${streamedContent.length}chars, thinking=${streamedThinking.length}chars`);
          console.log(`📋 All messages before finalize:`, prev.map((m, i) => `[${i}] ${m.role}(${m.id}): ${m.content?.length || 0}chars, streaming=${m.isStreaming}`));
          
          // Defensive check
          if (idx < 0 || idx >= updated.length) {
            console.error(`❌ Invalid finalize index: ${idx}, length: ${updated.length}`);
            console.error(`📊 Messages:`, prev.map((m, i) => `[${i}] ${m.role}: "${m.content?.substring(0, 30)}"`));
            return prev;
          }
          
          // SAFETY: Ensure we're finalizing an assistant message
          if (updated[idx]?.role !== 'assistant') {
            console.error(`❌ Attempted to finalize non-assistant message at index ${idx}`);
            return prev;
          }
          
          console.log(`✅ Finalizing message [${idx}]: "${updated[idx].content?.substring(0, 50)}..."`);
          console.log(`   Before: streaming=${updated[idx].isStreaming}, thinking=${updated[idx].isThinking}`);
          console.log(`   Accumulated: content=${streamedContent.length}chars, thinking=${streamedThinking.length}chars`);
          
          // CRITICAL FIX: Explicitly set content and thinkingContent to ensure they're preserved
          // even if React batches updates and previous streaming updates weren't applied
          updated[idx] = {
            ...updated[idx],
            content: streamedContent, // Ensure final content is set
            thinkingContent: streamedThinking, // Ensure final thinking is set
            isStreaming: false,
            isThinking: false, // Always hide thinking when done
          };
          
          console.log(`   After: streaming=${updated[idx].isStreaming}, thinking=${updated[idx].isThinking}, content.length=${updated[idx].content?.length}`);
          console.log(`📊 Final messages:`, updated.map((m, i) => `[${i}] ${m.role}: ${m.content?.length || 0}chars`));
          console.log(`🏁 ===== FINALIZE COMPLETE =====`);
          return updated;
        });
        
        // Reset thinking timer
        thinkingStartTimeRef.current = null;
        
        console.log(`✅ Stream complete: ${streamedContent.length} chars content, ${streamedThinking.length} chars thinking`);
      } else {
        // Fallback to non-streaming or error response
        const data = await response.json();
        if (data?.model) setModelName(data.model);
        
        // Check if this is an error response with helpful information
        const content = data.message || data.error || 'An error occurred';
        
        const assistantMessage: Message = {
          id: 'assistant-' + Date.now(),
          role: 'assistant',
          content: content,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
        
        // Log helpful debug info if model failed
        if (data.attempted_model) {
          console.log('⚠️ Model failed:', data.attempted_model);
          console.log('✅ Available models:', data.available_models);
        }
      }
    } catch (error) {
      console.error('❌ ===== CHAT ERROR =====');
      console.error('Error type:', error instanceof Error ? error.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
      console.error('Full error object:', error);
      
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment or contact us directly.",
        timestamp: new Date(),
      };
      
      console.log('Adding error message to state...');
      setMessages((prev) => {
        console.log('Error handler: prev.length =', prev.length);
        const newArray = [...prev, errorMessage];
        console.log('Error handler: new.length =', newArray.length);
        return newArray;
      });
      setIsLoading(false);
      console.log('Error handling complete');
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
                {messages.map((message, index) => {
                  // Log render cycle info on first message
                  if (index === 0) {
                    console.log(`🎨 ===== RENDER CYCLE ===== Total messages: ${messages.length}`);
                    console.log(`🎨 All messages:`, messages.map((m, i) => `[${i}] ${m.role}(${m.id}): ${m.content?.length || 0}chars`));
                  }
                  
                  // DEBUG: Log ALL messages being mapped
                  console.log(`🔍 Message [${index}]: role=${message.role}, id=${message.id}, content=${message.content?.length || 0}chars, thinking=${message.thinkingContent?.length || 0}chars, streaming=${message.isStreaming}, isThinking=${message.isThinking}`);
                  
                  // ALWAYS render user messages (they should never be empty)
                  // Only skip truly empty assistant messages that aren't streaming/thinking
                  if (message.role === 'assistant' && !message.content && !message.thinkingContent && !message.isStreaming && !message.isThinking) {
                    console.log(`⏭️ Skipping empty assistant message [${index}]`);
                    return null;
                  }
                  
                  // Safety check: Warn if user message has no content
                  if (message.role === 'user' && !message.content) {
                    console.error(`⚠️ User message [${index}] has no content! ID: ${message.id}`);
                  }
                  
                  // Log what we're rendering for debugging
                  const debugInfo = `[${index}] ${message.role}: content=${message.content?.length || 0}chars, thinking=${message.thinkingContent?.length || 0}chars, streaming=${message.isStreaming}, showThinking=${message.isThinking}`;
                  if (message.isStreaming || message.isThinking) {
                    console.log(`🎨 Rendering ${debugInfo}`);
                  }
                  
                  return (
                  <div key={message.id}>
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
                        {/* Thinking Display - INSIDE message bubble, shows sequential thoughts ONLY */}
                        {message.role === 'assistant' && message.isThinking && message.thinkingContent && (
                          <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                            <AnimatePresence mode="wait">
                              {(() => {
                                const steps = extractThinkingSteps(message.thinkingContent);
                                if (steps.length > 0) {
                                  const currentStep = steps[currentThinkingStep % steps.length];
                                  return (
                                    <motion.div
                                      key={currentThinkingStep}
                                      initial={{ opacity: 0, y: -5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 5 }}
                                      transition={{ duration: 0.35, ease: "easeOut" }}
                                      className="flex items-start gap-2"
                                    >
                                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 flex-shrink-0 animate-pulse" />
                                      <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-medium leading-relaxed italic">
                                        {currentStep}
                                      </p>
                                    </motion.div>
                                  );
                                }
                                return null; // Don't show anything if no steps yet
                              })()}
                            </AnimatePresence>
                          </div>
                        )}
                      
                      {/* Message content - ALWAYS show for user, show for assistant if has content OR is streaming */}
                      {(() => {
                        const shouldRender = message.role === 'user' || message.content || message.isStreaming;
                        console.log(`🖼️ [${index}] Render content? ${shouldRender} | role=${message.role}, hasContent=${!!message.content}(${message.content?.length || 0}chars), isStreaming=${message.isStreaming}`);
                        if (!shouldRender) {
                          console.log(`❌ [${index}] Content hidden due to condition! Message:`, message);
                        }
                        return shouldRender;
                      })() && (
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
                          {message.timestamp?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
                        </p>
                      </div>

                      {message.role === 'user' && (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                      )}
                    </motion.div>
                  </div>
                  );
                })}
                
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
              <div className="flex items-center justify-between mt-3 sm:mt-4 gap-2">
                <div className="flex items-center gap-2">
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

