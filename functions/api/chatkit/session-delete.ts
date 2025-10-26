/**
 * Session Delete Endpoint
 * Explicitly cleans up KV cache when sessions are deleted
 */

export async function onRequestDelete(context: any) {
  const { request, env } = context;
  
  try {
    // Parse session ID from request
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('Session delete error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete session cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle OPTIONS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

