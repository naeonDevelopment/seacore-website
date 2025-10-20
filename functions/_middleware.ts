// Cloudflare Pages Functions middleware for bot rendering
// This runs at the edge before serving static files

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export async function onRequest(context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}) {
  const userAgent = context.request.headers.get('user-agent') || '';
  
  // Detect bots and crawlers
  const isBot = /bot|crawler|spider|facebookexternalhit|twitterbot|slackbot|linkedinbot|whatsapp/i.test(userAgent);
  
  // For now, just pass through - but this is where you'd add SSR
  // Future: Render React server-side for bots using miniflare or similar
  
  if (isBot) {
    // Log bot access (optional)
    console.log(`Bot detected: ${userAgent}`);
    
    // For now, serve the static HTML
    // TODO: Add actual SSR here if needed
  }
  
  return context.next();
}

