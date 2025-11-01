/**
 * Minimal entity canonicalization for maritime queries
 * Extracts IMO, MMSI, call sign and a normalized name if present in the query text.
 */

export interface CanonicalEntity {
  type: 'vessel' | 'company' | 'unknown';
  name?: string;
  imo?: string; // 7 digits
  mmsi?: string; // 9 digits
  callSign?: string;
}

function extractIMO(text: string): string | undefined {
  const m = text.match(/\bIMO\s*(\d{7})\b/i);
  return m ? m[1] : undefined;
}

function extractMMSI(text: string): string | undefined {
  const m = text.match(/\bMMSI\s*(\d{9})\b/i);
  return m ? m[1] : undefined;
}

function extractCallSign(text: string): string | undefined {
  const m = text.match(/\b(call\s*sign|cs)\s*([A-Z0-9]{3,8})\b/i);
  return m ? m[2].toUpperCase() : undefined;
}

function extractLikelyName(text: string): string | undefined {
  // Heuristic: two tokens starting with capitals or a word + number pattern (e.g., "Dynamic 25")
  const m = text.match(/\b([A-Z][a-z]+\s+(?:[A-Z][a-z]+|\d{2,}))\b/);
  return m ? m[1].trim() : undefined;
}

export function canonicalizeQueryEntity(query: string): CanonicalEntity | null {
  const text = query.trim();
  const imo = extractIMO(text);
  const mmsi = extractMMSI(text);
  const callSign = extractCallSign(text);
  const name = extractLikelyName(text);

  if (imo || mmsi || callSign || name) {
    const type: CanonicalEntity['type'] = (imo || mmsi || callSign || /\bvessel|ship\b/i.test(text)) ? 'vessel' : (/company|operator|owner/i.test(text) ? 'company' : 'unknown');
    return { type, name, imo, mmsi, callSign };
  }
  return null;
}


