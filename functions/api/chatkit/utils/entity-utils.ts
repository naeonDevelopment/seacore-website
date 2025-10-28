/**
 * JEWEL: Entity Extraction & Context Building Utilities
 * Sophisticated entity recognition and context extraction for maritime domain
 */

/**
 * Extract maritime entities from text (vessels, companies, equipment)
 * JEWEL: Comprehensive pattern matching for various entity types
 */
export function extractMaritimeEntities(text: string): string[] {
  const entities: string[] = [];
  
  // Company patterns
  const companyMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Marine|Shipping|Lines|Group|Services))\b/g);
  if (companyMatch) entities.push(...companyMatch);
  
  // Vessel patterns - IMPROVED
  // Pattern 1: MV/MS/MT prefix
  const prefixVesselMatch = text.match(/\b(?:MV|MS|MT)\s+([A-Z][a-zA-Z0-9\s-]+?)(?:\s+(?:is|was|has|vessel|ship)|[,.]|$)/gi);
  if (prefixVesselMatch) {
    entities.push(...prefixVesselMatch.map(v => v.trim()));
  }
  
  // Pattern 2: Multi-word capitalized names (like "MSC Michel Cappellini")
  const multiWordMatch = text.match(/\b([A-Z]{2,}(?:\s+[A-Z][a-z]+){1,3})\b/g);
  if (multiWordMatch) {
    entities.push(...multiWordMatch);
  }
  
  // Pattern 2b: Capitalized multi-word vessel names (like "Castillo de Merida", "Ever Given")
  const mixedCaseVesselMatch = text.match(/\b([A-Z][a-z]+(?:\s+(?:de|of|the|van|von|del|della|di)\s+[A-Z][a-z]+|\s+[A-Z][a-z]+){1,3})\b/g);
  if (mixedCaseVesselMatch) {
    entities.push(...mixedCaseVesselMatch);
  }
  
  // Pattern 3: "vessel [Name]" or "ship [Name]"
  const namedVesselMatch = text.match(/\b(?:vessel|ship)\s+([A-Z][a-zA-Z0-9\s-]+?)(?:\s+(?:is|was|has)|[,.]|$)/gi);
  if (namedVesselMatch) {
    entities.push(...namedVesselMatch.map(v => v.replace(/^(?:vessel|ship)\s+/i, '').trim()));
  }
  
  // Equipment models (alphanumeric patterns)
  const equipmentMatch = text.match(/\b([A-Z][a-z]+\s+\d+[A-Z0-9-]+)\b/g);
  if (equipmentMatch) entities.push(...equipmentMatch);
  
  // Pattern 4: Vessel names with numbers (case-insensitive) - "dynamic 17", "ever given", etc.
  const vesselWithNumberMatch = text.match(/\b([a-z]+(?:\s+[a-z]+)*\s+\d+)\b/gi);
  if (vesselWithNumberMatch) {
    // Capitalize each word for consistency
    entities.push(...vesselWithNumberMatch.map(v => 
      v.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
    ));
  }
  
  return [...new Set(entities)];
}

/**
 * JEWEL: Extract rich entity context from answer text
 * Identifies entity type (vessel, company, equipment, regulation) and extracts:
 * - IMO numbers, vessel types, operators/owners
 * - Company context and operations
 * - Equipment specifications
 * - Regulatory requirements
 */
export function extractEntityContextFromAnswer(answer: string, entityName: string): Record<string, any> {
  const context: Record<string, any> = {
    name: entityName,
    mentionedAt: Date.now(),
  };
  
  // Build a focused section around the entity name
  const entityPattern = new RegExp(`${entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*?[.!?]`, 'gi');
  const entityMentions = answer.match(entityPattern);
  
  if (entityMentions && entityMentions.length > 0) {
    // Store the most relevant context snippet (first 2 sentences mentioning entity)
    context.contextSnippet = entityMentions.slice(0, 2).join(' ').substring(0, 300);
  }
  
  // VESSEL-SPECIFIC: Extract IMO, type, specs
  const imoMatch = answer.match(/IMO[:\s]+(\d{7})/i);
  if (imoMatch) {
    context.imo = imoMatch[1];
    context.entityType = 'vessel';
  }
  
  const vesselTypePatterns = [
    /(container ship|tanker|bulk carrier|crew boat|supply vessel|high-speed craft|offshore vessel|cargo ship|research vessel|fishing vessel)/i
  ];
  for (const pattern of vesselTypePatterns) {
    const match = answer.match(pattern);
    if (match) {
      context.vesselType = match[1].trim();
      context.entityType = 'vessel';
      break;
    }
  }
  
  // COMPANY-SPECIFIC: Detect if it's a company
  if (/\b(company|corporation|group|lines|shipping|marine|maritime|services|operator)\b/i.test(answer)) {
    const companyContext = answer.match(new RegExp(`${entityName}[^.]*?(?:is|operates|specializes|provides)[^.]*?[.]`, 'i'));
    if (companyContext) {
      context.entityType = context.entityType || 'company';
      context.companyContext = companyContext[0].substring(0, 200);
    }
  }
  
  // EQUIPMENT-SPECIFIC: Detect equipment/systems
  if (/\b(engine|system|equipment|machinery|component|device|sensor|pump|valve|generator)\b/i.test(answer)) {
    const equipmentContext = answer.match(new RegExp(`${entityName}[^.]*?(?:specification|model|capacity|power|type)[^.]*?[.]`, 'i'));
    if (equipmentContext) {
      context.entityType = context.entityType || 'equipment';
      context.equipmentContext = equipmentContext[0].substring(0, 200);
    }
  }
  
  // REGULATION-SPECIFIC: Detect regulations/standards
  if (/\b(regulation|standard|requirement|compliance|SOLAS|MARPOL|ISM|code|convention)\b/i.test(answer)) {
    const regulationContext = answer.match(new RegExp(`${entityName}[^.]*?(?:requires|mandates|specifies|states)[^.]*?[.]`, 'i'));
    if (regulationContext) {
      context.entityType = context.entityType || 'regulation';
      context.regulationContext = regulationContext[0].substring(0, 200);
    }
  }
  
  // Extract any key-value pairs near the entity
  const specs: Record<string, string> = {};
  
  // Year
  const yearMatch = answer.match(new RegExp(`${entityName}[^.]*?(?:built|established|founded|year)[^.]*?(\\d{4})`, 'i'));
  if (yearMatch) specs.year = yearMatch[1];
  
  // Location/Flag
  const locationMatch = answer.match(new RegExp(`${entityName}[^.]*?(?:flag|based|located|registered)[^.]*?in ([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'i'));
  if (locationMatch) specs.location = locationMatch[1];
  
  if (Object.keys(specs).length > 0) {
    context.specs = specs;
  }
  
  // CRITICAL: Extract operator/owner information (for vessels)
  const operatorPatterns = [
    /(?:operated|owned|managed|chartered)\s+(?:by|under)\s+([A-Z][A-Za-z\s&.,-]+?)(?:\s+(?:and|,|\.|;|$))/i,
    /operator[:\s]+([A-Z][A-Za-z\s&.,-]+?)(?:\s+(?:and|,|\.|;|$))/i,
    /owner[:\s]+([A-Z][A-Za-z\s&.,-]+?)(?:\s+(?:and|,|\.|;|$))/i
  ];
  
  for (const pattern of operatorPatterns) {
    const operatorMatch = answer.match(pattern);
    if (operatorMatch) {
      context.operator = operatorMatch[1].trim();
      break;
    }
  }
  
  // Also check for management company mentions
  const managementMatch = answer.match(/management[:\s]+([A-Z][A-Za-z\s&.,-]+?)(?:\s+(?:and|,|\.|;|$))/i);
  if (managementMatch && !context.operator) {
    context.operator = managementMatch[1].trim();
  }
  
  return context;
}

/**
 * JEWEL: Build rich entity context from accumulated knowledge
 * Creates detailed context string with vessel/company details for tools
 */
export function buildRichEntityContext(
  vesselEntities: Record<string, any>,
  companyEntities: Record<string, any>
): string {
  const vesselList = Object.values(vesselEntities);
  const companyList = Object.values(companyEntities);
  
  if (vesselList.length === 0 && companyList.length === 0) {
    return '';
  }
  
  const contextParts: string[] = [];
  
  // Add vessel details with ALL available information
  if (vesselList.length > 0) {
    contextParts.push(`PREVIOUSLY DISCUSSED VESSELS:`);
    vesselList.forEach((vessel: any) => {
      const details: string[] = [`${vessel.name}`];
      if (vessel.type) details.push(`Type: ${vessel.type}`);
      if (vessel.imo) details.push(`IMO: ${vessel.imo}`);
      if (vessel.operator) details.push(`Operator: ${vessel.operator}`);
      if (vessel.specs && Object.keys(vessel.specs).length > 0) {
        details.push(`Specs: ${JSON.stringify(vessel.specs).substring(0, 200)}`);
      }
      contextParts.push(`- ${details.join(' | ')}`);
    });
  }
  
  // Add company details
  if (companyList.length > 0) {
    contextParts.push(`\nPREVIOUSLY DISCUSSED COMPANIES:`);
    companyList.forEach((company: any) => {
      const details: string[] = [`${company.name}`];
      if (company.companyContext) {
        details.push(company.companyContext.substring(0, 150));
      }
      contextParts.push(`- ${details.join(' | ')}`);
    });
  }
  
  return contextParts.join('\n');
}

/**
 * Check if query is a follow-up (uses pronouns or references to previous entities)
 */
export function isFollowUpQuery(query: string, previousEntities: string[]): boolean {
  if (previousEntities.length === 0) return false;
  
  const followUpPatterns = [
    /\b(it|its|their|them|this|that|these|those)\b/i,
    /\b(give me|tell me|what about|how about|also)\b/i,
    /^(and|but|or|so)\b/i,
  ];
  
  return followUpPatterns.some(pattern => pattern.test(query));
}

