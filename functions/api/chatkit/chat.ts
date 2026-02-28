/**
 * ChatKit Chat Endpoint - Maritime Intelligence Agent
 * LLM-driven orchestrator with unified tools (Gemini + Deep Research)
 * 
 * PHASE 1 SECURITY: CORS, input validation, error sanitization, size limits
 */

import { handleChatWithAgent, type ChatRequest } from './agent-orchestrator';
import { sanitizeUserInput, validateInput } from './input-security';
import { getCorsHeaders } from './cors-config';
import { createErrorResponse } from './error-sanitizer';
import { checkMultiTierRateLimit, createRateLimitResponse, getRateLimitHeaders } from './rate-limiter';

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

  // ✅ SECURITY: Actual body size check (not spoofable Content-Length header)
  const MAX_REQUEST_SIZE = 100 * 1024;

  try {
    const rawBuffer = await request.arrayBuffer();
    if (rawBuffer.byteLength > MAX_REQUEST_SIZE) {
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

    const body = JSON.parse(new TextDecoder().decode(rawBuffer)) as {
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

    // ✅ SECURITY: Multi-tier rate limiting (KV-based, works across Workers)
    let rateLimitResult: Awaited<ReturnType<typeof checkMultiTierRateLimit>> | null = null;
    if (env.CHAT_SESSIONS) {
      rateLimitResult = await checkMultiTierRateLimit(
        request,
        sessionId,
        undefined, // userId (no auth yet)
        env.CHAT_SESSIONS
      );
      
      if (!rateLimitResult.allowed) {
        const rateLimitResponse = createRateLimitResponse(rateLimitResult);
        Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
          rateLimitResponse.headers.set(key, value);
        });
        Object.entries(corsHeaders).forEach(([key, value]) => {
          rateLimitResponse.headers.set(key, value);
        });
        return rateLimitResponse;
      }
    }

    // ✅ SECURITY: Validate ALL user messages, not only the last one
    for (const msg of messages) {
      if (msg.role !== 'user') continue;
      const sanitized = sanitizeUserInput(msg.content);
      const validation = validateInput(sanitized.content);
      if (!validation.valid || validation.risk === 'high') {
        console.warn('[SECURITY] Input validation failed:', {
          sessionId: sessionId.substring(0, 8) + '...',
          errors: validation.errors,
          risk: validation.risk,
        });
        return new Response(
          JSON.stringify({
            error: 'Security validation failed',
            code: 'INVALID_INPUT',
            reason: 'High risk input detected',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
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

    // Return SSE stream with rate limit headers (reuse result from check above)
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders,
    };
    
    if (rateLimitResult) {
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        headers[key] = value;
      });
    }

    return new Response(stream, { headers });

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

