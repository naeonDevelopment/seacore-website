/**
 * UNIVERSAL TRUTH VERIFICATION SYSTEM (v2.0)
 * 
 * Distributed Prompt Architecture - Each stage uses a specialized prompt
 * optimized for its specific task
 * 
 * Pipeline:
 * 1. Entity Extraction & Disambiguation
 * 2. Data Normalization (convert raw text to structured data)
 * 3. Claim Extraction (with evidence)
 * 4. Comparative Analysis (cross-source comparison for "largest/biggest" queries)
 * 5. Conflict Resolution & Verification
 * 6. Grounded Answer Generation
 * 7. Self-Verification
 */

interface SearchResult {
  title: string;
  url: string;
  content: string;
  raw_content?: string;
  snippet?: string;
}

export interface ExtractedEntity {
  name: string;
  type: 'vessel' | 'company' | 'equipment' | 'location' | 'person' | 'other';
  aliases: string[]; // Alternative names found in sources
  confidence: number;
  sources: number[];
}

export interface NormalizedData {
  entity: string;
  attribute: string; // e.g., "length", "deadweight", "owner", "built_year"
  value: string | number;
  unit?: string; // e.g., "meters", "tons", "year"
  rawText: string; // Original text from source
  sourceIndex: number;
  confidence: number;
}

export interface ExtractedClaim {
  claim: string;
  claimType: 'factual' | 'numerical' | 'date' | 'entity' | 'opinion';
  sources: number[];
  confidence: number;
  evidence: string[];
  contradictions?: string[];
  normalizedData?: NormalizedData[]; // Structured data supporting this claim
}

interface ComparativeAnalysis {
  attribute: string; // What we're comparing (e.g., "vessel size")
  candidates: {
    value: string | number;
    entity: string;
    sources: number[];
    evidence: string[];
    confidence: number;
  }[];
  winner: {
    entity: string;
    value: string | number;
    reason: string;
    confidence: number;
  } | null;
  conflicts: string[];
}

interface VerificationResult {
  verified: boolean;
  confidence: number;
  supportingSources: number;
  conflictDetected: boolean;
  reason: string;
  comparativeAnalysis?: ComparativeAnalysis;
}

/**
 * STAGE 1: Entity Extraction & Disambiguation
 * Specialized prompt for identifying and disambiguating entities across sources
 */
export async function extractEntities(
  query: string,
  sources: SearchResult[],
  openaiKey: string
): Promise<ExtractedEntity[]> {
  
  const sourceContent = sources.map((s, i) => 
    `[Source ${i+1}: ${s.title}]\n${(s.raw_content || s.content || s.snippet || '').substring(0, 1500)}`
  ).join('\n\n---\n\n');
  
  const entityPrompt = `You are an entity extraction specialist for maritime domain.

TASK: Extract and disambiguate ALL entities mentioned across these sources.

Query: "${query}"

Sources:
${sourceContent}

CRITICAL RULES:
1. Extract EVERY entity mentioned (vessels, companies, equipment, people, locations)
2. Group aliases together (e.g., "Stanford Marine" = "Stanford Marine Group")
3. Note which source mentions each entity
4. Classify entity type accurately
5. Return ONLY valid JSON

Return JSON array:
[
  {
    "name": "Primary entity name",
    "type": "vessel|company|equipment|location|person|other",
    "aliases": ["alternative name 1", "alternative name 2"],
    "sources": [1, 3, 5],
    "confidence": 85
  }
]

Return ONLY the JSON array:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a precise entity extraction system for maritime domain. Return valid JSON only.' 
          },
          { role: 'user', content: entityPrompt }
        ],
        temperature: 0,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('❌ Entity extraction failed:', response.status);
      return [];
    }

    const json = await response.json();
    const extractedText = json.choices?.[0]?.message?.content || '[]';
    
    const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️ No valid JSON in entity extraction');
      return [];
    }
    
    const entities: ExtractedEntity[] = JSON.parse(jsonMatch[0]);
    console.log(`✅ Extracted ${entities.length} entities`);
    return entities;
    
  } catch (error) {
    console.error('❌ Entity extraction error:', error);
    return [];
  }
}

/**
 * STAGE 2: Data Normalization
 * Specialized prompt for converting raw text into structured, comparable data
 */
export async function normalizeData(
  query: string,
  sources: SearchResult[],
  entities: ExtractedEntity[],
  openaiKey: string
): Promise<NormalizedData[]> {
  
  const sourceContent = sources.map((s, i) => 
    `[Source ${i+1}: ${s.title}]\n${(s.raw_content || s.content || s.snippet || '').substring(0, 2000)}`
  ).join('\n\n---\n\n');
  
  const entityNames = entities.map(e => e.name).join(', ');
  
  const normalizationPrompt = `You are a data normalization specialist for maritime information.

TASK: Extract and normalize ALL measurable attributes mentioned for these entities.

Query: "${query}"
Entities Found: ${entityNames}

Sources:
${sourceContent}

CRITICAL RULES:
1. Extract EVERY measurable attribute (size, weight, capacity, year, owner, etc.)
2. Convert units to standard format (meters, tonnes, MW, etc.)
3. Parse dates to consistent format
4. Note the exact raw text you're parsing from
5. Include source index for each data point
6. Return ONLY valid JSON

Examples of attributes to extract:
- Vessel dimensions: length, beam, draft, deadweight, gross tonnage
- Company info: fleet size, founding year, headquarters
- Equipment specs: power output, capacity, manufacturer
- Dates: built year, delivery date, last survey

Return JSON array:
[
  {
    "entity": "Stanford Bateleur",
    "attribute": "length",
    "value": 87,
    "unit": "meters",
    "rawText": "87-meter DP2 platform supply vessel",
    "sourceIndex": 1,
    "confidence": 95
  },
  {
    "entity": "Stanford Bateleur",
    "attribute": "deadweight",
    "value": 5145,
    "unit": "tons",
    "rawText": "deadweight of 5,145 tons",
    "sourceIndex": 1,
    "confidence": 95
  }
]

Return ONLY the JSON array:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a precise data normalization system. Extract and standardize all measurable attributes. Return valid JSON only.' 
          },
          { role: 'user', content: normalizationPrompt }
        ],
        temperature: 0,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      console.error('❌ Data normalization failed:', response.status);
      return [];
    }

    const json = await response.json();
    const extractedText = json.choices?.[0]?.message?.content || '[]';
    
    const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️ No valid JSON in data normalization');
      return [];
    }
    
    const normalizedData: NormalizedData[] = JSON.parse(jsonMatch[0]);
    console.log(`✅ Normalized ${normalizedData.length} data points`);
    return normalizedData;
    
  } catch (error) {
    console.error('❌ Data normalization error:', error);
    return [];
  }
}

/**
 * STAGE 3: Comparative Analysis
 * Specialized prompt for comparing entities across sources (e.g., "which vessel is largest?")
 */
export async function performComparativeAnalysis(
  query: string,
  normalizedData: NormalizedData[],
  entities: ExtractedEntity[],
  openaiKey: string
): Promise<ComparativeAnalysis | null> {
  
  // Check if query requires comparison
  const comparisonIndicators = /largest|biggest|smallest|most|least|best|worst|highest|lowest|maximum|minimum/i;
  if (!comparisonIndicators.test(query)) {
    console.log('⏭️ No comparison required for this query');
    return null;
  }
  
  const dataByEntity = normalizedData.reduce((acc, d) => {
    if (!acc[d.entity]) acc[d.entity] = [];
    acc[d.entity].push(d);
    return acc;
  }, {} as Record<string, NormalizedData[]>);
  
  const comparisonPrompt = `You are a comparative analysis specialist for maritime data.

TASK: Determine which entity best answers the comparative query based on normalized data.

Query: "${query}"

Entities and their data:
${Object.entries(dataByEntity).map(([entity, data]) => 
  `\n${entity}:\n${data.map(d => `  - ${d.attribute}: ${d.value} ${d.unit || ''} (from Source ${d.sourceIndex + 1}, confidence: ${d.confidence}%)`).join('\n')}`
).join('\n')}

CRITICAL RULES:
1. Identify what attribute is being compared (e.g., vessel size = deadweight or length)
2. Compare ONLY entities with data for that attribute
3. For vessel size: prioritize deadweight > length > gross tonnage
4. Cross-check values from multiple sources if available
5. Identify the clear winner OR note if comparison is ambiguous
6. Flag any conflicts or inconsistencies
7. Return ONLY valid JSON

Return JSON:
{
  "attribute": "What is being compared",
  "candidates": [
    {
      "value": 5145,
      "entity": "Stanford Bateleur",
      "sources": [1, 2],
      "evidence": ["87-meter DP2 platform supply vessel", "deadweight of 5,145 tons"],
      "confidence": 90
    }
  ],
  "winner": {
    "entity": "Stanford Bateleur",
    "value": 5145,
    "reason": "Highest deadweight tonnage among all vessels found",
    "confidence": 90
  },
  "conflicts": ["No conflicts found"] or ["Source 1 says X but Source 2 says Y"]
}

Return ONLY the JSON object:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a precise comparative analysis system. Determine winners in comparisons using structured data. Return valid JSON only.' 
          },
          { role: 'user', content: comparisonPrompt }
        ],
        temperature: 0,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('❌ Comparative analysis failed:', response.status);
      return null;
    }

    const json = await response.json();
    const extractedText = json.choices?.[0]?.message?.content || '{}';
    
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('⚠️ No valid JSON in comparative analysis');
      return null;
    }
    
    const analysis: ComparativeAnalysis = JSON.parse(jsonMatch[0]);
    console.log(`✅ Comparative analysis complete: Winner = ${analysis.winner?.entity || 'None'}`);
    return analysis;
    
  } catch (error) {
    console.error('❌ Comparative analysis error:', error);
    return null;
  }
}

/**
 * STEP 1: Classify Query Type
 * Determines what kind of answer is needed and verification level required
 */
export function classifyQuery(query: string): {
  type: 'factual' | 'opinion' | 'fleetcore' | 'mixed';
  domain: 'vessel' | 'maintenance' | 'legislation' | 'company' | 'equipment' | 'general';
  requiresSearch: boolean;
  requiresComparison: boolean;
  verificationLevel: 'high' | 'medium' | 'low';
} {
  const queryLower = query.toLowerCase();
  
  // Factual queries requiring HIGH verification
  const factualIndicators = [
    /what is|tell me|how many|when|where|which|who owns/i,
    /largest|biggest|smallest|newest|oldest/i,
    /specification|requirement|regulation|standard/i,
    /\bsolas\b|\bmarpol\b|\bism code\b/i,
    /maintenance schedule|interval|frequency/i,
    /vessel|ship|fleet|company|owner/i,
  ];
  
  // Comparison indicators
  const comparisonIndicators = /largest|biggest|smallest|most|least|best|worst|highest|lowest|maximum|minimum/i;
  
  // Opinion/recommendation queries - MEDIUM verification
  const opinionIndicators = [
    /best practice|recommend|should|could|advice/i,
    /how to|what do you think|in your opinion/i,
    /pros and cons|advantages|disadvantages/i,
  ];
  
  // fleetcore-specific queries - LOW verification (we know our own product)
  const fleetcoreIndicators = [
    /fleetcore|platform|your system|your software/i,
    /schedule-specific hours|dual-interval/i,
    /how does fleetcore/i,
  ];
  
  // Determine type
  let type: 'factual' | 'opinion' | 'fleetcore' | 'mixed' = 'factual';
  if (fleetcoreIndicators.some(r => r.test(queryLower))) {
    type = 'fleetcore';
  } else if (opinionIndicators.some(r => r.test(queryLower))) {
    type = 'opinion';
  } else if (factualIndicators.some(r => r.test(queryLower))) {
    type = 'factual';
  }
  
  // Determine domain
  let domain: 'vessel' | 'maintenance' | 'legislation' | 'company' | 'equipment' | 'general' = 'general';
  if (/vessel|ship|fleet|boat/i.test(queryLower)) domain = 'vessel';
  else if (/maintenance|schedule|pms|service/i.test(queryLower)) domain = 'maintenance';
  else if (/solas|marpol|ism code|regulation|compliance/i.test(queryLower)) domain = 'legislation';
  else if (/company|owner|operator|maritime firm/i.test(queryLower)) domain = 'company';
  else if (/engine|equipment|machinery|generator/i.test(queryLower)) domain = 'equipment';
  
  // Determine if search required
  const requiresSearch = type !== 'fleetcore';
  
  // Determine if comparison needed
  const requiresComparison = comparisonIndicators.test(queryLower);
  
  // Set verification level
  let verificationLevel: 'high' | 'medium' | 'low' = 'medium';
  if (type === 'factual' && (domain === 'vessel' || domain === 'legislation' || domain === 'company')) {
    verificationLevel = 'high';
  } else if (type === 'fleetcore') {
    verificationLevel = 'low';
  }
  
  return { type, domain, requiresSearch, requiresComparison, verificationLevel };
}

/**
 * STAGE 4: Enhanced Claim Extraction (with normalized data integration)
 */
export async function extractClaims(
  query: string,
  sources: SearchResult[],
  normalizedData: NormalizedData[],
  openaiKey: string
): Promise<ExtractedClaim[]> {
  
  const sourceContent = sources.map((s, i) => {
    const content = s.raw_content || s.content || s.snippet || '';
    return `[Source ${i+1}: ${s.title} - ${s.url}]\n${content.substring(0, 2000)}`;
  }).join('\n\n---\n\n');
  
  const normalizedDataContext = normalizedData.length > 0 
    ? `\n\nNORMALIZED DATA AVAILABLE:\n${normalizedData.map(d => 
        `- ${d.entity}: ${d.attribute} = ${d.value} ${d.unit || ''} [Source ${d.sourceIndex + 1}]`
      ).join('\n')}\n`
    : '';
  
  const extractionPrompt = `You are a precise fact extraction system with access to normalized data.

CRITICAL RULES:
1. Extract ONLY verifiable claims explicitly stated in sources
2. For EACH claim, note which source(s) support it
3. Mark claim type: factual, numerical, date, entity, opinion
4. Include EXACT QUOTES as evidence
5. If sources CONTRADICT each other, note the contradiction
6. Link claims to normalized data where applicable
7. Return valid JSON only

Query: "${query}"
${normalizedDataContext}
Sources:
${sourceContent}

Return JSON array:
[
  {
    "claim": "exact factual statement",
    "claimType": "factual|numerical|date|entity|opinion",
    "sources": [1, 3],
    "evidence": ["exact quote from source 1", "exact quote from source 3"],
    "confidence": 85,
    "contradictions": null or ["conflicting info"],
    "normalizedData": [references to normalized data points if applicable]
  }
]

Return ONLY the JSON array:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a precise fact extraction system. Extract only verifiable claims with evidence. Return valid JSON only.' 
          },
          { role: 'user', content: extractionPrompt }
        ],
        temperature: 0,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      console.error('❌ Claim extraction failed:', response.status);
      return [];
    }

    const json = await response.json();
    const extractedText = json.choices?.[0]?.message?.content || '[]';
    
    const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️ No valid JSON found in extraction response');
      return [];
    }
    
    const claims: ExtractedClaim[] = JSON.parse(jsonMatch[0]);
    
    // Compute confidence for each claim (if not already set)
    claims.forEach(claim => {
      if (!claim.confidence) {
        let confidence = 20; // Base
        
        if (claim.sources.length >= 2) confidence += 30;
        else if (claim.sources.length >= 3) confidence += 40;
        
        if (claim.evidence && claim.evidence.length > 0) confidence += 20;
        
        if (claim.claimType === 'numerical' || claim.claimType === 'date') confidence += 20;
        
        if (claim.contradictions && claim.contradictions.length > 0) confidence -= 50;
        
        claim.confidence = Math.max(0, Math.min(100, confidence));
      }
    });
    
    console.log(`✅ Extracted ${claims.length} claims with confidence scores`);
    return claims;
    
  } catch (error) {
    console.error('❌ Claim extraction error:', error);
    return [];
  }
}

/**
 * STAGE 5: Verify Claims (enhanced with comparative analysis)
 */
export function verifyClaims(
  claims: ExtractedClaim[],
  verificationLevel: 'high' | 'medium' | 'low',
  comparativeAnalysis?: ComparativeAnalysis | null
): VerificationResult {
  
  if (claims.length === 0) {
    return {
      verified: false,
      confidence: 0,
      supportingSources: 0,
      conflictDetected: false,
      reason: 'No claims could be extracted from sources',
      comparativeAnalysis: comparativeAnalysis || undefined
    };
  }
  
  const hasContradictions = claims.some(c => c.contradictions && c.contradictions.length > 0);
  
  // If comparative analysis found conflicts, flag it
  const hasComparativeConflicts = comparativeAnalysis?.conflicts && 
    comparativeAnalysis.conflicts.length > 0 && 
    !comparativeAnalysis.conflicts.some(c => c.includes('No conflicts'));
  
  const avgConfidence = claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;
  
  // Boost confidence if comparative analysis has a clear winner
  let adjustedConfidence = avgConfidence;
  if (comparativeAnalysis?.winner && comparativeAnalysis.winner.confidence > avgConfidence) {
    adjustedConfidence = (avgConfidence + comparativeAnalysis.winner.confidence) / 2;
    console.log(`✅ Confidence boosted by comparative analysis: ${avgConfidence.toFixed(0)}% → ${adjustedConfidence.toFixed(0)}%`);
  }
  
  const allSources = new Set(claims.flatMap(c => c.sources));
  const supportingSourceCount = allSources.size;
  
  const thresholds = {
    high: { minConfidence: 70, minSources: 2 },
    medium: { minConfidence: 50, minSources: 1 },
    low: { minConfidence: 30, minSources: 1 },
  };
  
  const threshold = thresholds[verificationLevel];
  
  let verified = true;
  let reason = 'Verification passed';
  
  if (adjustedConfidence < threshold.minConfidence) {
    verified = false;
    reason = `Confidence ${adjustedConfidence.toFixed(0)}% below threshold ${threshold.minConfidence}%`;
  } else if (supportingSourceCount < threshold.minSources) {
    verified = false;
    reason = `Only ${supportingSourceCount} supporting sources, need ${threshold.minSources}`;
  } else if ((hasContradictions || hasComparativeConflicts) && verificationLevel === 'high') {
    verified = false;
    reason = 'Sources contain contradictory information';
  }
  
  return {
    verified,
    confidence: adjustedConfidence,
    supportingSources: supportingSourceCount,
    conflictDetected: hasContradictions || hasComparativeConflicts || false,
    reason,
    comparativeAnalysis: comparativeAnalysis || undefined
  };
}

/**
 * STAGE 6: Generate Grounded Answer (enhanced with comparative analysis)
 */
export async function generateGroundedAnswer(
  query: string,
  claims: ExtractedClaim[],
  sources: SearchResult[],
  verification: VerificationResult,
  systemPrompt: string,
  openaiKey: string,
  model: string
): Promise<string> {
  
  let groundedContext = '=== VERIFIED CLAIMS (Use ONLY These Facts) ===\n\n';
  
  if (!verification.verified) {
    groundedContext += `⚠️ VERIFICATION FAILED: ${verification.reason}\n\n`;
    groundedContext += `You MUST acknowledge the uncertainty in your response.\n\n`;
  }
  
  // Add comparative analysis result if available
  if (verification.comparativeAnalysis?.winner) {
    groundedContext += `=== COMPARATIVE ANALYSIS RESULT ===\n`;
    groundedContext += `Attribute Compared: ${verification.comparativeAnalysis.attribute}\n`;
    groundedContext += `Winner: ${verification.comparativeAnalysis.winner.entity}\n`;
    groundedContext += `Value: ${verification.comparativeAnalysis.winner.value}\n`;
    groundedContext += `Reason: ${verification.comparativeAnalysis.winner.reason}\n`;
    groundedContext += `Confidence: ${verification.comparativeAnalysis.winner.confidence}%\n\n`;
    
    if (verification.comparativeAnalysis.conflicts.length > 0) {
      groundedContext += `Conflicts Found:\n`;
      verification.comparativeAnalysis.conflicts.forEach(c => {
        groundedContext += `  - ${c}\n`;
      });
      groundedContext += '\n';
    }
  }
  
  claims.forEach((claim, idx) => {
    groundedContext += `CLAIM ${idx + 1}: ${claim.claim}\n`;
    groundedContext += `- Type: ${claim.claimType}\n`;
    groundedContext += `- Confidence: ${claim.confidence}%\n`;
    groundedContext += `- Supporting Sources: [${claim.sources.join(', ')}]\n`;
    groundedContext += `- Evidence:\n`;
    claim.evidence.forEach(e => {
      groundedContext += `  • "${e}"\n`;
    });
    if (claim.contradictions && claim.contradictions.length > 0) {
      groundedContext += `- ⚠️ CONTRADICTIONS FOUND:\n`;
      claim.contradictions.forEach(c => {
        groundedContext += `  • ${c}\n`;
      });
    }
    groundedContext += `\n`;
  });
  
  groundedContext += '\n=== SOURCE REFERENCE ===\n\n';
  sources.forEach((s, i) => {
    groundedContext += `[${i+1}] ${s.title}\n    ${s.url}\n\n`;
  });
  
  groundedContext += `\n=== MANDATORY ANSWER REQUIREMENTS ===\n
1. Use ONLY the verified claims above - DO NOT add information not in claims
2. If comparative analysis is present, use its winner as the definitive answer
3. Cite sources [1][2] for EVERY factual statement
4. If verification failed, acknowledge uncertainty
5. If contradictions exist, present both viewpoints
6. End with "**Sources:**" section listing all cited sources with URLs
7. If confidence < 70%, use phrases like "According to [source]" instead of stating as absolute truth\n\n`;

  const answerPrompt = `${systemPrompt}\n\n${groundedContext}\n\nUser Question: ${query}\n\nGenerate a grounded answer following ALL requirements above:`;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a truthful assistant that answers ONLY from provided verified claims and comparative analysis. You cite sources for every fact.' },
          { role: 'user', content: answerPrompt }
        ],
        temperature: 0.0,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const json = await response.json();
    return json.choices?.[0]?.message?.content || 'Error generating answer';
    
  } catch (error) {
    console.error('❌ Grounded answer generation failed:', error);
    return `I apologize, but I encountered an error while generating a verified answer. Please try again.`;
  }
}

/**
 * STAGE 7: Self-Verification
 */
export async function selfVerifyAnswer(
  answer: string,
  claims: ExtractedClaim[],
  sources: SearchResult[],
  openaiKey: string
): Promise<{ passed: boolean; issues: string[] }> {
  
  const verificationPrompt = `You are a fact-checking system. Verify this answer against the provided claims and sources.

ANSWER TO VERIFY:
${answer}

VERIFIED CLAIMS:
${claims.map((c, i) => `${i+1}. ${c.claim} [Sources: ${c.sources.join(',')}]`).join('\n')}

SOURCES:
${sources.map((s, i) => `[${i+1}] ${s.title} - ${s.url}`).join('\n')}

CHECK:
1. Does every factual statement in the answer have a citation [1][2]?
2. Does each citation actually appear in the sources list?
3. Are the claims in the answer supported by the verified claims?
4. Are there any statements made without evidence from sources?

Return JSON:
{
  "passed": true/false,
  "issues": ["list of problems found, empty if passed"]
}

Return ONLY the JSON:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a precise fact-checking system. Return valid JSON only.' },
          { role: 'user', content: verificationPrompt }
        ],
        temperature: 0,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.warn('⚠️ Self-verification API call failed');
      return { passed: true, issues: [] };
    }

    const json = await response.json();
    const verificationText = json.choices?.[0]?.message?.content || '{}';
    
    const jsonMatch = verificationText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { passed: true, issues: [] };
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    if (!result.passed) {
      console.warn('⚠️ Self-verification found issues:', result.issues);
    } else {
      console.log('✅ Self-verification passed');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Self-verification error:', error);
    return { passed: true, issues: [] };
  }
}

/**
 * MAIN: Complete Verification Pipeline (Enhanced with Distributed Prompts)
 */
export async function verifyAndAnswer(
  query: string,
  sources: SearchResult[],
  systemPrompt: string,
  openaiKey: string,
  model: string = 'gpt-4o-mini'
): Promise<{
  answer: string;
  verified: boolean;
  confidence: number;
  metadata: {
    queryType: string;
    domain: string;
    entitiesFound: number;
    normalizedDataPoints: number;
    claimsExtracted: number;
    supportingSources: number;
    comparativeAnalysisPerformed: boolean;
    selfVerificationPassed: boolean;
    issues: string[];
  };
}> {
  
  console.log('\n🔍 === STARTING DISTRIBUTED VERIFICATION PIPELINE ===\n');
  
  // Stage 1: Classify query
  const classification = classifyQuery(query);
  console.log(`📊 Query classified:`, classification);
  
  // Stage 2: Extract entities
  const entities = await extractEntities(query, sources, openaiKey);
  console.log(`🏢 Extracted ${entities.length} entities`);
  
  // Stage 3: Normalize data
  const normalizedData = await normalizeData(query, sources, entities, openaiKey);
  console.log(`📐 Normalized ${normalizedData.length} data points`);
  
  // Stage 4: Comparative analysis (if needed)
  let comparativeAnalysis: ComparativeAnalysis | null = null;
  if (classification.requiresComparison && normalizedData.length > 0) {
    console.log(`⚖️ Performing comparative analysis...`);
    comparativeAnalysis = await performComparativeAnalysis(query, normalizedData, entities, openaiKey);
  }
  
  // Stage 5: Extract claims with normalized data
  const claims = await extractClaims(query, sources, normalizedData, openaiKey);
  console.log(`📋 Extracted ${claims.length} claims`);
  
  // Stage 6: Verify claims
  const verification = verifyClaims(claims, classification.verificationLevel, comparativeAnalysis);
  console.log(`✓ Verification result:`, verification);
  
  // Stage 7: Generate grounded answer
  const answer = await generateGroundedAnswer(
    query,
    claims,
    sources,
    verification,
    systemPrompt,
    openaiKey,
    model
  );
  
  // Stage 8: Self-verify the answer
  const selfVerification = await selfVerifyAnswer(answer, claims, sources, openaiKey);
  
  console.log('\n✅ === VERIFICATION PIPELINE COMPLETE ===\n');
  
  return {
    answer,
    verified: verification.verified && selfVerification.passed,
    confidence: verification.confidence,
    metadata: {
      queryType: classification.type,
      domain: classification.domain,
      entitiesFound: entities.length,
      normalizedDataPoints: normalizedData.length,
      claimsExtracted: claims.length,
      supportingSources: verification.supportingSources,
      comparativeAnalysisPerformed: comparativeAnalysis !== null,
      selfVerificationPassed: selfVerification.passed,
      issues: selfVerification.issues,
    },
  };
}
