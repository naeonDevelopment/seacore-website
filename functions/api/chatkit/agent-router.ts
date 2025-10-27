/**
 * Agent Router - Feature Flag System
 * Routes between LangGraph agent (new) and legacy agent (old)
 */

import { handleChatWithLangGraph, type ChatRequest } from './langgraph-agent';

// Feature flag - controlled via environment variable
const USE_LANGGRAPH = (env: any): boolean => {
  const flag = env.USE_LANGGRAPH?.toLowerCase();
  
  // Default to false for now (gradual rollout)
  if (!flag) return false;
  
  return flag === 'true' || flag === '1' || flag === 'yes';
};

/**
 * Route chat request to appropriate agent implementation
 */
export async function routeChatRequest(
  messages: Array<{ role: string; content: string }>,
  sessionId: string,
  enableBrowsing: boolean,
  env: any
): Promise<{ stream: ReadableStream; agent: 'langgraph' | 'legacy' }> {
  
  const useLangGraph = USE_LANGGRAPH(env);
  
  console.log(`🔀 Agent Router: ${useLangGraph ? 'LangGraph' : 'Legacy'}`);
  console.log(`   USE_LANGGRAPH env value: "${env.USE_LANGGRAPH}"`);
  console.log(`   OPENAI_API_KEY present: ${!!env.OPENAI_API_KEY}`);
  console.log(`   TAVILY_API_KEY present: ${!!env.TAVILY_API_KEY}`);
  console.log(`   GEMINI_API_KEY present: ${!!env.GEMINI_API_KEY}`);
  console.log(`   LANGSMITH_API_KEY present: ${!!env.LANGSMITH_API_KEY}`);
  
  if (useLangGraph) {
    // Use new LangGraph agent with Gemini + Tavily hybrid
    console.log(`   ✅ Routing to LangGraph agent (Gemini + Tavily)`);
    try {
      const stream = await handleChatWithLangGraph({
        messages,
        sessionId,
        enableBrowsing,
        env: {
          OPENAI_API_KEY: env.OPENAI_API_KEY,
          TAVILY_API_KEY: env.TAVILY_API_KEY,
          GEMINI_API_KEY: env.GEMINI_API_KEY,
          LANGSMITH_API_KEY: env.LANGSMITH_API_KEY,
        }
      });
      
      console.log(`   ✅ LangGraph stream created successfully`);
      return { stream, agent: 'langgraph' };
    } catch (error: any) {
      console.error(`❌ LangGraph agent failed:`, error);
      console.error(`   Error name: ${error.name}`);
      console.error(`   Error message: ${error.message}`);
      console.error(`   Stack: ${error.stack?.substring(0, 500)}`);
      
      // Re-throw the error - don't fall back to legacy silently
      throw new Error(`LangGraph agent error: ${error.message}`);
    }
  } else {
    // Use legacy agent (Tavily only)
    console.log(`   ⚠️  Routing to legacy agent (Tavily only - no Gemini)`);
    const { onRequestPost } = await import('./_legacy_chat');
    
    // Create a mock Request object for the legacy agent
    const mockRequest = new Request('https://dummy.com/api/chatkit/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        sessionId,
        enableBrowsing,
      }),
    });
    
    const response = await onRequestPost({
      request: mockRequest,
      env,
    });
    
    return { stream: response.body as ReadableStream, agent: 'legacy' };
  }
}

/**
 * Get agent status for debugging
 */
export function getAgentStatus(env: any): {
  active: 'langgraph' | 'legacy';
  featureFlag: boolean;
  capabilities: string[];
} {
  const useLangGraph = USE_LANGGRAPH(env);
  
  return {
    active: useLangGraph ? 'langgraph' : 'legacy',
    featureFlag: useLangGraph,
    capabilities: useLangGraph 
      ? [
          'LangGraph StateGraph orchestration',
          'Hybrid research (Gemini + Tavily)',
          'Google Search grounding',
          'Maritime knowledge base',
          'Intelligent tool selection',
          'Automatic source evaluation',
          'Confidence scoring',
          'Follow-up detection',
          'State persistence (MemorySaver)',
        ]
      : [
          'Manual orchestration',
          'Direct Tavily API calls',
          'KV-based session cache',
          'Custom streaming',
        ],
  };
}

export { USE_LANGGRAPH };

