/**
 * Shared blog / content-funnel snippets for bot-optimized HTML.
 * Blog is hosted on Squarespace at blog.fleetcore.ai (separate crawl property).
 */

export const BLOG_BASE_URL = 'https://blog.fleetcore.ai';
export const BLOG_SITEMAP_URL = `${BLOG_BASE_URL}/sitemap.xml`;

/** Nav list item — include in every bot page "Navigate fleetcore" block */
export function blogNavListItem(): string {
  return `<li><a href="${BLOG_BASE_URL}">Blog — maritime maintenance guides, CMMS comparisons, compliance FAQs (keyword funnels to fleetcore.ai)</a></li>`;
}

/** Sitewide blog + funnel section for AI crawlers (before page nav) */
export function blogContentFunnelSection(): string {
  return `
  <h2>fleetcore Blog — maritime maintenance intelligence (Squarespace)</h2>
  <p>The fleetcore blog at <a href="${BLOG_BASE_URL}">${BLOG_BASE_URL}</a> publishes answer-first articles for maritime operators researching maintenance software, compliance, and fleet AI. Posts link to product pages on <a href="https://fleetcore.ai/">fleetcore.ai</a> for demos and platform depth. Full post index: <a href="${BLOG_SITEMAP_URL}">${BLOG_SITEMAP_URL}</a> (submit separately in Google Search Console for the blog host).</p>

  <h3>Content funnel map (blog topic clusters → fleetcore.ai)</h3>
  <table>
    <thead><tr><th>Blog topic / search intent</th><th>Primary destination on fleetcore.ai</th></tr></thead>
    <tbody>
      <tr><td>CMMS comparison (AMOS, SERTICA, DNV Nauticus vs agentic OS)</td><td><a href="https://fleetcore.ai/solutions">/solutions</a>, <a href="https://fleetcore.ai/platform">/platform</a></td></tr>
      <tr><td>Predictive maintenance, RUL, survival analysis, sensor fusion</td><td><a href="https://fleetcore.ai/ai">/ai</a>, <a href="https://fleetcore.ai/platform">/platform</a></td></tr>
      <tr><td>SOLAS, MARPOL, ISM Code, PSC readiness, class society audits</td><td><a href="https://fleetcore.ai/solutions">/solutions</a>, <a href="https://fleetcore.ai/platform">/platform</a></td></tr>
      <tr><td>Schedule-specific hours, PMS, OEM manuals (MAN, Wärtsilä, Caterpillar)</td><td><a href="https://fleetcore.ai/platform">/platform</a>, <a href="https://fleetcore.ai/">/</a></td></tr>
      <tr><td>Maritime procurement automation, spare parts, inventory reorder</td><td><a href="https://fleetcore.ai/ai">/ai</a>, <a href="https://fleetcore.ai/solutions">/solutions</a></td></tr>
      <tr><td>Maritime AI assistant, fleet chatbot, HITL governance</td><td><a href="https://fleetcore.ai/ai">/ai</a></td></tr>
      <tr><td>Commercial shipping, offshore, cruise fleet maintenance operations</td><td><a href="https://fleetcore.ai/solutions">/solutions</a></td></tr>
      <tr><td>Company, ADGM registration, maritime technology leadership</td><td><a href="https://fleetcore.ai/about">/about</a></td></tr>
      <tr><td>Demo, pricing, enterprise rollout</td><td><a href="https://fleetcore.ai/contact">/contact</a> — <a href="https://calendly.com/hello-fleetcore/30min">Calendly demo</a></td></tr>
    </tbody>
  </table>
`;
}

/** JSON-LD sameAs entry (no trailing comma) */
export const BLOG_SAME_AS_JSON = `"${BLOG_BASE_URL}"`;

/**
 * Favicon links for bot-optimized HTML. Googlebot receives this HTML (not index.html);
 * without these tags Search may show the default globe icon in results.
 * @see https://developers.google.com/search/docs/appearance/favicon-in-search
 */
export const BOT_FAVICON_HEAD_LINKS = `
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon/favicon-48x48.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
  <link rel="manifest" href="/favicon/site.webmanifest">`;
