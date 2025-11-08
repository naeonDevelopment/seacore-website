/**
 * Modern Citation Formatting System
 * 
 * Implements IEEE-style numbered citations with proper reference section.
 * Format: Inline [N] citations with corresponding numbered reference list.
 * 
 * Example output:
 * "Dynamic 17 is a crew boat built in 2009 [1], operating under 
 *  St Kitts & Nevis flag [2]."
 * 
 * REFERENCES
 * [1] MarineTraffic, "DYNAMIC 17 - Vessel Details," https://www.marinetraffic.com/...
 * [2] VesselFinder, "IMO 9562752," https://www.vesselfinder.com/...
 */

export interface Source {
  title: string;
  url: string;
  content: string;
  score?: number;
  tier?: 'T1' | 'T2' | 'T3';
}

export interface Citation {
  index: number;
  source: Source;
  inlineFormat: string;
  referenceFormat: string;
}

/**
 * Generate inline citation in IEEE format
 * Returns: [N] where N is 1-indexed citation number
 */
export function formatInlineCitation(citationIndex: number): string {
  return `[${citationIndex}]`;
}

/**
 * Generate complete REFERENCES section in IEEE format
 * 
 * IEEE Format:
 * [N] Source, "Title," URL (accessed Date)
 * 
 * Example:
 * [1] MarineTraffic, "DYNAMIC 17 - Vessel Details," https://www.marinetraffic.com/...
 */
export function generateReferenceSection(sources: Source[]): string {
  if (sources.length === 0) return '';
  
  let references = '\n\n## REFERENCES\n\n';
  
  sources.forEach((source, idx) => {
    const index = idx + 1;
    const title = cleanTitle(source.title);
    const url = source.url;
    const siteName = extractSiteName(url);
    
    // IEEE format: [N] SiteName, "Title," URL
    references += `[${index}] ${siteName}, "${title}," ${url}\n`;
  });
  
  return references;
}

/**
 * Convert content with old [[N]](url) format to new [N] format
 * Also removes URLs from citations (they'll be in REFERENCES section)
 */
export function convertLegacyCitations(content: string): string {
  // Pattern 1: [[N]](url) -> [N]
  let converted = content.replace(/\[\[(\d+)\]\]\([^)]+\)/g, '[$1]');
  
  // Pattern 2: [N](url) -> [N]
  converted = converted.replace(/\[(\d+)\]\([^)]+\)/g, '[$1]');
  
  return converted;
}

/**
 * Add REFERENCES section to content if not present
 * Converts legacy citations to modern format
 */
export function ensureModernCitationFormat(content: string, sources: Source[]): {
  content: string;
  wasConverted: boolean;
  citationCount: number;
} {
  // Check if already has REFERENCES section
  const hasReferences = /## REFERENCES\b/i.test(content);
  
  // Convert legacy citations
  let modernContent = convertLegacyCitations(content);
  const wasConverted = modernContent !== content;
  
  // Count citations
  const citationMatches = modernContent.match(/\[(\d+)\]/g);
  const citationCount = citationMatches ? citationMatches.length : 0;
  
  // Add REFERENCES section if missing
  if (!hasReferences && citationCount > 0) {
    const referencesSection = generateReferenceSection(sources);
    modernContent = modernContent.trimEnd() + referencesSection;
  }
  
  return {
    content: modernContent,
    wasConverted,
    citationCount
  };
}

/**
 * Extract clean site name from URL for reference formatting
 * 
 * Examples:
 * - www.marinetraffic.com -> MarineTraffic
 * - vesselfinder.com -> VesselFinder
 * - equasis.org -> Equasis
 */
function extractSiteName(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace('www.', '');
    const domain = hostname.split('.')[0];
    
    // Special cases for known maritime sites
    const specialCases: Record<string, string> = {
      'marinetraffic': 'MarineTraffic',
      'vesselfinder': 'VesselFinder',
      'equasis': 'Equasis',
      'myshiptracking': 'MyShipTracking',
      'vesseltracker': 'VesselTracker',
      'fleetmon': 'FleetMon',
      'gcaptain': 'gCaptain',
      'maritime-executive': 'Maritime Executive',
      'splash247': 'Splash 24/7',
      'lloydslist': "Lloyd's List",
      'tradewinds': 'TradeWinds',
      'offshore-energy': 'Offshore Energy',
      'wartsila': 'Wärtsilä',
      'man-es': 'MAN Energy Solutions',
      'dnv': 'DNV',
      'abs': 'ABS',
      'lr': "Lloyd's Register",
      'bureauveritas': 'Bureau Veritas',
      'classnk': 'ClassNK',
      'imo': 'IMO'
    };
    
    if (specialCases[domain]) {
      return specialCases[domain];
    }
    
    // Default: Capitalize first letter of each word (split by dash/underscore)
    return domain
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
  } catch (e) {
    // If URL parsing fails, return generic "Source"
    return 'Online Source';
  }
}

/**
 * Clean up title text for reference formatting
 * - Remove extra whitespace
 * - Limit length to 100 characters
 * - Remove special characters that break formatting
 */
function cleanTitle(title: string | undefined): string {
  if (!title) return 'Untitled';
  
  let cleaned = title
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/["""'']/g, '"')  // Normalize quotes
    .trim();
  
  // Truncate if too long
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 97) + '...';
  }
  
  // Remove any remaining problematic characters
  cleaned = cleaned.replace(/[\n\r\t]/g, ' ');
  
  return cleaned || 'Untitled';
}

/**
 * Validate citation format in content
 * Returns issues found with citations
 */
export function validateCitationFormat(content: string, sources: Source[]): {
  valid: boolean;
  hasModernFormat: boolean;
  hasLegacyFormat: boolean;
  hasReferencesSection: boolean;
  outOfBoundsCitations: number[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const outOfBoundsCitations: number[] = [];
  
  // Check for legacy format
  const hasLegacyFormat = /\[\[\d+\]\]\([^)]+\)|\[\d+\]\([^)]+\)/.test(content);
  
  // Check for modern format
  const hasModernFormat = /\[\d+\]/.test(content);
  
  // Check for REFERENCES section
  const hasReferencesSection = /## REFERENCES\b/i.test(content);
  
  // Find all citations
  const citationMatches = content.matchAll(/\[(\d+)\]/g);
  
  for (const match of citationMatches) {
    const index = parseInt(match[1], 10);
    if (index < 1 || index > sources.length) {
      outOfBoundsCitations.push(index);
      warnings.push(`Citation [${index}] out of bounds (${sources.length} sources available)`);
    }
  }
  
  if (hasLegacyFormat) {
    warnings.push('Content contains legacy citation format [[N]](url) - should be converted to [N]');
  }
  
  if (hasModernFormat && !hasReferencesSection) {
    warnings.push('Content has citations but missing REFERENCES section');
  }
  
  const valid = outOfBoundsCitations.length === 0 && !hasLegacyFormat;
  
  return {
    valid,
    hasModernFormat,
    hasLegacyFormat,
    hasReferencesSection,
    outOfBoundsCitations,
    warnings
  };
}

/**
 * Get citation statistics from content
 */
export function getCitationStats(content: string): {
  totalCitations: number;
  uniqueCitations: Set<number>;
  citationDensity: number;  // citations per 100 words
  averageCitationsPerParagraph: number;
} {
  const citationMatches = [...content.matchAll(/\[(\d+)\]/g)];
  const totalCitations = citationMatches.length;
  const uniqueCitations = new Set(citationMatches.map(m => parseInt(m[1], 10)));
  
  // Calculate density
  const wordCount = content.split(/\s+/).length;
  const citationDensity = wordCount > 0 ? (totalCitations / wordCount) * 100 : 0;
  
  // Calculate per-paragraph average
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  const averageCitationsPerParagraph = paragraphs.length > 0 ? totalCitations / paragraphs.length : 0;
  
  return {
    totalCitations,
    uniqueCitations,
    citationDensity,
    averageCitationsPerParagraph
  };
}

