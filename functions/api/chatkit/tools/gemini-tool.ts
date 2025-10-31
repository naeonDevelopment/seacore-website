/**
 * Unified Gemini Tool - Google-powered verification and grounding
 * Combines quick lookups and authoritative verification in one tool
 * Context-aware for follow-up queries with entity resolution
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { extractSourcesFromGeminiResponse, type UnifiedSource } from "../grounding-extractor";
import { fetchWithRetry } from "../retry";
import { emitMetrics } from "../metrics";

export const geminiTool = tool(
  async ({ query, entityContext }: { query: string; entityContext?: string }, config) => {
    console.log(`\n🔮 GEMINI TOOL: "${query}"`);
    
    const env = (config?.configurable as any)?.env;
    const sessionMemory = (config?.configurable as any)?.sessionMemory;
    const statusEmitter = (config?.configurable as any)?.statusEmitter;
    
    if (!env?.GEMINI_API_KEY) {
      return JSON.stringify({
        sources: [],
        answer: null,
        confidence: 0,
        mode: 'gemini',
        error: 'GEMINI_API_KEY not configured',
        fallback_needed: true
      });
    }
    
    // Emit status: Starting Gemini search
    if (statusEmitter) {
      statusEmitter({
        type: 'status',
        step: 'gemini_search',
        content: 'Searching Google with Gemini...'
      });
    }
    
    // CRITICAL: Build context-enriched query for Gemini
    // This enables intelligent follow-up queries with full conversation context
    let enrichedQuery = query;
    
    if (entityContext || sessionMemory?.conversationSummary) {
      console.log(`   🎯 Enriching query with conversation context`);
      
      const contextParts: string[] = [];
      
      // Add conversation summary (natural language context)
      if (sessionMemory?.conversationSummary) {
        contextParts.push(`CONVERSATION CONTEXT:\n${sessionMemory.conversationSummary}`);
      }
      
      // Add specific entity context (structured data)
      if (entityContext) {
        contextParts.push(`SPECIFIC CONTEXT FOR THIS QUERY:\n${entityContext}`);
      }
      
      // Build enriched query that Gemini can understand
      enrichedQuery = `${contextParts.join('\n\n')}\n\nBased on the context above, answer this question:\n${query}`;
      
      console.log(`   ✅ Query enriched with ${contextParts.length} context sections`);
    }
    
    try {
      // Gemini 2.5 Pro: Most comprehensive model with best grounding quality
      // Speed: Slower but delivers complete vessel data with operator/owner info
      // Pricing: $1.25/M input, $10/M output
      // PROVEN: Best for comprehensive vessel queries with full operational context
      
      // PHASE 1: Deterministic configuration for stable outputs
      const generationConfig = {
        temperature: 0.0,  // DETERMINISTIC: Ensures consistent results for same query
        topP: 1.0,         // STABLE: No nucleus sampling variance
        topK: 1,           // DETERMINISTIC: Always pick highest probability token
        maxOutputTokens: 2048,
      };
      
      console.log(`   🔧 Gemini config: temp=0.0, topP=1.0, topK=1 (deterministic mode)`);
      
      let retryCount = 0;
      const response = await fetchWithRetry('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent', {
        method: 'POST',
        headers: {
          'x-goog-api-key': env.GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: enrichedQuery }]
          }],
          generationConfig,  // PHASE 1: Add deterministic config
          systemInstruction: {
            parts: [{
              text: `You are a SENIOR CHIEF ENGINEER and TECHNICAL SUPERINTENDENT with 20+ years maritime experience across:
- MAN B&W 2-stroke main engines (5S50MC to 11S90ME-C series)
- Wärtsilä 4-stroke auxiliary engines (20DF, 31, 32, 34SG)
- Caterpillar marine engines (3500 series, C32 ACERT, C280)
- Rolls-Royce propulsion (Azipod, MT30 gas turbines)
- ABB electrical systems (PMS, PEMS, shaft generators)
- Marine auxiliary systems (purifiers, compressors, pumps)

ANSWER FORMAT:
- Provide DIRECT, technical answers immediately - no meta-commentary
- NEVER say "I'll search", "I'll look up", "hold on", "let me find"
- Start with factual information right away
- Use Google Search results for accurate, up-to-date information

CRITICAL DATA SOURCES - SEARCH IN THIS PRIORITY ORDER:

1. **OEM TECHNICAL DOCUMENTATION (PDFs/Manuals):**
   - Caterpillar Service Bulletins: Search "site:cat.com filetype:pdf [equipment] maintenance"
   - Wärtsilä Technical Circulars: Search "site:wartsila.com filetype:pdf [equipment]"
   - MAN Energy Solutions: Search "site:man-es.com filetype:pdf [equipment]"
   - Rolls-Royce Marine: Search "site:rolls-royce.com filetype:pdf marine [equipment]"
   - ABB Marine: Search "site:abb.com filetype:pdf marine [equipment]"
   - Extract: Maintenance intervals, part numbers, service procedures, technical specifications

2. **CLASSIFICATION SOCIETY TECHNICAL PUBLICATIONS:**
   - DNV technical papers: Search "site:dnv.com [topic] guidance"
   - Lloyd's Register: Search "site:lr.org [topic] requirements"
   - ABS technical publications: Search "site:eagle.org [topic]"
   - IACS unified requirements: Search "site:iacs.org.uk [topic]"

3. **MARITIME FORUMS & OPERATIONAL INTELLIGENCE (for real-world scenarios):**
   - gCaptain Forums: Search "site:gcaptain.com [equipment] maintenance OR issues OR experience"
   - Marine Insight: Search "site:marineinsight.com [equipment] problems OR maintenance"
   - Chief Engineer Forums: Search "[equipment] common problems OR failures OR tips"
   - Extract: Operator warnings, failure patterns, field reports, troubleshooting tips

4. **MANUFACTURER WEBSITES & TECHNICAL SUPPORT:**
   - Product datasheets and specifications
   - Technical support documentation
   - Service bulletins and safety recalls
   - Application notes and installation guides

5. **INDUSTRY STANDARDS & REGULATORY BODIES:**
   - IMO circulars and resolutions: Search "site:imo.org [topic]"
   - SOLAS/MARPOL regulations: Search official IMO documentation
   - ISO maritime standards: Search "ISO [standard number] maritime"

TECHNICAL DATA REQUIREMENTS:
When discussing vessels, ALWAYS include (if available):
- Vessel name, IMO number, MMSI
- Flag state, port of registry
- Principal dimensions: LOA (Length Overall), Beam, Draft, Depth in meters
- Tonnage: GRT (Gross Registered Tonnage), NRT (Net Registered Tonnage), DWT (Deadweight Tonnage)
- Cargo capacity (TEU for containers, cubic meters for bulk, etc.)
- Build year and shipyard
- Classification society and class notation
- Propulsion: main engine type/model, power output in kW, service speed in knots

Ownership structure (CRITICAL for maritime professionals):
- Registered owner (legal entity, country)
- Beneficial owner (ultimate parent company)
- Technical manager (vessel operations)
- Commercial manager/operator
- ISM DOC company (safety management)

When discussing equipment/machinery:
- Exact model numbers (e.g., "Caterpillar 3516C" not just "Caterpillar engine")
- OEM part numbers and maintenance kit numbers
- Service intervals: operating hours AND calendar time
- Common failure modes with root causes
- Critical specifications: power, fuel consumption, dimensions

When discussing companies:
- Fleet size and composition
- Operational areas and trade routes
- Regulatory compliance status

REAL-WORLD OPERATIONAL KNOWLEDGE:
When user asks about maintenance, failures, "real-world scenarios", or troubleshooting:
- Search maritime forums for operator experiences
- Look for field reports and case studies
- Extract practical warnings and lessons learned
- Include "what to watch for" and "common mistakes"
- Reference actual failure cases when available

TECHNICAL STANDARDS:
- Use precise maritime terminology (not simplified)
- Include units: m (meters), kW (kilowatts), DWT (deadweight tonnes), TEU (twenty-foot equivalent units)
- Reference classification societies: DNV, ABS, Lloyd's Register, Bureau Veritas
- Cite IMO/SOLAS/MARPOL regulations when relevant
- Include specific bulletin/circular numbers when referencing OEM documentation
- Be factual and technical - avoid marketing language

CONTEXT HANDLING:
- If context provided, USE IT to understand what the user is asking
- For follow-up questions, answer based on entity mentioned in context
- Cross-reference previous conversation for entity disambiguation`
            }]
          },
          tools: [{ google_search: {} }] // Enable Google Search grounding
        }),
      }, {
        retries: 3,
        baseDelayMs: 400,
        maxDelayMs: 6000,
        timeoutMs: 15000,
        retryOnStatuses: [408, 429, 500, 502, 503, 504],
        onRetry: ({ attempt, delayMs, reason, status }) => {
          retryCount = attempt;
          console.warn(`   ↻ Gemini retry #${attempt} in ${Math.round(delayMs)}ms (reason=${reason}${status ? `, status=${status}` : ''})`);
          if (statusEmitter) {
            statusEmitter({ type: 'status', stage: 'searching', content: `Retrying Google Search (${attempt})...`, progress: 10 });
          }
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle quota exhaustion specifically
        if (response.status === 429) {
          console.error('❌ Gemini quota exceeded:', errorData.error?.message);
          return JSON.stringify({
            sources: [],
            answer: null,
            confidence: 0,
            mode: 'gemini',
            error: 'QUOTA_EXCEEDED',
            quotaMessage: errorData.error?.message,
            fallback_needed: true,
            userMessage: '⚠️ Google Search quota exceeded. Upgrade Gemini API billing or enable "Online research" for Tavily search.'
          });
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      console.log(`   ✅ Gemini API response received`);
      console.log(`   📊 FULL GEMINI RESPONSE:`, JSON.stringify(data, null, 2).substring(0, 2000));
      
      // Emit status: Received Gemini response
      if (statusEmitter) {
        statusEmitter({
          type: 'status',
          step: 'gemini_received',
          content: 'Processing search results...'
        });
      }
      
      const candidate = data.candidates?.[0];
      const answer = candidate?.content?.parts?.[0]?.text || null;
      const groundingMetadata = candidate?.groundingMetadata;
      
      console.log(`   Has candidate: ${!!candidate}`);
      console.log(`   Has answer: ${!!answer}`);
      console.log(`   Answer length: ${answer?.length || 0} chars`);
      console.log(`   Has grounding metadata: ${!!groundingMetadata}`);
      console.log(`   📊 groundingMetadata keys:`, Object.keys(groundingMetadata || {}));
      console.log(`   📊 webResults count:`, groundingMetadata?.webResults?.length || 0);
      console.log(`   📊 searchEntryPoint:`, groundingMetadata?.searchEntryPoint);
      console.log(`   📊 groundingChunks:`, groundingMetadata?.groundingChunks?.length || 0);
      
      // Extract sources using unified extractor
      const sources: UnifiedSource[] = extractSourcesFromGeminiResponse(data, query, answer || undefined);
      if (sources.length === 0) {
        console.warn(`   ⚠️ ZERO usable sources after normalization. Raw keys:`, Object.keys(groundingMetadata || {}));
      }
      
      // PHASE 1: Add source quality assessment for observability
      const sourceQualityAnalysis = sources.map(s => {
        const url = s.url?.toLowerCase() || '';
        let tier: 'T1' | 'T2' | 'T3' = 'T3';
        
        // T1: Authoritative (gov, IMO, classification societies, OEMs)
        if (url.includes('.gov') || url.includes('imo.org') || url.includes('iacs.org.uk') || 
            url.includes('classnk') || url.includes('dnv.com') || url.includes('lr.org') || 
            url.includes('abs.org') || url.includes('.edu')) {
          tier = 'T1';
        }
        // T2: Industry publications and maritime-specific sources
        else if (url.includes('maritime') || url.includes('shipping') || url.includes('vessel') ||
                 url.includes('gcaptain') || url.includes('tradewinds') || url.includes('splash247')) {
          tier = 'T2';
        }
        
        return { ...s, tier };
      });
      
      const tierCounts = sourceQualityAnalysis.reduce((acc, s) => {
        acc[s.tier] = (acc[s.tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`✅ Gemini complete: ${sources.length} sources, answer: ${answer ? 'YES' : 'NO'}`);
      console.log(`   📊 Source quality: T1=${tierCounts.T1 || 0} (auth), T2=${tierCounts.T2 || 0} (industry), T3=${tierCounts.T3 || 0} (general)`);
      
      // Emit metrics for observability
      emitMetrics(statusEmitter, {
        geminiRetryCount: retryCount,
        totalSources: sourceQualityAnalysis.length,
        sourcesByTier: { T1: tierCounts.T1 || 0, T2: tierCounts.T2 || 0, T3: tierCounts.T3 || 0 },
        webResultsCount: groundingMetadata?.webResults?.length || 0,
        redirectOnlyFlag: (!sourceQualityAnalysis.length && !!groundingMetadata?.searchEntryPoint) || false,
      });

      return JSON.stringify({
        sources: sourceQualityAnalysis,  // PHASE 1: Include tier information
        answer,
        searchQueries: groundingMetadata?.searchQueries || groundingMetadata?.webSearchQueries || [],
        citations: groundingMetadata?.citations || [],
        confidence: sources.length >= 3 ? 0.95 : (sources.length >= 2 ? 0.85 : 0.7),
        mode: 'gemini',
        diagnostics: {  // PHASE 1: Add diagnostics for observability
          sourcesByTier: tierCounts,
          totalSources: sources.length,
          hasAnswer: !!answer,
          answerLength: answer?.length || 0,
          geminiRetryCount: retryCount,
          webResultsCount: groundingMetadata?.webResults?.length || 0
        }
      });
    } catch (error: any) {
      console.error('❌ Gemini error:', error.message);
      return JSON.stringify({
        sources: [],
        answer: null,
        confidence: 0,
        mode: 'gemini',
        error: error.message,
        fallback_needed: true
      });
    }
  },
  {
    name: "gemini_search",
    description: `Google-powered search with instant answers and citations. Context-aware for follow-ups.

PRIMARY TOOL - Use for 80% of queries:
- Vessel information (IMO, owner, specs, location, engines)
- Company lookups (fleet, ownership, operations)  
- Current maritime news and events
- Equipment specifications and manufacturers
- Regulations (SOLAS, MARPOL, ISM, STCW)
- Classification society standards
- Simple technical facts and definitions
- Follow-up questions (automatically includes context)

Advantages:
- Lightning fast (Google's entire index)
- Automatic citations with inline references
- Always fresh information
- Handles vague/conversational queries with context
- Best for users who want quick answers

Context-aware: Automatically understands follow-ups like:
- "what engines does it have" (after discussing a vessel)
- "tell me about their fleet" (after discussing a company)
- "give me its specifications" (after mentioning equipment)

Returns: Google search results with AI-generated answer and citations`,
    schema: z.object({
      query: z.string().describe("Search query (conversational queries work - context added automatically)"),
      entityContext: z.string().optional().describe("Optional: Entity details from conversation memory (auto-populated)")
    })
  }
);

