// Enhanced Cloudflare Pages middleware with basic SSR fallback
// Serves optimized content for crawlers without requiring pre-rendering

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

// Bot detection with comprehensive crawler list
function isBot(userAgent: string): boolean {
  return /bot|crawler|spider|google|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkshare|w3c_validator|whatsapp|GPTBot|ClaudeBot|PerplexityBot|Applebot|Amazonbot|ia_archiver|inspection/i.test(userAgent);
}

// Generate basic HTML shell with meta tags for bots
function generateBotHTML(pathname: string): string {
  const routes: Record<string, { title: string; description: string; url: string }> = {
    '/': {
      title: 'FleetCore - Agentic Maritime Intelligence Platform',
      description: 'Revolutionary AI-powered maritime maintenance platform with predictive intelligence, automated SOLAS/MARPOL/ISM compliance, and cross-manufacturer optimization. Transform your fleet operations with agentic maritime intelligence.',
      url: 'https://fleetcore.ai/'
    },
    '/solutions': {
      title: 'Maritime Solutions - FleetCore',
      description: 'Industry-specific maritime intelligence solutions for commercial shipping, offshore energy, cruise lines, naval defense, port operations, and yacht management. Automated compliance and predictive maintenance.',
      url: 'https://fleetcore.ai/solutions'
    },
    '/platform': {
      title: 'Platform - FleetCore Agentic Maritime Intelligence',
      description: 'Agentic Fleet AI, Global Intelligence Graph, automated regulatory compliance, predictive maintenance, and vendor-neutral OEM integration. Transform maritime operations with AI.',
      url: 'https://fleetcore.ai/platform'
    },
    '/about': {
      title: 'About FleetCore - Maritime Intelligence Leadership',
      description: 'Leading provider of agentic maritime intelligence solutions. Dubai-based innovation team transforming fleet operations with AI-powered predictive maintenance and compliance automation.',
      url: 'https://fleetcore.ai/about'
    },
    '/contact': {
      title: 'Contact FleetCore - Get Started',
      description: 'Transform your fleet operations with FleetCore\'s agentic maritime intelligence platform. Schedule a demo to see how AI-powered predictive maintenance reduces costs by 20-30%.',
      url: 'https://fleetcore.ai/contact'
    },
    '/privacy-policy': {
      title: 'Privacy Policy - FleetCore',
      description: 'FleetCore privacy policy outlining data collection, usage, and protection practices for our maritime intelligence platform.',
      url: 'https://fleetcore.ai/privacy-policy'
    }
  };

  const route = routes[pathname] || routes['/'];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${route.title}</title>
  <meta name="description" content="${route.description}">
  <meta name="robots" content="index, follow">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${route.url}">
  <meta property="og:title" content="${route.title}">
  <meta property="og:description" content="${route.description}">
  <meta property="og:image" content="https://fleetcore.ai/og/home.png">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${route.url}">
  <meta name="twitter:title" content="${route.title}">
  <meta name="twitter:description" content="${route.description}">
  <meta name="twitter:image" content="https://fleetcore.ai/og/home.png">
  
  <!-- Canonical -->
  <link rel="canonical" href="${route.url}">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "FleetCore",
    "url": "https://fleetcore.ai/",
    "description": "${route.description}",
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
  
  <!-- Critical styles inline for instant render -->
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #fff; color: #1a1a1a; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { font-size: 1.125rem; line-height: 1.7; color: #4a5568; }
    .content { margin-top: 2rem; }
    noscript { display: block; padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${route.title}</h1>
    <p>${route.description}</p>
    
    <div class="content">
      <h2>Key Features</h2>
      <ul>
        <li><strong>Agentic Fleet AI:</strong> Vessel-specific agents with autonomous decision-making</li>
        <li><strong>Predictive Maintenance:</strong> 20-30% cost reduction through AI-powered scheduling</li>
        <li><strong>Automated Compliance:</strong> SOLAS 2024, MARPOL, ISM Code monitoring</li>
        <li><strong>Global Intelligence Graph:</strong> Cross-fleet learning and optimization</li>
        <li><strong>Vendor-Neutral Platform:</strong> Multi-OEM integration and optimization</li>
      </ul>
    </div>
  </div>
</body>
</html>`;
}

export async function onRequest(context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}) {
  const userAgent = context.request.headers.get('user-agent') || '';
  const url = new URL(context.request.url);
  
  // Check if this is a bot
  if (isBot(userAgent)) {
    console.log(`Bot detected: ${userAgent} accessing ${url.pathname}`);
    
    // For main routes, serve optimized HTML
    const mainRoutes = ['/', '/solutions', '/platform', '/about', '/contact', '/privacy-policy'];
    
    if (mainRoutes.includes(url.pathname)) {
      const html = generateBotHTML(url.pathname);
      
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Served-To': 'Bot',
          'X-Robots-Tag': 'index, follow',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }
  }
  
  // Try to serve the requested file
  const response = await context.next();
  
  // If file not found (404) and it's not a file request (no extension), serve index.html for SPA routing
  if (response.status === 404 && !url.pathname.includes('.')) {
    // Rewrite URL to index.html for SPA routing
    const indexUrl = new URL(context.request.url);
    indexUrl.pathname = '/index.html';
    
    return context.env.ASSETS.fetch(new Request(indexUrl, context.request));
  }
  
  return response;
}

