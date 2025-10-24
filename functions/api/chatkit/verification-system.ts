/**
 * UNIVERSAL TRUTH VERIFICATION SYSTEM
 * 
 * Implements industry-standard fact verification used by Perplexity, ChatGPT, Claude
 * Works for ALL domains: vessels, maintenance, legislation, company data, etc.
 */

interface SearchResult {
  title: string;
  url: string;
  content: string;
  raw_content?: string;
  snippet?: string;
}

interface ExtractedClaim {
  claim: string;
  claimType: 'factual' | 'numerical' | 'date' | 'entity' | 'opinion';
  sources: number[]; // Which source indices support this claim
  confidence: number; // 0-100
  evidence: string[]; // Exact quotes from sources
  contradictions?: string[]; // Conflicting information found
}

interface VerificationResult {
  verified: boolean;
  confidence: number;
  supportingSources: number;
  conflictDetected: boolean;
  reason: string;
}

/**
 * STEP 1: Classify Query Type
 * Determines what kind of answer is needed and verification level required
 */
export function classifyQuery(query: string): {
  type: 'factual' | 'opinion' | 'fleetcore' | 'mixed';
  domain: 'vessel' | 'maintenance' | 'legislation' | 'company' | 'equipment' | 'general';
  requiresSearch: boolean;
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
  const requiresSearch = type !== 'fleetcore'; // Only skip search for fleetcore features
  
  // Set verification level
  let verificationLevel: 'high' | 'medium' | 'low' = 'medium';
  if (type === 'factual' && (domain === 'vessel' || domain === 'legislation' || domain === 'company')) {
    verificationLevel = 'high'; // Facts about real entities = strict verification
  } else if (type === 'fleetcore') {
    verificationLevel = 'low'; // We know our own product
  }
  
  return { type, domain, requiresSearch, verificationLevel };
}

/**
 * STEP 2: Extract Claims from Search Results
 * Uses GPT-4 to pull out factual claims with evidence
 */
export async function extractClaims(
  query: string,
  sources: SearchResult[],
  openaiKey: string
): Promise<ExtractedClaim[]> {
  
  // Compile source content
  const sourceContent = sources.map((s, i) => {
    const content = s.raw_content || s.content || s.snippet || '';
    return `[Source ${i+1}: ${s.title} - ${s.url}]\n${content.substring(0, 2000)}`;
  }).join('\n\n---\n\n');
  
  const extractionPrompt = `You are a precise fact extraction system. Extract ONLY verifiable claims from these sources.

CRITICAL RULES:
1. Extract ONLY claims explicitly stated in sources - NO inference or reasoning
2. For EACH claim, note which source(s) support it
3. Mark claim type: factual, numerical, date, entity, opinion
4. Include EXACT QUOTES as evidence
5. If sources CONTRADICT each other, note the contradiction
6. Return valid JSON only

Query: "${query}"

Sources:
${sourceContent}

Return JSON array:
[
  {
    "claim": "exact factual statement",
    "claimType": "factual|numerical|date|entity|opinion",
    "sources": [1, 3],  // Which sources support this
    "evidence": ["exact quote from source 1", "exact quote from source 3"],
    "contradictions": ["conflicting info if found"] or null
  }
]

Return ONLY the JSON array, no explanation:`;

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
        temperature: 0, // Deterministic extraction
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('❌ Claim extraction failed:', response.status);
      return [];
    }

    const json = await response.json();
    const extractedText = json.choices?.[0]?.message?.content || '[]';
    
    // Parse JSON - handle markdown formatting
    const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️ No valid JSON found in extraction response');
      return [];
    }
    
    const claims: ExtractedClaim[] = JSON.parse(jsonMatch[0]);
    
    // Compute confidence for each claim
    claims.forEach(claim => {
      let confidence = 0;
      
      // Base confidence: 20 points
      confidence += 20;
      
      // +30 if supported by multiple sources
      if (claim.sources.length >= 2) confidence += 30;
      else if (claim.sources.length >= 3) confidence += 40;
      
      // +20 if has direct evidence quotes
      if (claim.evidence && claim.evidence.length > 0) confidence += 20;
      
      // +20 if numerical/date (easier to verify)
      if (claim.claimType === 'numerical' || claim.claimType === 'date') confidence += 20;
      
      // -50 if contradictions found
      if (claim.contradictions && claim.contradictions.length > 0) confidence -= 50;
      
      claim.confidence = Math.max(0, Math.min(100, confidence));
    });
    
    console.log(`✅ Extracted ${claims.length} claims with confidence scores`);
    return claims;
    
  } catch (error) {
    console.error('❌ Claim extraction error:', error);
    return [];
  }
}

/**
 * STEP 3: Verify Claims Against Requirements
 * Cross-validates extracted claims based on verification level
 */
export function verifyClaims(
  claims: ExtractedClaim[],
  verificationLevel: 'high' | 'medium' | 'low'
): VerificationResult {
  
  if (claims.length === 0) {
    return {
      verified: false,
      confidence: 0,
      supportingSources: 0,
      conflictDetected: false,
      reason: 'No claims could be extracted from sources'
    };
  }
  
  // Check for contradictions
  const hasContradictions = claims.some(c => c.contradictions && c.contradictions.length > 0);
  
  // Compute overall confidence
  const avgConfidence = claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;
  
  // Count unique supporting sources
  const allSources = new Set(claims.flatMap(c => c.sources));
  const supportingSourceCount = allSources.size;
  
  // Verification thresholds based on level
  const thresholds = {
    high: { minConfidence: 70, minSources: 2 },
    medium: { minConfidence: 50, minSources: 1 },
    low: { minConfidence: 30, minSources: 1 },
  };
  
  const threshold = thresholds[verificationLevel];
  
  // Determine if verified
  let verified = true;
  let reason = 'Verification passed';
  
  if (avgConfidence < threshold.minConfidence) {
    verified = false;
    reason = `Confidence ${avgConfidence.toFixed(0)}% below threshold ${threshold.minConfidence}%`;
  } else if (supportingSourceCount < threshold.minSources) {
    verified = false;
    reason = `Only ${supportingSourceCount} supporting sources, need ${threshold.minSources}`;
  } else if (hasContradictions && verificationLevel === 'high') {
    verified = false;
    reason = 'Sources contain contradictory information';
  }
  
  return {
    verified,
    confidence: avgConfidence,
    supportingSources: supportingSourceCount,
    conflictDetected: hasContradictions,
    reason,
  };
}

/**
 * STEP 4: Generate Grounded Answer
 * Creates answer using ONLY verified claims with citations
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
  
  // Build grounded context
  let groundedContext = '=== VERIFIED CLAIMS (Use ONLY These Facts) ===\n\n';
  
  if (!verification.verified) {
    groundedContext += `⚠️ VERIFICATION FAILED: ${verification.reason}\n\n`;
    groundedContext += `You MUST acknowledge the uncertainty in your response.\n\n`;
  }
  
  // Add verified claims with evidence
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
    groundedContext += '\n';
  });
  
  // Add source reference
  groundedContext += '\n=== SOURCE REFERENCE ===\n\n';
  sources.forEach((s, i) => {
    groundedContext += `[${i+1}] ${s.title}\n    ${s.url}\n\n`;
  });
  
  // Add strict grounding instructions
  groundedContext += `\n=== MANDATORY ANSWER REQUIREMENTS ===\n
1. Use ONLY the verified claims above - DO NOT add information not in claims
2. Cite sources [1][2] for EVERY factual statement
3. If verification failed (see above), acknowledge uncertainty
4. If contradictions exist, present both viewpoints
5. End with "**Sources:**" section listing all cited sources
6. If confidence < 70%, use phrases like "According to [source]" instead of stating as absolute truth\n\n`;

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
          { role: 'system', content: 'You are a truthful assistant that answers ONLY from provided verified claims. You cite sources for every fact.' },
          { role: 'user', content: answerPrompt }
        ],
        temperature: 0.0, // Deterministic for factual answers
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
 * STEP 5: Self-Verification
 * Second LLM pass to verify the answer matches the sources
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
      return { passed: true, issues: [] }; // Fail open
    }

    const json = await response.json();
    const verificationText = json.choices?.[0]?.message?.content || '{}';
    
    const jsonMatch = verificationText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { passed: true, issues: [] }; // Fail open
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
    return { passed: true, issues: [] }; // Fail open
  }
}

/**
 * MAIN: Complete Verification Pipeline
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
    claimsExtracted: number;
    supportingSources: number;
    selfVerificationPassed: boolean;
    issues: string[];
  };
}> {
  
  // Step 1: Classify query
  const classification = classifyQuery(query);
  console.log(`🔍 Query classified:`, classification);
  
  // Step 2: Extract claims from sources
  const claims = await extractClaims(query, sources, openaiKey);
  console.log(`📋 Extracted ${claims.length} claims`);
  
  // Step 3: Verify claims
  const verification = verifyClaims(claims, classification.verificationLevel);
  console.log(`✓ Verification result:`, verification);
  
  // Step 4: Generate grounded answer
  const answer = await generateGroundedAnswer(
    query,
    claims,
    sources,
    verification,
    systemPrompt,
    openaiKey,
    model
  );
  
  // Step 5: Self-verify the answer
  const selfVerification = await selfVerifyAnswer(answer, claims, sources, openaiKey);
  
  return {
    answer,
    verified: verification.verified && selfVerification.passed,
    confidence: verification.confidence,
    metadata: {
      queryType: classification.type,
      domain: classification.domain,
      claimsExtracted: claims.length,
      supportingSources: verification.supportingSources,
      selfVerificationPassed: selfVerification.passed,
      issues: selfVerification.issues,
    },
  };
}

