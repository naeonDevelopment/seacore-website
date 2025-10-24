/**
 * Cloudflare Pages Middleware - Bot Detection & Content Delivery
 * 
 * Architecture:
 * - Logic only (no hardcoded content)
 * - Bot detection for Google, ChatGPT, Claude, Perplexity, Gemini
 * - Dynamic content loading from bot-content/ files
 * - Edge caching for performance
 */

import { generateHomeContent } from './bot-content/home';
import { generatePlatformContent } from './bot-content/platform';
import { generateSolutionsContent } from './bot-content/solutions';
import { generateAboutContent } from './bot-content/about';
import { generateContactContent } from './bot-content/contact';
import { generatePrivacyPolicyContent } from './bot-content/privacy-policy';

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

// Generate rich HTML for bot crawlers
function generateBotHTML(pathname: string): string {
  // Dynamically generate content based on route
  switch (pathname) {
    case '/':
      return generateHomeContent();
    case '/platform':
      return generatePlatformContent();
    case '/solutions':
      return generateSolutionsContent();
    case '/about':
      return generateAboutContent();
    case '/contact':
      return generateContactContent();
    case '/privacy-policy':
      return generatePrivacyPolicyContent();
    default:
      return generateHomeContent();
  }
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
