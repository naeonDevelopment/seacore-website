/**
 * Comparative Query Analyzer
 * Handles superlative/comparative queries requiring multi-entity extraction and ranking
 * 
 * Examples:
 * - "What is the biggest cargo ship under Norwegian flag?"
 * - "Which is faster: NORVIND or Stanford Seal?"
 * - "Compare Dynamic 17 vs Stanford Seal"
 */

export interface Source {
  url: string;
  title?: string;
  content?: string;
  snippet?: string;
}

export interface ExtractedEntity {
  name: string;
  attribute: string; // 'size', 'speed', 'age', etc.
  value: number;
  unit: string;
  rawText: string;
  sourceIndex: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ComparativeResult {
  winner: ExtractedEntity | null;
  allEntities: ExtractedEntity[];
  ranking: ExtractedEntity[];
  queryType: 'superlative' | 'binary';
  attribute: string;
  confidence: 'high' | 'medium' | 'low';
  validationIssues: string[];
}

/**
 * Detect if query is comparative/superlative
 */
export function isComparativeQuery(query: string): boolean {
  const comparativePatterns = [
    /\b(biggest|largest|smallest|longest|shortest|tallest|fastest|slowest)\b/i,
    /\b(best|worst|most|least|highest|lowest)\b/i,
    /\b(compare|versus|vs\.?)\b/i,
    /\b(which|what).*\b(bigger|larger|faster|better)\b/i
  ];
  
  return comparativePatterns.some(pattern => pattern.test(query));
}

/**
 * Detect target attribute from query
 */
export function detectAttribute(query: string): string {
  const queryLower = query.toLowerCase();
  
  // Size-related
  if (/\b(biggest|largest|longer|bigger|size|tonnage|dwt|gt|displacement)\b/i.test(query)) {
    if (/\b(tonnage|dwt|gt|displacement)\b/i.test(query)) return 'tonnage';
    if (/\b(length|loa|beam)\b/i.test(query)) return 'length';
    return 'size';
  }
  
  // Speed
  if (/\b(fastest|slowest|speed|knots)\b/i.test(query)) return 'speed';
  
  // Age/time
  if (/\b(newest|oldest|latest|recent|built|age)\b/i.test(query)) return 'age';
  
  // Power
  if (/\b(powerful|power|hp|kw|bhp)\b/i.test(query)) return 'power';
  
  // Capacity
  if (/\b(capacity|cargo|container|teu)\b/i.test(query)) return 'capacity';
  
  return 'size'; // Default
}

/**
 * Detect comparative type
 */
export function detectComparativeType(query: string): 'superlative' | 'binary' {
  // Binary comparison if mentions "vs", "versus", or "compare X and Y"
  if (/\b(versus|vs\.?|compare.*\band\b)\b/i.test(query)) {
    return 'binary';
  }
  
  // Superlative if uses -est suffix or "most/least"
  return 'superlative';
}

/**
 * Extract all entities with target attribute from sources
 */
export function extractEntities(
  sources: Source[],
  attribute: string,
  queryEntities?: string[]
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  
  // Attribute-specific extraction patterns
  const patterns = getExtractionPatterns(attribute);
  
  sources.forEach((source, sourceIndex) => {
    const content = source.content || source.snippet || '';
    
    // Extract entities based on attribute
    patterns.forEach(pattern => {
      const matches = content.matchAll(pattern.regex);
      
      for (const match of matches) {
        const entity = extractEntityFromMatch(match, pattern, sourceIndex, attribute);
        if (entity) {
          // If query specifies entities, filter to those
          if (!queryEntities || queryEntities.some(qe => 
            entity.name.toLowerCase().includes(qe.toLowerCase())
          )) {
            entities.push(entity);
          }
        }
      }
    });
  });
  
  return entities;
}

/**
 * Get extraction patterns for specific attribute
 */
function getExtractionPatterns(attribute: string): Array<{
  regex: RegExp;
  valueGroup: number;
  unitGroup: number;
  nameGroup?: number;
}> {
  switch (attribute) {
    case 'size':
    case 'tonnage':
      return [
        {
          regex: /([A-Z][A-Za-z\s\-]+?)\s+(?:is|has|with|of|:|–|—)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(GT|DWT|tons?|tonnes?)\b/gi,
          valueGroup: 2,
          unitGroup: 3,
          nameGroup: 1
        },
        {
          regex: /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(GT|DWT|tons?|tonnes?)\s+([A-Z][A-Za-z\s\-]+)/gi,
          valueGroup: 1,
          unitGroup: 2,
          nameGroup: 3
        }
      ];
      
    case 'length':
      return [
        {
          regex: /([A-Z][A-Za-z\s\-]+?)\s+(?:is|measures?|with|of|:|–|—)\s*(\d+(?:\.\d+)?)\s*(m|meters?|metres?|feet|ft)\b/gi,
          valueGroup: 2,
          unitGroup: 3,
          nameGroup: 1
        },
        {
          regex: /LOA[:\s]+(\d+(?:\.\d+)?)\s*(m|meters?|metres?)/gi,
          valueGroup: 1,
          unitGroup: 2
        }
      ];
      
    case 'speed':
      return [
        {
          regex: /([A-Z][A-Za-z\s\-]+?)\s+(?:speed|cruises?|travels?)[:\s]+(\d+(?:\.\d+)?)\s*(knots?|kn|kts|km\/h|mph)\b/gi,
          valueGroup: 2,
          unitGroup: 3,
          nameGroup: 1
        }
      ];
      
    case 'age':
      return [
        {
          regex: /([A-Z][A-Za-z\s\-]+?)\s+(?:built|delivered|constructed)[:\s]+(\d{4})\b/gi,
          valueGroup: 2,
          unitGroup: 0, // Year has no unit
          nameGroup: 1
        }
      ];
      
    case 'power':
      return [
        {
          regex: /([A-Z][A-Za-z\s\-]+?)\s+(?:engine|power|hp)[:\s]+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(HP|BHP|kW|MW)\b/gi,
          valueGroup: 2,
          unitGroup: 3,
          nameGroup: 1
        }
      ];
      
    default:
      return [];
  }
}

/**
 * Extract entity from regex match
 */
function extractEntityFromMatch(
  match: RegExpMatchArray,
  pattern: { valueGroup: number; unitGroup: number; nameGroup?: number },
  sourceIndex: number,
  attribute: string
): ExtractedEntity | null {
  const valueStr = match[pattern.valueGroup]?.replace(/,/g, '') || '';
  const value = parseFloat(valueStr);
  
  if (isNaN(value) || value <= 0) return null;
  
  const unit = pattern.unitGroup > 0 ? (match[pattern.unitGroup] || '') : '';
  const name = pattern.nameGroup ? (match[pattern.nameGroup]?.trim() || '') : '';
  
  // Validation: size should be reasonable
  if (attribute === 'size' || attribute === 'tonnage') {
    // Cargo ships typically > 1,000 GT, largest > 500,000 GT
    if (value < 100 || value > 1000000) {
      return null; // Unrealistic
    }
  }
  
  // Confidence based on how complete the extraction is
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (name && value && unit) confidence = 'high';
  if (!name || !unit) confidence = 'low';
  
  return {
    name: name || 'Unknown',
    attribute,
    value,
    unit,
    rawText: match[0],
    sourceIndex,
    confidence
  };
}

/**
 * Rank entities by attribute value
 */
export function rankEntities(
  entities: ExtractedEntity[],
  descending: boolean = true
): ExtractedEntity[] {
  return [...entities].sort((a, b) => {
    // Normalize to same unit if needed
    const aValue = normalizeValue(a.value, a.unit, a.attribute);
    const bValue = normalizeValue(b.value, b.unit, b.attribute);
    
    return descending ? bValue - aValue : aValue - bValue;
  });
}

/**
 * Normalize values to common unit
 */
function normalizeValue(value: number, unit: string, attribute: string): number {
  unit = unit.toLowerCase();
  
  // Size/tonnage - normalize to GT
  if (attribute === 'size' || attribute === 'tonnage') {
    if (unit.includes('dwt')) return value * 0.7; // DWT ≈ 0.7 × GT (approximation)
    return value; // GT is baseline
  }
  
  // Length - normalize to meters
  if (attribute === 'length') {
    if (unit.includes('ft') || unit.includes('feet')) return value * 0.3048;
    return value; // meters is baseline
  }
  
  // Speed - normalize to knots
  if (attribute === 'speed') {
    if (unit.includes('km')) return value * 0.539957; // km/h to knots
    if (unit.includes('mph')) return value * 0.868976; // mph to knots
    return value; // knots is baseline
  }
  
  // Power - normalize to kW
  if (attribute === 'power') {
    if (unit.includes('hp') || unit.includes('bhp')) return value * 0.7457; // HP to kW
    if (unit.includes('mw')) return value * 1000; // MW to kW
    return value; // kW is baseline
  }
  
  // Age - year is already normalized
  return value;
}

/**
 * Validate winner makes sense
 */
export function validateWinner(
  winner: ExtractedEntity | null,
  attribute: string,
  queryScope: string
): string[] {
  const issues: string[] = [];
  
  if (!winner) {
    issues.push('No winner found - insufficient data in sources');
    return issues;
  }
  
  // Size validation
  if (attribute === 'size' || attribute === 'tonnage') {
    if (winner.value < 5000) {
      issues.push(`Winner size (${winner.value} ${winner.unit}) seems too small for "biggest cargo ship" - typical cargo ships > 10,000 GT`);
    }
  }
  
  // Confidence check
  if (winner.confidence === 'low') {
    issues.push('Winner has low confidence - data may be incomplete');
  }
  
  return issues;
}

/**
 * Analyze comparative query
 */
export function analyzeComparativeQuery(
  query: string,
  sources: Source[]
): ComparativeResult {
  const attribute = detectAttribute(query);
  const queryType = detectComparativeType(query);
  
  // Extract entity names from query if binary comparison
  let queryEntities: string[] | undefined;
  if (queryType === 'binary') {
    // Extract names from "X vs Y" or "compare X and Y"
    const vsMatch = query.match(/([A-Z][A-Za-z\s\-]+)\s+(?:vs\.?|versus)\s+([A-Z][A-Za-z\s\-]+)/i);
    const compareMatch = query.match(/compare\s+([A-Z][A-Za-z\s\-]+)\s+and\s+([A-Z][A-Za-z\s\-]+)/i);
    
    if (vsMatch) {
      queryEntities = [vsMatch[1].trim(), vsMatch[2].trim()];
    } else if (compareMatch) {
      queryEntities = [compareMatch[1].trim(), compareMatch[2].trim()];
    }
  }
  
  // Extract all entities
  const entities = extractEntities(sources, attribute, queryEntities);
  
  // Rank (descending for superlatives like "biggest")
  const descending = /\b(biggest|largest|fastest|most|highest)\b/i.test(query);
  const ranking = rankEntities(entities, descending);
  
  const winner = ranking[0] || null;
  
  // Validate
  const validationIssues = validateWinner(winner, attribute, query);
  
  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (ranking.length >= 3 && winner?.confidence === 'high') confidence = 'high';
  if (ranking.length < 2 || validationIssues.length > 0) confidence = 'low';
  
  return {
    winner,
    allEntities: entities,
    ranking,
    queryType,
    attribute,
    confidence,
    validationIssues
  };
}

