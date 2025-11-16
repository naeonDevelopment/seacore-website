/**
 * Research Gap Analyzer - Zero "Not Found" Guarantee
 * 
 * Analyzes generated responses for missing critical vessel data
 * and generates targeted search queries to fill gaps.
 * 
 * Philosophy: "Not found" is UNACCEPTABLE - we have the entire Google index.
 * The agent must use iterative research to guarantee complete vessel data.
 */

export interface ResearchGap {
  field: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  searchQuery: string;
  targetSites: string[];
}

export interface GapAnalysis {
  missingFields: ResearchGap[];
  completeness: number; // 0-100%
  needsAdditionalResearch: boolean;
  iteration: number;
}

/**
 * Check if a field is missing from content
 * ENHANCED: More aggressive detection for owner/operator (critical field)
 */
function isMissing(content: string, field: string): boolean {
  // Special aggressive detection for Owner/Operator (CRITICAL field)
  if (field === 'Owner' || field === 'Operator') {
    // Check for explicit owner/operator mentions with actual company names
    const hasOwnerMention = 
      content.match(/owner[:\s]+[A-Z][a-z]+/i) ||  // "Owner: Company Name"
      content.match(/owned by\s+[A-Z]/i) ||         // "owned by Company"
      content.match(/operator[:\s]+[A-Z][a-z]+/i) || // "Operator: Company"
      content.match(/operated by\s+[A-Z]/i) ||      // "operated by Company"
      content.match(/managed by\s+[A-Z]/i) ||       // "managed by Company"
      content.match(/management[:\s]+[A-Z]/i);      // "Management: Company"
    
    // If no actual company name found, consider it missing
    if (!hasOwnerMention) {
      console.log(`   🚨 CRITICAL GAP: ${field} not found - triggering targeted research`);
      return true;
    }
    
    // Even if found, check if it's a real name or placeholder
    if (content.includes(`${field}: Not found`) || 
        content.includes(`${field}:**Not found`)) {
      return true;
    }
    
    return false; // Has real owner/operator data
  }
  
  // Standard detection for other fields
  return (
    !content.includes(field) || 
    content.includes(`${field}: Not found`) ||
    content.includes(`${field}:**Not found`) ||
    content.includes(`${field}: N/A`) ||
    content.match(new RegExp(`${field}[:\\s]*Not available`, 'i'))
  );
}

/**
 * Analyze response for missing vessel data
 * Returns gap analysis with targeted search queries
 */
export function analyzeResearchGaps(
  content: string,
  vesselName: string,
  existingSources: any[],
  iteration: number = 1
): GapAnalysis {
  const gaps: ResearchGap[] = [];
  
  // CRITICAL: IMO Number (unique vessel identifier - most important)
  if (isMissing(content, 'IMO')) {
    gaps.push({
      field: 'IMO Number',
      importance: 'critical',
      searchQuery: `"${vesselName}" IMO number site:marinetraffic.com OR site:vesselfinder.com OR site:shipspotting.com`,
      targetSites: ['marinetraffic.com', 'vesselfinder.com', 'shipspotting.com', 'equasis.org']
    });
  }
  
  // CRITICAL: MMSI (AIS identifier - required for tracking)
  if (isMissing(content, 'MMSI')) {
    gaps.push({
      field: 'MMSI',
      importance: 'critical',
      searchQuery: `"${vesselName}" MMSI site:marinetraffic.com OR site:vesselfinder.com`,
      targetSites: ['marinetraffic.com', 'vesselfinder.com']
    });
  }
  
  // HIGH: Owner (ownership data - very important for vessel intelligence)
  if (isMissing(content, 'Owner')) {
    gaps.push({
      field: 'Registered Owner',
      importance: 'high',
      searchQuery: `"${vesselName}" vessel owner company site:equasis.org OR site:lrsearch.lr.org OR site:dnv.com`,
      targetSites: ['equasis.org', 'lr.org', 'dnv.com', 'abs.org', 'marinetraffic.com']
    });
  }
  
  // HIGH: Operator/Manager (who actually operates the vessel)
  if (isMissing(content, 'Operator') || isMissing(content, 'Manager')) {
    gaps.push({
      field: 'Operator/Manager',
      importance: 'high',
      searchQuery: `"${vesselName}" ship management operator technical manager`,
      targetSites: ['equasis.org', 'maritime-executive.com', 'marinetraffic.com']
    });
  }
  
  // MEDIUM: Gross Tonnage (size indicator)
  if (isMissing(content, 'Gross Tonnage') || isMissing(content, ' GT')) {
    gaps.push({
      field: 'Gross Tonnage',
      importance: 'medium',
      searchQuery: `"${vesselName}" specifications tonnage GT DWT`,
      targetSites: ['marinetraffic.com', 'vesselfinder.com', 'equasis.org']
    });
  }
  
  // MEDIUM: Length Overall (principal dimension)
  if (isMissing(content, 'Length') || isMissing(content, 'LOA')) {
    gaps.push({
      field: 'Length Overall',
      importance: 'medium',
      searchQuery: `"${vesselName}" length LOA beam draft specifications`,
      targetSites: ['marinetraffic.com', 'vesselfinder.com']
    });
  }
  
  // MEDIUM: Call Sign (radio identification)
  if (isMissing(content, 'Call Sign')) {
    gaps.push({
      field: 'Call Sign',
      importance: 'medium',
      searchQuery: `"${vesselName}" call sign radio`,
      targetSites: ['marinetraffic.com', 'vesselfinder.com']
    });
  }
  
  // LOW: Build Information (nice to have, but don't waste iterations if we're running out)
  if (isMissing(content, 'Shipyard') && iteration <= 2) {
    gaps.push({
      field: 'Shipyard & Build Year',
      importance: 'low',
      searchQuery: `"${vesselName}" shipyard built delivery date`,
      targetSites: ['shipspotting.com', 'gcaptain.com', 'marinetraffic.com']
    });
  }
  
  // LOW: Classification Society (useful but not critical)
  if (isMissing(content, 'Class Society') && iteration <= 2) {
    gaps.push({
      field: 'Classification Society',
      importance: 'low',
      searchQuery: `"${vesselName}" class society classification DNV LR ABS BV`,
      targetSites: ['equasis.org', 'dnv.com', 'lr.org', 'abs.org']
    });
  }
  
  // Calculate completeness score
  const totalExpectedFields = 20; // Total expected fields in a complete vessel profile
  const missingCount = gaps.length;
  const completeness = Math.max(0, Math.round(((totalExpectedFields - missingCount) / totalExpectedFields) * 100));
  
  // Determine if additional research is needed
  // Trigger if:
  // 1. Completeness < 80%, OR
  // 2. Any CRITICAL gaps exist (IMO, MMSI), OR
  // 3. 2+ HIGH importance gaps (Owner, Operator)
  const criticalGaps = gaps.filter(g => g.importance === 'critical').length;
  const highGaps = gaps.filter(g => g.importance === 'high').length;
  
  const needsAdditionalResearch = 
    (completeness < 80) || 
    (criticalGaps > 0) || 
    (highGaps >= 2);
  
  return {
    missingFields: gaps,
    completeness,
    needsAdditionalResearch,
    iteration
  };
}

/**
 * Extract vessel name from query
 * Handles various query formats:
 * - "give me details about dynamic 17"
 * - "what is the biggest cargo ship under norwegian flag"
 * - "tell me about NORVIND"
 */
export function extractVesselName(query: string): string | null {
  // Remove common query prefixes
  let cleaned = query
    .replace(/^(give me details about|tell me about|what is|who is|details about|info about|information about)/i, '')
    .trim();
  
  // For comparative queries, return null (can't extract single vessel)
  if (/\b(biggest|largest|compare|versus|vs\.?)\b/i.test(query)) {
    return null;
  }
  
  // Capitalize each word for vessel name
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validate if query is a vessel query (vs general maritime query)
 */
export function isVesselQuery(query: string): boolean {
  const vesselIndicators = [
    /\b(vessel|ship|MV |MS |MT |bulk carrier|tanker|container ship|cargo ship)\b/i,
    /\bgive me details about\b/i,
    /\btell me about\b/i,
    /\bwhat is .* (vessel|ship)\b/i
  ];
  
  return vesselIndicators.some(pattern => pattern.test(query));
}

