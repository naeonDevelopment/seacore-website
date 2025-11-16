/**
 * Session Delete Endpoint
 * Explicitly cleans up KV cache when sessions are deleted
 * 
 * SECURITY: CORS, error sanitization
 */

import { getCorsHeaders } from './cors-config';
import { createErrorResponse } from './error-sanitizer';

export async function onRequestDelete(context: any) {
  const { request, env } = context;
  
  // ✅ SECURITY: Strict CORS
  const corsHeaders = getCorsHeaders(request);
  
  try {
    // Parse session ID from request
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Check if KV binding exists
    if (!env.CHAT_SESSIONS) {
      console.warn('KV namespace CHAT_SESSIONS not bound - skipping cache cleanup');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Session deleted (KV not configured)' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Delete from KV cache
    const cacheKey = `session:${sessionId}`;
    await env.CHAT_SESSIONS.delete(cacheKey);
    
    console.log(`✅ Deleted session cache: ${sessionId}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      sessionId,
      message: 'Session cache deleted successfully' 
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
    
  } catch (error) {
    // ✅ PHASE 1 SECURITY: Sanitized error responses
    return createErrorResponse(error, 500, corsHeaders, 'session_delete');
  }
}

// Handle OPTIONS preflight
export async function onRequestOptions(context: any) {
  const { request } = context;
  const corsHeaders = getCorsHeaders(request);
  
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      'Access-Control-Max-Age': '86400',
    },
  });
}

