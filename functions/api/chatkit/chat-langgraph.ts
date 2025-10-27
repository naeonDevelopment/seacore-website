/**
 * LangGraph Chat Endpoint - New Implementation
 * Feature-flagged endpoint using LangGraph orchestration
 */

import { routeChatRequest, getAgentStatus } from './agent-router';

interface Env {
  OPENAI_API_KEY: string;
  TAVILY_API_KEY: string;
  GEMINI_API_KEY: string;
  LANGSMITH_API_KEY?: string;
  USE_LANGGRAPH?: string;
  // CHAT_SESSIONS not needed - LangGraph uses built-in MemorySaver
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json() as {
      messages: Array<{ role: string; content: string }>;
      sessionId: string;
      enableBrowsing?: boolean;
    };

    const { messages, sessionId, enableBrowsing = false } = body;

    if (!messages || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: messages, sessionId' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📥 Chat Request | Session: ${sessionId} | Messages: ${messages.length} | Browsing: ${enableBrowsing}`);
    console.log(`${'='.repeat(80)}\n`);

    // Route to appropriate agent
    const { stream, agent } = await routeChatRequest(
      messages,
      sessionId,
      enableBrowsing,
      env
    );

    console.log(`✅ Using ${agent} agent\n`);

    // Return SSE stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('❌ Chat endpoint error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
}

/**
 * Health check endpoint
 */
export async function onRequestGet(context: { request: Request; env: Env }) {
  const { env } = context;
  
  const status = getAgentStatus(env);
  
  return new Response(
    JSON.stringify({
      status: 'healthy',
      agent: status,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

