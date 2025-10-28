/**
 * Unified Gemini Tool - Google-powered verification and grounding
 * Combines quick lookups and authoritative verification in one tool
 * Context-aware for follow-up queries with entity resolution
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const geminiTool = tool(
  async ({ query, entityContext }: { query: string; entityContext?: string }, config) => {
    console.log(`\n🔮 GEMINI TOOL: "${query}"`);
    
    const env = (config?.configurable as any)?.env;
    const sessionMemory = (config?.configurable as any)?.sessionMemory;
    
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
      // Gemini 2.5 Pro: Latest production model with enhanced reasoning (paid tier required)
      // Pricing: $1.25/M input tokens, $10/M output tokens (<200K context)
      // Alternatives: gemini-2.5-flash (faster, cheaper), gemini-1.5-pro-latest (fallback)
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent', {
        method: 'POST',
        headers: {
          'x-goog-api-key': env.GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: enrichedQuery }]
          }],
          systemInstruction: {
            parts: [{
              text: `You are a maritime intelligence expert serving technical officers, captains, and marine superintendents.

ANSWER FORMAT:
- Provide DIRECT, technical answers immediately - no meta-commentary
- NEVER say "I'll search", "I'll look up", "hold on", "let me find"
- Start with factual information right away
- Use Google Search results for accurate, up-to-date information

TECHNICAL DATA REQUIREMENTS:
When discussing vessels, ALWAYS include (if available):
- Vessel name, IMO number, MMSI
- Flag state, port of registry
- Principal dimensions: LOA (Length Overall), Beam, Draft, Depth in meters
- Tonnage: GRT (Gross Registered Tonnage), NRT (Net Registered Tonnage), DWT (Deadweight Tonnage)
- Cargo capacity (TEU for containers, cubic meters for bulk, etc.)
- Build year and shipyard
- Classification society and class notation
- Propulsion: main engine type, power output in kW, service speed in knots

Ownership structure (CRITICAL for maritime professionals):
- Registered owner (legal entity, country)
- Beneficial owner (ultimate parent company)
- Technical manager (vessel operations)
- Commercial manager/operator
- ISM DOC company (safety management)

When discussing companies:
- Fleet size and composition
- Operational areas and trade routes
- Regulatory compliance status

TECHNICAL STANDARDS:
- Use precise maritime terminology (not simplified)
- Include units: m (meters), kW (kilowatts), DWT (deadweight tonnes), TEU (twenty-foot equivalent units)
- Reference classification societies: DNV, ABS, Lloyd's Register, Bureau Veritas
- Cite IMO/SOLAS/MARPOL regulations when relevant
- Be factual and technical - avoid marketing language

CONTEXT HANDLING:
- If context provided, USE IT to understand what the user is asking
- For follow-up questions, answer based on entity mentioned in context
- Cross-reference previous conversation for entity disambiguation`
            }]
          },
          tools: [{ google_search: {} }] // Enable Google Search grounding
        }),
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
      
      // Extract sources from multiple possible locations
      let sources: any[] = [];
      
      console.log(`   🔍 DEBUG: groundingMetadata keys:`, Object.keys(groundingMetadata || {}));
      console.log(`   🔍 DEBUG: has webResults?`, !!groundingMetadata?.webResults);
      console.log(`   🔍 DEBUG: has groundingChunks?`, !!groundingMetadata?.groundingChunks);
      console.log(`   🔍 DEBUG: groundingChunks length:`, groundingMetadata?.groundingChunks?.length || 0);
      
      // PRIORITY 1: webResults (most detailed)
      if (groundingMetadata?.webResults && Array.isArray(groundingMetadata.webResults)) {
        sources = groundingMetadata.webResults.map((result: any) => ({
          url: result.url,
          title: result.title || 'Untitled',
          content: result.snippet || result.content || '',
          score: 0.9,
        }));
        console.log(`   📚 Extracted ${sources.length} sources from webResults`);
      } 
      
      // PRIORITY 2: groundingChunks (alternative format - Gemini 2.5 format)
      if (sources.length === 0 && groundingMetadata?.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
        console.log(`   🔍 DEBUG: First chunk structure:`, JSON.stringify(groundingMetadata.groundingChunks[0], null, 2));
        sources = groundingMetadata.groundingChunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            url: chunk.web?.uri || '',
            title: chunk.web?.title || 'Untitled',
            content: chunk.web?.snippet || '',
            score: 0.9,
          }));
        console.log(`   📚 Extracted ${sources.length} sources from groundingChunks`);
        if (sources.length > 0) {
          console.log(`   ✅ Sample source:`, JSON.stringify(sources[0], null, 2));
        }
      }
      
      // PRIORITY 3: groundingSupport (Gemini 2.0 format)
      if (sources.length === 0 && groundingMetadata?.groundingSupport && Array.isArray(groundingMetadata.groundingSupport)) {
        sources = groundingMetadata.groundingSupport
          .filter((support: any) => support.segment && support.groundingChunkIndices)
          .flatMap((support: any) => {
            return support.groundingChunkIndices.map((idx: number) => {
              const chunk = groundingMetadata.retrievalMetadata?.groundingChunks?.[idx];
              return {
                url: chunk?.web?.uri || '',
                title: chunk?.web?.title || 'Source',
                content: support.segment?.text || '',
                score: 0.85,
              };
            });
          })
          .filter((s: any) => s.url); // Remove entries without URLs
        console.log(`   📚 Extracted ${sources.length} sources from groundingSupport`);
      }
      
      // FALLBACK: searchEntryPoint (minimal)
      if (sources.length === 0 && groundingMetadata?.searchEntryPoint) {
        console.warn(`   ⚠️ Only searchEntryPoint available - Gemini didn't return detailed sources`);
        sources = [{
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          title: 'Google Search',
          content: answer?.substring(0, 500) || '',
          score: 0.6,
        }];
      }
      
      // WARNING: No sources at all
      if (sources.length === 0) {
        console.warn(`   ⚠️ ZERO sources returned by Gemini! This shouldn't happen with grounding enabled.`);
        console.warn(`   Raw metadata:`, JSON.stringify(groundingMetadata, null, 2));
      }
      
      console.log(`✅ Gemini complete: ${sources.length} sources, answer: ${answer ? 'YES' : 'NO'}`);
      
      return JSON.stringify({
        sources,
        answer,
        searchQueries: groundingMetadata?.searchQueries || [],
        citations: groundingMetadata?.citations || [],
        confidence: sources.length >= 3 ? 0.95 : (sources.length >= 2 ? 0.85 : 0.7),
        mode: 'gemini'
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

