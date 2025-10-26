import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ChatInterface } from '@/components/layout/ChatInterface';
import { SessionSidebar } from '@/components/layout/SessionSidebar';
import { useSessions } from '@/hooks/useSessions';
import { generatePageSEO } from '@/utils/seoGenerator';
import { cn } from '@/utils/cn';

const AssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
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
  
  const seo = generatePageSEO('assistant', '/assistant', {
    mainKeywords: ['maritime AI assistant', 'fleet maintenance chatbot', 'SOLAS compliance assistant'],
    features: ['AI-powered answers', 'maritime regulations', 'predictive maintenance', 'online research'],
    industries: ['commercial shipping', 'offshore energy', 'cruise operations', 'naval defense'],
    valueProposition: 'Get instant answers about maritime maintenance, regulations, and fleetcore features'
  });

  const handleClose = () => {
    navigate('/'); // Go to home page
  };

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>Maritime AI Assistant - fleetcore | Ask About Fleet Maintenance & SOLAS</title>
        <meta name="title" content="Maritime AI Assistant - fleetcore | Ask About Fleet Maintenance & SOLAS" />
        <meta name="description" content="Chat with fleetcore's AI maritime expert. Get instant answers about fleet maintenance, SOLAS/MARPOL compliance, predictive maintenance, and maritime regulations. Powered by advanced AI with real-time research." />
        <meta name="keywords" content="maritime AI assistant, fleet maintenance chatbot, SOLAS compliance assistant, maritime regulations AI, ship maintenance AI, predictive maintenance assistant, maritime chatbot, fleet management AI, MARPOL assistant" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://fleetcore.ai/assistant" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fleetcore.ai/assistant" />
        <meta property="og:title" content="Maritime AI Assistant - fleetcore | Ask About Fleet Maintenance & SOLAS" />
        <meta property="og:description" content="Chat with fleetcore's AI maritime expert. Get instant answers about fleet maintenance, SOLAS/MARPOL compliance, predictive maintenance, and maritime regulations." />
        <meta property="og:image" content="https://fleetcore.ai/og/assistant.png" />
        <meta property="og:site_name" content="fleetcore" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://fleetcore.ai/assistant" />
        <meta name="twitter:title" content="Maritime AI Assistant - fleetcore" />
        <meta name="twitter:description" content="Chat with fleetcore's AI maritime expert. Get instant answers about fleet maintenance, SOLAS/MARPOL compliance, and maritime regulations." />
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
            "name": "fleetcore Maritime AI Assistant",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "description": "AI-powered maritime assistant providing instant answers about fleet maintenance, SOLAS compliance, and maritime regulations",
            "featureList": [
              "Maritime regulations guidance",
              "Fleet maintenance assistance",
              "SOLAS and MARPOL compliance",
              "Predictive maintenance insights",
              "Real-time online research",
              "Chain-of-thought reasoning"
            ],
            "screenshot": "https://fleetcore.ai/og/assistant.png",
            "softwareVersion": "1.0",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "127"
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
                "name": "What can the fleetcore AI assistant help me with?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The fleetcore AI assistant helps with maritime maintenance management, SOLAS and MARPOL compliance questions, predictive maintenance insights, fleet management best practices, and general maritime industry regulations. It uses advanced AI with real-time online research capabilities."
                }
              },
              {
                "@type": "Question",
                "name": "How does the maritime AI assistant work?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our AI assistant uses advanced language models with chain-of-thought reasoning and optional online research capabilities. It's trained on maritime regulations, fleet maintenance procedures, and industry best practices to provide accurate, helpful answers to your maritime questions."
                }
              },
              {
                "@type": "Question",
                "name": "Is the maritime AI assistant free to use?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, the fleetcore maritime AI assistant is free to use. You can ask questions about maritime maintenance, regulations, and our platform features without any cost or signup required."
                }
              },
              {
                "@type": "Question",
                "name": "Can the AI assistant provide SOLAS compliance guidance?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, the AI assistant can provide guidance on SOLAS (Safety of Life at Sea) regulations, MARPOL compliance, and other maritime safety standards. It can help you understand requirements and how fleetcore's platform automates compliance tracking."
                }
              },
              {
                "@type": "Question",
                "name": "Does the assistant have access to real-time information?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, you can enable 'Online research' mode to have the assistant search for real-time information, latest maritime regulations updates, and current industry news. This ensures you get the most up-to-date answers."
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
            "name": "Maritime AI Assistant",
            "description": "Chat with fleetcore's AI maritime expert for instant answers about fleet maintenance and maritime regulations",
            "url": "https://fleetcore.ai/assistant",
            "inLanguage": "en-US",
            "isPartOf": {
              "@type": "WebSite",
              "name": "fleetcore",
              "url": "https://fleetcore.ai/"
            },
            "about": {
              "@type": "Thing",
              "name": "Maritime Maintenance Management",
              "description": "AI-powered fleet maintenance and compliance management"
            },
            "audience": {
              "@type": "Audience",
              "audienceType": "Maritime Professionals, Fleet Managers, Ship Operators"
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

      {/* Main Layout */}
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 relative">
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
          <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                aria-label="Open sessions"
              >
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>
              
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <img
                  src="/Light.svg"
                  alt="fleetcore"
                  className="h-10 w-auto"
                  loading="lazy"
                />
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

        {/* Chat Interface Container with Max Width */}
        <div className={cn(
          "transition-all duration-300",
          isMobile ? "pt-14" : ""
        )}>
          <ChatInterface 
            isFullscreen={true}
            messages={activeSession.messages}
            onMessagesChange={(messages) => updateSessionMessages(activeSessionId, messages)}
            onClose={!isMobile ? handleClose : undefined}
            showHeader={!isMobile}
            className="min-h-screen"
          />
        </div>
      </div>
    </>
  );
};

export default AssistantPage;

