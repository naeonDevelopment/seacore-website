import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { ChatInterface } from '@/components/layout/ChatInterface';
import { SessionSidebar } from '@/components/layout/SessionSidebar';
import { FleetCoreLogo } from '@/components/ui/FleetCoreLogo';
import { useSessions } from '@/hooks/useSessions';
import { cn } from '@/utils/cn';

interface AssistantPageProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AssistantPage: React.FC<AssistantPageProps> = ({ darkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Track viewport dimensions for mobile keyboard handling
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
  const [viewportTop, setViewportTop] = useState(0);
  
  const {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    deleteSession,
    switchSession,
    updateSessionMessages,
    renameSession,
  } = useSessions();

  const handleClose = () => {
    navigate('/');
  };
  
  // Expose activeSessionId to window for ChatInterface cache management
  useEffect(() => {
    (window as any).__activeSessionId = activeSessionId;
  }, [activeSessionId]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Mobile: Lock body scroll and track Visual Viewport for keyboard handling
  useEffect(() => {
    if (!isMobile) return;

    // Lock body scroll on mobile to prevent background scrolling
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const scrollY = window.scrollY;
    
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    // Track Visual Viewport dimensions for keyboard handling
    const updateViewportDimensions = () => {
      if (typeof window === 'undefined') return;
      
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        // Use Visual Viewport API for accurate dimensions when keyboard appears
        setViewportHeight(visualViewport.height);
        setViewportTop(visualViewport.offsetTop);
      } else {
        // Fallback for browsers without Visual Viewport API
        setViewportHeight(window.innerHeight);
        setViewportTop(0);
      }
    };

    // Initial update
    updateViewportDimensions();

    // Add event listeners
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportDimensions);
      window.visualViewport.addEventListener('scroll', updateViewportDimensions);
    } else {
      window.addEventListener('resize', updateViewportDimensions);
    }

    // Cleanup
    return () => {
      // Restore original body styles
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.overflow = originalOverflow;
      
      // Restore scroll position
      window.scrollTo(0, scrollY);

      // Remove event listeners
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportDimensions);
        window.visualViewport.removeEventListener('scroll', updateViewportDimensions);
      } else {
        window.removeEventListener('resize', updateViewportDimensions);
      }
    };
  }, [isMobile]);

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>Enterprise Maritime Intelligence Agent - fleetcore | Specialized AI Expert System</title>
        <meta name="title" content="Enterprise Maritime Intelligence Agent - fleetcore | Specialized AI Expert System" />
        <meta name="description" content="Experience our specialized maritime intelligence agent delivering tailored insights on fleet operations, compliance, and predictive maintenance. Enterprise-grade AI with real-time research and domain expertise." />
        <meta name="keywords" content="maritime intelligence agent, specialized AI expert system, tailored maritime insights, enterprise AI assistant, maritime expert agent, personalized fleet intelligence, AI maritime advisor, intelligent compliance assistant, custom maritime AI, adaptive fleet intelligence" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://fleetcore.ai/assistant" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fleetcore.ai/assistant" />
        <meta property="og:title" content="Enterprise Maritime Intelligence Agent - Tailored AI Insights | fleetcore" />
        <meta property="og:description" content="Specialized AI agent delivering personalized maritime intelligence. Expert guidance on fleet operations, regulatory compliance, and predictive maintenance strategies tailored to your needs." />
        <meta property="og:image" content="https://fleetcore.ai/og/assistant.png" />
        <meta property="og:site_name" content="fleetcore" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://fleetcore.ai/assistant" />
        <meta name="twitter:title" content="Enterprise Maritime Intelligence Agent - fleetcore" />
        <meta name="twitter:description" content="Specialized AI agent delivering tailored maritime insights. Expert guidance on fleet operations, compliance, and maintenance strategies." />
        <meta name="twitter:image" content="https://fleetcore.ai/og/assistant.png" />
        
        {/* Robots */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        
        {/* Additional SEO */}
        <meta name="author" content="fleetcore" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />
        
        {/* Schema.org structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "fleetcore Maritime Intelligence Agent",
            "applicationCategory": "BusinessApplication",
            "applicationSubCategory": "Enterprise AI Expert System",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "description": "Enterprise-grade specialized intelligence agent delivering tailored maritime insights with adaptive AI reasoning, domain expertise, and real-time research capabilities",
            "featureList": [
              "Specialized maritime domain expertise",
              "Tailored insights and personalized guidance",
              "Adaptive intelligence with context awareness",
              "Real-time research and data synthesis",
              "Chain-of-thought reasoning transparency",
              "Enterprise-grade security and reliability",
              "Multi-session conversation management",
              "Regulatory compliance intelligence"
            ],
            "screenshot": "https://fleetcore.ai/og/assistant.png",
            "softwareVersion": "2.0",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "ratingCount": "156"
            }
          })}
        </script>
        
        {/* FAQ Schema for AI Engines */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What makes fleetcore's maritime intelligence agent specialized?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our enterprise intelligence agent combines deep maritime domain expertise with adaptive AI reasoning to deliver tailored insights for fleet operations, regulatory compliance, predictive maintenance, and strategic decision-making. Unlike generic chatbots, it provides personalized guidance based on your specific context and operational requirements."
                }
              },
              {
                "@type": "Question",
                "name": "How does the specialized intelligence agent deliver tailored information?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The intelligence agent uses advanced contextual awareness, chain-of-thought reasoning, and real-time research capabilities to understand your unique situation and deliver personalized recommendations. It adapts its responses based on your role, fleet type, operational context, and specific challenges to provide relevant, actionable insights."
                }
              },
              {
                "@type": "Question",
                "name": "Is the maritime intelligence agent suitable for enterprise use?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, absolutely. Our intelligence agent is built on enterprise-grade infrastructure with multi-session management, conversation history, transparent reasoning processes, and the ability to synthesize complex maritime regulations, industry standards, and operational data. It's designed for fleet managers, technical teams, and maritime executives requiring sophisticated decision support."
                }
              },
              {
                "@type": "Question",
                "name": "What type of specialized maritime knowledge does the agent possess?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The agent has deep expertise across SOLAS/MARPOL/ISM compliance, predictive maintenance strategies, fleet optimization, equipment lifecycle management, regulatory interpretation, safety management systems, cost reduction methodologies, and industry best practices. It continuously accesses current maritime regulations and industry developments through real-time research."
                }
              },
              {
                "@type": "Question",
                "name": "How is this different from a standard AI chatbot?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Unlike generic chatbots, our specialized intelligence agent offers maritime domain expertise, tailored recommendations based on your context, transparent reasoning processes, enterprise-grade reliability, multi-session conversation management, and the ability to synthesize complex regulatory and operational data into actionable insights. It's a professional decision-support tool, not just a Q&A system."
                }
              }
            ]
          })}
        </script>
        
        {/* Breadcrumb Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://fleetcore.ai/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "AI Assistant",
                "item": "https://fleetcore.ai/assistant"
              }
            ]
          })}
        </script>
        
        {/* WebPage Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Maritime Intelligence Agent - Specialized AI Expert System",
            "description": "Enterprise-grade specialized intelligence agent delivering tailored maritime insights, personalized guidance, and adaptive decision support for fleet operations and compliance",
            "url": "https://fleetcore.ai/assistant",
            "inLanguage": "en-US",
            "isPartOf": {
              "@type": "WebSite",
              "name": "fleetcore",
              "url": "https://fleetcore.ai/"
            },
            "about": {
              "@type": "Thing",
              "name": "Maritime Intelligence Systems",
              "description": "Specialized AI agent systems delivering tailored insights for maritime operations, compliance, and strategic decision-making"
            },
            "audience": {
              "@type": "Audience",
              "audienceType": "Fleet Managers, Maritime Executives, Technical Directors, Compliance Officers, Ship Operators"
            },
            "potentialAction": {
              "@type": "InteractAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://fleetcore.ai/assistant",
                "actionPlatform": [
                  "http://schema.org/DesktopWebPlatform",
                  "http://schema.org/MobileWebPlatform"
                ]
              },
              "description": "Interact with specialized maritime intelligence agent for tailored insights"
            }
          })}
        </script>
        
        {/* Organization Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "fleetcore",
            "url": "https://fleetcore.ai",
            "logo": "https://fleetcore.ai/Light.svg",
            "description": "AI-powered maritime maintenance operating system",
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "Customer Service",
              "email": "hello@fleetcore.ai",
              "availableLanguage": ["en"]
            },
            "sameAs": [
              "https://www.linkedin.com/company/fleetcore"
            ]
          })}
        </script>
      </Helmet>

      {/* Main Layout - Use Visual Viewport dimensions on mobile */}
      <div 
        className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 relative"
        style={isMobile && viewportHeight > 0 ? {
          position: 'fixed',
          top: `${viewportTop}px`,
          left: 0,
          right: 0,
          height: `${viewportHeight}px`,
          maxHeight: `${viewportHeight}px`,
          overflow: 'hidden'
        } : {
          minHeight: '100vh'
        }}
      >
        {/* Desktop: Session Sidebar (Fixed Left) */}
        {!isMobile && (
          <SessionSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onCreateSession={createSession}
            onSwitchSession={switchSession}
            onDeleteSession={deleteSession}
            onRenameSession={renameSession}
          />
        )}

        {/* Mobile: Session Drawer */}
        {isMobile && (
          <SessionSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onCreateSession={createSession}
            onSwitchSession={switchSession}
            onDeleteSession={deleteSession}
            onRenameSession={renameSession}
            isMobile={true}
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Mobile: Top Action Bar with Logo */}
        {isMobile && (
          <div 
            className="absolute left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 h-16"
            style={{ top: 0 }}
          >
            <div className="flex items-center justify-between px-4 h-full">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                aria-label="Open sessions"
              >
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>
              
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
                <FleetCoreLogo 
                  variant={darkMode ? 'dark' : 'light'}
                  className="!max-w-[60px] !h-auto transition-all duration-300"
                />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap mt-1">
                  AI Maritime Expert
                </span>
              </div>
              
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                aria-label="Go to home"
              >
                <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Chat Interface Container - Full Width */}
        <div 
          className={cn(
            "transition-all duration-300 w-full",
            isMobile ? "absolute left-0 right-0 overflow-hidden" : ""
          )}
          style={isMobile ? {
            top: '4rem', // 64px for mobile header
            bottom: 0,
            height: 'calc(100% - 4rem)'
          } : undefined}
        >
            <ChatInterface 
              isFullscreen={true}
              messages={activeSession.messages}
              onMessagesChange={(messages) => updateSessionMessages(activeSessionId, messages)}
              onClose={!isMobile ? handleClose : undefined}
              showHeader={!isMobile}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              className={cn(isMobile ? "h-full" : "min-h-screen")}
            />
        </div>
      </div>
    </>
  );
};

export default AssistantPage;

