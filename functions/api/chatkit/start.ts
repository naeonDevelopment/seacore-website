/**
 * ChatKit Session Initialization
 * Creates a new ChatKit session with OpenAI
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
    // Create a ChatKit session
    const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'chatkit-1.0',
      },
      body: JSON.stringify({
        workflow: {
          instructions: `You are a maritime maintenance expert assistant for fleetcore.ai. 
          
You specialize in:
- Maritime maintenance management systems (PMS)
- SOLAS/MARPOL regulatory compliance
- Fleet management and technical operations
- Preventive maintenance scheduling
- Equipment lifecycle management
- Spare parts inventory management

Your knowledge includes:
- Dual-interval task tracking (hours + calendar)
- Equipment registry and health monitoring
- Compliance tracking and audit trails
- Maritime industry regulations and standards
- Technical superintendent operations
- Chief engineer responsibilities

When users ask questions:
1. Provide accurate, technical information about maritime maintenance
2. Reference specific fleetcore features when relevant
3. Guide users to appropriate sections of the website
4. Explain complex maritime concepts clearly
5. Suggest scheduling a demo for detailed information

Key fleetcore capabilities:
- Automated PMS schedule generation from OEM recommendations
- Real-time equipment monitoring and alerts
- Cross-fleet intelligence and benchmarking
- Digital documentation and reporting
- SOLAS 2024/MARPOL compliance built-in
- Multi-tenant architecture for enterprise fleets

Website sections:
- Home: Overview of maritime maintenance OS
- Platform: Technical architecture and modules
- Solutions: Operating system approach and capabilities
- About: Company mission and expertise
- Contact: Demo scheduling and inquiries

Be conversational, helpful, and knowledgeable. Always offer to schedule a demo at calendly.com/fleetcore-ai/30min for detailed discussions.`,
          model: 'gpt-4-turbo-preview',
        },
        user: 'anonymous',
        rate_limits: {
          max_requests_per_1_minute: 20,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
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
    console.error('Session creation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

