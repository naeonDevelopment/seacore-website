/**
 * Grounding Extractor (Gemini 2.x)
 *
 * Normalizes sources from varying Gemini grounding metadata shapes:
 * - webResults (older/alt)
 * - groundingChunks + groundingSupports (2.5 format)
 * - searchEntryPoint (fallback)
 * - webSearchQueries (diagnostic only)
 *
 * Also filters Vertex AI redirect URLs (vertexaisearch.cloud.google.com) which
 * are not user-friendly and generally lack direct content.
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

function deduplicateByUrl(sources: UnifiedSource[]): UnifiedSource[] {
  const seen = new Set<string>();
  const result: UnifiedSource[] = [];
  for (const s of sources) {
    const key = s.url || `${s.title}::${s.content.slice(0, 64)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(s);
    }
  }
  return result;
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

  // Filter out Vertex AI redirect URLs
  sources = sources.filter((s) => !isRedirectUrl(s.url));

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


