import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Bot, User, Globe, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isThinking?: boolean;
  thinkingContent?: string;
}

interface ChatInterfaceProps {
  isFullscreen?: boolean;
  onClose?: () => void;
  className?: string;
  showHeader?: boolean;
  messages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  isFullscreen = false, 
  onClose,
  className,
  showHeader = true,
  messages: externalMessages,
  onMessagesChange
}) => {
  const [internalMessages, setInternalMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `# Welcome to Fleetcore's Intelligence Hub

I'm your **AI Maritime Maintenance Expert** – here to help with fleetcore's system, maritime regulations, and maintenance management.

## 💡 What I Can Help With:

**Fleetcore System** • Platform features, workflows, integrations, and best practices

**Maritime Regulations** • SOLAS, MARPOL, ISM Code, MLC, and compliance requirements

**Maintenance Operations** • Procedures, safety protocols, equipment management, and certifications

---

💬 **Tip:** Enable **Online Research** below to access real-time industry data, technical specs, and regulatory updates.

**What would you like to know?**`,
      timestamp: new Date(),
    },
  ]);

  // Use external messages if provided, otherwise use internal state
  const messages = externalMessages || internalMessages;
  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    if (onMessagesChange) {
      if (typeof newMessages === 'function') {
        const updatedMessages = newMessages(messages);
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
  const [modelName, setModelName] = useState<string>('GPT');
  const [useBrowsing, setUseBrowsing] = useState<boolean>(false);
  const useChainOfThought = true;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const streamingIndexRef = useRef<number | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const [currentThinkingStep, setCurrentThinkingStep] = useState<number>(0);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const thinkingStartTimeRef = useRef<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
  const [viewportTop, setViewportTop] = useState(0);

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
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

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
  }, [isFullscreen]);

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
          researchComplexity: 'simple',
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        const hdrModel = response.headers.get('x-model');
        if (hdrModel) setModelName(hdrModel);
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        let streamedContent = '';
        let streamedThinking = '';
        let hasReceivedContent = false;
        let answerReadyToShow = false;
        
        streamingIndexRef.current = null;
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
            isThinking: true,
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
                } else if (parsed.type === 'content') {
                  if (!hasReceivedContent) {
                    hasReceivedContent = true;
                    answerReadyToShow = true;
                  }
                  streamedContent += parsed.content;
                }

                const MINIMUM_THINKING_TIME = 9000;
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
                    isThinking: !shouldHideThinking,
                  };
                  return updated;
                });
              } catch (_) {
                buffer = line + '\n' + buffer;
                break;
              }
            }
          }
        }

        const MINIMUM_THINKING_TIME = 9000;
        const thinkingElapsedTime = thinkingStartTimeRef.current ? Date.now() - thinkingStartTimeRef.current : MINIMUM_THINKING_TIME;
        const remainingThinkingTime = Math.max(0, MINIMUM_THINKING_TIME - thinkingElapsedTime);
        
        if (remainingThinkingTime > 0 && streamedThinking) {
          await new Promise(resolve => setTimeout(resolve, remainingThinkingTime));
        }
        
        setMessages((prev) => {
          const updated = [...prev];
          const idx = streamingIndexRef.current ?? updated.length - 1;
          updated[idx] = {
            ...updated[idx],
            isStreaming: false,
            isThinking: false,
          };
          return updated;
        });
        
        thinkingStartTimeRef.current = null;
      } else {
        const data = await response.json();
        if (data?.model) setModelName(data.model);
        
        const content = data.message || data.error || 'An error occurred';
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: content,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
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
        "flex flex-col",
        isFullscreen ? "h-screen" : "",
        className
      )}
      style={isFullscreen && typeof window !== 'undefined' && window.innerWidth < 640 && viewportHeight < window.innerHeight ? {
        height: `${viewportHeight}px`,
        maxHeight: `${viewportHeight}px`
      } : undefined}
    >
      {/* Header - Full Width Background - Match website header h-16 */}
      {showHeader && (
        <div className="relative bg-gradient-to-r from-maritime-600 via-blue-600 to-indigo-600 w-full flex-shrink-0 h-16">
          <div className="max-w-[1400px] mx-auto px-3 md:px-6 lg:px-8 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center">
                <svg 
                  viewBox="170 450 690 130"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMinYMid meet"
                  className="h-4 md:h-4 lg:h-5 w-auto"
                  style={{ minWidth: '60px' }}
                >
                  <defs>
                    <linearGradient id="logo-white-1" x1="222.64" y1="574.43" x2="297.1" y2="481.15" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#ffffff"/>
                      <stop offset="1" stopColor="#e0f2fe"/>
                    </linearGradient>
                    <linearGradient id="logo-white-2" x1="237.37" y1="586.18" x2="311.82" y2="492.9">
                      <stop offset="0" stopColor="#ffffff"/>
                      <stop offset="1" stopColor="#e0f2fe"/>
                    </linearGradient>
                    <linearGradient id="logo-white-3" x1="209.31" y1="563.78" x2="283.77" y2="470.51">
                      <stop offset="0" stopColor="#ffffff"/>
                      <stop offset="1" stopColor="#e0f2fe"/>
                    </linearGradient>
                  </defs>
                  <g fill="#ffffff">
                    <path d="M408.27,462.94c-8.82,0-15.71,2.19-21.09,6.72-6.01,5.34-9.31,13.42-9.31,22.77v1.43h-8.87v11.36h8.87v54.41h13.97v-54.41h14.74v-11.36h-14.74v-1.82c0-8.03,2.53-17.61,14.61-17.61,3.46,0,6.18.41,8.08,1.21v83.99h13.97v-91.98l-.67-.37c-4.96-2.76-12.09-4.34-19.55-4.34Z"/>
                    <path d="M471.29,492.42c-18.21,0-30.93,14.54-30.93,35.36s12.7,33.15,32.36,33.15c10.43,0,17.47-2.19,21.55-4.03l.99-.45-2.57-10.78-1.43.61c-3.87,1.64-8.6,3.16-16.97,3.16-5.87,0-19.36-1.91-20.3-19.3h44.18l.19-1.7c.14-1.21.34-2.87.34-4.96,0-3.48-.54-12.38-5.53-19.95-4.79-7.27-12.35-11.11-21.87-11.11ZM454.28,519.3c1.18-6.56,5.61-16.04,16.1-16.04,4.18,0,7.55,1.27,10.01,3.78,3.72,3.79,4.46,9.38,4.58,12.26h-30.69Z"/>
                    <path d="M536.66,492.42c-18.21,0-30.93,14.54-30.93,35.36s12.7,33.15,32.36,33.15c10.43,0,17.47-2.19,21.55-4.03l.99-.45-2.57-10.78-1.43.61c-3.87,1.64-8.6,3.16-16.97,3.16-5.87,0-19.36-1.91-20.3-19.3h44.18l.19-1.7c.14-1.21.34-2.87.34-4.96,0-3.48-.54-12.38-5.53-19.95-4.79-7.27-12.35-11.11-21.87-11.11ZM519.65,519.3c1.18-6.56,5.61-16.04,16.1-16.04,4.18,0,7.55,1.27,10.01,3.78,3.72,3.79,4.46,9.38,4.58,12.26h-30.69Z"/>
                    <path d="M592.12,475.33l-13.84,3.7v14.83h-9.79v11.36h9.79v33.13c0,8.43,1.53,13.94,4.76,17.3,3.02,3.45,7.65,5.28,13.38,5.28,4.28,0,8.07-.59,10.68-1.66l.87-.36-.68-11.15-1.55.42c-1.23.34-3.33.74-6.31.74-5.19,0-7.3-3.17-7.3-10.95v-32.74h16.44v-11.36h-16.44v-18.53Z"/>
                    <path d="M648.74,504.31c6.37,0,10.4,1.54,12.66,2.83l1.44.82,3.39-11.51-.98-.49c-3.14-1.57-9.34-3.4-16.5-3.4-20.75,0-35.23,14.33-35.23,34.84s13.16,33.54,32.75,33.54c8.45,0,15.38-2.05,18.74-3.8l.9-.47-2.53-11.14-1.45.64c-3.32,1.46-7.38,3.02-13.56,3.02-12.33,0-20.61-8.96-20.61-22.31s8.24-22.57,21-22.57Z"/>
                    <path d="M703.8,492.42c-9.08,0-17.3,3.28-23.15,9.23-6.2,6.31-9.48,15.16-9.48,25.61,0,19.9,12.99,33.8,31.58,33.8,16.3,0,32.75-10.77,32.75-34.84,0-20.22-12.74-33.8-31.71-33.8ZM721.15,526.61c0,13.45-7.52,23.22-17.87,23.22s-17.87-9.66-17.87-22.96c0-11.56,5.61-23.22,18.13-23.22s17.61,11.9,17.61,22.96Z"/>
                    <path d="M776.61,492.42c-6.94,0-13.19,4-16.84,10.48l-.29-9.05h-12.72l.09,1.4c.36,5.38.52,11.43.52,19.61v44.76h13.97v-34.97c0-1.86.26-3.64.5-5.12,1.53-8.43,6.94-13.67,14.11-13.67,1.41,0,2.49.11,3.63.36l1.59.35v-13.49l-.99-.25c-1.22-.31-2.26-.43-3.58-.43Z"/>
                    <path d="M815.1,492.42c-18.21,0-30.93,14.54-30.93,35.36s12.7,33.15,32.36,33.15c10.43,0,17.47-2.19,21.55-4.03l.99-.45-2.57-10.78-1.43.61c-3.87,1.64-8.6,3.16-16.97,3.16-5.87,0-19.36-1.91-20.3-19.3h44.18l.19-1.69c.14-1.21.34-2.87.34-4.96,0-3.48-.54-12.38-5.53-19.95-4.79-7.27-12.35-11.11-21.87-11.11ZM798.09,519.3c1.18-6.56,5.61-16.04,16.1-16.04,4.18,0,7.55,1.27,10.01,3.78,3.72,3.79,4.46,9.38,4.58,12.26h-30.69Z"/>
                  </g>
                  <g>
                    <path fill="url(#logo-white-1)" d="M185.18,535.72s17.18,7.77,36.41-.41,39.27-25.37,62.59-23.73c23.32,1.64,41.32,19.64,41.32,19.64,0,0-17.59-10.64-38.46-5.32-20.86,5.32-31.71,25.09-55.64,30.27-33.96,7.36-46.23-20.46-46.23-20.46Z"/>
                    <path fill="url(#logo-white-2)" d="M200.32,564.76s15.96,9.41,41.32-.82c25.37-10.23,29.05-23.32,51.96-27.41,22.91-4.09,32.32,6.55,32.32,6.55,0,0-15.96-.41-27.41,8.18-11.46,8.59-20.81,26.43-39.27,31.91-37.23,11.05-58.91-18.41-58.91-18.41Z"/>
                    <path fill="url(#logo-white-3)" d="M333.69,504.38v15.48c-5.04-.32-9.92-1.26-14.55-2.74-6.16-1.95-11.89-4.84-17.04-8.51-3.3-2.35-5.84-5.61-7.38-9.35l-.02-.05.19-.22-.29-.02c-2.92-6.98-7.75-12.95-13.85-17.26-2.38-1.69-4.96-3.13-7.68-4.26l-.02-.29-.22.19c-2.8-1.15-5.76-1.99-8.83-2.49-2.08-.33-4.22-.51-6.39-.51-5.39,0-10.53,1.06-15.22,3l-.22-.19-.02.29c-9.7,4.05-17.47,11.82-21.53,21.53l-.29.02.2.22c-1.93,4.69-3,9.84-3,15.23,0,3.49.45,6.88,1.29,10.1-4.98,1.31-10.22,2-15.61,2-2.04,0-4.07-.1-6.06-.29-5.2-.51-10.21-1.66-14.96-3.39-.4-.15-.67-.53-.67-.96v-17.52c0-1.48,1.14-2.7,2.62-2.81l13.43-.96c1.55-6.78,4.22-13.13,7.82-18.85l-8.82-10.18c-.97-1.12-.91-2.79.14-3.83l14.23-14.23c1.05-1.04,2.72-1.1,3.83-.14l10.18,8.83c5.72-3.59,12.07-6.26,18.85-7.82l.96-13.43c.1-1.47,1.33-2.62,2.81-2.62h20.12c1.48,0,2.7,1.14,2.81,2.62l.96,13.43c1.63.37,3.23.82,4.81,1.31,4.98,1.58,9.69,3.78,14.03,6.5l10.18-8.83c1.12-.97,2.79-.91,3.83.14l14.23,14.23c1.04,1.04,1.1,2.72.14,3.83l-8.83,10.18c3.59,5.72,6.26,12.07,7.82,18.85l13.43.96c1.47.11,2.62,1.33,2.62,2.81Z"/>
                  </g>
                </svg>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <h1 className="text-base md:text-lg lg:text-xl font-bold text-white enterprise-heading whitespace-nowrap">
                AI Maritime Expert
              </h1>
            </div>
            <div className="w-[100px] md:w-[120px] flex items-center justify-end">
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group flex-shrink-0"
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
                </button>
              )}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 lg:p-6 space-y-3 md:space-y-4 lg:space-y-5 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 relative min-h-0">
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(59 130 246) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        <div className="relative z-10 space-y-3 md:space-y-4 lg:space-y-5 max-w-5xl mx-auto w-full px-2 sm:px-0">
          {messages.map((message, index) => (
            <div key={index}>
              {message.role === 'assistant' && message.thinkingContent && message.isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={cn('flex gap-2 sm:gap-4 mb-2', 'justify-start')}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
                  <div className="max-w-[85%] sm:max-w-[80%]">
                    <AnimatePresence mode="wait">
                      {(() => {
                        const steps = extractThinkingSteps(message.thinkingContent);
                        if (steps.length > 0) {
                          const currentStep = steps[currentThinkingStep % steps.length];
                          return (
                            <motion.div
                              key={currentThinkingStep}
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 5 }}
                              transition={{ duration: 0.35, ease: "easeOut" }}
                              className="px-4 py-2 rounded-full backdrop-blur-md bg-purple-50/70 dark:bg-purple-900/30 border border-purple-200/70 dark:border-purple-700/50 shadow-sm"
                            >
                              <p className="text-xs sm:text-sm text-purple-800 dark:text-purple-200 font-medium leading-relaxed">
                                {currentStep}
                              </p>
                            </motion.div>
                          );
                        }
                        return (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="px-4 py-2 rounded-full backdrop-blur-md bg-purple-50/70 dark:bg-purple-900/30 border border-purple-200/70 dark:border-purple-700/50"
                          >
                            <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-medium">
                              Thinking<motion.span
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                              >...</motion.span>
                            </p>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
              
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
                
                  {message.content && (message.role === 'user' || !message.isThinking) && (
                    <>
                      {message.role === 'assistant' ? (
                        <div className="text-sm sm:text-base leading-relaxed enterprise-body prose prose-slate dark:prose-invert max-w-none prose-a:text-maritime-600 prose-a:dark:text-maritime-400 prose-a:font-semibold prose-a:no-underline prose-a:hover:underline">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
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
                            {message.content}
                          </ReactMarkdown>
                          {message.isStreaming && <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />}
                        </div>
                      ) : (
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

      {/* Input Area */}
      <div 
        ref={inputAreaRef}
        className="px-3 pt-3 pb-3 md:p-5 lg:p-6 border-t border-white/20 dark:border-slate-700/30 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 flex-shrink-0"
      >
        <div className="flex gap-2 md:gap-3 max-w-5xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
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
              touchAction: 'manipulation'
            }}
          />
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
        </div>
        <div className="flex items-center mt-2 md:mt-3 lg:mt-4 gap-2 md:gap-3 max-w-5xl mx-auto">
          <button
            type="button"
            role="switch"
            aria-checked={useBrowsing}
            onClick={() => setUseBrowsing((v) => !v)}
            className={cn(
              'group inline-flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl border transition-all flex-shrink-0',
              useBrowsing
                ? 'bg-maritime-50 border-maritime-200 text-maritime-700'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            )}
          >
            <span className={cn(
              'relative inline-flex h-6 w-11 md:h-7 md:w-12 items-center rounded-full transition-colors',
              useBrowsing ? 'bg-maritime-600' : 'bg-slate-300 dark:bg-slate-700'
            )}>
              <span
                className={cn(
                  'inline-block h-5 w-5 md:h-6 md:w-6 transform rounded-full bg-white shadow ring-1 ring-black/5 transition-transform',
                  useBrowsing ? 'translate-x-5 md:translate-x-5' : 'translate-x-0.5 md:translate-x-0.5'
                )}
              />
            </span>
            <span className="text-xs md:text-sm font-semibold whitespace-nowrap">Online research</span>
          </button>
          
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
            <span className="text-xs md:text-sm font-semibold whitespace-nowrap">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

