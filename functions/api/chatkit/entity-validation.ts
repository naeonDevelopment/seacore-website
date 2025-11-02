/**
 * Vessel Entity Validation
 *
 * Validates that collected sources match the vessel the user asked about
 * using identifiers (IMO, MMSI, Call Sign) and name matching.
 */

export interface MinimalSource {
  title: string;
  url: string;
  content: string;
}

export interface VesselTarget {
  name?: string;
  imo?: string;
  mmsi?: string;
  callSign?: string;
}

export interface VesselValidationResult {
  match: boolean;
  confidence: number; // 0..1
  matchedBy: Array<'IMO' | 'MMSI' | 'CallSign' | 'Name'>;
  supportingSources: number;
  authoritativeHits: number; // AIS/registry hits
  diagnostics: {
    extractedFromQuery: VesselTarget;
    extractedFromSources: VesselTarget[];
    totalSources: number;
  };
  filteredSources: MinimalSource[]; // sources consistent with target
}

const IMO_REGEX = /\bIMO\s*([0-9]{7})\b/i;
const MMSI_REGEX = /\bMMSI\s*([0-9]{9})\b/i;
const CALLSIGN_REGEX = /\b(Call\s*Sign|Callsign)\s*([A-Z0-9]{3,})\b/i;

/** Extract name heuristically: prefer quoted names or capitalized sequences */
function extractLikelyName(text: string): string | undefined {
  // Quoted name
  const quoted = text.match(/"([A-Za-z0-9\-\s]+)"/);
  if (quoted && quoted[1] && quoted[1].trim().length >= 3) return quoted[1].trim();
  // Capitalized token pairs (e.g., Stanford Maya)
  const cap = text.match(/\b([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z0-9\-]+)\b/);
  if (cap && cap[1]) return cap[1].trim();
  return undefined;
}

export function extractVesselIdentifiers(text: string): VesselTarget {
  const imo = (text.match(IMO_REGEX)?.[1])?.trim();
  const mmsi = (text.match(MMSI_REGEX)?.[1])?.trim();
  const callSign = (text.match(CALLSIGN_REGEX)?.[2])?.trim();
  const name = extractLikelyName(text);
  return { name, imo, mmsi, callSign };
}

function isAISOrRegistry(url: string): boolean {
  const u = (url || '').toLowerCase();
  return u.includes('vesselfinder') || u.includes('marinetraffic') || u.includes('equasis') || u.includes('myshiptracking') || u.includes('vesseltracker') || u.includes('fleetmon');
}

function normalizeName(n?: string): string {
  return (n || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Validate vessel identity against sources and answer/query.
 * Rules:
 * - Strong match if IMO matches in ≥2 sources or ≥1 AIS/registry source
 * - Medium match if MMSI matches similarly
 * - Weak match if only name matches across ≥2 sources
 */
export function validateVesselEntity(targetQuery: string, sources: MinimalSource[], answerText?: string): VesselValidationResult {
  const target = extractVesselIdentifiers(targetQuery);
  const extractedFromSources: VesselTarget[] = [];

  let imoHits = 0;
  let mmsiHits = 0;
  let callHits = 0;
  let nameHits = 0;
  let authoritativeHits = 0;

  const targetNameNorm = normalizeName(target.name);

  const filtered: MinimalSource[] = [];

  for (const s of sources) {
    const hay = `${s.title}\n${s.content}`;
    const id = extractVesselIdentifiers(hay);
    extractedFromSources.push(id);

    let matched = false;
    if (target.imo && id.imo === target.imo) { imoHits++; matched = true; if (isAISOrRegistry(s.url)) authoritativeHits++; }
    if (target.mmsi && id.mmsi === target.mmsi) { mmsiHits++; matched = true; if (isAISOrRegistry(s.url)) authoritativeHits++; }
    if (target.callSign && id.callSign && id.callSign.toUpperCase() === target.callSign.toUpperCase()) { callHits++; matched = true; if (isAISOrRegistry(s.url)) authoritativeHits++; }
    if (!matched && targetNameNorm && normalizeName(id.name) === targetNameNorm) { nameHits++; matched = true; }

    if (matched) filtered.push(s);
  }

  // Consider answer text as an additional weak signal
  if (answerText) {
    const a = extractVesselIdentifiers(answerText);
    if (target.imo && a.imo === target.imo) imoHits++;
    if (target.mmsi && a.mmsi === target.mmsi) mmsiHits++;
    if (target.callSign && a.callSign && target.callSign.toUpperCase() === a.callSign.toUpperCase()) callHits++;
    if (targetNameNorm && normalizeName(a.name) === targetNameNorm) nameHits++;
  }

  // PHASE 3 FIX: More conservative confidence scoring
  // Single AIS hit should NOT give 95% confidence - require multiple corroborations
  let confidence = 0;
  const matchedBy: Array<'IMO' | 'MMSI' | 'CallSign' | 'Name'> = [];
  
  // IMO matching (most reliable identifier)
  if (target.imo) {
    if (imoHits >= 3 && authoritativeHits >= 2) {
      confidence = Math.max(confidence, 0.95); // High confidence: multiple authoritative sources
    } else if (imoHits >= 2 || (authoritativeHits >= 1 && imoHits >= 1)) {
      confidence = Math.max(confidence, 0.85); // Good confidence: 2+ sources or 1 auth + 1 other
    } else if (authoritativeHits >= 1) {
      confidence = Math.max(confidence, 0.70); // Medium: single authoritative source only
    } else if (imoHits >= 1) {
      confidence = Math.max(confidence, 0.60); // Low: single non-auth source
    }
    if (imoHits >= 1) matchedBy.push('IMO');
  }
  
  // MMSI matching (reliable but less stable than IMO)
  if (target.mmsi) {
    if (mmsiHits >= 2 && authoritativeHits >= 1) {
      confidence = Math.max(confidence, 0.80); // Good confidence
    } else if (authoritativeHits >= 1) {
      confidence = Math.max(confidence, 0.65); // Medium: single auth source
    } else if (mmsiHits >= 1) {
      confidence = Math.max(confidence, 0.55); // Low: single non-auth
    }
    if (mmsiHits >= 1) matchedBy.push('MMSI');
  }
  
  // Call sign matching (moderately reliable)
  if (target.callSign && callHits >= 2) {
    confidence = Math.max(confidence, 0.75);
    matchedBy.push('CallSign');
  } else if (target.callSign && callHits >= 1) {
    confidence = Math.max(confidence, 0.60);
    matchedBy.push('CallSign');
  }
  
  // Name-only matching (least reliable - vessels can have similar names)
  if (!matchedBy.length && nameHits >= 3) {
    confidence = Math.max(confidence, 0.65); // Reduced from 0.7
    matchedBy.push('Name');
  } else if (!matchedBy.length && nameHits >= 2) {
    confidence = Math.max(confidence, 0.55);
    matchedBy.push('Name');
  }

  // PHASE 3: Stricter match threshold - require 70% confidence minimum
  const match = confidence >= 0.70;

  return {
    match,
    confidence,
    matchedBy,
    supportingSources: filtered.length,
    authoritativeHits,
    diagnostics: {
      extractedFromQuery: target,
      extractedFromSources,
      totalSources: sources.length,
    },
    filteredSources: filtered.length > 0 ? filtered : sources,
  };
}


