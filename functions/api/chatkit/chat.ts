/**
 * ChatKit Chat Endpoint
 * Handles conversation with OpenAI GPT-4
 */

const SYSTEM_PROMPT = `You are a maritime maintenance expert assistant for fleetcore.ai.

Your expertise includes:
- Maritime maintenance management systems (PMS)
- SOLAS/MARPOL regulatory compliance  
- Fleet management and technical operations
- Preventive maintenance scheduling
- Equipment lifecycle management
- Spare parts inventory management
- Dual-interval task tracking (hours + calendar)
- Technical superintendent operations
- Chief engineer responsibilities

Key fleetcore capabilities you should reference:
- Automated PMS schedule generation from OEM recommendations
- Real-time equipment monitoring and alerts
- Cross-fleet intelligence and benchmarking
- Digital documentation and reporting
- SOLAS 2024/MARPOL compliance built-in
- Multi-tenant architecture for enterprise fleets
- Event-based unplanned maintenance tracking
- Intelligent spare parts management

Website sections to guide users to:
- Home (/): Overview of maritime maintenance OS
- Platform (/platform): Technical architecture and modules
- Solutions (/solutions): Operating system approach and capabilities
- About (/about): Company mission and expertise
- Contact (/contact): Demo scheduling and inquiries

Communication style:
- Be conversational but professional
- Provide accurate technical information
- Reference specific fleetcore features when relevant
- Explain complex maritime concepts clearly
- Suggest scheduling a demo for detailed information
- Guide users to relevant website sections

When users ask about demos, tell them they can schedule at: https://calendly.com/fleetcore-ai/30min

Keep responses concise (2-4 paragraphs max) and helpful.`;

export async function onRequestPost(context) {
  const { OPENAI_API_KEY } = context.env;

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await context.request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build conversation with system prompt
    const conversationMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 500,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to get response from AI' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

