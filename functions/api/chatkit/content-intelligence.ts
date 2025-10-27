/**
 * MARITIME CONTENT INTELLIGENCE SYSTEM
 * Multi-tiered content scoring inspired by Cursor's orchestration patterns
 * 
 * Architecture:
 * 1. Surface Analysis (Fast) - URL, domain, metadata
 * 2. Semantic Analysis (Medium) - Content relevance, technical depth
 * 3. Authority Analysis (Medium) - Source credibility, citations
 * 4. Maritime Context Analysis (Deep) - Domain expertise, technical accuracy
 * 5. Composite Intelligence Score (Weighted synthesis)
 */

// =====================
// TYPES & INTERFACES
// =====================

export interface ContentSource {
  title: string;
  url: string;
  content: string;
  score?: number;
  raw_content?: string;
  published_date?: string;
}

export interface ContentIntelligence {
  // Tier 1: Surface Metrics (Fast)
  domain_authority: number;        // 0-1: Domain reputation
  freshness: number;               // 0-1: Content recency
  structure_quality: number;       // 0-1: Title, formatting
  
  // Tier 2: Semantic Metrics (Medium)
  relevance_score: number;         // 0-1: Query alignment
  technical_depth: number;         // 0-1: Technical detail level
  completeness: number;            // 0-1: Information completeness
  
  // Tier 3: Authority Metrics (Medium)
  source_credibility: number;      // 0-1: Source authority
  citation_quality: number;        // 0-1: References, sources
  expertise_indicators: number;    // 0-1: Author credentials, affiliations
  
  // Tier 4: Maritime Context (Deep)
  maritime_specificity: number;    // 0-1: Maritime domain relevance
  technical_accuracy: number;      // 0-1: Maritime technical correctness
  industry_alignment: number;      // 0-1: Alignment with maritime standards
  
  // Composite Score
  final_score: number;             // 0-1: Weighted composite
  confidence: number;              // 0-1: Analysis confidence
  
  // Meta
  analysis_depth: 'fast' | 'standard' | 'deep';
  processing_time_ms: number;
}

export interface ScoringWeights {
  domain_authority: number;
  freshness: number;
  structure_quality: number;
  relevance_score: number;
  technical_depth: number;
  completeness: number;
  source_credibility: number;
  citation_quality: number;
  expertise_indicators: number;
  maritime_specificity: number;
  technical_accuracy: number;
  industry_alignment: number;
}

// =====================
// TIER 1: SURFACE ANALYSIS (Fast - <10ms)
// =====================

/**
 * Analyze domain authority and reputation
 * Cursor Pattern: Fast metadata checks before deep analysis
 */
function analyzeDomainAuthority(url: string): number {
  const domain = new URL(url).hostname.toLowerCase();
  
  // TIER 1: International Maritime Organizations (Highest Authority)
  const tier1Domains = [
    'imo.org',              // International Maritime Organization
    'iacs.org.uk',          // International Association of Classification Societies
    'uscg.mil',             // US Coast Guard
    'emsa.europa.eu',       // European Maritime Safety Agency
    'marad.dot.gov',        // US Maritime Administration
  ];
  
  // TIER 2: Classification Societies & Major OEMs
  const tier2Domains = [
    'dnv.com', 'lr.org', 'abs.org', 'class-nk.or.jp',  // Classification
    'bvmarine.com', 'rina.org', 'krs.co.kr',           // Classification
    'wartsila.com', 'man-es.com', 'rolls-royce.com',   // OEM
    'kongsberg.com', 'siemens.com',                    // OEM/Tech
  ];
  
  // TIER 3: Maritime Industry Publishers & Databases
  const tier3Domains = [
    'maritime-executive.com', 'gcaptain.com',
    'marinelink.com', 'offshore-mag.com',
    'marinetraffic.com', 'vesselfinder.com',
    'equasis.org', 'shipspotting.com',
  ];
  
  // TIER 4: Academic & Research
  const tier4Domains = [
    '.edu', '.ac.uk', 'researchgate.net',
    'mdpi.com', 'sciencedirect.com',
  ];
  
  // TIER 5: Government & Port Authorities
  const tier5Domains = ['.gov', 'port.com', 'maritime.gov'];
  
  // PENALTIES: Low-quality sources
  const penaltyDomains = [
    'wikipedia.org', 'facebook.com', 'twitter.com',
    'reddit.com', 'quora.com', 'pinterest.com',
  ];
  
  // Check domain tiers
  if (tier1Domains.some(d => domain.includes(d))) return 1.0;
  if (tier2Domains.some(d => domain.includes(d))) return 0.9;
  if (tier3Domains.some(d => domain.includes(d))) return 0.75;
  if (tier4Domains.some(d => domain.endsWith(d) || domain.includes(d))) return 0.7;
  if (tier5Domains.some(d => domain.includes(d))) return 0.8;
  if (penaltyDomains.some(d => domain.includes(d))) return 0.2;
  
  // Default: Medium authority
  return 0.5;
}

/**
 * Analyze content freshness
 * Maritime info degrades slower than tech, but regulations change
 */
function analyzeFreshness(publishedDate?: string): number {
  if (!publishedDate) return 0.6; // Unknown date = medium freshness
  
  const now = new Date();
  const published = new Date(publishedDate);
  const ageMonths = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  // Freshness decay curve for maritime content
  if (ageMonths < 6) return 1.0;      // Very fresh (< 6 months)
  if (ageMonths < 12) return 0.9;     // Fresh (< 1 year)
  if (ageMonths < 24) return 0.8;     // Recent (< 2 years)
  if (ageMonths < 36) return 0.6;     // Aging (< 3 years)
  if (ageMonths < 60) return 0.4;     // Old (< 5 years)
  return 0.2;                          // Very old (5+ years)
}

/**
 * Analyze content structure quality
 * Well-structured content indicates professionalism
 */
function analyzeStructureQuality(source: ContentSource): number {
  let score = 0.5; // Base score
  
  const { title, content } = source;
  
  // Title quality
  if (title && title.length > 20 && title.length < 150) score += 0.1;
  if (/[A-Z]/.test(title) && !/^[A-Z\s]+$/.test(title)) score += 0.05; // Proper capitalization
  
  // Content structure indicators
  const hasNumbers = /\d+/.test(content);
  const hasTechnicalTerms = /(specification|technical|datasheet|manual|engine|vessel|ship)/i.test(content);
  const hasProperPunctuation = /[.!?]/.test(content);
  const hasListStructure = /[•\-*]|\d+\./gm.test(content);
  
  if (hasNumbers) score += 0.05;
  if (hasTechnicalTerms) score += 0.1;
  if (hasProperPunctuation) score += 0.05;
  if (hasListStructure) score += 0.1;
  
  // Length indicates depth (but not too long)
  const wordCount = content.split(/\s+/).length;
  if (wordCount > 100 && wordCount < 2000) score += 0.1;
  else if (wordCount >= 2000) score += 0.05;
  
  return Math.min(score, 1.0);
}

// =====================
// TIER 2: SEMANTIC ANALYSIS (Medium - 20-50ms)
// =====================

/**
 * Analyze query-content relevance
 * Cursor Pattern: Multi-level keyword matching with semantic understanding
 */
function analyzeRelevance(source: ContentSource, query: string): number {
  const contentLower = source.content.toLowerCase();
  const titleLower = source.title.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Extract query keywords (remove stopwords)
  const stopwords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with'];
  const queryKeywords = queryLower
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.includes(w));
  
  if (queryKeywords.length === 0) return 0.5;
  
  let score = 0;
  
  // Level 1: Exact keyword matches
  const exactMatches = queryKeywords.filter(kw => contentLower.includes(kw)).length;
  score += (exactMatches / queryKeywords.length) * 0.4;
  
  // Level 2: Title matches (higher weight)
  const titleMatches = queryKeywords.filter(kw => titleLower.includes(kw)).length;
  score += (titleMatches / queryKeywords.length) * 0.3;
  
  // Level 3: Semantic proximity (simplified - check for related terms)
  const semanticScore = calculateSemanticProximity(contentLower, queryKeywords);
  score += semanticScore * 0.3;
  
  return Math.min(score, 1.0);
}

/**
 * Calculate semantic proximity using maritime domain knowledge
 * Simplified version - in production, use embeddings (OpenAI, Cohere)
 */
function calculateSemanticProximity(content: string, keywords: string[]): number {
  // Maritime synonym groups
  const synonymGroups = [
    ['vessel', 'ship', 'boat', 'craft', 'maritime', 'marine'],
    ['engine', 'propulsion', 'motor', 'power', 'machinery'],
    ['specification', 'specs', 'technical', 'details', 'datasheet'],
    ['fleet', 'vessels', 'ships', 'armada', 'group'],
    ['company', 'operator', 'owner', 'firm', 'corporation'],
    ['cargo', 'freight', 'load', 'shipment', 'goods'],
    ['container', 'teu', 'box', 'containerized'],
  ];
  
  let semanticMatches = 0;
  for (const keyword of keywords) {
    for (const group of synonymGroups) {
      if (group.includes(keyword)) {
        // Check if content contains ANY synonym from the group
        const hasSynonym = group.some(syn => content.includes(syn));
        if (hasSynonym) semanticMatches++;
        break;
      }
    }
  }
  
  return semanticMatches / keywords.length;
}

/**
 * Analyze technical depth
 * Cursor Pattern: Detect code/technical patterns, data density
 */
function analyzeTechnicalDepth(content: string): number {
  let score = 0;
  
  // Technical indicators
  const hasMeasurements = /\d+\s*(m|km|ton|teu|kw|mw|knots|rpm|bar|mm|cm)/gi.test(content);
  const hasSpecifications = /(specification|technical data|parameters|dimensions)/i.test(content);
  const hasTechnicalTerms = /(propulsion|displacement|draft|beam|dwt|grt|imo number)/i.test(content);
  const hasEquipmentDetails = /(engine|generator|thruster|boiler|pump|valve)/i.test(content);
  const hasNumbers = (content.match(/\d+/g) || []).length;
  
  if (hasMeasurements) score += 0.25;
  if (hasSpecifications) score += 0.2;
  if (hasTechnicalTerms) score += 0.2;
  if (hasEquipmentDetails) score += 0.15;
  if (hasNumbers > 5) score += 0.2;
  
  return Math.min(score, 1.0);
}

/**
 * Analyze information completeness
 * Cursor Pattern: Check for comprehensive coverage
 */
function analyzeCompleteness(content: string): number {
  let score = 0.3; // Base score
  
  // Completeness indicators
  const wordCount = content.split(/\s+/).length;
  const sentenceCount = content.split(/[.!?]+/).length;
  
  // Length indicates depth
  if (wordCount > 200) score += 0.2;
  if (wordCount > 500) score += 0.2;
  
  // Structure indicates organization
  if (sentenceCount > 5) score += 0.1;
  
  // Coverage indicators
  const hasIntroduction = /\b(introduction|overview|background)\b/i.test(content);
  const hasDetails = /\b(details?|specification|features?|characteristics?)\b/i.test(content);
  const hasConclusion = /\b(conclusion|summary|result)\b/i.test(content);
  
  if (hasIntroduction) score += 0.1;
  if (hasDetails) score += 0.1;
  if (hasConclusion) score += 0.05;
  
  return Math.min(score, 1.0);
}

// =====================
// TIER 3: AUTHORITY ANALYSIS (Medium - 20-50ms)
// =====================

/**
 * Analyze source credibility
 * Cursor Pattern: Multi-factor authority assessment
 */
function analyzeSourceCredibility(source: ContentSource): number {
  const { url, content, title } = source;
  const domain = new URL(url).hostname;
  
  // Start with domain authority
  let score = analyzeDomainAuthority(url);
  
  // Check for authority indicators in content
  const hasOfficialMarking = /(official|certified|approved|authorized|licensed)/i.test(content);
  const hasOrganizationRef = /(imo|iacs|classification|maritime organization)/i.test(content);
  const hasStandards = /(iso|solas|marpol|stcw|ism code)/i.test(content);
  const hasExpertAuthor = /(captain|engineer|naval architect|marine surveyor|ceo|director)/i.test(content);
  
  if (hasOfficialMarking) score += 0.05;
  if (hasOrganizationRef) score += 0.05;
  if (hasStandards) score += 0.05;
  if (hasExpertAuthor) score += 0.05;
  
  // HTTPS is expected for official sources
  if (url.startsWith('https://')) score += 0.02;
  
  return Math.min(score, 1.0);
}

/**
 * Analyze citation quality
 * Cursor Pattern: Check for references, sources, data provenance
 */
function analyzeCitationQuality(content: string): number {
  let score = 0.3; // Base score (not all content needs citations)
  
  // Citation indicators
  const hasReferences = /\b(reference|citation|source|according to|reported by)\b/i.test(content);
  const hasLinks = /https?:\/\/[^\s]+/g.test(content);
  const hasQuotes = /"[^"]{20,}"/g.test(content);
  const hasDataAttribution = /\b(data from|statistics from|reported by|published by)\b/i.test(content);
  
  if (hasReferences) score += 0.2;
  if (hasLinks) score += 0.2;
  if (hasQuotes) score += 0.15;
  if (hasDataAttribution) score += 0.15;
  
  return Math.min(score, 1.0);
}

/**
 * Analyze expertise indicators
 * Cursor Pattern: Detect domain expertise signals
 */
function analyzeExpertiseIndicators(source: ContentSource): number {
  const { content, title } = source;
  let score = 0.4; // Base score
  
  // Expertise signals
  const hasAuthorCredentials = /(captain|engineer|surveyor|inspector|master mariner|chief engineer)/i.test(content);
  const hasIndustryTerms = /(vessel|maritime|marine|shipping|naval|offshore|port|dock)/gi.test(content);
  const industryTermCount = (content.match(/(vessel|maritime|marine|shipping|naval|offshore|port|dock)/gi) || []).length;
  const hasTechnicalJargon = /(dwt|grt|teu|imo|mmsi|class notation|flag state)/i.test(content);
  const hasDetailedSpecs = /\d+\s*(ton|teu|kw|mw|m|km)/gi.test(content);
  
  if (hasAuthorCredentials) score += 0.15;
  if (industryTermCount > 5) score += 0.15;
  if (hasTechnicalJargon) score += 0.15;
  if (hasDetailedSpecs) score += 0.15;
  
  return Math.min(score, 1.0);
}

// =====================
// TIER 4: MARITIME CONTEXT ANALYSIS (Deep - 50-100ms)
// =====================

/**
 * Analyze maritime domain specificity
 * Cursor Pattern: Deep domain alignment check
 */
function analyzeMaritimeSpecificity(source: ContentSource): number {
  const { content, title, url } = source;
  const combinedText = `${title} ${content}`.toLowerCase();
  
  let score = 0;
  
  // Core maritime terms (essential)
  const coreTerms = ['vessel', 'ship', 'maritime', 'marine', 'shipping', 'naval', 'port', 'fleet'];
  const coreMatches = coreTerms.filter(term => combinedText.includes(term)).length;
  score += (coreMatches / coreTerms.length) * 0.3;
  
  // Specific maritime categories
  const categories = [
    // Vessel types
    ['container', 'tanker', 'bulk carrier', 'cargo', 'cruise', 'ferry', 'offshore'],
    // Equipment
    ['engine', 'propulsion', 'thruster', 'boiler', 'generator', 'pump', 'crane'],
    // Operations
    ['navigation', 'cargo handling', 'maintenance', 'inspection', 'classification', 'survey'],
    // Regulations
    ['solas', 'marpol', 'ism', 'stcw', 'flag state', 'port state'],
    // Technical
    ['displacement', 'draft', 'beam', 'dwt', 'grt', 'teu', 'knots'],
  ];
  
  let categoryMatches = 0;
  for (const category of categories) {
    if (category.some(term => combinedText.includes(term))) {
      categoryMatches++;
    }
  }
  score += (categoryMatches / categories.length) * 0.4;
  
  // Domain URL check
  const maritimeDomains = ['maritime', 'marine', 'vessel', 'ship', 'port', 'offshore', 'naval'];
  if (maritimeDomains.some(d => url.includes(d))) score += 0.3;
  
  return Math.min(score, 1.0);
}

/**
 * Analyze technical accuracy
 * Cursor Pattern: Check for consistency, valid technical data
 */
function analyzeTechnicalAccuracy(content: string): number {
  let score = 0.7; // Assume accurate unless proven otherwise
  
  // Check for technical consistency
  const hasMeasurements = /\d+\s*(m|km|ton|teu|kw|mw)/gi.test(content);
  const hasValidIMOPattern = /imo\s*:?\s*\d{7}/i.test(content);
  const hasValidMMSI = /mmsi\s*:?\s*\d{9}/i.test(content);
  const hasRealisticNumbers = !/\d{10,}/g.test(content); // No absurdly large numbers
  
  if (hasMeasurements) score += 0.1;
  if (hasValidIMOPattern || hasValidMMSI) score += 0.1;
  if (hasRealisticNumbers) score += 0.05;
  
  // Penalty for vague/marketing language
  const hasMarketingFluff = /(amazing|incredible|revolutionary|best ever|world-class)/i.test(content);
  if (hasMarketingFluff) score -= 0.1;
  
  return Math.max(Math.min(score, 1.0), 0);
}

/**
 * Analyze industry alignment
 * Cursor Pattern: Check alignment with industry standards and practices
 */
function analyzeIndustryAlignment(source: ContentSource): number {
  const { content, url } = source;
  let score = 0.5; // Base score
  
  // Standards and regulations
  const hasStandards = /(iso|solas|marpol|ism|stcw|iacs|class)/i.test(content);
  const hasClassification = /(dnv|abs|lloyd|bureau veritas|class nk|rina)/i.test(content);
  const hasRegulations = /(compliance|regulation|requirement|mandatory|certification)/i.test(content);
  
  if (hasStandards) score += 0.2;
  if (hasClassification) score += 0.15;
  if (hasRegulations) score += 0.15;
  
  return Math.min(score, 1.0);
}

// =====================
// COMPOSITE INTELLIGENCE ORCHESTRATOR
// =====================

/**
 * Generate default scoring weights
 * Cursor Pattern: Configurable, context-aware weights
 */
export function getDefaultWeights(): ScoringWeights {
  return {
    // Tier 1: Surface (20%)
    domain_authority: 0.10,
    freshness: 0.05,
    structure_quality: 0.05,
    
    // Tier 2: Semantic (30%)
    relevance_score: 0.15,
    technical_depth: 0.10,
    completeness: 0.05,
    
    // Tier 3: Authority (25%)
    source_credibility: 0.10,
    citation_quality: 0.05,
    expertise_indicators: 0.10,
    
    // Tier 4: Maritime Context (25%)
    maritime_specificity: 0.10,
    technical_accuracy: 0.08,
    industry_alignment: 0.07,
  };
}

/**
 * MAIN ORCHESTRATOR: Analyze content with multi-tiered intelligence
 * Cursor Pattern: Hierarchical analysis with early exits for efficiency
 */
export async function analyzeContentIntelligence(
  source: ContentSource,
  query: string,
  analysisDepth: 'fast' | 'standard' | 'deep' = 'standard',
  customWeights?: Partial<ScoringWeights>
): Promise<ContentIntelligence> {
  const startTime = Date.now();
  
  // Merge custom weights with defaults
  const weights: ScoringWeights = { ...getDefaultWeights(), ...customWeights };
  
  // TIER 1: Surface Analysis (Always run - fast)
  const domain_authority = analyzeDomainAuthority(source.url);
  const freshness = analyzeFreshness(source.published_date);
  const structure_quality = analyzeStructureQuality(source);
  
  // Early exit for 'fast' mode
  if (analysisDepth === 'fast') {
    const final_score = 
      domain_authority * weights.domain_authority +
      freshness * weights.freshness +
      structure_quality * weights.structure_quality;
    
    return {
      domain_authority,
      freshness,
      structure_quality,
      relevance_score: 0,
      technical_depth: 0,
      completeness: 0,
      source_credibility: 0,
      citation_quality: 0,
      expertise_indicators: 0,
      maritime_specificity: 0,
      technical_accuracy: 0,
      industry_alignment: 0,
      final_score: final_score / 0.2, // Normalize to 0-1
      confidence: 0.5, // Low confidence in fast mode
      analysis_depth: 'fast',
      processing_time_ms: Date.now() - startTime,
    };
  }
  
  // TIER 2: Semantic Analysis
  const relevance_score = analyzeRelevance(source, query);
  const technical_depth = analyzeTechnicalDepth(source.content);
  const completeness = analyzeCompleteness(source.content);
  
  // TIER 3: Authority Analysis
  const source_credibility = analyzeSourceCredibility(source);
  const citation_quality = analyzeCitationQuality(source.content);
  const expertise_indicators = analyzeExpertiseIndicators(source);
  
  // Early exit for 'standard' mode
  if (analysisDepth === 'standard') {
    const final_score =
      domain_authority * weights.domain_authority +
      freshness * weights.freshness +
      structure_quality * weights.structure_quality +
      relevance_score * weights.relevance_score +
      technical_depth * weights.technical_depth +
      completeness * weights.completeness +
      source_credibility * weights.source_credibility +
      citation_quality * weights.citation_quality +
      expertise_indicators * weights.expertise_indicators;
    
    return {
      domain_authority,
      freshness,
      structure_quality,
      relevance_score,
      technical_depth,
      completeness,
      source_credibility,
      citation_quality,
      expertise_indicators,
      maritime_specificity: 0,
      technical_accuracy: 0,
      industry_alignment: 0,
      final_score: final_score / 0.75, // Normalize
      confidence: 0.75,
      analysis_depth: 'standard',
      processing_time_ms: Date.now() - startTime,
    };
  }
  
  // TIER 4: Deep Maritime Context Analysis
  const maritime_specificity = analyzeMaritimeSpecificity(source);
  const technical_accuracy = analyzeTechnicalAccuracy(source.content);
  const industry_alignment = analyzeIndustryAlignment(source);
  
  // Calculate final composite score
  const final_score =
    domain_authority * weights.domain_authority +
    freshness * weights.freshness +
    structure_quality * weights.structure_quality +
    relevance_score * weights.relevance_score +
    technical_depth * weights.technical_depth +
    completeness * weights.completeness +
    source_credibility * weights.source_credibility +
    citation_quality * weights.citation_quality +
    expertise_indicators * weights.expertise_indicators +
    maritime_specificity * weights.maritime_specificity +
    technical_accuracy * weights.technical_accuracy +
    industry_alignment * weights.industry_alignment;
  
  // Calculate confidence based on analysis consistency
  const metrics = [
    domain_authority, freshness, structure_quality,
    relevance_score, technical_depth, completeness,
    source_credibility, citation_quality, expertise_indicators,
    maritime_specificity, technical_accuracy, industry_alignment,
  ];
  const avgMetric = metrics.reduce((a, b) => a + b, 0) / metrics.length;
  const variance = metrics.reduce((sum, m) => sum + Math.pow(m - avgMetric, 2), 0) / metrics.length;
  const confidence = 1.0 - Math.min(variance, 0.3) / 0.3; // Low variance = high confidence
  
  return {
    domain_authority,
    freshness,
    structure_quality,
    relevance_score,
    technical_depth,
    completeness,
    source_credibility,
    citation_quality,
    expertise_indicators,
    maritime_specificity,
    technical_accuracy,
    industry_alignment,
    final_score,
    confidence,
    analysis_depth: 'deep',
    processing_time_ms: Date.now() - startTime,
  };
}

/**
 * Batch analyze multiple sources (parallel processing)
 * Cursor Pattern: Efficient parallel orchestration
 */
export async function batchAnalyzeContent(
  sources: ContentSource[],
  query: string,
  analysisDepth: 'fast' | 'standard' | 'deep' = 'standard'
): Promise<(ContentSource & { intelligence: ContentIntelligence })[]> {
  // Parallel analysis for speed
  const analyses = await Promise.all(
    sources.map(source => analyzeContentIntelligence(source, query, analysisDepth))
  );
  
  // Merge intelligence with sources
  return sources.map((source, i) => ({
    ...source,
    intelligence: analyses[i],
    score: analyses[i].final_score, // Update score field
  }));
}

/**
 * Generate human-readable intelligence report
 * Cursor Pattern: Explainable AI - show reasoning
 */
export function generateIntelligenceReport(intelligence: ContentIntelligence): string {
  const { final_score, confidence, analysis_depth } = intelligence;
  
  const scoreLabel = 
    final_score >= 0.9 ? 'EXCEPTIONAL' :
    final_score >= 0.8 ? 'EXCELLENT' :
    final_score >= 0.7 ? 'GOOD' :
    final_score >= 0.6 ? 'ACCEPTABLE' :
    final_score >= 0.5 ? 'MODERATE' : 'LOW';
  
  const report = [];
  report.push(`Intelligence Score: ${(final_score * 100).toFixed(1)}% (${scoreLabel})`);
  report.push(`Confidence: ${(confidence * 100).toFixed(1)}%`);
  report.push(`Analysis Depth: ${analysis_depth.toUpperCase()}`);
  report.push(`Processing Time: ${intelligence.processing_time_ms}ms`);
  report.push('');
  report.push('Breakdown:');
  report.push(`  Domain Authority: ${(intelligence.domain_authority * 100).toFixed(0)}%`);
  report.push(`  Relevance: ${(intelligence.relevance_score * 100).toFixed(0)}%`);
  report.push(`  Technical Depth: ${(intelligence.technical_depth * 100).toFixed(0)}%`);
  report.push(`  Source Credibility: ${(intelligence.source_credibility * 100).toFixed(0)}%`);
  report.push(`  Maritime Specificity: ${(intelligence.maritime_specificity * 100).toFixed(0)}%`);
  
  return report.join('\n');
}

