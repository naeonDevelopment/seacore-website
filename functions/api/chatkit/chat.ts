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
  const { OPENAI_API_KEY, OPENAI_MODEL, TAVILY_API_KEY } = context.env;

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await context.request.json();
    const { messages, enableBrowsing } = body;

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

    // Optional lightweight web browsing: fetch top 3 search snippets and include as context
    let browsingContext = '';
    let researchPerformed = false;
    if (enableBrowsing && TAVILY_API_KEY) {
      try {
        const q = messages[messages.length - 1]?.content || '';
        console.log('🔍 Performing online research for:', q);
        const tavilyRes = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            // Support both current and legacy Tavily auth schemes
            'Authorization': `Bearer ${TAVILY_API_KEY}`,
            'x-api-key': TAVILY_API_KEY,
          },
          body: JSON.stringify({ query: q, search_depth: 'basic', max_results: 3 }),
        });
        if (tavilyRes.ok) {
          const tavilyJson = await tavilyRes.json();
          const items = tavilyJson?.results || [];
          if (Array.isArray(items) && items.length) {
            browsingContext = items.map((r, i) => `(${i+1}) ${r.title}\n${r.snippet}\nSource: ${r.url}`).join('\n\n');
            researchPerformed = true;
            console.log(`✅ Found ${items.length} research results`);
          }
        }
      } catch (e) {
        console.error('❌ Research failed:', e);
        // Ignore browsing failures silently
      }
    }

    const DEFAULT_MODEL = 'gpt-4o-mini';
    const envModel = (OPENAI_MODEL || DEFAULT_MODEL).trim();
    // Normalize accidental spaces in model names (e.g., "gpt-5 mini")
    const selectedModel = envModel.replace(/\s+/g, '-');

    // Call OpenAI API with streaming enabled
    let usedModel = selectedModel;
    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: usedModel,
        messages: browsingContext
          ? [
              { role: 'system', content: `${SYSTEM_PROMPT}\n\nWhen relevant, use the following web snippets to enhance your answer and add short citations like [1], [2]. If the snippets conflict with fleetcore-specific information, prefer fleetcore data.\n\nWeb snippets:\n${browsingContext}` },
              ...messages,
            ]
          : conversationMessages,
        temperature: 0.7,
        max_tokens: 800,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        stream: true, // Enable streaming
      }),
    });

    // If model is invalid (400), retry once with default cheaper model
    if (!response.ok && response.status === 400 && usedModel !== DEFAULT_MODEL) {
      usedModel = DEFAULT_MODEL;
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: usedModel,
          messages: browsingContext
            ? [
                { role: 'system', content: `${SYSTEM_PROMPT}\n\nWhen relevant, use the following web snippets to enhance your answer and add short citations like [1], [2]. If the snippets conflict with fleetcore-specific information, prefer fleetcore data.\n\nWeb snippets:\n${browsingContext}` },
                ...messages,
              ]
            : conversationMessages,
          temperature: 0.7,
          max_tokens: 800,
          presence_penalty: 0.6,
          frequency_penalty: 0.3,
          stream: true,
        }),
      });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to get response from AI' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response back to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const rb = response.body;
        if (!rb) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }
        const reader = rb.getReader();
        const decoder = new TextDecoder();
        let thinking = '';
        let isFirstChunk = true;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  
                  // Generate detailed thinking/reasoning for first chunk
                  if (isFirstChunk && content) {
                    // Build detailed chain of thought
                    const userQuery = messages[messages.length - 1]?.content || '';
                    const thinkingParts = ['Analyzing your question about'];
                    
                    // Add context-aware reasoning
                    if (userQuery.toLowerCase().includes('pms')) {
                      thinkingParts.push('PMS (Planned Maintenance System)');
                    } else if (userQuery.toLowerCase().includes('solas') || userQuery.toLowerCase().includes('marpol')) {
                      thinkingParts.push('maritime regulations and compliance');
                    } else if (userQuery.toLowerCase().includes('maintenance')) {
                      thinkingParts.push('maintenance management');
                    } else {
                      thinkingParts.push('maritime operations');
                    }
                    
                    if (researchPerformed) {
                      thinkingParts.push('| Searched latest industry sources');
                      thinkingParts.push('| Cross-referencing with fleetcore capabilities');
                    } else {
                      thinkingParts.push('| Drawing from fleetcore knowledge base');
                    }
                    
                    thinkingParts.push('| Formulating comprehensive response...');
                    
                    thinking = thinkingParts.join(' ');
                    
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: thinking })}\n\n`)
                    );
                    
                    // Send research indicator if browsing was used
                    if (researchPerformed) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: 'research', content: 'Online research completed' })}\n\n`)
                      );
                    }
                    
                    isFirstChunk = false;
                  }

                  if (content) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`)
                    );
                  }
                } catch (e) {
                  console.error('Error parsing stream chunk:', e);
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'x-model': usedModel,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

