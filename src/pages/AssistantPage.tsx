import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ChatInterface } from '@/components/layout/ChatInterface';
import { generatePageSEO } from '@/utils/seoGenerator';

const AssistantPage: React.FC = () => {
  const navigate = useNavigate();
  
  const seo = generatePageSEO('assistant', '/assistant', {
    mainKeywords: ['maritime AI assistant', 'fleet maintenance chatbot', 'SOLAS compliance assistant'],
    features: ['AI-powered answers', 'maritime regulations', 'predictive maintenance', 'online research'],
    industries: ['commercial shipping', 'offshore energy', 'cruise operations', 'naval defense'],
    valueProposition: 'Get instant answers about maritime maintenance, regulations, and fleetcore features'
  });

  const handleClose = () => {
    navigate(-1); // Go back to previous page
  };

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

      {/* Fullscreen Chat Interface */}
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <ChatInterface 
          isFullscreen={true} 
          onClose={handleClose}
          className="min-h-screen"
        />
      </div>
    </>
  );
};

export default AssistantPage;

