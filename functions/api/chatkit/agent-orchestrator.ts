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
 * Main agent node - LLM decides what to do
 * Relies on maritime prompt intelligence, not code logic
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
  
  // Detect platform query (no entity mentions)
  const isPlatform = isPlatformQuery(userQuery);
  const hasEntityMention = /vessel|ship|fleet|company|equipment|manufacturer|imo|mmsi/i.test(userQuery);
  
  console.log(`   Platform query: ${isPlatform}`);
  console.log(`   Has entity: ${hasEntityMention}`);
  
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
  
  // Create system message with prompt + context
  const systemMessage = new SystemMessage(MARITIME_SYSTEM_PROMPT + contextAddition);
  
  // PLATFORM MODE: Don't bind tools at all (like legacy agent mode='none')
  // Answer directly from training data about fleetcore features
  if (isPlatform && !hasEntityMention) {
    console.log(`   🎯 PLATFORM MODE: Responding from training data (NO TOOLS BOUND)`);
    
    // LLM WITHOUT tools - like legacy mode='none'
    const platformLlm = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.1,
      openAIApiKey: env.OPENAI_API_KEY,
      streaming: true,
    });
    
    // Add explicit platform instruction
    const platformContext = `\n\n=== PLATFORM QUERY DETECTED ===
This is a question about fleetcore platform features, capabilities, or implementation.
Answer comprehensively from your training knowledge about the fleetcore Maritime Maintenance Operating System.
Do NOT suggest using external research - provide detailed information about the system directly.`;
    
    const platformSystemMessage = new SystemMessage(MARITIME_SYSTEM_PROMPT + contextAddition + platformContext);
    const response = await platformLlm.invoke([platformSystemMessage, ...state.messages]);
    
    console.log(`   ✅ Platform response generated (no tools)`);
    return { messages: [response] };
  }
  
  // NORMAL MODE: Initialize LLM with tools for entity queries
  console.log(`   🔧 NORMAL MODE: LLM with tools available`);
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.1,
    openAIApiKey: env.OPENAI_API_KEY,
    streaming: true,
  }).bindTools(maritimeTools);
  
  // LLM decides what to do (call tools or respond directly)
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
        // Invoke agent with streaming
        const events = agent.streamEvents(
          {
            messages: baseMessages,
            sessionId,
            enableBrowsing,
          },
          {
            version: "v2",
            configurable: {
              thread_id: sessionId,
              env,
              sessionMemory,
            },
          }
        );
        
        let fullResponse = "";
        let sources: Source[] = [];
        
        // Stream events
        for await (const event of events) {
          // Debug logging
          if (event.event === "on_chat_model_start" || event.event === "on_chat_model_stream" || event.event === "on_chat_model_end") {
            console.log(`   📡 Stream event: ${event.event}`);
          }
          
          // Stream LLM tokens
          if (event.event === "on_chat_model_stream") {
            const chunk = event.data?.chunk;
            if (chunk?.content) {
              const text = typeof chunk.content === 'string' ? chunk.content : '';
              if (text) {
                fullResponse += text;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: text })}\n\n`));
                console.log(`   💬 Token: "${text.substring(0, 50)}..."`);
              }
            }
          }
          
          // Capture sources from tool results
          if (event.event === "on_tool_end") {
            console.log(`   🔧 Tool completed`);
            try {
              const result = event.data?.output;
              if (result) {
                const data = typeof result === 'string' ? JSON.parse(result) : result;
                if (data.sources && Array.isArray(data.sources)) {
                  sources.push(...data.sources);
                  console.log(`   📚 Added ${data.sources.length} sources`);
                }
              }
            } catch (e) {
              // Skip
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

