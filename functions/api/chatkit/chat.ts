/**
 * ChatKit Chat Endpoint - Maritime Intelligence Agent
 * LLM-driven orchestrator with unified tools (Gemini + Deep Research)
 * 
 * PHASE 1 SECURITY: CORS, input validation, error sanitization, size limits
 */

import { handleChatWithAgent, type ChatRequest } from './agent-orchestrator';
import { getCorsHeaders } from './cors-config';
import { performSecurityCheck } from './input-security';
import { createErrorResponse } from './error-sanitizer';

interface Env {
  OPENAI_API_KEY: string;
  TAVILY_API_KEY: string;
  GEMINI_API_KEY: string;
  LANGSMITH_API_KEY?: string;
  USE_LANGGRAPH?: string;
  
  // Cross-session memory infrastructure
  MARITIME_MEMORY: D1Database;
  VECTOR_INDEX: VectorizeIndex;
  AI: Ai;
  CHAT_SESSIONS: KVNamespace;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  // ✅ SECURITY: Strict CORS with origin whitelist
  const corsHeaders = getCorsHeaders(request);

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ✅ SECURITY: Request size limit (100 KB)
  const MAX_REQUEST_SIZE = 100 * 1024;
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
    return new Response(
      JSON.stringify({ 
        error: 'Request too large',
        code: 'REQUEST_TOO_LARGE',
        maxSize: '100 KB'
      }),
      { 
        status: 413, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
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

    // ✅ SECURITY: Input validation enforcement
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === 'user') {
      const securityCheck = performSecurityCheck(
        lastUserMessage.content,
        sessionId,
        { 
          maxRequests: 10,
          windowMs: 60000,
          strictMode: false // Set to true for maximum security
        }
      );

      if (!securityCheck.allowed) {
        console.warn('[SECURITY] Input validation failed:', {
          sessionId: sessionId.substring(0, 8) + '...',
          reason: securityCheck.reason,
          risk: securityCheck.validation.risk
        });
        
        return new Response(
          JSON.stringify({
            error: 'Security validation failed',
            code: 'INVALID_INPUT',
            reason: securityCheck.reason
          }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📥 Chat Request | Session: ${sessionId} | Messages: ${messages.length} | Browsing: ${enableBrowsing}`);
    console.log(`${'='.repeat(80)}\n`);

    // Direct call to new simplified orchestrator
    const stream = await handleChatWithAgent({
      messages,
      sessionId,
      enableBrowsing,
      env: {
        OPENAI_API_KEY: env.OPENAI_API_KEY,
        TAVILY_API_KEY: env.TAVILY_API_KEY,
        GEMINI_API_KEY: env.GEMINI_API_KEY,
        LANGSMITH_API_KEY: env.LANGSMITH_API_KEY,
        CHAT_SESSIONS: env.CHAT_SESSIONS,
        MARITIME_MEMORY: env.MARITIME_MEMORY,
        VECTOR_INDEX: env.VECTOR_INDEX,
        AI: env.AI,
      }
    });

    console.log(`✅ Using simplified orchestrator\n`);

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
    // ✅ SECURITY: Sanitized error responses
    return createErrorResponse(error, 500, corsHeaders, 'chat_endpoint');
  }
}

/**
 * Health check endpoint
 */
export async function onRequestGet(context: { request: Request; env: Env }) {
  const { env } = context;
  
  return new Response(
    JSON.stringify({
      status: 'healthy',
      agent: 'simplified-orchestrator',
      capabilities: [
        'LangGraph StateGraph orchestration',
        'LLM-driven tool selection',
        'Unified Gemini tool (grounding + verification)',
        'Deep research with content intelligence',
        'Maritime knowledge base',
        'Context-aware follow-ups',
        'Entity extraction and memory',
        'Session memory (KV)',
      ],
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

