/**
 * Cloudflare Pages Middleware - Bot Detection & Content Delivery
 * 
 * Architecture:
 * - Logic only (no hardcoded content)
 * - Bot detection for Google, ChatGPT, Claude, Perplexity, Gemini
 * - Dynamic content loading from bot-content/ files
 * - Edge caching for performance
 */

import { homeContent } from './bot-content/home';
import { platformContent } from './bot-content/platform';
import { solutionsContent } from './bot-content/solutions';
import { aboutContent } from './bot-content/about';
import { contactContent } from './bot-content/contact';
import { privacyPolicyContent } from './bot-content/privacy-policy';

// Cloudflare Pages EventContext interface
interface EventContext<Env = any> {
  request: Request;
  functionPath: string;
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
  next(input?: Request | string, init?: RequestInit): Promise<Response>;
  env: Env;
  params: Record<string, string>;
  data: Record<string, unknown>;
}

interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

// Comprehensive bot detection for search engines and AI crawlers
function isBot(userAgent: string): boolean {
  const botPatterns = [
    // Traditional search engines
    'Googlebot', 'Google-InspectionTool', 'GoogleOther',
    'bingbot', 'BingPreview', 'msnbot',
    'DuckDuckBot', 'Baiduspider', 'YandexBot',
    'Slurp', 'Yahoo',
    
    // AI search engines & LLM crawlers (2024-2025)
    'GPTBot', 'ChatGPT-User',  // OpenAI
    'Claude-Web', 'ClaudeBot', 'anthropic-ai',  // Anthropic
    'PerplexityBot', 'Perplexity',  // Perplexity AI
    'Google-Extended', 'GoogleOther',  // Google Bard/Gemini
    'cohere-ai',  // Cohere
    'Meta-ExternalAgent',  // Meta AI
    
    // Social media crawlers
    'facebookexternalhit', 'Twitterbot', 'LinkedInBot',
    'WhatsApp', 'TelegramBot', 'Slackbot',
    
    // SEO & monitoring tools
    'Screaming Frog', 'AhrefsBot', 'SemrushBot',
    'MJ12bot', 'DotBot', 'PetalBot'
  ];
  
  return botPatterns.some(pattern => 
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );
}

// Content mapping for all routes
const contentMap: Record<string, { title: string; description: string; content: string }> = {
  '/': homeContent,
  '/platform': platformContent,
  '/solutions': solutionsContent,
  '/about': aboutContent,
  '/contact': contactContent,
  '/privacy-policy': privacyPolicyContent
};

// Generate rich HTML for bot crawlers
function generateBotHTML(pathname: string): string {
  const pageContent = contentMap[pathname] || contentMap['/'];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageContent.title}</title>
  <meta name="description" content="${pageContent.description}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://fleetcore.ai${pathname}">
  <meta property="og:title" content="${pageContent.title}">
  <meta property="og:description" content="${pageContent.description}">
  <meta property="og:image" content="https://fleetcore.ai/og/home.png">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://fleetcore.ai${pathname}">
  <meta name="twitter:title" content="${pageContent.title}">
  <meta name="twitter:description" content="${pageContent.description}">
  <meta name="twitter:image" content="https://fleetcore.ai/og/home.png">
  
  <!-- Canonical -->
  <link rel="canonical" href="https://fleetcore.ai${pathname}">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "FleetCore",
    "url": "https://fleetcore.ai/",
    "description": "${pageContent.description}",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://fleetcore.ai/search?q={query}",
      "query-input": "required name=query"
    }
  }
  </script>
  
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "FleetCore",
    "url": "https://fleetcore.ai",
    "logo": "https://fleetcore.ai/Light.svg",
    "description": "Leading provider of agentic maritime intelligence solutions for predictive maintenance and regulatory compliance."
  }
  </script>
  
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      line-height: 1.6; 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 20px; 
      color: #1e293b;
    }
    h1 { color: #0f172a; font-size: 2.5em; margin-bottom: 0.5em; }
    h2 { color: #1e293b; font-size: 1.8em; margin-top: 1.5em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
    h3 { color: #334155; font-size: 1.3em; margin-top: 1.2em; }
    strong { color: #0ea5e9; }
    ul { margin: 1em 0; padding-left: 2em; }
    li { margin: 0.5em 0; }
    table { width: 100%; border-collapse: collapse; margin: 1.5em 0; }
    th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    a { color: #0ea5e9; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  ${pageContent.content}
  
  <footer style="margin-top: 4em; padding-top: 2em; border-top: 2px solid #e2e8f0; color: #64748b; font-size: 0.9em;">
    <p><strong>FleetCore</strong> - AI-Powered Maritime Maintenance Operating System</p>
    <p>© ${new Date().getFullYear()} FleetCore. All rights reserved. | <a href="https://fleetcore.ai/privacy-policy">Privacy Policy</a></p>
  </footer>
</body>
</html>`;
}

// Main middleware handler
export async function onRequest(context: EventContext) {
  try {
    const userAgent = context.request.headers.get('user-agent') || '';
    const url = new URL(context.request.url);
    const pathname = url.pathname;
    
    // SPA routes that need bot optimization
    const spaRoutes = ['/', '/solutions', '/platform', '/about', '/contact', '/privacy-policy'];
    
    // Static asset caching - aggressive performance
    const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|webm)$/i.test(pathname);
    
    if (isStaticAsset) {
      const response = await context.next();
      const newResponse = new Response(response.body, response);
      
      // Immutable hashed assets - 1 year cache
      if (/\.[a-f0-9]{8,}\.(js|css)$/i.test(pathname)) {
        newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Regular assets - 1 week cache with revalidation
        newResponse.headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      }
      
      return newResponse;
    }
    
    // Bot detection and content delivery
    if (isBot(userAgent) && spaRoutes.includes(pathname)) {
      console.log(`[BOT DETECTED] ${userAgent.substring(0, 50)} -> ${pathname}`);
      
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
          'CDN-Cache-Control': 'max-age=86400',
          'Cloudflare-CDN-Cache-Control': 'max-age=86400'
        }
      });
    }
    
    // Regular user - SPA with smart caching
    if (spaRoutes.includes(pathname)) {
      const response = await context.next();
      const newResponse = new Response(response.body, response);
      
      newResponse.headers.set('Cache-Control', 'public, max-age=0, must-revalidate, stale-while-revalidate=3600');
      newResponse.headers.set('X-Content-Type-Options', 'nosniff');
      newResponse.headers.set('X-Served-To', 'User');
      
      return newResponse;
    }
    
    // All other requests - pass through
    return context.next();
    
  } catch (error) {
    // Graceful fallback - never break the site
    console.error('[MIDDLEWARE ERROR]', error);
    return context.next();
  }
}
