/**
 * ChatKit Session Refresh
 * Refreshes an existing ChatKit session
 */

interface Env {
  OPENAI_API_KEY: string;
}

export async function onRequestPost(context: { env: Env; request: Request }) {
  const { OPENAI_API_KEY } = context.env;

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await context.request.json();
    const { currentClientSecret } = body;

    if (!currentClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Current client secret required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Refresh the session
    const response = await fetch('https://api.openai.com/v1/chatkit/sessions/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'chatkit-1.0',
      },
      body: JSON.stringify({
        client_secret: currentClientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Session refresh error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to refresh session' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ client_secret: data.client_secret }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Session refresh error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

