/**
 * Grounding Extractor (Gemini 2.x) - PHASE 1 FIX
 *
 * Normalizes sources from varying Gemini grounding metadata shapes:
 * - webResults (older/alt)
 * - groundingChunks + groundingSupports (2.5 format)
 * - searchEntryPoint (fallback with domain extraction)
 * - webSearchQueries (diagnostic only)
 *
 * CRITICAL FIX: Extracts real domains from Vertex AI redirect URLs and searchEntryPoint
 * to ensure we always have usable sources for citation and validation.
 */

export interface UnifiedSource {
  title: string;
  url: string;
  content: string;
  score?: number;
}

const VERTEX_REDIRECT_HOST = 'vertexaisearch.cloud.google.com';

function isEmptyString(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

export function isRedirectUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname === VERTEX_REDIRECT_HOST;
  } catch {
    return false;
  }
}

/**
 * PHASE 1 FIX: Extract real domain hints from searchEntryPoint HTML
 * Gemini provides rendered HTML with chip links that show the actual domains
 */
function extractDomainsFromSearchEntryPoint(searchEntryPoint: any): Array<{ domain: string; title: string }> {
  const domains: Array<{ domain: string; title: string }> = [];
  
  if (!searchEntryPoint?.renderedContent) return domains;
  
  const html = searchEntryPoint.renderedContent;
  
  // Extract domain hints from chip text (e.g., "Dynamic Marine services vessel owner")
  // These are user-friendly labels that hint at the source domain
  const chipPattern = /<a class="chip"[^>]*>([^<]+)<\/a>/g;
  let match;
  
  while ((match = chipPattern.exec(html)) !== null) {
    const chipText = match[1].trim();
    
    // Extract domain hints from chip text
    // Pattern 1: "site.com" or "domain.net" in text
    const explicitDomain = chipText.match(/\b([a-z0-9-]+\.(com|net|org|uk|io))\b/i);
    if (explicitDomain) {
      domains.push({
        domain: `https://${explicitDomain[1]}`,
        title: chipText
      });
      continue;
    }
    
    // Pattern 2: Company/service names that map to known domains
    const domainMappings: Record<string, string> = {
      'vesselfinder': 'vesselfinder.com',
      'marinetraffic': 'marinetraffic.com',
      'equasis': 'equasis.org',
      'dynamic marine': 'dynamicmarine.net',
      'maritime registry': 'registry-search',
      'st kitts': 'skanregistry.com',
      'panama registry': 'amp.gob.pa',
    };
    
    const chipLower = chipText.toLowerCase();
    for (const [key, domain] of Object.entries(domainMappings)) {
      if (chipLower.includes(key)) {
        domains.push({
          domain: `https://${domain}`,
          title: chipText
        });
        break;
      }
    }
  }
  
  return domains;
}

/**
 * PHASE 1 FIX: Validate and normalize URL
 * Rejects incomplete, malformed, or low-quality URLs
 */
function isValidSourceUrl(url: string): { valid: boolean; reason?: string } {
  if (!url || url.trim().length === 0) {
    return { valid: false, reason: 'empty' };
  }
  
  try {
    const parsed = new URL(url);
    
    // Reject localhost/internal IPs
    if (parsed.hostname === 'localhost' || /^127\.|^192\.168\.|^10\./.test(parsed.hostname)) {
      return { valid: false, reason: 'localhost' };
    }
    
    // Reject incomplete vessel tracking URLs (common issue)
    const path = parsed.pathname.toLowerCase();
    
    // Pattern 1: /vessels/details/ must have numeric ID
    if (path.includes('/vessels/details/') && !path.match(/\/vessels\/details\/\d{7}/)) {
      return { valid: false, reason: 'incomplete vessel URL (missing ID)' };
    }
    
    // Pattern 2: /ais/details/ships must have specific vessel
    if (path.includes('/ais/details/ships') && !path.match(/\/ais\/details\/ships\/\d+/)) {
      return { valid: false, reason: 'generic ships page (no specific vessel)' };
    }
    
    // Pattern 3: Root pages without identifiers
    if (path.match(/^\/(en|fr|es|ar|de|it|ru|pt|no|zh|ja|ko)\/?$/)) {
      return { valid: false, reason: 'locale root page (no content)' };
    }
    
    // Pattern 4: Port pages when looking for vessels
    if (path.includes('/ports/') && !path.includes('/vessels/')) {
      return { valid: false, reason: 'port page (not vessel data)' };
    }
    
    return { valid: true };
    
  } catch (e) {
    return { valid: false, reason: 'malformed URL' };
  }
}

/**
 * PHASE 1 FIX: Normalize URL for deduplication
 * Handles locale prefixes, suffixes, query params, and subdomains
 */
function normalizeUrlForDedup(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Remove www subdomain
    let hostname = parsed.hostname.replace(/^www\./, '');
    
    // Remove locale subdomains (en.marinetraffic.com → marinetraffic.com)
    hostname = hostname.replace(/^(ar|en|es|fr|no|pt|de|it|ru|tr|zh|ja|ko)\./, '');
    
    let pathname = parsed.pathname || '';
    
    // Remove locale prefix (/en/vessels → /vessels)
    pathname = pathname.replace(/^\/(ar|en|es|fr|no|pt|de|it|ru|tr|zh|ja|ko)\//, '/');
    
    // Remove locale suffix (/vessels/details/9549683/en → /vessels/details/9549683)
    pathname = pathname.replace(/\/(ar|en|es|fr|no|pt|de|it|ru|tr|zh|ja|ko)\/?$/, '');
    
    // Remove tracking/locale query params
    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((value, key) => {
      // Keep meaningful params, remove tracking and locale
      if (!key.match(/^(utm_|fbclid|gclid|msclkid|ref|source|campaign|lang|locale|l|language)/i)) {
        cleanParams.set(key, value);
      }
    });
    
    // Remove trailing slash for consistency
    pathname = pathname.replace(/\/$/, '');
    
    // Rebuild normalized URL
    const normalized = `${parsed.protocol}//${hostname}${pathname}`;
    const params = cleanParams.toString();
    
    return params ? `${normalized}?${params}` : normalized;
    
  } catch (e) {
    return url; // Return as-is if parsing fails
  }
}

function deduplicateByUrl(sources: UnifiedSource[]): UnifiedSource[] {
  const seen = new Map<string, UnifiedSource>();
  
  for (const s of sources) {
    // PHASE 1 FIX: Validate URL before deduplication
    const validation = isValidSourceUrl(s.url);
    if (!validation.valid) {
      console.log(`   🚫 PHASE 1: Rejected source - ${validation.reason}: ${s.url.substring(0, 80)}`);
      continue;
    }
    
    // PHASE 1 FIX: Use enhanced normalization
    const normalizedUrl = normalizeUrlForDedup(s.url);
    const existing = seen.get(normalizedUrl);
    
    if (!existing) {
      seen.set(normalizedUrl, s);
    } else {
      // Keep source with better score or longer content
      const existingScore = existing.score || 0;
      const newScore = s.score || 0;
      const existingContentLength = existing.content?.length || 0;
      const newContentLength = s.content?.length || 0;
      
      if (newScore > existingScore || (newScore === existingScore && newContentLength > existingContentLength)) {
        seen.set(normalizedUrl, s);
      }
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Extract sources from Gemini generateContent response.
 * Pass the original query and optional answer text for fallback content
 * distribution when snippets are missing.
 */
export function extractSourcesFromGeminiResponse(
  data: any,
  query: string,
  answer?: string
): UnifiedSource[] {
  const candidate = data?.candidates?.[0];
  const groundingMetadata = candidate?.groundingMetadata || data?.groundingMetadata;

  let sources: UnifiedSource[] = [];

  // Priority 1: webResults (if provided)
  const webResults = groundingMetadata?.webResults;
  if (Array.isArray(webResults)) {
    sources = webResults
      .map((r: any) => ({
        url: r?.url || '',
        title: r?.title || 'Source',
        content: r?.snippet || r?.content || '',
        score: 0.9,
      }))
      .filter((s: UnifiedSource) => !!s.url);
  }

  // Priority 2: groundingChunks + groundingSupports (Gemini 2.5)
  if (sources.length === 0) {
    const chunks = groundingMetadata?.groundingChunks;
    const supports = groundingMetadata?.groundingSupports;

    if (Array.isArray(chunks)) {
      // Build indexable map of chunks
      const chunkAt = (idx: number) => chunks[idx]?.web || chunks[idx]?.source?.web;

      if (Array.isArray(supports) && supports.length > 0) {
        // Use supports to attach relevant text segments
        for (const support of supports) {
          const indices: number[] = Array.isArray(support?.groundingChunkIndices)
            ? support.groundingChunkIndices
            : [];
          const segmentText: string = support?.segment?.text || '';
          for (const idx of indices) {
            const webMeta = chunkAt(idx);
            const url = webMeta?.uri || '';
            const title = webMeta?.title || 'Source';
            if (url) {
              sources.push({ url, title, content: segmentText || '', score: 0.85 });
            }
          }
        }
      } else {
        // No supports; map chunks directly
        for (const ch of chunks) {
          const webMeta = ch?.web || ch?.source?.web;
          const url = webMeta?.uri || '';
          const title = webMeta?.title || 'Source';
          if (url) {
            sources.push({ url, title, content: '', score: 0.8 });
          }
        }
      }
    }
  }

  // Fallback: searchEntryPoint → create Google search link (not authoritative)
  if (sources.length === 0 && groundingMetadata?.searchEntryPoint) {
    sources.push({
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      title: 'Google Search',
      content: isEmptyString(answer) ? '' : String(answer).slice(0, 500),
      score: 0.6,
    });
  }

  // PHASE 1 FIX: Handle Vertex AI redirect URLs
  // Instead of filtering them out completely, try to extract real domain hints
  const hasOnlyRedirects = sources.length > 0 && sources.every((s) => isRedirectUrl(s.url));
  
  if (hasOnlyRedirects) {
    console.log(`   ⚠️ PHASE 1: All ${sources.length} sources are Vertex redirects - extracting domain hints`);
    
    // Extract real domains from searchEntryPoint
    const domainHints = extractDomainsFromSearchEntryPoint(groundingMetadata?.searchEntryPoint);
    
    if (domainHints.length > 0) {
      console.log(`   ✅ PHASE 1: Extracted ${domainHints.length} domain hints from searchEntryPoint`);
      
      // Map redirect sources to real domains using content matching
      const enhancedSources: UnifiedSource[] = [];
      
      for (const source of sources) {
        const content = source.content.toLowerCase();
        
        // Try to match source content to domain hints
        let bestMatch: { domain: string; title: string } | null = null;
        let bestScore = 0;
        
        for (const hint of domainHints) {
          // Score based on how many words from the hint appear in content
          const hintWords = hint.title.toLowerCase().split(/\s+/);
          const matchCount = hintWords.filter(w => w.length > 3 && content.includes(w)).length;
          const score = matchCount / Math.max(hintWords.length, 1);
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = hint;
          }
        }
        
        if (bestMatch && bestScore > 0.2) {
          enhancedSources.push({
            url: bestMatch.domain,
            title: bestMatch.title,
            content: source.content,
            score: source.score ? source.score * 0.9 : 0.75 // Slight penalty for inferred domain
          });
        } else {
          // Fallback: keep source but with generic domain
          enhancedSources.push({
            url: 'https://google.com/search?q=' + encodeURIComponent(query),
            title: source.title || 'Google Search Result',
            content: source.content,
            score: 0.6
          });
        }
      }
      
      sources = enhancedSources;
      console.log(`   ✅ PHASE 1: Enhanced ${sources.length} sources with real domains`);
    } else {
      // No domain hints available - create synthetic sources
      console.warn(`   ⚠️ PHASE 1: No domain hints available - creating synthetic search sources`);
      sources = sources.map((s) => ({
        url: 'https://google.com/search?q=' + encodeURIComponent(query),
        title: s.title || 'Google Search Result',
        content: s.content,
        score: 0.6
      }));
    }
  } else {
    // Filter out any remaining redirect URLs (mixed case)
    const beforeCount = sources.length;
    sources = sources.filter((s) => !isRedirectUrl(s.url));
    if (beforeCount > sources.length) {
      console.log(`   🧹 PHASE 1: Filtered ${beforeCount - sources.length} redirect URLs from ${beforeCount} sources`);
    }
  }

  // Deduplicate
  sources = deduplicateByUrl(sources);

  // If we have sources but many lack content and we have an answer, distribute some text
  if (sources.length > 0 && !isEmptyString(answer)) {
    const empty = sources.filter((s) => isEmptyString(s.content));
    if (empty.length > 0 && String(answer!).length > 200) {
      const snippetSize = Math.max(120, Math.floor(String(answer!).length / empty.length));
      let offset = 0;
      for (const s of empty) {
        s.content = String(answer!).slice(offset, offset + snippetSize);
        offset += snippetSize;
      }
    }
  }

  return sources;
}


