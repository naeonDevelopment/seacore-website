/**
 * Diagnostic endpoint to check agent configuration
 */

interface Env {
  OPENAI_API_KEY: string;
  TAVILY_API_KEY: string;
  GEMINI_API_KEY: string;
  USE_LANGGRAPH?: string;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { env } = context;
  
  return new Response(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: {
        USE_LANGGRAPH: env.USE_LANGGRAPH || 'NOT SET',
        USE_LANGGRAPH_lowercase: env.USE_LANGGRAPH?.toLowerCase() || 'NOT SET',
        has_OPENAI_API_KEY: !!env.OPENAI_API_KEY,
        has_TAVILY_API_KEY: !!env.TAVILY_API_KEY,
        has_GEMINI_API_KEY: !!env.GEMINI_API_KEY,
      },
      routing_logic: {
        USE_LANGGRAPH_flag_evaluation: env.USE_LANGGRAPH?.toLowerCase() === 'true' || 
                                        env.USE_LANGGRAPH?.toLowerCase() === '1' || 
                                        env.USE_LANGGRAPH?.toLowerCase() === 'yes',
        will_route_to: (env.USE_LANGGRAPH?.toLowerCase() === 'true' || 
                       env.USE_LANGGRAPH?.toLowerCase() === '1' || 
                       env.USE_LANGGRAPH?.toLowerCase() === 'yes') ? 'LANGGRAPH' : 'LEGACY',
      },
    }, null, 2),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

