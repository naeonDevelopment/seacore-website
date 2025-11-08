/**
 * Owner/Operator Extraction System
 * 
 * PHASE 1: Aggressive extraction of vessel ownership and management data
 * 
 * Purpose: Pre-extract owner/operator from sources before GPT-4 synthesis
 * to ensure this critical data is never missed.
 * 
 * Extraction Strategies:
 * 1. Pattern-based text extraction (regex)
 * 2. HTML table parsing (MarineTraffic/VesselFinder structure)
 * 3. JSON-LD structured data (if present)
 * 4. Fallback to company name detection near keywords
 */

export interface Source {
  title: string;
  url: string;
  content: string;
  score?: number;
  tier?: 'T1' | 'T2' | 'T3';
}

export interface OwnerOperatorData {
  owner?: string;
  operator?: string;
  manager?: string;
  technicalManager?: string;
  confidence: 'high' | 'medium' | 'low';
  sourceIndex: number;
  sourceUrl: string;
  extractionMethod: 'table' | 'pattern' | 'structured' | 'proximity';
}

/**
 * Main extraction function - tries multiple strategies in priority order
 */
export function extractOwnerOperator(sources: Source[]): OwnerOperatorData | null {
  // Strategy 1: Try structured HTML table extraction first (highest confidence)
  for (let i = 0; i < sources.length; i++) {
    const tableData = extractFromHtmlTable(sources[i], i);
    if (tableData) return tableData;
  }
  
  // Strategy 2: Try JSON-LD structured data (high confidence)
  for (let i = 0; i < sources.length; i++) {
    const structuredData = extractFromStructuredData(sources[i], i);
    if (structuredData) return structuredData;
  }
  
  // Strategy 3: Try explicit pattern matching (medium-high confidence)
  for (let i = 0; i < sources.length; i++) {
    const patternData = extractFromPatterns(sources[i], i);
    if (patternData) return patternData;
  }
  
  // Strategy 4: Try proximity-based extraction (medium confidence)
  for (let i = 0; i < sources.length; i++) {
    const proximityData = extractFromProximity(sources[i], i);
    if (proximityData) return proximityData;
  }
  
  return null;
}

/**
 * Strategy 1: Extract from HTML tables
 * Common in MarineTraffic, VesselFinder, Equasis
 */
function extractFromHtmlTable(source: Source, index: number): OwnerOperatorData | null {
  const content = source.content || '';
  
  // Pattern 1: <td>Owner</td><td>Company Name</td>
  const tablePattern1 = /<td[^>]*>\s*Owner\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi;
  const ownerMatch1 = tablePattern1.exec(content);
  
  // Pattern 2: <th>Owner</th><td>Company Name</td>
  const tablePattern2 = /<th[^>]*>\s*Owner\s*<\/th>\s*<td[^>]*>([^<]+)<\/td>/gi;
  const ownerMatch2 = tablePattern2.exec(content);
  
  // Pattern 3: <td>Operator</td><td>Company Name</td>
  const operatorPattern1 = /<td[^>]*>\s*Operator\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi;
  const operatorMatch1 = operatorPattern1.exec(content);
  
  // Pattern 4: <td>Manager</td><td>Company Name</td>
  const managerPattern1 = /<td[^>]*>\s*(?:Manager|Management)\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi;
  const managerMatch1 = managerPattern1.exec(content);
  
  // Pattern 5: <td>Technical Manager</td><td>Company Name</td>
  const techManagerPattern = /<td[^>]*>\s*Technical\s+Manager\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi;
  const techManagerMatch = techManagerPattern.exec(content);
  
  if (ownerMatch1 || ownerMatch2 || operatorMatch1 || managerMatch1 || techManagerMatch) {
    const owner = (ownerMatch1?.[1] || ownerMatch2?.[1])?.trim();
    const operator = operatorMatch1?.[1]?.trim();
    const manager = managerMatch1?.[1]?.trim();
    const technicalManager = techManagerMatch?.[1]?.trim();
    
    // Clean up extracted data
    const cleanedData = {
      owner: cleanCompanyName(owner),
      operator: cleanCompanyName(operator),
      manager: cleanCompanyName(manager),
      technicalManager: cleanCompanyName(technicalManager),
      confidence: 'high' as const,
      sourceIndex: index,
      sourceUrl: source.url,
      extractionMethod: 'table' as const
    };
    
    // Only return if we found at least one field
    if (cleanedData.owner || cleanedData.operator || cleanedData.manager || cleanedData.technicalManager) {
      return cleanedData;
    }
  }
  
  return null;
}

/**
 * Strategy 2: Extract from JSON-LD structured data
 */
function extractFromStructuredData(source: Source, index: number): OwnerOperatorData | null {
  const content = source.content || '';
  
  // Look for JSON-LD script tags
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = jsonLdPattern.exec(content)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      
      // Check for organization data
      if (data.owner || data.operator || data.organizationName) {
        return {
          owner: cleanCompanyName(data.owner?.name || data.owner),
          operator: cleanCompanyName(data.operator?.name || data.operator),
          manager: cleanCompanyName(data.manager?.name || data.manager),
          confidence: 'high' as const,
          sourceIndex: index,
          sourceUrl: source.url,
          extractionMethod: 'structured' as const
        };
      }
    } catch (e) {
      // Invalid JSON, continue
    }
  }
  
  return null;
}

/**
 * Strategy 3: Pattern-based text extraction
 * Looks for explicit phrases like "Owner: Company Name", "Operated by Company"
 */
function extractFromPatterns(source: Source, index: number): OwnerOperatorData | null {
  const content = source.content || '';
  const title = source.title || '';
  const combined = `${title}\n${content}`;
  
  // Pattern 1: "Owner: Company Name" or "Owner - Company Name"
  const ownerPattern1 = /\b(?:Owner|Registered Owner)[:\s-]+([A-Z][A-Za-z0-9\s&.,'-]+?(?:Ltd\.?|Limited|Inc\.?|LLC|Line|Group|Marine|Shipping|Services|AS|ASA|SA|AG|GmbH|BV|NV)?)\b/gi;
  
  // Pattern 2: "Operated by Company Name"
  const operatorPattern1 = /\b(?:Operated|Managed)\s+by[:\s]+([A-Z][A-Za-z0-9\s&.,'-]+?(?:Ltd\.?|Limited|Inc\.?|LLC|Line|Group|Marine|Shipping|Services|AS|ASA|SA|AG|GmbH|BV|NV)?)\b/gi;
  
  // Pattern 3: "Ship Manager: Company Name"
  const managerPattern1 = /\b(?:Ship\s+Manager|Technical\s+Manager|Manager)[:\s-]+([A-Z][A-Za-z0-9\s&.,'-]+?(?:Ltd\.?|Limited|Inc\.?|LLC|Line|Group|Marine|Shipping|Services|AS|ASA|SA|AG|GmbH|BV|NV)?)\b/gi;
  
  // Pattern 4: "Company Name (Owner)" or "Company Name - Owner"
  const ownerPattern2 = /([A-Z][A-Za-z0-9\s&.,'-]+?(?:Ltd\.?|Limited|Inc\.?|LLC|Line|Group|Marine|Shipping|Services|AS|ASA|SA|AG|GmbH|BV|NV)?)\s*[\(\-]\s*(?:Owner|Operator|Manager)\s*[\)]/gi;
  
  const ownerMatches = [...combined.matchAll(ownerPattern1), ...combined.matchAll(ownerPattern2)];
  const operatorMatches = [...combined.matchAll(operatorPattern1)];
  const managerMatches = [...combined.matchAll(managerPattern1)];
  
  if (ownerMatches.length > 0 || operatorMatches.length > 0 || managerMatches.length > 0) {
    // Take first valid match for each field
    const owner = ownerMatches[0]?.[1]?.trim();
    const operator = operatorMatches[0]?.[1]?.trim();
    const manager = managerMatches[0]?.[1]?.trim();
    
    return {
      owner: cleanCompanyName(owner),
      operator: cleanCompanyName(operator),
      manager: cleanCompanyName(manager),
      confidence: 'medium' as const,
      sourceIndex: index,
      sourceUrl: source.url,
      extractionMethod: 'pattern' as const
    };
  }
  
  return null;
}

/**
 * Strategy 4: Proximity-based extraction
 * Find company names near "owner"/"operator" keywords
 */
function extractFromProximity(source: Source, index: number): OwnerOperatorData | null {
  const content = source.content || '';
  
  // Find sentences containing ownership keywords
  const sentences = content.split(/[.!?]+/);
  
  let owner: string | undefined;
  let operator: string | undefined;
  let manager: string | undefined;
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    
    // Look for owner keyword
    if (/\b(?:owner|owned by|ownership)\b/.test(lowerSentence)) {
      const companyMatch = sentence.match(/\b([A-Z][A-Za-z0-9\s&.,'-]{3,50}?(?:Ltd\.?|Limited|Inc\.?|LLC|Line|Group|Marine|Shipping|Services|AS|ASA|SA|AG|GmbH|BV|NV))\b/);
      if (companyMatch && !owner) {
        owner = companyMatch[1].trim();
      }
    }
    
    // Look for operator keyword
    if (/\b(?:operator|operated by|operations)\b/.test(lowerSentence)) {
      const companyMatch = sentence.match(/\b([A-Z][A-Za-z0-9\s&.,'-]{3,50}?(?:Ltd\.?|Limited|Inc\.?|LLC|Line|Group|Marine|Shipping|Services|AS|ASA|SA|AG|GmbH|BV|NV))\b/);
      if (companyMatch && !operator) {
        operator = companyMatch[1].trim();
      }
    }
    
    // Look for manager keyword
    if (/\b(?:manager|management|managed by)\b/.test(lowerSentence)) {
      const companyMatch = sentence.match(/\b([A-Z][A-Za-z0-9\s&.,'-]{3,50}?(?:Ltd\.?|Limited|Inc\.?|LLC|Line|Group|Marine|Shipping|Services|AS|ASA|SA|AG|GmbH|BV|NV))\b/);
      if (companyMatch && !manager) {
        manager = companyMatch[1].trim();
      }
    }
  }
  
  if (owner || operator || manager) {
    return {
      owner: cleanCompanyName(owner),
      operator: cleanCompanyName(operator),
      manager: cleanCompanyName(manager),
      confidence: 'medium' as const,
      sourceIndex: index,
      sourceUrl: source.url,
      extractionMethod: 'proximity' as const
    };
  }
  
  return null;
}

/**
 * Clean up company name
 * - Remove HTML entities
 * - Trim whitespace
 * - Remove invalid characters
 * - Validate it looks like a company name
 */
function cleanCompanyName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  
  // Decode HTML entities
  let cleaned = name
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/gi, (match, dec) => String.fromCharCode(dec))
    .trim();
  
  // Remove leading/trailing punctuation
  cleaned = cleaned.replace(/^[:\-,.\s]+|[:\-,.\s]+$/g, '');
  
  // Validate: must be at least 3 chars, start with uppercase, contain letters
  if (cleaned.length < 3) return undefined;
  if (!/^[A-Z]/.test(cleaned)) return undefined;
  if (!/[A-Za-z]/.test(cleaned)) return undefined;
  
  // Filter out common false positives
  const falsePositives = [
    /^Not\s+(?:Available|Found|Specified)/i,
    /^Unknown$/i,
    /^N\/A$/i,
    /^TBD$/i,
    /^-+$/,
    /^\.+$/,
    /^\d+$/,  // Pure numbers
  ];
  
  for (const pattern of falsePositives) {
    if (pattern.test(cleaned)) return undefined;
  }
  
  return cleaned;
}

/**
 * Get diagnostic information about extraction attempts
 */
export function diagnosticExtraction(sources: Source[]): {
  foundInSources: number[];
  methods: string[];
  allAttempts: Array<{ sourceIndex: number; method: string; found: boolean; data?: any }>;
} {
  const allAttempts: Array<{ sourceIndex: number; method: string; found: boolean; data?: any }> = [];
  
  for (let i = 0; i < sources.length; i++) {
    // Try each method and log results
    const tableResult = extractFromHtmlTable(sources[i], i);
    allAttempts.push({ sourceIndex: i, method: 'table', found: !!tableResult, data: tableResult });
    
    const structuredResult = extractFromStructuredData(sources[i], i);
    allAttempts.push({ sourceIndex: i, method: 'structured', found: !!structuredResult, data: structuredResult });
    
    const patternResult = extractFromPatterns(sources[i], i);
    allAttempts.push({ sourceIndex: i, method: 'pattern', found: !!patternResult, data: patternResult });
    
    const proximityResult = extractFromProximity(sources[i], i);
    allAttempts.push({ sourceIndex: i, method: 'proximity', found: !!proximityResult, data: proximityResult });
  }
  
  const foundInSources = [...new Set(allAttempts.filter(a => a.found).map(a => a.sourceIndex))];
  const methods = [...new Set(allAttempts.filter(a => a.found).map(a => a.method))];
  
  return { foundInSources, methods, allAttempts };
}

/**
 * Helper: Check if sources contain owner/operator hints
 * (Used by reflexion system to determine if additional searches needed)
 */
export function hasOwnerOperatorData(sources: Source[]): boolean {
  return extractOwnerOperator(sources) !== null;
}

