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
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
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
              text: `You are a maritime intelligence expert. When answering:
- Provide DIRECT answers immediately - no meta-commentary
- NEVER say "I'll search", "I'll look up", "hold on", "let me find"
- Start with factual information right away
- Use Google Search results for accurate, up-to-date info
- If context provided, USE IT to understand what user is asking
- For follow-up questions, answer based on entity mentioned in context
- Keep responses concise and factual
- Focus on maritime terminology: LOA, DWT, GT, TEU, IMO, MMSI`
            }]
          },
          tools: [{ google_search: {} }] // Enable Google Search grounding
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
      
      const data = await response.json();
      const candidate = data.candidates?.[0];
      const answer = candidate?.content?.parts?.[0]?.text || null;
      const groundingMetadata = candidate?.groundingMetadata;
      
      // Extract sources from multiple possible locations
      let sources: any[] = [];
      
      if (groundingMetadata?.webResults && Array.isArray(groundingMetadata.webResults)) {
        sources = groundingMetadata.webResults.map((result: any) => ({
          url: result.url,
          title: result.title || 'Untitled',
          content: result.snippet || result.content || '',
          score: 0.9,
        }));
        console.log(`   📚 Extracted ${sources.length} sources from webResults`);
      } else if (groundingMetadata?.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
        sources = groundingMetadata.groundingChunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            url: chunk.web?.uri || '',
            title: chunk.web?.title || 'Untitled',
            content: chunk.web?.snippet || '',
            score: 0.9,
          }));
        console.log(`   📚 Extracted ${sources.length} sources from groundingChunks`);
      } else if (groundingMetadata?.searchEntryPoint) {
        sources = [{
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          title: 'Google Search',
          content: answer?.substring(0, 500) || '',
          score: 0.8,
        }];
      }
      
      console.log(`✅ Gemini complete: ${sources.length} sources, answer: ${answer ? 'YES' : 'NO'}`);
      
      return JSON.stringify({
        sources,
        answer,
        searchQueries: groundingMetadata?.searchQueries || [],
        citations: groundingMetadata?.citations || [],
        confidence: sources.length >= 2 ? 0.95 : 0.8,
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

