/**
 * LangGraph-powered Maritime Intelligence Agent
 * Modern agent architecture with tool-based research and state management
 */

import { Annotation, StateGraph, END, START } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { MARITIME_SYSTEM_PROMPT } from './maritime-system-prompt';

// =====================
// TYPES & INTERFACES
// =====================

interface Source {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface ResearchResult {
  sources: Source[];
  rejected_sources?: Source[];
  summary?: string;
  confidence: number;
}

// =====================
// STATE DEFINITION
// =====================

const MaritimeAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  sessionId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  enableBrowsing: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  researchContext: Annotation<string>({
    reducer: (_, next) => next || "",
    default: () => "",
  }),
  verifiedSources: Annotation<Source[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  rejectedSources: Annotation<Source[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  confidence: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  maritimeEntities: Annotation<string[]>({
    reducer: (current, update) => [...new Set([...current, ...update])],
    default: () => [],
  }),
  needsRefinement: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
});

type AgentState = typeof MaritimeAgentState.State;

// =====================
// MARITIME SYSTEM PROMPT - Imported from maritime-system-prompt.ts
// Complete 404-line industry-leading prompt transferred 1:1 from chat.ts
// =====================

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Extract maritime entities from query
 */
function extractMaritimeEntities(text: string): string[] {
  const entities: string[] = [];
  
  // Company patterns
  const companyMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Marine|Shipping|Lines|Group|Services))\b/g);
  if (companyMatch) entities.push(...companyMatch);
  
  // Vessel patterns (MV, MS, MT prefixes or quoted names)
  const vesselMatch = text.match(/\b(?:MV|MS|MT|vessel|ship)\s+([A-Z][a-zA-Z0-9\s-]+)/gi);
  if (vesselMatch) entities.push(...vesselMatch);
  
  // Equipment models (alphanumeric patterns)
  const equipmentMatch = text.match(/\b([A-Z][a-z]+\s+\d+[A-Z0-9-]+)\b/g);
  if (equipmentMatch) entities.push(...equipmentMatch);
  
  return [...new Set(entities)];
}

/**
 * Check if query is a follow-up question
 */
function isFollowUpQuery(query: string, previousMessages: BaseMessage[]): boolean {
  const hasReferentialPronouns = /\b(them|those|that|it|its|each one|the above|mentioned|listed|same|their|this|these)\b/i.test(query);
  const hasFollowUpPhrases = /\b(give me|tell me|what about|how about|also|additionally|furthermore|more about|details of|specs of|tech details)\b/i.test(query);
  
  // Check if previous messages contain research context
  const hasPreviousResearch = previousMessages.some(msg => 
    msg.content && typeof msg.content === 'string' && msg.content.includes('RESEARCH CONTEXT')
  );
  
  return (hasReferentialPronouns || hasFollowUpPhrases) && hasPreviousResearch;
}

/**
 * Select best sources based on quality scoring
 * Advanced logic transferred from chat.ts
 */
function selectBestSources(results: any[], maxSources: number = 15): { selected: Source[], rejected: Source[] } {
  const scored = results.map(r => {
    let score = r.score || 0.5;
    
    // PRIORITY 1: Official/OEM sources (highest authority)
    if (/(\.gov|imo\.org|classification|dnv|abs|lloyd|bureau-veritas)/i.test(r.url)) score += 0.3;
    if (/(wartsila|caterpillar|man-es|rolls-royce|kongsberg)/i.test(r.url)) score += 0.25;
    
    // PRIORITY 2: Technical documentation
    if (/\.(pdf|doc)$/i.test(r.url)) score += 0.15;
    if (/(manual|specification|datasheet|technical|whitepaper)/i.test(r.title)) score += 0.15;
    if (/(manufacturer|oem|equipment)/i.test(r.url)) score += 0.1;
    
    // PRIORITY 3: Maritime authoritative sources
    if (/(maritime|vessel|ship|marine|offshore)/i.test(r.url)) score += 0.1;
    if (/(fleet|shipyard|naval|maritime-executive)/i.test(r.url)) score += 0.08;
    
    // PRIORITY 4: Equipment/vessel databases
    if (/(marinetraffic|vesseltracker|equasis|shipping)/i.test(r.url)) score += 0.12;
    
    // PENALTY: Low-quality sources
    if (/(wikipedia|reddit|quora|forum)/i.test(r.url)) score -= 0.2;
    if (/(social|facebook|twitter|instagram|linkedin|pinterest)/i.test(r.url)) score -= 0.3;
    
    // Boost if title matches query intent (more relevant)
    const titleWords = r.title?.toLowerCase().split(/\s+/) || [];
    if (titleWords.some(w => ['technical', 'specification', 'manual', 'guide'].includes(w))) {
      score += 0.05;
    }
    
    return { ...r, score: Math.max(0, Math.min(1, score)) }; // Clamp to [0,1]
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // SMART SELECTION: Take top sources but ensure quality gap
  const qualityGap = 0.15; // Only accept sources within 0.15 of best score
  const bestScore = scored[0]?.score || 0;
  
  const qualityFiltered = scored.filter(s => s.score >= bestScore - qualityGap);
  const selected = qualityFiltered.slice(0, maxSources);
  const rejected = scored.filter(s => !selected.includes(s));
  
  console.log(`   Quality range: ${bestScore.toFixed(2)} - ${(bestScore - qualityGap).toFixed(2)}`);
  console.log(`   Selected ${selected.length}/${scored.length} (rejected ${rejected.length} low-quality)`);
  
  return { selected, rejected };
}

/**
 * Calculate confidence score based on sources
 */
function calculateConfidence(sources: Source[]): number {
  if (sources.length === 0) return 0;
  if (sources.length < 3) return 0.5;
  if (sources.length < 5) return 0.7;
  
  // Check for technical documentation
  const hasTechnicalDocs = sources.some(s => 
    /(manual|specification|datasheet|technical)/i.test(s.title)
  );
  
  return hasTechnicalDocs ? 0.9 : 0.8;
}

// =====================
// TOOLS
// =====================

/**
 * Maritime Search Tool - Uses Tavily API for maritime research
 */
const maritimeSearchTool = tool(
  async ({ query, search_depth }: { query: string; search_depth: 'basic' | 'advanced' }, config) => {
    const env = (config?.configurable as any)?.env;
    if (!env?.TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY not configured');
    }
    
    console.log(`🔍 Maritime Search: "${query}" (${search_depth})`);
    
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: env.TAVILY_API_KEY,
          query,
          search_depth,
          include_answer: false,
          include_raw_content: false,
          max_results: search_depth === 'advanced' ? 20 : 15,
          include_domains: [],
          exclude_domains: ['facebook.com', 'twitter.com', 'instagram.com'],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Select best sources
      const { selected, rejected } = selectBestSources(
        data.results || [],
        search_depth === 'advanced' ? 15 : 10
      );
      
      console.log(`✅ Found ${selected.length} sources (rejected ${rejected.length})`);
      
      return {
        sources: selected,
        rejected_sources: rejected,
        total_results: data.results?.length || 0,
        confidence: calculateConfidence(selected),
      };
    } catch (error: any) {
      console.error('❌ Maritime search error:', error.message);
      return {
        sources: [],
        rejected_sources: [],
        total_results: 0,
        confidence: 0,
        error: error.message,
      };
    }
  },
  {
    name: "maritime_search",
    description: `Search maritime databases, vessel registries, equipment specifications, and technical documentation.
    
Use this tool when users ask about:
- Specific vessels, ships, or marine equipment
- Maritime companies and their fleets
- Equipment specifications and manufacturers
- Current maritime news or developments
- Specific technical documentation

Parameters:
- query: Search query (be specific and include entity names)
- search_depth: 'basic' for quick searches, 'advanced' for comprehensive research`,
    schema: z.object({
      query: z.string().describe("Search query with specific entities (vessels, companies, equipment)"),
      search_depth: z.enum(['basic', 'advanced']).default('basic').describe("Search depth: 'basic' for quick answers, 'advanced' for comprehensive research")
    })
  }
);

/**
 * Maritime Knowledge Base Tool - Internal fleetcore knowledge
 */
const maritimeKnowledgeTool = tool(
  async ({ topic }: { topic: string }) => {
    console.log(`📚 Knowledge Base Query: "${topic}"`);
    
    const knowledge: Record<string, string> = {
      'SOLAS': 'SOLAS (Safety of Life at Sea) is the most important international maritime safety treaty, covering construction, equipment, operation, and training standards.',
      'MARPOL': 'MARPOL (International Convention for the Prevention of Pollution from Ships) regulates pollution from ships, including oil, chemicals, sewage, garbage, and air emissions.',
      'ISM': 'ISM Code (International Safety Management Code) provides an international standard for safe ship management and pollution prevention.',
      'fleetcore': 'fleetcore is an enterprise Maritime Maintenance Operating System providing predictive maintenance, compliance management, and digital transformation for maritime operations.',
    };
    
    const result = Object.entries(knowledge)
      .filter(([key]) => topic.toLowerCase().includes(key.toLowerCase()))
      .map(([_, value]) => value)
      .join('\n\n');
    
    return result || "Topic not found in knowledge base. Please use maritime_search for specific queries.";
  },
  {
    name: "maritime_knowledge",
    description: "Query fleetcore's internal maritime knowledge base for regulations, standards, and general maritime concepts (SOLAS, MARPOL, ISM, fleetcore features).",
    schema: z.object({
      topic: z.string().describe("Topic to query: SOLAS, MARPOL, ISM, fleetcore, vessel types, equipment categories")
    })
  }
);

const tools = [maritimeSearchTool, maritimeKnowledgeTool];
const toolNode = new ToolNode(tools);

// =====================
// AGENT NODES
// =====================

/**
 * Router Node - Decides if research is needed and which tools to use
 */
async function routerNode(state: AgentState, config?: any): Promise<Partial<AgentState>> {
  const lastMessage = state.messages[state.messages.length - 1];
  const userQuery = lastMessage.content as string;
  
  console.log(`🎯 Router analyzing: "${userQuery.substring(0, 100)}..."`);
  
  // Extract entities
  const entities = extractMaritimeEntities(userQuery);
  
  // Check if follow-up
  const isFollowUp = isFollowUpQuery(userQuery, state.messages);
  
  console.log(`   Entities: ${entities.length ? entities.join(', ') : 'none'}`);
  console.log(`   Follow-up: ${isFollowUp}`);
  console.log(`   Browsing: ${state.enableBrowsing}`);
  
  // If follow-up with existing research context, skip research
  if (isFollowUp && state.researchContext) {
    console.log(`✅ Using existing research context for follow-up`);
    return {
      maritimeEntities: entities,
    };
  }
  
  // If specific entities detected and browsing enabled, trigger research
  if (entities.length > 0 && state.enableBrowsing) {
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      apiKey: (config?.configurable as any)?.env?.OPENAI_API_KEY,
    }).bindTools(tools);
    
    const planningPrompt = `You are a research planner for maritime queries.

User Query: "${userQuery}"
Detected Entities: ${entities.join(', ')}

Your task: Decide which tool(s) to call to answer this query.
- Use maritime_search for specific vessels, companies, equipment specs, or current information
- Use maritime_knowledge for general regulations, standards, or fleetcore features
- You can call multiple tools if needed

Call the appropriate tool(s) now.`;
    
    const response = await model.invoke([
      new SystemMessage(planningPrompt),
      new HumanMessage(userQuery)
    ], config);
    
    console.log(`📋 Planner decided: ${response.tool_calls?.length || 0} tool calls`);
    
    return {
      messages: [response],
      maritimeEntities: entities,
    };
  }
  
  // No research needed - go straight to answer
  console.log(`💬 No research needed, answering from expertise`);
  console.log(`   → State will have: messages=${state.messages.length}, entities=${entities.length}`);
  return {
    maritimeEntities: entities,
  };
}

/**
 * Process Tool Results - Extract and format research findings
 */
async function processToolResults(state: AgentState): Promise<Partial<AgentState>> {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // Find tool messages
  const toolMessages = state.messages
    .filter(msg => (msg as any).tool_calls || msg.constructor.name === 'ToolMessage')
    .slice(-5); // Last 5 tool interactions
  
  if (toolMessages.length === 0) {
    return {};
  }
  
  console.log(`🔧 Processing ${toolMessages.length} tool results`);
  
  // Extract sources from tool results
  let allSources: Source[] = [];
  let allRejected: Source[] = [];
  let confidenceScore = 0;
  
  for (const msg of toolMessages) {
    const content = msg.content;
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (parsed.sources) {
          allSources.push(...parsed.sources);
          confidenceScore = Math.max(confidenceScore, parsed.confidence || 0);
        }
        if (parsed.rejected_sources) {
          allRejected.push(...parsed.rejected_sources);
        }
      } catch (e) {
        // Not JSON, might be knowledge base result
        console.log('   Non-JSON tool result (likely knowledge base)');
      }
    }
  }
  
  // Build research context
  const researchContext = allSources.length > 0
    ? `=== RESEARCH CONTEXT ===

Found ${allSources.length} verified sources:

${allSources.map((s, i) => `[${i + 1}] ${s.title}
   URL: ${s.url}
   Content: ${s.content.substring(0, 500)}...
`).join('\n')}

=== END RESEARCH CONTEXT ===`
    : '';
  
  console.log(`✅ Processed: ${allSources.length} sources, confidence: ${confidenceScore.toFixed(2)}`);
  
  return {
    researchContext,
    verifiedSources: allSources,
    rejectedSources: allRejected,
    confidence: confidenceScore,
    needsRefinement: confidenceScore < 0.7 && allSources.length < 5,
  };
}

/**
 * Synthesizer Node - Generate final answer with citations
 */
async function synthesizerNode(state: AgentState, config?: any): Promise<Partial<AgentState>> {
  console.log(`\n🎨 SYNTHESIZER NODE`);
  console.log(`   Sources: ${state.verifiedSources.length}`);
  console.log(`   Research context: ${state.researchContext ? 'YES' : 'NO'}`);
  console.log(`   Messages in state: ${state.messages.length}`);
  
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: state.researchContext ? 0.4 : 0.3, // Higher temp for research mode
    apiKey: (config?.configurable as any)?.env?.OPENAI_API_KEY,
  });
  
  // Build context-aware system prompt
  let systemPrompt = MARITIME_SYSTEM_PROMPT;
  
  if (state.researchContext) {
    systemPrompt = systemPrompt.replace(
      '{source_count}',
      state.verifiedSources.length.toString()
    );
  }
  
  // Prepare messages for synthesis
  const synthesisMessages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
  ];
  
  // Add conversation history
  for (const msg of state.messages) {
    // Skip tool call messages, they're already processed
    if (!(msg as any).tool_calls && msg.constructor.name !== 'ToolMessage') {
      synthesisMessages.push(msg);
    }
  }
  
  // Add research context if available
  if (state.researchContext) {
    synthesisMessages.push(
      new SystemMessage(state.researchContext)
    );
  }
  
  // Generate answer
  const response = await model.invoke(synthesisMessages, config);
  
  console.log(`✅ Synthesized ${response.content.toString().length} characters`);
  
  return {
    messages: [response],
  };
}

// =====================
// ROUTING LOGIC
// =====================

function shouldContinue(state: AgentState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const messageType = lastMessage.constructor.name;
  
  console.log(`\n🔀 ROUTING DECISION`);
  console.log(`   Messages: ${state.messages.length}`);
  console.log(`   Last message type: ${messageType}`);
  console.log(`   Research context: ${state.researchContext ? 'YES' : 'NO'}`);
  console.log(`   Confidence: ${state.confidence}`);
  console.log(`   Verified sources: ${state.verifiedSources.length}`);
  
  // If last message has tool calls, execute them
  if ((lastMessage as AIMessage).tool_calls?.length) {
    console.log(`→ Routing to: tools`);
    return "tools";
  }
  
  // If we just processed tools, check if we need refinement
  if (state.needsRefinement && state.confidence < 0.7) {
    console.log(`→ Routing to: router (refinement needed)`);
    return "router";
  }
  
  // CRITICAL: If we have research context, we need to synthesize
  // This happens after tools execute (lastMessage = ToolMessage)
  if (state.researchContext) {
    // If last message is already a final AIMessage answer, we're done
    const isAIAnswer = messageType === 'AIMessage' && !(lastMessage as AIMessage).tool_calls?.length;
    if (isAIAnswer) {
      console.log(`→ Routing to: END (answer complete)`);
      return END;
    }
    // Otherwise, go to synthesizer to create the answer
    console.log(`→ Routing to: synthesizer (research complete, ${state.verifiedSources.length} sources)`);
    return "synthesizer";
  }
  
  // If no research and last message is from user, go to synthesizer (expert mode)
  if (messageType === 'HumanMessage') {
    console.log(`→ Routing to: synthesizer (expert mode - no research)`);
    return "synthesizer";
  }
  
  // Otherwise, we're done
  console.log(`→ Routing to: END (fallthrough)`);
  return END;
}

// =====================
// BUILD WORKFLOW
// =====================

const workflow = new StateGraph(MaritimeAgentState)
  // Add nodes
  .addNode("router", routerNode)
  .addNode("tools", toolNode)
  .addNode("process", processToolResults)
  .addNode("synthesizer", synthesizerNode)
  
  // Define edges
  .addEdge(START, "router")
  .addConditionalEdges(
    "router",
    shouldContinue,
    {
      "tools": "tools",
      "synthesizer": "synthesizer",
      [END]: END,
    }
  )
  .addEdge("tools", "process")
  .addConditionalEdges(
    "process",
    shouldContinue,
    {
      "router": "router",
      "synthesizer": "synthesizer",
      [END]: END,
    }
  )
  .addEdge("synthesizer", END);

// Compile with memory
const checkpointer = new MemorySaver();
const agent = workflow.compile({ 
  checkpointer,
});

// =====================
// EXPORT API
// =====================

export interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
  enableBrowsing: boolean;
  env: {
    OPENAI_API_KEY: string;
    TAVILY_API_KEY: string;
  };
}

/**
 * Handle chat request with LangGraph agent
 * Returns SSE stream for real-time updates
 */
export async function handleChatWithLangGraph(request: ChatRequest): Promise<ReadableStream> {
  const { messages, sessionId, enableBrowsing, env } = request;
  
  console.log(`\n🚀 LangGraph Agent Request | Session: ${sessionId} | Browsing: ${enableBrowsing}`);
  
  // Convert messages to BaseMessage format
  const baseMessages: BaseMessage[] = messages.map(msg => {
    if (msg.role === 'user') {
      return new HumanMessage(msg.content);
    } else if (msg.role === 'assistant') {
      return new AIMessage(msg.content);
    } else {
      return new SystemMessage(msg.content);
    }
  });
  
  const config = {
    configurable: {
      thread_id: sessionId,
      env,
    }
  };
  
  // Create SSE stream
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      try {
        // IMMEDIATE DEBUG: Send first event to confirm stream started
        console.log(`📡 SSE Stream: Sending initial debug event`);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'debug', message: 'LangGraph stream started', sessionId, enableBrowsing })}\n\n`
        ));
        
        // CRITICAL: Send visible content immediately to test frontend
        console.log(`📡 SSE Stream: Sending test content`);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'content', content: 'TEST: Stream active. Processing query...\n\n' })}\n\n`
        ));
        
        // Send thinking immediately
        console.log(`📡 SSE Stream: Sending initial thinking event`);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'thinking', content: 'Initializing maritime intelligence agent...' })}\n\n`
        ));
        
        console.log(`📡 SSE Stream: Starting agent.stream()`);
        
        // Stream events from agent
        const stream = await agent.stream(
          {
            messages: baseMessages,
            sessionId,
            enableBrowsing,
          },
          {
            ...config,
            streamMode: "updates" as const,
          }
        );
        
        let sourcesEmitted = false;
        let eventCount = 0;
        
        console.log(`📡 SSE Stream: Entering event loop`);
        
        for await (const event of stream) {
          eventCount++;
          const eventKey = Object.keys(event)[0];
          console.log(`\n📤 EVENT #${eventCount}:`, eventKey);
          console.log(`   Event structure:`, JSON.stringify(event, null, 2).substring(0, 500));
          
          // Emit thinking process
          if (event.router) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'thinking', content: 'Analyzing query...' })}\n\n`
            ));
          }
          
          if (event.tools) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'thinking', content: 'Searching maritime databases...' })}\n\n`
            ));
          }
          
          // Emit sources (Frontend expects: type='source', action='select'/'reject')
          if (event.process?.verifiedSources && !sourcesEmitted) {
            const sources = event.process.verifiedSources;
            console.log(`   Emitting ${sources.length} verified sources`);
            
            // Emit verified sources with action='select'
            for (const source of sources) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'source',
                  action: 'select', // Frontend expects this
                  title: source.title,
                  url: source.url,
                  content: source.content.substring(0, 300),
                  score: source.score || 0.5
                })}\n\n`
              ));
            }
            
            // Emit rejected sources with action='reject'
            if (event.process.rejectedSources?.length) {
              console.log(`   Emitting ${event.process.rejectedSources.length} rejected sources`);
              for (const rejected of event.process.rejectedSources) {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: 'source',
                    action: 'reject', // Frontend expects this
                    title: rejected.title,
                    url: rejected.url,
                    reason: 'Lower relevance score',
                    score: rejected.score || 0
                  })}\n\n`
                ));
              }
            }
            
            sourcesEmitted = true;
          }
          
          if (event.synthesizer) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'thinking', content: 'Synthesizing comprehensive answer...' })}\n\n`
            ));
          }
          
          // Emit final answer - CRITICAL FIX: Access messages array correctly
          if (event.synthesizer) {
            console.log(`   Synthesizer event keys:`, Object.keys(event.synthesizer));
            console.log(`   Synthesizer full value:`, JSON.stringify(event.synthesizer, null, 2).substring(0, 800));
            
            // LangGraph "updates" stream mode returns state DELTAS (what changed)
            // The messages field is the NEW messages added, which should be an array
            const messagesUpdate = event.synthesizer.messages;
            
            if (Array.isArray(messagesUpdate) && messagesUpdate.length > 0) {
              // Get the last message (the AI's answer)
              const lastMessage = messagesUpdate[messagesUpdate.length - 1];
              const content = typeof lastMessage.content === 'string' 
                ? lastMessage.content 
                : JSON.stringify(lastMessage.content);
              
              console.log(`   ✅ Answer found: ${content?.length || 0} chars`);
              console.log(`   First 200 chars: ${content?.substring(0, 200)}`);
              
              if (content && content.length > 0) {
                console.log(`   📤 Emitting ${Math.ceil(content.length / 50)} content chunks`);
                
                // Stream content in chunks for better UX
                const chunkSize = 50;
                let chunkCount = 0;
                for (let i = 0; i < content.length; i += chunkSize) {
                  const chunk = content.slice(i, i + chunkSize);
                  chunkCount++;
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`
                  ));
                }
                console.log(`   ✅ Emitted ${chunkCount} content chunks`);
              } else {
                console.error(`   ❌ Content is empty or undefined`);
              }
            } else {
              console.error(`   ❌ messages is not an array or is empty:`, typeof messagesUpdate, messagesUpdate);
            }
          }
        }
        
        // Done
        console.log(`📡 SSE Stream: Sending [DONE] and closing`);
        console.log(`📡 SSE Stream: Total events emitted: ${eventCount}`);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        
        console.log(`✅ LangGraph stream complete (${eventCount} events)\n`);
        
      } catch (error: any) {
        console.error(`❌ LangGraph error:`, error);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
        ));
        controller.close();
      }
    }
  });
}

export { agent, workflow };

