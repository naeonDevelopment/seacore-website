/**
 * TEST ENDPOINT: Direct Gemini API test
 * Access: /test-gemini
 */

export async function onRequest(context: any) {
  const { env } = context;
  
  const testQuery = "tell me about vessel Dynamic 17";
  
  try {
    console.log('🧪 Testing Gemini API...');
    console.log('Has GEMINI_API_KEY:', !!env.GEMINI_API_KEY);
    
    // Gemini 2.5 Pro: Latest production model (paid tier)
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-latest:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': env.GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: testQuery }]
        }],
        systemInstruction: {
          parts: [{
            text: `You are a maritime expert. Provide factual information about vessels.`
          }]
        },
        tools: [{ google_search: {} }]
      }),
    });
    
    const status = response.status;
    const data = await response.json();
    
    return new Response(JSON.stringify({
      success: response.ok,
      status,
      query: testQuery,
      hasCandidate: !!data.candidates?.[0],
      hasAnswer: !!data.candidates?.[0]?.content?.parts?.[0]?.text,
      answerLength: data.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0,
      hasGroundingMetadata: !!data.candidates?.[0]?.groundingMetadata,
      groundingMetadataKeys: Object.keys(data.candidates?.[0]?.groundingMetadata || {}),
      webResultsCount: data.candidates?.[0]?.groundingMetadata?.webResults?.length || 0,
      groundingChunksCount: data.candidates?.[0]?.groundingMetadata?.groundingChunks?.length || 0,
      fullResponse: data,
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

