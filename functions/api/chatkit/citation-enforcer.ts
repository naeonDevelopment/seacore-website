/**
 * PHASE 4: Citation Enforcement Post-Processor
 * 
 * Ensures inline citations are present in verification-mode answers.
 * If GPT-4o forgets to add citations, this injects them automatically.
 * 
 * Rules:
 * - Minimum citations: min(3, sources.length)
 * - Only inject if current count < threshold
 * - Target factual statements (numbers, names, technical terms)
 * - Use [[N]](url) format for consistency
 */

export interface Source {
  title: string;
  url: string;
  content: string;
  score?: number;
  tier?: 'T1' | 'T2' | 'T3';
}

export interface CitationEnforcementResult {
  originalContent: string;
  enforcedContent: string;
  citationsAdded: number;
  citationsFound: number;
  citationsRequired: number;
  wasEnforced: boolean;
  diagnostics: {
    originalCitationCount: number;
    targetCitationCount: number;
    factualStatementsFound: number;
    injectionsPerformed: number;
  };
}

/**
 * Main citation enforcement function
 * Analyzes content and injects citations if needed
 */
export function enforceCitations(
  content: string,
  sources: Source[],
  options?: { technicalDepth?: boolean; minRequired?: number }
): CitationEnforcementResult {
  
  // Count existing citations
  const existingCitations = countCitations(content);
  const baseMin = options?.minRequired !== undefined
    ? options.minRequired
    : (options?.technicalDepth ? 5 : 3);
  const minRequired = Math.min(baseMin, sources.length);
  
  console.log(`\n📎 CITATION ENFORCEMENT:`);
  console.log(`   Existing: ${existingCitations}, Required: ${minRequired}, Sources: ${sources.length}`);
  
  // If we have enough citations, return as-is
  if (existingCitations >= minRequired) {
    console.log(`   ✅ Citation count sufficient (${existingCitations}/${minRequired})`);
    return {
      originalContent: content,
      enforcedContent: content,
      citationsAdded: 0,
      citationsFound: existingCitations,
      citationsRequired: minRequired,
      wasEnforced: false,
      diagnostics: {
        originalCitationCount: existingCitations,
        targetCitationCount: minRequired,
        factualStatementsFound: 0,
        injectionsPerformed: 0
      }
    };
  }
  
  // Need to inject citations
  console.log(`   ⚠️ Insufficient citations - injecting...`);
  
  const result = injectCitations(content, sources, minRequired - existingCitations);
  
  return {
    originalContent: content,
    enforcedContent: result.content,
    citationsAdded: result.injected,
    citationsFound: existingCitations,
    citationsRequired: minRequired,
    wasEnforced: true,
    diagnostics: {
      originalCitationCount: existingCitations,
      targetCitationCount: minRequired,
      factualStatementsFound: result.factualStatements,
      injectionsPerformed: result.injected
    }
  };
}

/**
 * Count existing inline citations in content
 * Matches: [1], [2], [[1]], [[2]](url), etc.
 */
function countCitations(content: string): number {
  // Match both [N] and [[N]](url) formats
  const matches = content.match(/\[\[?\d+\]?\](?:\([^)]+\))?/g);
  return matches ? matches.length : 0;
}

/**
 * Inject citations into factual statements
 * Targets: numbers, vessel names, company names, technical specs
 */
function injectCitations(
  content: string,
  sources: Source[],
  needed: number
): { content: string; injected: number; factualStatements: number } {
  
  // Find factual statements that need citations
  const statements = findFactualStatements(content);
  
  console.log(`   📊 Found ${statements.length} factual statements to cite`);
  
  if (statements.length === 0) {
    // No factual statements found - inject at paragraph ends instead
    return injectAtParagraphEnds(content, sources, needed);
  }
  
  // Sort statements by position (reverse order for correct indexing during insertion)
  const sortedStatements = statements.sort((a, b) => b.position - a.position);
  
  let modifiedContent = content;
  let injected = 0;
  
  // Inject citations at top N factual statements
  for (let i = 0; i < Math.min(needed, sortedStatements.length); i++) {
    const statement = sortedStatements[i];
    const sourceIndex = i % sources.length; // Cycle through sources
    const source = sources[sourceIndex];
    
    // Insert citation after the statement
    const citation = `[[${sourceIndex + 1}]](${source.url})`;
    const insertPos = statement.position + statement.text.length;
    
    modifiedContent = 
      modifiedContent.slice(0, insertPos) +
      citation +
      modifiedContent.slice(insertPos);
    
    injected++;
    console.log(`   ✓ Injected citation ${sourceIndex + 1} after: "${statement.text.slice(0, 50)}..."`);
  }
  
  return {
    content: modifiedContent,
    injected,
    factualStatements: statements.length
  };
}

/**
 * Fallback: inject citations at paragraph ends if no factual statements found
 */
function injectAtParagraphEnds(
  content: string,
  sources: Source[],
  needed: number
): { content: string; injected: number; factualStatements: number } {
  
  console.log(`   ⚠️ No factual statements - injecting at paragraph ends`);
  
  // Split into paragraphs
  const paragraphs = content.split(/\n\n+/);
  
  if (paragraphs.length === 0) return { content, injected: 0, factualStatements: 0 };
  
  let injected = 0;
  
  // Inject at first N paragraph ends
  for (let i = 0; i < Math.min(needed, paragraphs.length); i++) {
    const sourceIndex = i % sources.length;
    const source = sources[sourceIndex];
    const citation = ` [[${sourceIndex + 1}]](${source.url})`;
    
    paragraphs[i] = paragraphs[i].trimEnd() + citation;
    injected++;
  }
  
  return {
    content: paragraphs.join('\n\n'),
    injected,
    factualStatements: 0
  };
}

/**
 * Find factual statements in content
 * Targets: numbers, vessel names, IMO numbers, dates, technical specs
 */
interface FactualStatement {
  text: string;
  position: number;
  type: 'number' | 'vessel' | 'company' | 'technical' | 'date';
}

function findFactualStatements(content: string): FactualStatement[] {
  const statements: FactualStatement[] = [];
  
  // Pattern 1: Sentences with numbers (technical specs, dimensions, years)
  // Example: "The vessel is 250 meters long"
  const numberPattern = /[^.!?]*\b\d+[,\d]*\.?\d*\s*(?:meters?|tonnes?|MW|kW|TEU|DWT|GT|knots?|years?|crew|passengers?)\b[^.!?]*/gi;
  let match;
  while ((match = numberPattern.exec(content)) !== null) {
    statements.push({
      text: match[0].trim(),
      position: match.index,
      type: 'number'
    });
  }
  
  // Pattern 2: Sentences with IMO numbers
  // Example: "IMO 9876543"
  const imoPattern = /[^.!?]*\bIMO\s*:?\s*\d{7}\b[^.!?]*/gi;
  while ((match = imoPattern.exec(content)) !== null) {
    statements.push({
      text: match[0].trim(),
      position: match.index,
      type: 'vessel'
    });
  }
  
  // Pattern 3: Sentences with vessel type classifications
  // Example: "classified as a Panamax bulk carrier"
  const vesselTypePattern = /[^.!?]*\b(?:classified|type|class|category)\s+(?:as|is)\s+(?:a|an)\s+[A-Z][a-z]+\s+(?:vessel|ship|carrier|tanker|bulk|container)\b[^.!?]*/gi;
  while ((match = vesselTypePattern.exec(content)) !== null) {
    statements.push({
      text: match[0].trim(),
      position: match.index,
      type: 'technical'
    });
  }
  
  // Pattern 4: Sentences with company/operator names (proper nouns + "operates"/"owns"/"manages")
  // Example: "operated by Maersk Line"
  const operatorPattern = /[^.!?]*\b(?:operated|owned|managed|chartered)\s+by\s+[A-Z][A-Za-z\s&]+(?:Ltd|Inc|LLC|Limited|Line|Shipping|Maritime)?\b[^.!?]*/gi;
  while ((match = operatorPattern.exec(content)) !== null) {
    statements.push({
      text: match[0].trim(),
      position: match.index,
      type: 'company'
    });
  }
  
  // Pattern 5: Sentences with dates and events
  // Example: "delivered in March 2020"
  const datePattern = /[^.!?]*\b(?:delivered|built|commissioned|launched|registered)\s+(?:in|on)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b[^.!?]*/gi;
  while ((match = datePattern.exec(content)) !== null) {
    statements.push({
      text: match[0].trim(),
      position: match.index,
      type: 'date'
    });
  }
  
  // Deduplicate overlapping statements (keep longest)
  const deduplicated = deduplicateStatements(statements);
  
  return deduplicated.slice(0, 10); // Limit to top 10 candidates
}

/**
 * Remove overlapping statements, keeping the longest one
 */
function deduplicateStatements(statements: FactualStatement[]): FactualStatement[] {
  if (statements.length === 0) return [];
  
  // Sort by position
  const sorted = statements.sort((a, b) => a.position - b.position);
  
  const result: FactualStatement[] = [];
  let lastEnd = -1;
  
  for (const statement of sorted) {
    const start = statement.position;
    const end = start + statement.text.length;
    
    // If this statement doesn't overlap with the last one, keep it
    if (start >= lastEnd) {
      result.push(statement);
      lastEnd = end;
    } else {
      // Overlapping - keep the longer one
      const lastStatement = result[result.length - 1];
      if (statement.text.length > lastStatement.text.length) {
        result[result.length - 1] = statement;
        lastEnd = end;
      }
    }
  }
  
  return result;
}

/**
 * Validate that citations are well-formed and point to valid sources
 */
export function validateCitations(
  content: string,
  sources: Source[]
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Extract all citation references
  const citationMatches = content.matchAll(/\[\[?(\d+)\]?\](?:\(([^)]+)\))?/g);
  
  for (const match of citationMatches) {
    const index = parseInt(match[1], 10);
    const url = match[2];
    
    // Check if index is within bounds
    if (index < 1 || index > sources.length) {
      errors.push(`Citation [${index}] references source ${index}, but only ${sources.length} sources available`);
    }
    
    // Check if URL matches source (if provided)
    if (url && index >= 1 && index <= sources.length) {
      const expectedUrl = sources[index - 1].url;
      if (url !== expectedUrl) {
        warnings.push(`Citation [${index}] URL mismatch: expected ${expectedUrl}, got ${url}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

