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
import { generateAIContent } from './bot-content/ai';
import { generatePlatformContent } from './bot-content/platform';
import { generateSolutionsContent } from './bot-content/solutions';
import { generateAboutContent } from './bot-content/about';
import { generateContactContent } from './bot-content/contact';
import { generatePrivacyPolicyContent } from './bot-content/privacy-policy';
import { generateImprintContent } from './bot-content/imprint';

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

// Comprehensive bot detection for search engines and AI crawlers
function isBot(userAgent: string): boolean {
  const botPatterns = [
    // Traditional search engines
    'Googlebot', 'Google-InspectionTool', 'GoogleOther',
    'bingbot', 'BingPreview', 'msnbot',
    'DuckDuckBot', 'Baiduspider', 'YandexBot',
    'Slurp', 'Yahoo',
    
    // AI search engines & LLM crawlers (2024-2026)
    'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',  // OpenAI
    'Claude-Web', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',  // Anthropic
    'PerplexityBot', 'Perplexity',  // Perplexity AI
    'Google-Extended', 'GoogleOther',  // Google Bard/Gemini
    'Applebot-Extended',  // Apple Intelligence (added 2024)
    'cohere-ai',  // Cohere
    'Meta-ExternalAgent',  // Meta AI
    'Bytespider',  // ByteDance
    'CCBot',  // Common Crawl
    
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
    case '/ai':
      return generateAIContent();
    case '/about':
      return generateAboutContent();
    case '/contact':
      return generateContactContent();
    case '/privacy-policy':
      return generatePrivacyPolicyContent();
    case '/imprint':
      return generateImprintContent();
    default:
      return generateHomeContent();
  }
}

// All valid SPA routes — used for 404 detection and bot routing
const ALL_SPA_ROUTES = new Set([
  '/',
  '/solutions',
  '/solutions/commercial-shipping',
  '/solutions/offshore-energy',
  '/solutions/cruise-lines',
  '/solutions/naval-defense',
  '/solutions/port-operations',
  '/solutions/yacht-superyacht',
  '/ai',
  '/platform',
  '/resources',
  '/resources/knowledge-base',
  '/resources/reports',
  '/resources/webinars',
  '/case-studies',
  '/about',
  '/contact',
  '/privacy-policy',
  '/imprint',
]);

// Routes served with full bot-optimised HTML (indexed pages only)
const BOT_ROUTES = new Set(['/', '/solutions', '/ai', '/platform', '/about', '/contact', '/privacy-policy', '/imprint']);

// Unpublished routes — robots.txt Disallow + HTTP noindex (Helmet alone is not enough for all crawlers)
const NOINDEX_ROUTES = new Set([
  '/solutions/commercial-shipping',
  '/solutions/offshore-energy',
  '/solutions/cruise-lines',
  '/solutions/naval-defense',
  '/solutions/port-operations',
  '/solutions/yacht-superyacht',
  '/resources',
  '/resources/knowledge-base',
  '/resources/reports',
  '/resources/webinars',
  '/case-studies',
]);

/** Vite/Rollup hashed filenames are case-sensitive — never lowercase paths with extensions */
function hasStaticFileExtension(pathname: string): boolean {
  return /\.[a-zA-Z0-9]{2,12}$/.test(pathname);
}

function canonicalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/');
  const withoutTrailing =
    collapsed.length > 1 && collapsed.endsWith('/') ? collapsed.replace(/\/+$/, '') || '/' : collapsed;
  if (hasStaticFileExtension(withoutTrailing)) {
    return withoutTrailing;
  }
  return withoutTrailing.toLowerCase();
}

// Main middleware handler
export async function onRequest(context: EventContext) {
  try {
    const userAgent = context.request.headers.get('user-agent') || '';
    const url = new URL(context.request.url);
    const rawPathname = url.pathname;

    // 0. Vite bundles — never rewrite (case-sensitive hashes; skip cached 301 redirect paths)
    if (
      rawPathname.startsWith('/assets/') ||
      /^\/favicon\.ico$/i.test(rawPathname) ||
      rawPathname.startsWith('/favicon/')
    ) {
      return context.next();
    }

    // 1. www → canonical redirect (must run before anything else)
    if (url.hostname === 'www.fleetcore.ai') {
      return Response.redirect(`https://fleetcore.ai${rawPathname}${url.search}`, 301);
    }

    // 2. Normalize path: collapse slashes, strip trailing slash, lowercase (routes only — not /assets/*.js)
    const canonicalPathname = canonicalizePathname(rawPathname);
    if (canonicalPathname !== rawPathname) {
      return Response.redirect(`${url.origin}${canonicalPathname}${url.search}`, 301);
    }
    const pathname = canonicalPathname;

    // 3. Static asset caching - aggressive performance
    const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|webm|txt|xml|json|webmanifest)$/i.test(pathname);

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

    // 4. Bot detection and content delivery for indexed routes
    if (isBot(userAgent) && BOT_ROUTES.has(pathname)) {
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

    // 5. Known SPA routes — serve the React app with correct cache headers
    if (ALL_SPA_ROUTES.has(pathname)) {
      const response = await context.next();
      const newResponse = new Response(response.body, response);

      newResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      newResponse.headers.set('X-Content-Type-Options', 'nosniff');
      newResponse.headers.set('X-Served-To', 'User');
      if (NOINDEX_ROUTES.has(pathname)) {
        newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
      }

      return newResponse;
    }

    // 6. Unknown routes — serve React app (renders NotFoundPage) with HTTP 404
    //    React Router handles client-side display; HTTP 404 satisfies crawlers.
    const response = await context.next();
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(response.body, {
      status: 404,
      headers
    });

  } catch (error) {
    // Graceful fallback - never break the site
    console.error('[MIDDLEWARE ERROR]', error);
    return context.next();
  }
}
