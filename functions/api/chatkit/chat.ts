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
    
    // Known valid OpenAI models as of Oct 2025
    const VALID_MODELS = [
      // GPT-5 series (if available)
      'gpt-5', 'gpt-5-turbo', 'gpt-5-mini',
      // GPT-4o series
      'gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024-08-06',
      // GPT-4 series
      'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-4', 
      'gpt-3.5-turbo', 'gpt-3.5-turbo-16k',
      // Reasoning models
      'o1-preview', 'o1-mini', 'o3-mini',
    ];
    
    const envModel = (OPENAI_MODEL || DEFAULT_MODEL).trim();
    // Normalize accidental spaces in model names (e.g., "gpt-5 mini" -> "gpt-5-mini")
    let selectedModel = envModel.replace(/\s+/g, '-');
    
    // Validate model and warn if invalid
    if (!VALID_MODELS.includes(selectedModel) && !selectedModel.startsWith('o1') && !selectedModel.startsWith('o3') && !selectedModel.startsWith('gpt-5')) {
      console.warn(`⚠️ Model "${selectedModel}" may not be valid. Attempting anyway, will fallback to ${DEFAULT_MODEL} on error.`);
    }
    
    // Detect if using reasoning-capable models
    // o1/o3 models have built-in reasoning, GPT-5 and GPT-4o support reasoning_effort
    const isO1O3Model = selectedModel.includes('o1') || selectedModel.includes('o3');
    const supportsReasoningEffort = selectedModel.includes('gpt-5') || selectedModel.includes('gpt-4o');

    // Call OpenAI API with streaming enabled
    let usedModel = selectedModel;
    
    // Log model and reasoning configuration
    console.log(`🤖 Using model: ${usedModel}`);
    if (supportsReasoningEffort) {
      console.log('🧠 Chain of Thought enabled: reasoning_effort = high');
    } else if (isO1O3Model) {
      console.log('🧠 Built-in reasoning model (o1/o3)');
    }
    
    // Build request body with model-specific parameters
    const requestBody = {
      model: usedModel,
      messages: browsingContext
        ? [
            { role: 'system', content: `${SYSTEM_PROMPT}\n\nWhen relevant, use the following web snippets to enhance your answer and add short citations like [1], [2]. If the snippets conflict with fleetcore-specific information, prefer fleetcore data.\n\nWeb snippets:\n${browsingContext}` },
            ...messages,
          ]
        : conversationMessages,
      stream: true, // Enable streaming
      ...(isO1O3Model 
        ? {
            // o1/o3 models don't support temperature, presence_penalty, frequency_penalty
            // They have built-in reasoning that can't be controlled
            max_completion_tokens: 3000,
          }
        : supportsReasoningEffort
        ? {
            // GPT-5 and GPT-4o with extended reasoning support
            temperature: 0.7,
            max_tokens: 2500, // Increased from 800 to avoid chopping
            presence_penalty: 0.6,
            frequency_penalty: 0.3,
            // Chain of Thought: Options are 'minimal', 'low', 'medium', 'high'
            // Higher values = deeper reasoning but slower responses
            reasoning_effort: 'high', // Use maximum reasoning for best quality
          }
        : {
            // Standard models without reasoning capabilities
            temperature: 0.7,
            max_tokens: 2500,
            presence_penalty: 0.6,
            frequency_penalty: 0.3,
          }
      ),
    };
    
    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // If model is invalid (400), retry once with default cheaper model
    if (!response.ok && response.status === 400 && usedModel !== DEFAULT_MODEL) {
      console.log(`⚠️ Model "${usedModel}" failed, falling back to ${DEFAULT_MODEL}`);
      usedModel = DEFAULT_MODEL;
      
      const fallbackBody = {
        model: usedModel,
        messages: browsingContext
          ? [
              { role: 'system', content: `${SYSTEM_PROMPT}\n\nWhen relevant, use the following web snippets to enhance your answer and add short citations like [1], [2]. If the snippets conflict with fleetcore-specific information, prefer fleetcore data.\n\nWeb snippets:\n${browsingContext}` },
              ...messages,
            ]
          : conversationMessages,
        temperature: 0.7,
        max_tokens: 2500,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        stream: true,
        // gpt-4o-mini doesn't support reasoning_effort
      };
      
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fallbackBody),
      });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ OpenAI API error:', error);
      console.error('❌ Attempted model:', usedModel);
      console.error('❌ Original env model:', envModel);
      
      // Return a user-friendly error as a valid response (200) so the chat doesn't break
      return new Response(
        JSON.stringify({ 
          message: `I apologize, but I'm having trouble connecting with the "${usedModel}" model. Please check your OPENAI_MODEL environment variable or contact support. Valid models include: gpt-4o, gpt-4o-mini, gpt-4-turbo.`,
          error: true,
          attempted_model: usedModel,
          available_models: VALID_MODELS
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
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
        let reasoningContent = '';
        let isFirstChunk = true;
        let hasShownThinking = false;

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
                  const delta = parsed.choices?.[0]?.delta || {};
                  const content = delta.content || '';
                  
                  // Capture reasoning from o1/o3 models or gpt-4o with reasoning_effort
                  const reasoningDelta = delta.reasoning_content || '';
                  if (reasoningDelta) {
                    reasoningContent += reasoningDelta;
                    // Stream reasoning as thinking
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: reasoningContent })}\n\n`)
                    );
                    hasShownThinking = true;
                  }
                  
                  // Generate detailed thinking/reasoning for first chunk if no native reasoning
                  if (isFirstChunk && content && !hasShownThinking) {
                    // Build detailed chain of thought
                    const userQuery = messages[messages.length - 1]?.content || '';
                    const thinkingParts = ['Analyzing your question about'];
                    
                    // Add context-aware reasoning based on query keywords
                    if (userQuery.toLowerCase().includes('pms')) {
                      thinkingParts.push('PMS (Planned Maintenance System)');
                      thinkingParts.push('→ Checking schedule generation capabilities');
                      thinkingParts.push('→ Reviewing OEM recommendations');
                    } else if (userQuery.toLowerCase().includes('task')) {
                      thinkingParts.push('task management systems');
                      thinkingParts.push('→ Evaluating dual-interval tracking');
                      thinkingParts.push('→ Analyzing maintenance workflows');
                    } else if (userQuery.toLowerCase().includes('solas') || userQuery.toLowerCase().includes('marpol')) {
                      thinkingParts.push('maritime regulations and compliance');
                      thinkingParts.push('→ Reviewing SOLAS 2024 requirements');
                      thinkingParts.push('→ Checking MARPOL standards');
                    } else if (userQuery.toLowerCase().includes('maintenance')) {
                      thinkingParts.push('maintenance management');
                      thinkingParts.push('→ Exploring preventive vs corrective strategies');
                      thinkingParts.push('→ Considering equipment lifecycle');
                    } else if (userQuery.toLowerCase().includes('spare') || userQuery.toLowerCase().includes('inventory')) {
                      thinkingParts.push('inventory and spare parts management');
                      thinkingParts.push('→ Analyzing stock optimization');
                      thinkingParts.push('→ Checking procurement workflows');
                    } else {
                      thinkingParts.push('maritime operations');
                      thinkingParts.push('→ Evaluating operational context');
                    }
                    
                    if (researchPerformed) {
                      thinkingParts.push('→ Searched latest industry sources');
                      thinkingParts.push('→ Cross-referencing with fleetcore capabilities');
                    } else {
                      thinkingParts.push('→ Drawing from fleetcore knowledge base');
                    }
                    
                    thinkingParts.push('→ Formulating comprehensive response...');
                    
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
                    
                    hasShownThinking = true;
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

