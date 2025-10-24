// Enhanced Cloudflare Pages middleware with rich semantic content for bots
// Optimized for Google, Bing, ChatGPT, Perplexity, Claude, and other AI search engines

// Cloudflare Pages Functions EventContext interface
interface EventContext<Env = any, P extends string = any, Data extends Record<string, unknown> = Record<string, unknown>> {
  request: Request;
  functionPath: string;
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
  next(input?: Request | string, init?: RequestInit): Promise<Response>;
  env: Env;
  params: Record<string, string>;
  data: Data;
}

interface Env {
  ASSETS?: {
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
          }
        ]
      }
    },
    '/solutions': {
      title: 'Maritime Solutions - fleetcore',
      description: 'Industry-specific maritime intelligence solutions for commercial shipping, offshore energy, cruise lines, naval defense, port operations, and yacht management.',
      url: 'https://fleetcore.ai/solutions',
      keywords: ['maritime solutions', 'commercial shipping software', 'offshore energy maintenance', 'cruise line operations'],
      content: {
        h1: 'Maritime Solutions Across All Sectors',
        intro: 'Specialized solutions tailored to the unique challenges of different maritime sectors, from commercial fleets to offshore operations.',
        sections: [
          {
            h2: 'Industry-Specific Solutions',
            content: 'Transform operations across all maritime sectors with AI-powered maintenance intelligence.',
            list: [
              'Commercial Fleet: Comprehensive maintenance management for cargo vessels, tankers, and bulk carriers',
              'Offshore Energy: Specialized solutions for offshore platforms, drilling rigs, and support vessels',
              'Cruise & Passenger: Enhanced passenger safety and operational reliability',
              'Naval & Defense: Mission-critical maintenance with enhanced security and audit trails'
            ]
          }
        ]
      }
    },
    '/about': {
      title: 'About fleetcore - Maritime Intelligence Leadership',
      description: 'Leading provider of agentic maritime intelligence solutions. Dubai-based innovation team transforming fleet operations.',
      url: 'https://fleetcore.ai/about',
      keywords: ['fleetcore company', 'maritime technology Dubai', 'maritime AI innovation'],
      content: {
        h1: 'Leading Maritime Intelligence Innovation',
        intro: 'Dubai-based technology company transforming maritime operations through AI-powered predictive maintenance.',
        sections: [
          {
            h2: 'Our Mission',
            content: 'Transform the maritime industry by eliminating the $17+ billion annual maintenance crisis.',
            list: [
              'Reduce maintenance costs by 20-30% through predictive intelligence',
              'Ensure 100% regulatory compliance with automated SOLAS/MARPOL/ISM tracking'
            ]
          }
        ]
      }
    },
    '/contact': {
      title: 'Contact fleetcore - Get Started',
      description: 'Transform your fleet operations with fleetcore. Schedule a demo to see how AI-powered predictive maintenance reduces costs by 20-30%.',
      url: 'https://fleetcore.ai/contact',
      keywords: ['contact fleetcore', 'maritime software demo', 'fleet management consultation'],
      content: {
        h1: 'Transform Your Maritime Operations',
        intro: 'Schedule a personalized demo to see how fleetcore can optimize your fleet operations.',
        sections: [
          {
            h2: 'Get Started',
            content: 'Join leading maritime operators who trust fleetcore.',
            list: [
              'Schedule a 30-minute platform demonstration',
              'See how 20-30% cost reduction is achieved',
              'Email: contact@fleetcore.ai'
            ]
          }
        ]
      }
    },
    '/privacy-policy': {
      title: 'Privacy Policy - fleetcore',
      description: 'fleetcore privacy policy outlining data collection, usage, and protection practices.',
      url: 'https://fleetcore.ai/privacy-policy',
      keywords: ['fleetcore privacy', 'data protection maritime', 'GDPR compliance'],
      content: {
        h1: 'Privacy Policy',
        intro: 'fleetcore is committed to protecting your privacy and ensuring the security of your data.',
        sections: [
          {
            h2: 'Data Security',
            content: 'Enterprise-grade security protecting your sensitive maritime operations data.',
            list: [
              'Row-level security with multi-tenant isolation',
              'Encrypted data transmission and storage',
              'SOC 2 Type II compliance'
            ]
          }
        ]
      }
    }
  };

  const route = routes[pathname] || routes['/'];

  // Generate rich semantic HTML
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
  <link rel="canonical" href="${route.url}">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; color: #0ea5e9; }
    h2 { font-size: 1.8rem; margin: 2rem 0 1rem; color: #0f172a; }
    p { font-size: 1.125rem; color: #475569; margin-bottom: 1rem; }
    ul { margin: 1rem 0; }
    li { padding: 0.5rem 0; color: #334155; }
  </style>
</head>
<body>
  <h1>${route.content.h1}</h1>
  <p><strong>${route.content.intro}</strong></p>
  ${sectionsHTML}
</body>
</html>`;
}

// Main middleware function using official Cloudflare Pages EventContext
export async function onRequest(context: EventContext<Env>): Promise<Response> {
  try {
    const userAgent = context.request.headers.get('user-agent') || '';
    const url = new URL(context.request.url);
    const pathname = url.pathname;
    
    // Define SPA routes that need bot optimization
    const spaRoutes = ['/', '/solutions', '/platform', '/about', '/contact', '/privacy-policy'];
    
    // Static assets - aggressive caching
    const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|webm)$/i.test(pathname);
    if (isStaticAsset) {
      const response = await context.next();
      const newResponse = new Response(response.body, response);
      
      // Immutable assets (hashed filenames) - 1 year cache
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
      
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Served-To': 'Bot',
          'X-Bot-User-Agent': userAgent.substring(0, 100),
          'X-Robots-Tag': 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
          'X-Content-Type-Options': 'nosniff',
          'Vary': 'User-Agent',
        }
      });
    }
    
    // For regular users - HTML pages with smart caching
    if (spaRoutes.includes(pathname)) {
      const response = await context.next();
      const newResponse = new Response(response.body, response);
      
      newResponse.headers.set('Cache-Control', 'public, max-age=0, must-revalidate, stale-while-revalidate=3600');
      newResponse.headers.set('X-Content-Type-Options', 'nosniff');
      newResponse.headers.set('X-Served-To', 'User');
      
      return newResponse;
    }
    
    // For all other requests, pass through
    return context.next();
  } catch (err) {
    // If middleware fails, pass through to avoid breaking the site
    console.error('[Middleware Error]', err);
    return context.next();
  }
}
