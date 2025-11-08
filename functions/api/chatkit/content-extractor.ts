/**
 * Advanced Content Extraction System
 * 
 * Extracts structured data from HTML pages (tables, lists, metadata)
 * Optimized for maritime vessel registry pages (MarineTraffic, VesselFinder, Equasis)
 * 
 * Key Features:
 * - HTML table parsing with field detection
 * - Metadata extraction (JSON-LD, OpenGraph, meta tags)
 * - Smart content truncation (preserves important sections)
 * - Section detection (vessel details, specifications, etc.)
 */

export interface ExtractedContent {
  rawText: string;
  structuredData: Record<string, string>;
  tables: ParsedTable[];
  metadata: PageMetadata;
  importantSections: ContentSection[];
  contentLength: number;
}

export interface ParsedTable {
  rows: TableRow[];
  headers?: string[];
  context?: string; // Text before/after table for context
}

export interface TableRow {
  key: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface PageMetadata {
  title?: string;
  description?: string;
  siteName?: string;
  jsonLd?: any[];
}

export interface ContentSection {
  heading: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Extract structured content with intelligent truncation
 * For vessel queries, preserves tables and important sections
 */
export function extractEnhancedContent(
  rawHtml: string,
  maxLength: number = 3000,
  isVesselQuery: boolean = false
): ExtractedContent {
  
  // Extract structured data first
  const tables = extractTables(rawHtml);
  const metadata = extractMetadata(rawHtml);
  const sections = extractSections(rawHtml);
  
  // Build structured data map from tables
  const structuredData: Record<string, string> = {};
  for (const table of tables) {
    for (const row of table.rows) {
      if (row.confidence === 'high') {
        structuredData[row.key.toLowerCase()] = row.value;
      }
    }
  }
  
  // Smart content selection for vessel queries
  let rawText: string;
  
  if (isVesselQuery) {
    // Priority content: tables + high-priority sections
    const priorityContent = assemblePriorityContent(tables, sections, maxLength);
    rawText = priorityContent;
  } else {
    // Standard truncation
    rawText = stripHtml(rawHtml).substring(0, maxLength);
  }
  
  return {
    rawText,
    structuredData,
    tables,
    metadata,
    importantSections: sections.filter(s => s.priority === 'high'),
    contentLength: rawText.length
  };
}

/**
 * Extract HTML tables and parse into key-value pairs
 * Optimized for vessel registry table formats
 */
function extractTables(html: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  
  // Pattern: <table>...</table>
  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  
  while ((tableMatch = tablePattern.exec(html)) !== null) {
    const tableHtml = tableMatch[1];
    const rows = parseTableRows(tableHtml);
    
    if (rows.length > 0) {
      tables.push({
        rows,
        context: extractTableContext(html, tableMatch.index)
      });
    }
  }
  
  return tables;
}

/**
 * Parse table rows into key-value pairs
 * Handles both <th>/<td> and <td>/<td> formats
 */
function parseTableRows(tableHtml: string): TableRow[] {
  const rows: TableRow[] = [];
  
  // Pattern 1: <tr><th>Key</th><td>Value</td></tr>
  const headerCellPattern = /<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let match;
  
  while ((match = headerCellPattern.exec(tableHtml)) !== null) {
    const key = cleanText(match[1]);
    const value = cleanText(match[2]);
    
    if (key && value && isValidKeyValuePair(key, value)) {
      rows.push({
        key,
        value,
        confidence: 'high'
      });
    }
  }
  
  // Pattern 2: <tr><td>Key</td><td>Value</td></tr>
  const doubleCellPattern = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  
  while ((match = doubleCellPattern.exec(tableHtml)) !== null) {
    const key = cleanText(match[1]);
    const value = cleanText(match[2]);
    
    // Only accept if key looks like a label (contains letters, ends with :, etc.)
    if (key && value && looksLikeLabel(key) && isValidKeyValuePair(key, value)) {
      rows.push({
        key,
        value,
        confidence: 'medium'
      });
    }
  }
  
  return rows;
}

/**
 * Extract context around table (useful for understanding what the table contains)
 */
function extractTableContext(html: string, tableIndex: number): string {
  const contextBefore = html.substring(Math.max(0, tableIndex - 200), tableIndex);
  const headingMatch = contextBefore.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
  
  if (headingMatch) {
    return cleanText(headingMatch[1]);
  }
  
  return '';
}

/**
 * Extract page metadata (JSON-LD, OpenGraph, meta tags)
 */
function extractMetadata(html: string): PageMetadata {
  const metadata: PageMetadata = {};
  
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    metadata.title = cleanText(titleMatch[1]);
  }
  
  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) {
    metadata.description = cleanText(descMatch[1]);
  }
  
  // Extract OpenGraph site name
  const siteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (siteNameMatch) {
    metadata.siteName = cleanText(siteNameMatch[1]);
  }
  
  // Extract JSON-LD
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const jsonLdBlocks: any[] = [];
  let jsonMatch;
  
  while ((jsonMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      jsonLdBlocks.push(parsed);
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  if (jsonLdBlocks.length > 0) {
    metadata.jsonLd = jsonLdBlocks;
  }
  
  return metadata;
}

/**
 * Extract content sections with headings
 */
function extractSections(html: string): ContentSection[] {
  const sections: ContentSection[] = [];
  
  // Extract h1-h3 sections
  const sectionPattern = /<h([1-3])[^>]*>([^<]+)<\/h\1>([\s\S]*?)(?=<h[1-3]|$)/gi;
  let match;
  
  while ((match = sectionPattern.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const heading = cleanText(match[2]);
    const content = cleanText(match[3]).substring(0, 500); // Limit section content
    
    if (heading && content) {
      sections.push({
        heading,
        content,
        priority: determineSectionPriority(heading, content)
      });
    }
  }
  
  return sections;
}

/**
 * Assemble priority content for vessel queries
 * Combines tables + high-priority sections
 */
function assemblePriorityContent(
  tables: ParsedTable[],
  sections: ContentSection[],
  maxLength: number
): string {
  const parts: string[] = [];
  let currentLength = 0;
  
  // Add tables first (highest priority for vessel data)
  for (const table of tables) {
    const tableText = formatTableAsText(table);
    if (currentLength + tableText.length <= maxLength) {
      parts.push(tableText);
      currentLength += tableText.length;
    }
  }
  
  // Add high-priority sections
  const highPrioritySections = sections.filter(s => s.priority === 'high');
  for (const section of highPrioritySections) {
    const sectionText = `${section.heading}: ${section.content}\n`;
    if (currentLength + sectionText.length <= maxLength) {
      parts.push(sectionText);
      currentLength += sectionText.length;
    } else {
      break;
    }
  }
  
  return parts.join('\n\n');
}

/**
 * Format table as readable text
 */
function formatTableAsText(table: ParsedTable): string {
  const lines: string[] = [];
  
  if (table.context) {
    lines.push(`[${table.context}]`);
  }
  
  for (const row of table.rows) {
    lines.push(`${row.key}: ${row.value}`);
  }
  
  return lines.join('\n');
}

/**
 * Determine section priority based on heading and content
 */
function determineSectionPriority(heading: string, content: string): 'high' | 'medium' | 'low' {
  const headingLower = heading.toLowerCase();
  
  // High priority keywords
  const highPriorityKeywords = [
    'specification', 'details', 'particulars', 'information',
    'owner', 'operator', 'management', 'registration',
    'dimensions', 'technical', 'propulsion', 'machinery'
  ];
  
  if (highPriorityKeywords.some(kw => headingLower.includes(kw))) {
    return 'high';
  }
  
  // Check content for vessel-related keywords
  const contentLower = content.toLowerCase();
  const vesselKeywords = ['imo', 'mmsi', 'flag', 'tonnage', 'loa', 'beam', 'draft'];
  
  if (vesselKeywords.some(kw => contentLower.includes(kw))) {
    return 'high';
  }
  
  return 'medium';
}

/**
 * Check if key-value pair is valid
 */
function isValidKeyValuePair(key: string, value: string): boolean {
  // Key must be at least 2 chars, value at least 1
  if (key.length < 2 || value.length < 1) return false;
  
  // Key shouldn't be too long (probably not a label)
  if (key.length > 50) return false;
  
  // Value shouldn't be just numbers or symbols (might be formatting)
  if (/^[\d\s\-_.,;:]+$/.test(value)) return false;
  
  return true;
}

/**
 * Check if text looks like a table label/key
 */
function looksLikeLabel(text: string): boolean {
  // Should contain letters
  if (!/[a-zA-Z]/.test(text)) return false;
  
  // Often ends with colon
  if (text.trim().endsWith(':')) return true;
  
  // Common label patterns
  const labelPatterns = [
    /^(imo|mmsi|call\s*sign|flag|owner|operator|type|class|built|year|length|beam|draft|tonnage|dwt|gt)/i
  ];
  
  return labelPatterns.some(p => p.test(text));
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean text content (strip HTML, normalize whitespace)
 */
function cleanText(text: string): string {
  return stripHtml(text)
    .replace(/\s+/g, ' ')
    .replace(/^\s*[:;,.\-_]+\s*/, '') // Remove leading punctuation
    .replace(/\s*[:;,.\-_]+\s*$/, '') // Remove trailing punctuation
    .trim();
}

/**
 * Get preview of content with intelligent truncation
 * Preserves complete sentences and important data
 */
export function getSmartPreview(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  
  // Try to break at sentence boundary
  const truncated = content.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  
  const breakPoint = Math.max(lastPeriod, lastNewline);
  
  if (breakPoint > maxLength * 0.7) {
    // Good break point found (at least 70% of desired length)
    return content.substring(0, breakPoint + 1).trim();
  }
  
  // Just truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  return content.substring(0, lastSpace).trim() + '...';
}

