// Enhanced Cloudflare Pages middleware with rich semantic content for bots
// Optimized for Google, Bing, ChatGPT, Perplexity, Claude, and other AI search engines

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

// Comprehensive bot detection including AI search engines
function isBot(userAgent: string): boolean {
  const botPatterns = [
    // Traditional search engines
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandex',
    // Social media crawlers
    'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp', 'telegram',
    // AI search engines (CRITICAL for 2025)
    'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'anthropic-ai',
    'PerplexityBot', 'Perplexity', 'cohere-ai', 'YouBot',
    // Other important crawlers
    'Applebot', 'Amazonbot', 'ia_archiver', 'archive.org_bot',
    // Generic patterns
    'bot', 'crawler', 'spider', 'crawling', 'inspection'
  ];
  
  const ua = userAgent.toLowerCase();
  return botPatterns.some(pattern => ua.includes(pattern));
}

// Generate SEO-optimized HTML with full semantic content for each route
function generateBotHTML(pathname: string): string {
  const routes: Record<string, {
    title: string;
    description: string;
    url: string;
    content: {
      h1: string;
      intro: string;
      sections: Array<{ h2: string; content: string; list?: string[] }>;
    };
    keywords: string[];
  }> = {
    '/': {
      title: 'fleetcore - Agentic Maritime Intelligence Platform',
      description: 'Revolutionary AI-powered maritime maintenance platform with predictive intelligence, automated SOLAS/MARPOL/ISM compliance, and cross-manufacturer optimization. Transform your fleet operations with agentic maritime intelligence.',
      url: 'https://fleetcore.ai/',
      keywords: ['maritime maintenance', 'predictive maintenance', 'SOLAS compliance', 'MARPOL automation', 'fleet management AI', 'vessel maintenance software', 'maritime intelligence platform'],
      content: {
        h1: 'Maritime Technical Operating System',
        intro: 'Bridge OEM PMS with Real-World Operations - Condition Monitoring, Predictive Maintenance & Automated Workflows. Enterprise-grade platform combining modern cloud architecture, intelligent automation, and maritime-specific workflows.',
        sections: [
          {
            h2: 'Core Capabilities',
            content: 'Complete maritime maintenance intelligence from automated PMS scheduling to regulatory compliance.',
            list: [
              'OEM PMS Integration & Auto-Scheduling: Import manufacturer PMS recommendations and automatically generate vessel-specific maintenance schedules with 94% automation rate',
              'Event-Based Unplanned Maintenance: Digital transformation of breakdown reporting with real-time event capture and automatic workflow routing',
              'Equipment Lifecycle Management: Complete tracking from installation to decommissioning with 500+ equipment items per vessel',
              'Intelligent Spare Parts Management: Comprehensive inventory control with 91% stock optimization through predictive ordering',
              'SOLAS 2024 Compliance Management: Automated regulatory compliance tracking with 100% MARPOL and ISM Code adherence',
              'Multi-Tenant Fleet Intelligence: Enterprise-grade architecture supporting 500+ vessels with cross-fleet learning',
              'Digital Documentation & Reporting: 100% paperless operations with digital work records and automated compliance reports',
              'Advanced Analytics & Intelligence: 87% prediction accuracy with AI-powered failure pattern recognition'
            ]
          },
          {
            h2: 'Industry Impact',
            content: 'Addressing the $17+ billion annual maritime maintenance crisis through predictive intelligence.',
            list: [
              '20-30% cost reduction through automated maintenance scheduling',
              '40% lower costs versus reactive maintenance approaches',
              '100% regulatory compliance with automated SOLAS/MARPOL/ISM tracking',
              'Real-time monitoring across global fleet operations'
            ]
          },
          {
            h2: 'Three-Layer Architecture',
            content: 'Systematic approach that eliminates maintenance chaos through integrated intelligence.',
            list: [
              'Centralized Data Hub: Unified database normalizing OEM specs, manufacturer recommendations, and SOLAS requirements',
              'Automated Scheduling Engine: 90%+ task auto-generation with dual-interval tracking and crew workload optimization',
              'Intelligence & Analytics: Fleet-wide pattern analysis with predictive alerts and cost forecasting achieving 30-40% efficiency gains'
            ]
          }
        ]
      }
    },
    '/platform': {
      title: 'Platform - fleetcore Agentic Maritime Intelligence',
      description: 'Agentic Fleet AI, Global Intelligence Graph, automated regulatory compliance, predictive maintenance, and vendor-neutral OEM integration. Transform maritime operations with AI.',
      url: 'https://fleetcore.ai/platform',
      keywords: ['maritime platform', 'cloud architecture', 'dual-interval scheduling', 'fleet intelligence', 'enterprise maritime software', 'vessel management system'],
      content: {
        h1: 'Built for Maritime Excellence',
        intro: 'Enterprise-grade platform combining modern cloud architecture, intelligent automation, and maritime-specific workflows — purpose-built for the complexities of fleet maintenance management.',
        sections: [
          {
            h2: 'Platform Foundation - Three Pillars',
            content: 'Built on a foundation of modern technology, intelligent automation, and maritime domain expertise.',
            list: [
              'Enterprise-Grade Architecture: Modern PostgreSQL with Supabase, featuring multi-tenant isolation, real-time subscriptions, and 99.9% uptime SLA',
              'Intelligent Automation Engine: Advanced algorithms with 90%+ task auto-generation rate, dual-interval tracking, and crew workload optimization',
              'Maritime-Specific Design: Purpose-built with SOLAS 2024 compliance tracking, STCW-compliant role hierarchy, and ISM Code documentation support'
            ]
          },
          {
            h2: 'Technical Differentiators',
            content: 'Industry-leading capabilities that set a new standard for maritime maintenance platforms.',
            list: [
              'Centralized Equipment Registry: Single source of truth with 100% data consistency across entire fleet',
              'Cross-Fleet Intelligence: Fleet-wide analytics enabling performance benchmarking and optimization insights',
              'Dual-Interval Task Management: Industry-first capability tracking both running hours AND calendar intervals',
              'Automated PMS Schedule Import: Zero manual setup with one-click import of manufacturer schedules',
              'Row-Level Security (RLS): Military-grade database-enforced access control with multi-tenant isolation',
              'Built-in Regulatory Compliance: 100% SOLAS/MARPOL tracking with automated alerts and certificate management'
            ]
          },
          {
            h2: 'Platform Modules',
            content: 'Six integrated modules working together as a unified operating system for maritime maintenance.',
            list: [
              'PMS Core: Complete planned maintenance system with automated scheduling and dual-interval task tracking',
              'Equipment Registry: Centralized equipment database with lifecycle management and health scoring',
              'Parts & Procurement: Smart inventory management with automatic reorder points and usage analytics',
              'Compliance Manager: Regulatory tracking with SOLAS/MARPOL monitoring and audit trails',
              'Analytics & Reporting: Real-time KPIs with fleet benchmarking and custom dashboards',
              'User Management: STCW-compliant role hierarchy with granular permissions and multi-vessel assignments'
            ]
          },
          {
            h2: 'Competitive Advantages',
            content: 'Modern technology stack delivering 10x faster performance versus legacy systems.',
            list: [
              'Modern PostgreSQL + Supabase architecture with 99.9% uptime versus 1990s legacy databases',
              'Both running hours AND calendar tracking versus calendar-only maintenance intervals',
              'Automated task generation with 90%+ automation versus manual creation of every maintenance task',
              'Unified fleet-wide database versus isolated vessel databases with no cross-fleet intelligence',
              'Integrated SOLAS/MARPOL compliance versus add-on modules or manual spreadsheets',
              'Row-level security with multi-tenant isolation versus basic shared database access'
            ]
          }
        ]
      }
    },
    '/solutions': {
      title: 'Maritime Solutions - fleetcore',
      description: 'Industry-specific maritime intelligence solutions for commercial shipping, offshore energy, cruise lines, naval defense, port operations, and yacht management. Automated compliance and predictive maintenance.',
      url: 'https://fleetcore.ai/solutions',
      keywords: ['maritime solutions', 'commercial shipping software', 'offshore energy maintenance', 'cruise line operations', 'naval fleet management', 'port operations software'],
      content: {
        h1: 'Maritime Solutions Across All Sectors',
        intro: 'Specialized solutions tailored to the unique challenges of different maritime sectors, from commercial fleets to offshore operations.',
        sections: [
          {
            h2: 'Industry-Specific Solutions',
            content: 'Transform operations across all maritime sectors with AI-powered maintenance intelligence.',
            list: [
              'Commercial Fleet: Comprehensive maintenance management for cargo vessels, tankers, and bulk carriers with automated scheduling and compliance tracking',
              'Offshore Energy: Specialized solutions for offshore platforms, drilling rigs, and support vessels with safety-critical equipment monitoring',
              'Cruise & Passenger: Enhanced passenger safety and operational reliability with predictive maintenance and regulatory compliance automation',
              'Naval & Defense: Mission-critical maintenance management with enhanced security, audit trails, and operational readiness tracking',
              'Port Operations: Infrastructure maintenance and equipment lifecycle management for port facilities and terminal operations',
              'Yacht & Superyacht: Premium vessel maintenance with detailed service histories, crew management, and owner reporting'
            ]
          },
          {
            h2: 'Universal Benefits',
            content: 'Core capabilities adapted to each industry\'s specific requirements and regulatory environment.',
            list: [
              'Predictive maintenance reducing unplanned downtime by 20-30%',
              'Automated regulatory compliance with SOLAS, MARPOL, ISM Code, and industry-specific standards',
              'Cross-fleet intelligence for multi-vessel operators',
              'Real-time equipment monitoring and health scoring',
              'Digital documentation and audit-ready reporting',
              'Integration with existing ERP and procurement systems'
            ]
          }
        ]
      }
    },
    '/about': {
      title: 'About fleetcore - Maritime Intelligence Leadership',
      description: 'Leading provider of agentic maritime intelligence solutions. Dubai-based innovation team transforming fleet operations with AI-powered predictive maintenance and compliance automation.',
      url: 'https://fleetcore.ai/about',
      keywords: ['fleetcore company', 'maritime technology Dubai', 'maritime AI innovation', 'fleet management experts', 'maritime maintenance leadership'],
      content: {
        h1: 'Leading Maritime Intelligence Innovation',
        intro: 'Dubai-based technology company transforming maritime operations through AI-powered predictive maintenance and compliance automation.',
        sections: [
          {
            h2: 'Our Mission',
            content: 'Transform the maritime industry by eliminating the $17+ billion annual maintenance crisis through intelligent automation and predictive analytics.',
            list: [
              'Reduce maintenance costs by 20-30% through predictive intelligence',
              'Ensure 100% regulatory compliance with automated SOLAS/MARPOL/ISM tracking',
              'Enable cross-fleet learning and optimization across global operations',
              'Digitalize maritime operations for the modern era'
            ]
          },
          {
            h2: 'Technology Leadership',
            content: 'Pioneering agentic maritime intelligence with vessel-specific AI agents and global knowledge graphs.',
            list: [
              'First platform to combine vessel-specific AI agents with cross-fleet learning',
              'Industry-leading 90%+ maintenance automation rate',
              'Modern cloud-native architecture with 99.9% uptime SLA',
              'Vendor-neutral approach supporting all major OEM manufacturers'
            ]
          },
          {
            h2: 'Global Reach',
            content: 'Supporting maritime operations worldwide with enterprise-grade reliability and support.',
            list: [
              'Serving 500+ vessels across global fleet operations',
              'Supporting all major maritime sectors from commercial to naval',
              'Dubai headquarters with global support coverage',
              '24/7 enterprise assistance and technical support'
            ]
          }
        ]
      }
    },
    '/contact': {
      title: 'Contact fleetcore - Get Started',
      description: 'Transform your fleet operations with fleetcore\'s agentic maritime intelligence platform. Schedule a demo to see how AI-powered predictive maintenance reduces costs by 20-30%.',
      url: 'https://fleetcore.ai/contact',
      keywords: ['contact fleetcore', 'maritime software demo', 'fleet management consultation', 'predictive maintenance inquiry'],
      content: {
        h1: 'Transform Your Maritime Operations',
        intro: 'Schedule a personalized demo to see how fleetcore can optimize your fleet operations with enterprise-grade reliability and measurable ROI.',
        sections: [
          {
            h2: 'Get Started',
            content: 'Join leading maritime operators who trust fleetcore for critical maintenance operations.',
            list: [
              'Schedule a 30-minute platform demonstration',
              'Discuss your specific fleet maintenance challenges',
              'See how 20-30% cost reduction is achieved',
              'Learn about implementation timeline and support',
              'Explore integration with your existing systems'
            ]
          },
          {
            h2: 'Contact Information',
            content: 'Reach our team for inquiries, demonstrations, or technical support.',
            list: [
              'Email: contact@fleetcore.ai',
              'Location: Dubai, United Arab Emirates',
              'Support: 24/7 enterprise assistance available',
              'Response time: Within 24 hours for all inquiries'
            ]
          },
          {
            h2: 'What to Expect',
            content: 'Our consultation process is designed to understand your unique requirements.',
            list: [
              'Comprehensive platform walkthrough tailored to your fleet type',
              'Discussion of regulatory compliance requirements (SOLAS, MARPOL, ISM)',
              'Integration assessment with existing ERP and procurement systems',
              'ROI analysis and implementation timeline',
              'Answers to technical and operational questions'
            ]
          }
        ]
      }
    },
    '/privacy-policy': {
      title: 'Privacy Policy - fleetcore',
      description: 'fleetcore privacy policy outlining data collection, usage, and protection practices for our maritime intelligence platform.',
      url: 'https://fleetcore.ai/privacy-policy',
      keywords: ['fleetcore privacy', 'data protection maritime', 'GDPR compliance'],
      content: {
        h1: 'Privacy Policy',
        intro: 'fleetcore is committed to protecting your privacy and ensuring the security of your data. This policy outlines our data collection, usage, and protection practices.',
        sections: [
          {
            h2: 'Data Collection',
            content: 'We collect information necessary to provide our maritime intelligence services.',
            list: [
              'Account information (name, email, company details)',
              'Vessel and equipment data for maintenance management',
              'Usage analytics to improve platform performance',
              'Technical data for system optimization'
            ]
          },
          {
            h2: 'Data Security',
            content: 'Enterprise-grade security protecting your sensitive maritime operations data.',
            list: [
              'Row-level security with multi-tenant isolation',
              'Encrypted data transmission and storage',
              'Regular security audits and compliance checks',
              'SOC 2 Type II compliance',
              'GDPR and international data protection standards'
            ]
          },
          {
            h2: 'Data Usage',
            content: 'Your data is used solely to provide and improve our maritime intelligence services.',
            list: [
              'Maintenance scheduling and predictive analytics',
              'Regulatory compliance monitoring and reporting',
              'Cross-fleet intelligence (anonymized and aggregated)',
              'Platform improvements and feature development',
              'Customer support and technical assistance'
            ]
          }
        ]
      }
    }
  };

  const route = routes[pathname] || routes['/'];

  // Generate rich semantic HTML with comprehensive content
  const sectionsHTML = route.content.sections.map(section => `
    <section>
      <h2>${section.h2}</h2>
      <p>${section.content}</p>
      ${section.list ? `
        <ul>
          ${section.list.map(item => `<li>${item}</li>`).join('\n          ')}
        </ul>
      ` : ''}
    </section>
  `).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${route.title}</title>
  <meta name="description" content="${route.description}">
  <meta name="keywords" content="${route.keywords.join(', ')}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="author" content="fleetcore">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${route.url}">
  <meta property="og:title" content="${route.title}">
  <meta property="og:description" content="${route.description}">
  <meta property="og:image" content="https://fleetcore.ai/og/${pathname === '/' ? 'home' : pathname.slice(1)}.png">
  <meta property="og:site_name" content="fleetcore">
  
  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@fleetcore_ai">
  <meta name="twitter:url" content="${route.url}">
  <meta name="twitter:title" content="${route.title}">
  <meta name="twitter:description" content="${route.description}">
  <meta name="twitter:image" content="https://fleetcore.ai/og/${pathname === '/' ? 'home' : pathname.slice(1)}.png">
  
  <!-- Canonical -->
  <link rel="canonical" href="${route.url}">
  
  <!-- Structured Data - Organization -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "fleetcore",
    "url": "https://fleetcore.ai",
    "logo": "https://fleetcore.ai/Light.svg",
    "description": "Leading provider of agentic maritime intelligence solutions for predictive maintenance and regulatory compliance.",
    "foundingDate": "2024",
    "industry": "Maritime Technology",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "AE",
      "addressLocality": "Dubai"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Sales",
      "email": "contact@fleetcore.ai",
      "availableLanguage": ["English"]
    },
    "sameAs": [
      "https://linkedin.com/company/fleetcore-ai",
      "https://x.com/fleetcore_ai"
    ]
  }
  </script>
  
  <!-- Structured Data - Software Application -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "fleetcore Maritime Intelligence Platform",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Cloud",
    "description": "${route.description}",
    "url": "https://fleetcore.ai",
    "offers": {
      "@type": "Offer",
      "availability": "https://schema.org/InStock",
      "priceRange": "Enterprise pricing available"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "127"
    },
    "featureList": [
      "Agentic Fleet AI with vessel-specific agents",
      "Global Intelligence Graph for cross-fleet learning",
      "Automated SOLAS 2024, MARPOL, and ISM compliance",
      "Predictive maintenance with 20-30% cost reduction",
      "Vendor-neutral multi-OEM optimization",
      "Real-time regulatory monitoring",
      "99.9% uptime SLA"
    ]
  }
  </script>
  
  <!-- Structured Data - WebPage with Speakable -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "${route.title}",
    "url": "${route.url}",
    "description": "${route.description}",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["h1", ".intro", ".key-features"]
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://fleetcore.ai/"
        }
        ${pathname !== '/' ? `,
        {
          "@type": "ListItem",
          "position": 2,
          "name": "${route.title.split(' - ')[0]}",
          "item": "${route.url}"
        }` : ''}
      ]
    }
  }
  </script>
  
  <!-- AI Search Optimization Comments -->
  <!-- PRIMARY_PURPOSE: Maritime maintenance platform reducing costs by 20-30% through predictive intelligence -->
  <!-- TARGET_INDUSTRIES: Commercial shipping, offshore energy, cruise operations, naval defense, port operations -->
  <!-- KEY_BENEFITS: Automated SOLAS compliance, predictive maintenance, cross-fleet intelligence, 99.9% uptime -->
  <!-- DIFFERENTIATORS: Agentic AI, vendor-neutral, modern cloud architecture, 90%+ automation rate -->
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      padding: 40px 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: #0ea5e9;
      font-weight: 700;
      line-height: 1.2;
    }
    h2 {
      font-size: 1.8rem;
      margin: 2rem 0 1rem 0;
      color: #0f172a;
      font-weight: 600;
    }
    p {
      font-size: 1.125rem;
      margin-bottom: 1rem;
      color: #475569;
      line-height: 1.7;
    }
    .intro {
      font-size: 1.25rem;
      font-weight: 500;
      color: #334155;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: #f1f5f9;
      border-left: 4px solid #0ea5e9;
      border-radius: 4px;
    }
    ul {
      list-style: none;
      margin: 1rem 0 2rem 0;
    }
    li {
      padding: 0.75rem 0;
      padding-left: 1.5rem;
      position: relative;
      color: #334155;
      line-height: 1.6;
    }
    li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
    }
    section {
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #e2e8f0;
    }
    section:last-child {
      border-bottom: none;
    }
    .keywords {
      display: none; /* Hidden from visual but readable by bots */
    }
    footer {
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <!-- Hidden keywords for search engines -->
  <div class="keywords" aria-hidden="true">
    Keywords: ${route.keywords.join(', ')}
  </div>

  <header>
    <h1>${route.content.h1}</h1>
    <p class="intro">${route.content.intro}</p>
  </header>

  <main>
    ${sectionsHTML}
  </main>

  <footer>
    <p><strong>fleetcore</strong> - Agentic Maritime Intelligence Platform</p>
    <p>Dubai, United Arab Emirates | contact@fleetcore.ai</p>
    <p>© 2024-2025 fleetcore. Leading provider of maritime maintenance intelligence.</p>
  </footer>

  <!-- Performance hint for browsers -->
  <link rel="prefetch" href="https://fleetcore.ai/">
</body>
</html>`;
}

export async function onRequest(context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
  waitUntil?: (promise: Promise<any>) => void;
}) {
  try {
    const userAgent = context.request.headers.get('user-agent') || '';
    const url = new URL(context.request.url);
    const pathname = url.pathname;
    
    // Define SPA routes that need bot optimization
    const spaRoutes = ['/', '/solutions', '/platform', '/about', '/contact', '/privacy-policy'];
    
    // Enhanced edge caching with Cloudflare-specific optimizations
    const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|webm)$/i.test(pathname);
    
    // Static assets - aggressive caching
    if (isStaticAsset) {
      const response = await context.next();
      const newResponse = new Response(response.body, response);
      
      // Immutable assets (hashed filenames)
      if (/\.[a-f0-9]{8,}\.(js|css)$/i.test(pathname)) {
        newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Regular assets - 1 week cache
        newResponse.headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      }
      
      return newResponse;
    }
    
    // Check if this is a bot accessing an SPA route
    if (isBot(userAgent) && spaRoutes.includes(pathname)) {
      console.log(`[BOT DETECTED] ${userAgent.substring(0, 50)} -> ${pathname}`);
      
      // Generate optimized HTML for bots
      const html = generateBotHTML(pathname);
      
      const botResponse = new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Served-To': 'Bot',
          'X-Bot-User-Agent': userAgent.substring(0, 100),
          'X-Robots-Tag': 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
          'X-Content-Type-Options': 'nosniff',
          'Vary': 'User-Agent',
          'CDN-Cache-Control': 'max-age=86400',
          'Cloudflare-CDN-Cache-Control': 'max-age=86400'
        }
      });
      
      // Optional: Try edge caching (non-blocking, won't fail if unavailable)
      try {
        if (typeof caches !== 'undefined' && caches.default) {
          const cacheKey = new Request(`https://bot-cache/${pathname}`, { method: 'GET' });
          const cache = caches.default;
          
          // Non-blocking cache write
          if (context.waitUntil) {
            context.waitUntil(cache.put(cacheKey, botResponse.clone()));
          } else {
            // Fire and forget if waitUntil not available
            cache.put(cacheKey, botResponse.clone()).catch(() => {});
          }
        }
      } catch (cacheError) {
        // Silently ignore cache errors - content delivery is more important
        console.log('[Cache] Optional caching failed, continuing...');
      }
      
      return botResponse;
    }
    
    // For regular users - HTML pages with smart caching
    if (spaRoutes.includes(pathname)) {
      const response = await context.next();
      const newResponse = new Response(response.body, response);
      
      // SPA pages: short cache, always revalidate
      newResponse.headers.set('Cache-Control', 'public, max-age=0, must-revalidate, stale-while-revalidate=3600');
      newResponse.headers.set('X-Content-Type-Options', 'nosniff');
      newResponse.headers.set('X-Served-To', 'User');
      
      return newResponse;
    }
    
    // For all other requests, pass through
    return context.next();
  } catch (error) {
    // If middleware fails, pass through to avoid breaking the site
    console.error('[Middleware Error]', error);
    return context.next();
  }
}
