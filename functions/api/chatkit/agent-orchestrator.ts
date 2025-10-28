/**
 * Maritime Intelligence Agent Orchestrator
 * Simplified architecture - LLM-driven with tool orchestration
 * 
 * Philosophy:
 * - Trust the LLM intelligence (via comprehensive maritime prompt)
 * - Minimal business logic - let LLM decide
 * - Simple memory integration
 * - Clean tool orchestration
 */

import { Annotation, StateGraph, END, START } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MARITIME_SYSTEM_PROMPT } from './maritime-system-prompt';
import { maritimeTools } from './tools';
import { geminiTool } from './tools/gemini-tool';
import { SessionMemoryManager, type SessionMemory } from './session-memory';

// Cloudflare Workers types
declare global {
  interface KVNamespace {
    get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
    put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
  }
  interface D1Database {}
  interface VectorizeIndex {}
  interface Ai {}
}

// =====================
// TYPES
// =====================

interface Source {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
  enableBrowsing: boolean;
  env: {
    OPENAI_API_KEY: string;
    TAVILY_API_KEY: string;
    GEMINI_API_KEY: string;
    LANGSMITH_API_KEY?: string;
    CHAT_SESSIONS?: KVNamespace;
    MARITIME_MEMORY?: D1Database;
    VECTOR_INDEX?: VectorizeIndex;
    AI?: Ai;
  };
}

// =====================
// STATE DEFINITION
// =====================

const AgentState = Annotation.Root({
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
  // Research context - populated after tool execution
  researchContext: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  sources: Annotation<Source[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
});

type State = typeof AgentState.State;

// =====================
// AGENT NODE
// =====================

/**
 * Detect if query is about fleetcore platform/features (should answer from training data)
 */
function isPlatformQuery(query: string): boolean {
  const queryLower = query.toLowerCase();
  
  const platformKeywords = [
    'fleetcore', 'seacore', 'fleet core', 'sea core',
    'pms', 'planned maintenance system', 'planned maintenance',
    'work order', 'work orders', 'maintenance scheduling',
    'inventory management', 'spare parts management',
    'crew management', 'crew scheduling',
    'compliance tracking', 'compliance management',
    'safety management system', 'sms system',
    'procurement', 'purchasing system',
    'dashboard', 'analytics', 'reporting', 'reports',
    'features', 'capabilities', 'integrations',
  ];
  
  return platformKeywords.some(keyword => {
    const words = keyword.split(' ');
    if (words.length === 1) {
      return new RegExp(`\\b${keyword}\\b`, 'i').test(query);
    } else {
      return queryLower.includes(keyword);
    }
  });
}

/**
 * Intelligent query mode detection (replicated from legacy agent)
 * Determines optimal strategy for each query type
 */
function detectQueryMode(
  query: string,
  enableBrowsing: boolean
): 'verification' | 'research' | 'none' {
  // PRIORITY 1: User explicitly enabled online research → deep multi-source research
  if (enableBrowsing) {
    console.log(`   📚 Mode: RESEARCH (user enabled browsing - deep multi-source)`);
    return 'research';
  }
  
  // PRIORITY 2: Platform queries without entities → answer from training data
  const isPlatform = isPlatformQuery(query);
  const hasEntityMention = /vessel|ship|fleet|company|equipment|manufacturer|imo|mmsi|flag/i.test(query);
  
  if (isPlatform && !hasEntityMention) {
    console.log(`   🎯 Mode: NONE (pure platform query - training data)`);
    return 'none';
  }
  
  // HYBRID: Platform + entity → verification with context
  if (isPlatform && hasEntityMention) {
    console.log(`   🔮 Mode: VERIFICATION (platform + entity hybrid)`);
    return 'verification';
  }
  
  // DEFAULT: All maritime queries → Gemini verification
  // This handles: vessel lookups, company queries, regulations, equipment specs
  console.log(`   🔮 Mode: VERIFICATION (default - Gemini grounding for real-time data)`);
  return 'verification';
}

/**
 * Main agent node - Intelligent mode-based routing
 * Replicated from legacy agent for optimal query handling
 */
async function agentNode(state: State, config: any): Promise<Partial<State>> {
  const env = config.configurable?.env;
  const sessionMemory = config.configurable?.sessionMemory as SessionMemory | null;
  
  console.log(`\n🤖 AGENT NODE`);
  console.log(`   Messages: ${state.messages.length}`);
  console.log(`   Browsing: ${state.enableBrowsing}`);
  console.log(`   Has memory: ${!!sessionMemory}`);
  
  // Get user query
  const lastUserMessage = state.messages.filter(m => m.constructor.name === 'HumanMessage').slice(-1)[0];
  const userQuery = lastUserMessage?.content?.toString() || '';
  
  // Build context from session memory
  let contextAddition = "";
  if (sessionMemory) {
    if (sessionMemory.conversationSummary) {
      contextAddition += `\n\n=== CONVERSATION CONTEXT ===\n${sessionMemory.conversationSummary}\n`;
    }
    
    // Add entity context for follow-up queries
    const vesselEntities = Object.keys(sessionMemory.accumulatedKnowledge?.vesselEntities || {});
    const companyEntities = Object.keys(sessionMemory.accumulatedKnowledge?.companyEntities || {});
    
    if (vesselEntities.length > 0 || companyEntities.length > 0) {
      contextAddition += `\n=== KNOWN ENTITIES ===\n`;
      if (vesselEntities.length > 0) {
        contextAddition += `Vessels: ${vesselEntities.join(', ')}\n`;
      }
      if (companyEntities.length > 0) {
        contextAddition += `Companies: ${companyEntities.join(', ')}\n`;
      }
    }
  }
  
  // INTELLIGENT MODE DETECTION (replicated from legacy agent)
  const mode = detectQueryMode(userQuery, state.enableBrowsing);
  
  console.log(`   Query: "${userQuery.substring(0, 80)}..."`);
  console.log(`   Detected mode: ${mode}`);
  
  // Create system message with prompt + context
  const systemMessage = new SystemMessage(MARITIME_SYSTEM_PROMPT + contextAddition);
  
  // MODE: NONE - Answer from training data (no tools)
  if (mode === 'none') {
    console.log(`   🎯 Executing NONE mode - training data only`);
    
    const platformLlm = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.1,
      openAIApiKey: env.OPENAI_API_KEY,
      streaming: true,
    });
    
    const platformContext = `\n\n=== PLATFORM QUERY ===
Answer comprehensively from your training knowledge about fleetcore.
Do NOT suggest using external research - provide detailed information directly.`;
    
    const platformSystemMessage = new SystemMessage(MARITIME_SYSTEM_PROMPT + contextAddition + platformContext);
    
    const stream = await platformLlm.stream([platformSystemMessage, ...state.messages]);
    
    let fullContent = '';
    for await (const chunk of stream) {
      fullContent += chunk.content;
    }
    
    console.log(`   ✅ Response generated (${fullContent.length} chars, no tools)`);
    return { messages: [new AIMessage(fullContent)] };
  }
  
  // MODE: VERIFICATION - Call Gemini directly (fast, authoritative)
  if (mode === 'verification') {
    console.log(`   🔮 Executing VERIFICATION mode - calling Gemini directly`);
    
    try {
      // Call gemini tool directly with user query
      const result = await geminiTool.invoke({ query: userQuery }, config);
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      
      console.log(`   ✅ Gemini call complete: ${parsed.sources?.length || 0} sources`);
      
      // Store sources in state for frontend display
      const sources = (parsed.sources || []).map((s: any) => ({
        title: s.title || '',
        url: s.url || '',
        content: s.content || '',
        score: s.score || 0.5,
      }));
      
      // Build answer with inline citations
      let answer = parsed.answer || 'Unable to retrieve information.';
      
      // Add inline source citations [1][2][3]
      if (sources.length > 0) {
        answer += '\n\n**Sources:**\n';
        sources.forEach((s: any, idx: number) => {
          answer += `[${idx + 1}] ${s.title} - ${s.url}\n`;
        });
      }
      
      // Update state with sources
      return {
        messages: [new AIMessage(answer)],
        sources,
      };
    } catch (error: any) {
      console.error(`   ❌ Gemini verification failed:`, error.message);
      // Fall through to research mode as fallback
    }
  }
  
  // MODE: RESEARCH - Let LLM orchestrate tools (deep multi-source)
  console.log(`   📚 Executing RESEARCH mode - LLM tool orchestration`);
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.1,
    openAIApiKey: env.OPENAI_API_KEY,
    streaming: true,
  }).bindTools(maritimeTools);
  
  // LLM decides what tools to use
  const response = await llm.invoke([systemMessage, ...state.messages]);
  
  console.log(`   Response type: ${response.constructor.name}`);
  console.log(`   Has tool calls: ${!!(response as AIMessage).tool_calls?.length}`);
  
  return {
    messages: [response],
  };
}

// =====================
// TOOL PROCESSING NODE
// =====================

/**
 * Process tool results and build research context
 * Simplified - just extract sources and format context
 */
async function processToolResults(state: State): Promise<Partial<State>> {
  console.log(`\n🔧 PROCESS TOOL RESULTS`);
  
  const lastMessages = state.messages.slice(-10); // Check recent messages
  const toolMessages = lastMessages.filter((m: BaseMessage) => m.constructor.name === 'ToolMessage');
  
  if (toolMessages.length === 0) {
    return {};
  }
  
  console.log(`   Processing ${toolMessages.length} tool results`);
  
  // Extract sources from all tool results
  const allSources: Source[] = [];
  let hasResearch = false;
  
  for (const toolMsg of toolMessages) {
    const content = typeof toolMsg.content === 'string' ? toolMsg.content : JSON.stringify(toolMsg.content);
    
    try {
      const data = JSON.parse(content);
      
      if (data.sources && Array.isArray(data.sources)) {
        allSources.push(...data.sources);
        hasResearch = true;
      }
      
      // Also check for Gemini answer
      if (data.answer) {
        hasResearch = true;
      }
    } catch (e) {
      // Not JSON, skip
    }
  }
  
  // Build research context if we have sources
  let researchContext: string | null = null;
  if (hasResearch && allSources.length > 0) {
    researchContext = `=== RESEARCH CONTEXT ===\nFound ${allSources.length} sources:\n\n`;
    allSources.forEach((source, idx) => {
      researchContext += `[${idx + 1}] ${source.title}\n${source.url}\n${source.content?.substring(0, 300)}...\n\n`;
    });
  }
  
  console.log(`   Sources extracted: ${allSources.length}`);
  console.log(`   Research context: ${hasResearch ? 'YES' : 'NO'}`);
  
  return {
    sources: allSources,
    researchContext,
  };
}

// =====================
// ROUTING LOGIC
// =====================

/**
 * Simple routing - LLM decides via tool calls
 */
function shouldContinue(state: State): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const hasToolCalls = !!(lastMessage as AIMessage).tool_calls?.length;
  
  console.log(`\n🔀 ROUTING`);
  console.log(`   Last message: ${lastMessage.constructor.name}`);
  console.log(`   Has tool calls: ${hasToolCalls}`);
  
  // If LLM called tools, execute them
  if (hasToolCalls) {
    console.log(`→ Execute tools`);
    return "tools";
  }
  
  // Otherwise done
  console.log(`→ END`);
  return END;
}

// =====================
// BUILD WORKFLOW
// =====================

const toolNode = new ToolNode(maritimeTools);

const workflow = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addNode("process", processToolResults)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    "tools": "tools",
    [END]: END,
  })
  .addEdge("tools", "process")
  .addEdge("process", "agent"); // Loop back to agent after processing

const checkpointer = new MemorySaver();
export const agent = workflow.compile({ checkpointer });

// =====================
// HANDLER
// =====================

/**
 * Handle chat request with streaming
 */
export async function handleChatWithAgent(request: ChatRequest): Promise<ReadableStream> {
  const { messages, sessionId, enableBrowsing, env } = request;
  
  console.log(`\n🚀 AGENT REQUEST | Session: ${sessionId} | Browsing: ${enableBrowsing}`);
  
  // Load session memory
  let sessionMemory: SessionMemory | null = null;
  let sessionMemoryManager: SessionMemoryManager | null = null;
  
  if (env.CHAT_SESSIONS) {
    try {
      sessionMemoryManager = new SessionMemoryManager(env.CHAT_SESSIONS);
      sessionMemory = await sessionMemoryManager.load(sessionId);
      sessionMemory = sessionMemoryManager.updateConversationSummary(sessionMemory);
      
      console.log(`📦 Memory loaded: ${sessionMemory.conversationTopic || 'new session'}`);
    } catch (error) {
      console.error(`❌ Memory load failed:`, error);
    }
  }
  
  // Convert messages to BaseMessage format
  const baseMessages: BaseMessage[] = messages.map((msg) =>
    msg.role === "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
  );
  
  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      try {
        // CRITICAL: Use .stream() with streamMode (not .streamEvents())
        // This enables token-level streaming via AIMessageChunk
        const agentStream = await agent.stream(
          {
            messages: baseMessages,
            sessionId,
            enableBrowsing,
          },
          {
            configurable: {
              thread_id: sessionId,
              env,
              sessionMemory,
            },
            streamMode: ["messages", "updates"] as const, // KEY: Enable both message and state streaming
          }
        );
        
        let fullResponse = "";
        let sources: Source[] = [];
        let eventCount = 0;
        
        console.log(`📡 Agent stream created - entering event loop`);
        
        // Stream events using [streamType, event] tuple pattern
        for await (const [streamType, event] of agentStream) {
          eventCount++;
          
          // Handle token-level streaming from "messages" mode
          if (streamType === 'messages') {
            const messages = event as BaseMessage[] | BaseMessage;
            const messageArray = Array.isArray(messages) ? messages : [messages];
            
            for (const msg of messageArray) {
              // Check for AIMessageChunk (streaming tokens)
              if (msg.constructor.name === 'AIMessageChunk' && msg.content) {
                const text = typeof msg.content === 'string' ? msg.content : String(msg.content);
                if (text) {
                  fullResponse += text;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: text })}\n\n`));
                  
                  if (eventCount <= 5) {
                    console.log(`   💬 Token #${eventCount}: "${text.substring(0, 30)}..."`);
                  }
                }
              }
            }
            continue; // Skip to next event
          }
          
          // Handle node-level updates from "updates" mode
          if (streamType === 'updates') {
            const eventKey = Object.keys(event || {})[0];
            
            // Capture sources from tool execution node
            if (event.tools || event.process) {
              const nodeState = event.tools || event.process;
              
              // Check for verified sources in state
              if (nodeState?.verifiedSources && Array.isArray(nodeState.verifiedSources)) {
                const newSources = nodeState.verifiedSources;
                
                // Emit source events for frontend
                for (const source of newSources) {
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: 'source',
                      action: 'selected',
                      title: source.title,
                      url: source.url,
                      content: source.content?.substring(0, 300) || '',
                      score: source.score || 0.5
                    })}\n\n`
                  ));
                }
                
                sources.push(...newSources);
                console.log(`   📚 Added ${newSources.length} sources (total: ${sources.length})`);
              }
            }
          }
        }
        
        console.log(`\n📊 Stream complete:`);
        console.log(`   Response length: ${fullResponse.length} chars`);
        console.log(`   Sources: ${sources.length}`);
        
        // If we got no response, something went wrong
        if (fullResponse.length === 0) {
          console.error(`❌ No response content generated!`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            content: 'Agent completed but produced no response. This might be a streaming configuration issue.' 
          })}\n\n`));
        }
        
        // Send sources
        if (sources.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'sources', 
            sources: sources.slice(0, 10) // Limit to 10 sources
          })}\n\n`));
        }
        
        // Save memory
        if (sessionMemoryManager && sessionMemory) {
          const userMessage = messages[messages.length - 1];
          sessionMemory.recentMessages.push(
            { role: 'user', content: userMessage.content, timestamp: Date.now() },
            { role: 'assistant', content: fullResponse, timestamp: Date.now() }
          );
          
          // Keep last 20 messages
          if (sessionMemory.recentMessages.length > 20) {
            sessionMemory.recentMessages = sessionMemory.recentMessages.slice(-20);
          }
          
          await sessionMemoryManager.save(sessionId, sessionMemory);
          console.log(`💾 Memory saved`);
        }
        
        // Done
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error: any) {
        console.error('❌ Stream error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error', 
          content: error.message 
        })}\n\n`));
        controller.close();
      }
    },
  });
  
  return stream;
}

