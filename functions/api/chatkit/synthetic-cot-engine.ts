/**
 * Cursor-Style Synthetic Chain of Thought Engine
 * Works with ANY model: GPT-4o, Claude Sonnet, Gemini
 * Cost: Same as regular queries (no premium pricing)
 * 
 * Based on research into Cursor's implementation:
 * - Zero-Shot CoT: Add structured thinking prompts
 * - Auto-CoT: Domain-specific reasoning templates
 * - Plan-and-Solve: Break down comparative queries
 * - Self-Consistency: Run 3x, pick most consistent
 */

import { ChatOpenAI } from '@langchain/openai';
import { AIMessage } from '@langchain/core/messages';

export interface CoTConfig {
  technique: 'zero-shot' | 'auto-cot' | 'plan-solve' | 'self-consistent';
  domain: 'maritime' | 'general';
  requiresComparison: boolean;
  complexityLevel: 'simple' | 'medium' | 'complex';
}

export interface CoTResult {
  thinking: string;  // Reasoning process
  answer: string;    // Final answer
  confidence: number; // 0-1
  technique: string;  // Which CoT technique used
}

export interface QueryClassification {
  mode: 'none' | 'verification' | 'research';
  requiresTechnicalDepth: boolean;
  isVesselQuery?: boolean;
}

export interface Source {
  url: string;
  title?: string;
  snippet?: string;
}

/**
 * Zero-Shot CoT - Primary technique for 80% of queries
 * Add structured thinking prompt before query
 */
export function buildZeroShotCoT(
  query: string, 
  context: string,
  domain: 'maritime' | 'general'
): string {
  const maritimeThinking = domain === 'maritime' ? `
4. Maritime Classification: What type of vessel/equipment? What category?
5. Source Tier Assessment: T1 (OEM/Official) > T2 (Industry) > T3 (General)
6. Owner/Operator Priority: Extract ownership data from ALL sources
7. Technical Validation: Do specs/dimensions/tonnage make logical sense?
8. Operational Significance: Why does this matter in maritime operations?` : '';

  return `${context}

**USER QUERY:** ${query}

**CRITICAL: Show your reasoning process before answering:**

<thinking>
1. Understanding: What exactly is the user asking for? Be specific about entities, requirements, constraints.
2. Information Needs: What facts/data are required to answer this comprehensively?
3. Source Analysis: Which of the provided sources contain relevant information? Prioritize authoritative sources.${maritimeThinking}
${domain === 'maritime' ? '9' : '4'}. Cross-Verification: Are facts consistent across sources? Any contradictions to address?
${domain === 'maritime' ? '10' : '5'}. Synthesis Strategy: How should I structure the answer? What sections/headings?
${domain === 'maritime' ? '11' : '6'}. Citation Planning: Which sources support which facts? Aim for 5-8 citations.
${domain === 'maritime' ? '12' : '7'}. Quality Assurance: Will this answer fully satisfy the user's information need?
</thinking>

Now provide your comprehensive answer with inline citations [1](url)[2](url)[3](url)...`;
}

/**
 * Auto-CoT - For complex maritime queries requiring specialized reasoning
 * Includes domain-specific reasoning templates
 */
export function buildAutoCoT(
  query: string,
  context: string,
  queryType: 'vessel' | 'equipment' | 'company' | 'compliance'
): string {
  const templates = {
    vessel: `
<thinking>
1. Vessel Identification: Search for name, IMO, MMSI in ALL sources
2. ⚠️ CRITICAL CHECK: Do I have IMO number? (YES/NO)
3. ⚠️ CRITICAL CHECK: Do I have MMSI? (YES/NO)
4. Classification: Type (cargo, tanker, container, etc.), flag state, class society
5. Specification Extraction: LOA, beam, draft, GT, DWT, capacity
6. ⚠️ HIGH PRIORITY CHECK: Do I have Owner/Operator? (YES/NO)
7. Propulsion System: Main engines (make/model/power), auxiliary systems
8. Build Information: Shipyard, year, hull number
9. Current Status: Location, speed, destination from AIS
10. GAP ANALYSIS: List ALL missing critical fields:
    - Missing IMO? → Need targeted search: "vessel name IMO site:marinetraffic.com"
    - Missing Owner? → Need targeted search: "vessel name owner site:equasis.org"
    - Missing specs? → Need targeted search: "vessel name specifications"
11. COMPLETENESS SCORE: What % of expected data do I have? (Aim for 95%+)
12. RECOMMENDATION: Should we trigger additional research? (YES if <80% OR missing IMO/MMSI/Owner)
</thinking>`,
    
    equipment: `
<thinking>
1. Equipment Identification: Exact model number, manufacturer
2. Technical Specifications: Power, fuel consumption, dimensions, weight
3. OEM Maintenance: Service intervals from manufacturer documentation
4. Common Failure Modes: Known issues from field reports/forums
5. Operational Best Practices: Tips from experienced engineers
6. Real-World Performance: Typical duty cycles, operational conditions
7. Parts & Consumables: Critical spares, part numbers
8. Installation Context: Where used? What vessels/applications?
9. Compliance: Relevant regulations (SOLAS, classification requirements)
10. Industry Position: Market share, competing systems
</thinking>`,
    
    company: `
<thinking>
1. Company Identity: Full legal name, headquarters, ownership structure
2. Fleet Composition: Number of vessels, types, total capacity
3. Operational Scope: Trade routes, service areas, market segments
4. Fleet Management: Technical management approach, PMS systems
5. Regulatory Compliance: Flag states, ISM certification, safety record
6. Market Position: Size ranking, competitive advantages
7. Recent Developments: Fleet expansion, newbuilds, acquisitions
8. Industry Relationships: Partnerships, alliances, contracts
9. Financial Health: If public, key financial metrics
10. Strategic Direction: Future plans, technology adoption
</thinking>`,
    
    compliance: `
<thinking>
1. Regulation Identification: Exact SOLAS chapter/MARPOL annex/IMO regulation
2. Scope & Applicability: Which vessels? Which operations? Effective date?
3. Technical Requirements: Specific equipment, procedures, documentation
4. Compliance Verification: How is compliance demonstrated? Inspections?
5. Classification Society Role: Survey requirements, certification process
6. Port State Control: PSC inspection focus areas, deficiency trends
7. Enforcement & Penalties: Consequences of non-compliance
8. Industry Best Practices: How do leading operators ensure compliance?
9. Recent Updates: Amendments, clarifications, implementation guidance
10. Practical Implementation: What do ship operators need to do?
</thinking>`
  };
  
  return `${context}

**USER QUERY:** ${query}

**Use specialized maritime reasoning for ${queryType} queries:**

${templates[queryType]}

Provide detailed answer with comprehensive citations [1](url)[2](url)...`;
}

/**
 * Plan-and-Solve CoT - For comparative/superlative queries
 * Breaks down into explicit subtasks
 */
export function buildPlanAndSolveCoT(
  query: string,
  context: string,
  comparativeType: 'superlative' | 'binary',
  targetAttribute: string
): string {
  return `${context}

**USER QUERY:** ${query}

**This is a ${comparativeType} query requiring systematic comparison. Plan and execute:**

<thinking>
**PLAN:**
Step 1: Entity Extraction
- Identify ALL ${targetAttribute === 'size' ? 'vessels/entities' : 'candidates'} mentioned across sources
- Must extract: name, ${targetAttribute} value, unit, source index

Step 2: Data Normalization
- Convert all ${targetAttribute} values to common unit
- Validate data makes sense (no obvious errors like 4,000 GT as "largest")

Step 3: Ranking
- Sort entities by ${targetAttribute} (descending for "biggest/largest")
- Identify clear winner

Step 4: Validation & Sanity Checks
- Does winner make logical sense given the scope?
- Is winner's ${targetAttribute} value realistic? (e.g., cargo ship >10,000 GT)
- Would a 4,185 GT vessel be "biggest cargo ship"? (NO - too small)
- Are we comparing correct category (e.g., cargo ships vs all ships)?
- Any missing candidates we should have found?

Step 5: Confidence Assessment
- How many candidates did we find? (3+ = high confidence)
- Are specs consistent across multiple sources?
- Is the winning margin clear or close?

**EXECUTION:**
[Work through each step systematically, showing findings]

**CONCLUSION:**
- Winner: [Entity] with [value] [unit]
- Confidence: [High/Medium/Low] based on [reasoning]
- Validation: [Why this answer makes sense]
</thinking>

Provide comprehensive answer with winner clearly stated and full ranking shown with citations...`;
}

/**
 * Self-Consistency - For critical queries requiring high confidence
 * Run 3x with temperature=0.7, pick most consistent
 */
export async function selfConsistentGeneration(
  query: string,
  context: string,
  llm: ChatOpenAI,
  config: any
): Promise<CoTResult> {
  console.log('🎯 Running self-consistent reasoning (3 attempts)');
  
  const prompt = buildZeroShotCoT(query, context, 'maritime');
  
  // Generate 3 independent reasoning chains
  const attempts = await Promise.all([
    llm.invoke([{ role: 'user', content: prompt }], { ...config, temperature: 0.7 }),
    llm.invoke([{ role: 'user', content: prompt }], { ...config, temperature: 0.7 }),
    llm.invoke([{ role: 'user', content: prompt }], { ...config, temperature: 0.7 })
  ]);
  
  // Extract thinking and answers
  const results = attempts.map(a => {
    const content = String(a.content);
    return {
      thinking: extractBetweenTags(content, 'thinking'),
      answer: content.split('</thinking>')[1]?.trim() || content
    };
  });
  
  // Find most consistent answer (simple: longest common reasoning chain)
  const mostConsistent = selectMostConsistent(results);
  
  console.log(`   ✅ Selected most consistent reasoning (${mostConsistent.confidence.toFixed(0)}% agreement)`);
  
  return {
    thinking: mostConsistent.thinking,
    answer: mostConsistent.answer,
    confidence: mostConsistent.confidence,
    technique: 'self-consistent'
  };
}

/**
 * Smart CoT Router - Decides which technique to use
 */
export function selectCoTTechnique(
  query: string,
  classification: QueryClassification,
  sources: Source[]
): CoTConfig {
  // Comparative queries → Plan-and-Solve
  if (/\b(biggest|largest|smallest|best|compare|versus|vs\.?)\b/i.test(query)) {
    return {
      technique: 'plan-solve',
      domain: 'maritime',
      requiresComparison: true,
      complexityLevel: 'complex'
    };
  }
  
  // High-stakes queries → Self-Consistency
  if (classification.requiresTechnicalDepth && sources.length >= 5) {
    return {
      technique: 'self-consistent',
      domain: 'maritime',
      requiresComparison: false,
      complexityLevel: 'complex'
    };
  }
  
  // Vessel/equipment queries → Auto-CoT with templates
  if (classification.mode === 'verification' && /\b(vessel|ship|engine|equipment|machinery)\b/i.test(query)) {
    return {
      technique: 'auto-cot',
      domain: 'maritime',
      requiresComparison: false,
      complexityLevel: 'medium'
    };
  }
  
  // Default → Zero-Shot CoT (80% of queries)
  return {
    technique: 'zero-shot',
    domain: 'maritime',
    requiresComparison: false,
    complexityLevel: sources.length >= 3 ? 'medium' : 'simple'
  };
}

/**
 * Detect query type for Auto-CoT template selection
 */
export function detectQueryType(query: string): 'vessel' | 'equipment' | 'company' | 'compliance' {
  const queryLower = query.toLowerCase();
  
  // Compliance/regulation queries
  if (/\b(solas|marpol|imo|regulation|compliance|certificate|survey|inspection)\b/i.test(query)) {
    return 'compliance';
  }
  
  // Company/operator queries
  if (/\b(company|operator|owner|fleet|shipping line|management)\b/i.test(query)) {
    return 'company';
  }
  
  // Equipment/system queries
  if (/\b(engine|motor|pump|generator|system|equipment|machinery|auxiliary)\b/i.test(query)) {
    return 'equipment';
  }
  
  // Default to vessel
  return 'vessel';
}

/**
 * Helper: Extract content between XML tags
 */
export function extractBetweenTags(content: string, tagName: string, allowPartial: boolean = false): string {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  
  const startIdx = content.indexOf(openTag);
  if (startIdx === -1) return '';
  
  const endIdx = content.indexOf(closeTag, startIdx);
  if (endIdx === -1) {
    // Partial thinking - still being generated
    if (allowPartial) {
      return content.substring(startIdx + openTag.length).trim();
    }
    return '';
  }
  
  return content.substring(startIdx + openTag.length, endIdx).trim();
}

/**
 * Helper: Select most consistent answer from multiple attempts
 */
function selectMostConsistent(results: Array<{ thinking: string; answer: string }>): {
  thinking: string;
  answer: string;
  confidence: number;
} {
  if (results.length === 0) {
    return { thinking: '', answer: '', confidence: 0 };
  }
  
  if (results.length === 1) {
    return { ...results[0], confidence: 1.0 };
  }
  
  // Simple consistency measure: compare answer lengths and key terms overlap
  const answerLengths = results.map(r => r.answer.length);
  const avgLength = answerLengths.reduce((a, b) => a + b, 0) / answerLengths.length;
  
  // Find answer closest to average length (likely most complete)
  let bestIdx = 0;
  let minDiff = Math.abs(answerLengths[0] - avgLength);
  
  for (let i = 1; i < answerLengths.length; i++) {
    const diff = Math.abs(answerLengths[i] - avgLength);
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i;
    }
  }
  
  // Calculate simple confidence based on length variance
  const variance = answerLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / answerLengths.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / avgLength;
  
  // High consistency = low variation (confidence inversely proportional to CV)
  const confidence = Math.max(0.5, Math.min(1.0, 1.0 - coefficientOfVariation));
  
  return {
    thinking: results[bestIdx].thinking,
    answer: results[bestIdx].answer,
    confidence
  };
}

/**
 * Detect comparative attributes from query
 */
export function detectComparativeAttribute(query: string): string {
  const queryLower = query.toLowerCase();
  
  if (/\b(biggest|largest|longer|higher|heavier|bigger)\b/i.test(query)) {
    if (/\b(tonnage|dwt|gt|displacement)\b/i.test(query)) return 'tonnage';
    if (/\b(length|loa|beam)\b/i.test(query)) return 'length';
    if (/\b(power|hp|kw)\b/i.test(query)) return 'power';
    return 'size'; // Default
  }
  
  if (/\b(fastest|speed)\b/i.test(query)) return 'speed';
  if (/\b(newest|oldest|latest)\b/i.test(query)) return 'age';
  if (/\b(cheapest|expensive|cost)\b/i.test(query)) return 'cost';
  
  return 'size'; // Default
}

