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
  
  if (useLangGraph) {
    // Use new LangGraph agent
    const stream = await handleChatWithLangGraph({
      messages,
      sessionId,
      enableBrowsing,
      env: {
        OPENAI_API_KEY: env.OPENAI_API_KEY,
        TAVILY_API_KEY: env.TAVILY_API_KEY,
      }
    });
    
    return { stream, agent: 'langgraph' };
  } else {
    // Use legacy agent (import dynamically to avoid loading if not needed)
    // This will be the existing chat.ts logic
    throw new Error('Legacy agent routing not yet implemented - will be added in next step');
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
          'Tool-based research (Tavily)',
          'Maritime knowledge base',
          'Automatic source selection',
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

