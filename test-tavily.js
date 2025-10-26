/**
 * Quick Tavily API Test
 * Run with: node test-tavily.js
 * 
 * This tests if your TAVILY_API_KEY is working
 */

// Replace with your actual Tavily API key
const TAVILY_API_KEY = 'YOUR_KEY_HERE'; // Get from Cloudflare secret

async function testTavilyAPI() {
  console.log('🔍 Testing Tavily API...\n');
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`,
        'x-api-key': TAVILY_API_KEY,
      },
      body: JSON.stringify({ 
        query: 'Maersk largest vessel by length', 
        search_depth: 'advanced',
        max_results: 3,
        include_answer: true
      }),
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ SUCCESS! Tavily API is working\n');
      console.log(`Answer: ${data.answer}\n`);
      console.log(`Sources found: ${data.results?.length || 0}`);
      
      if (data.results && data.results.length > 0) {
        console.log('\nTop 3 sources:');
        data.results.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.title}`);
          console.log(`     ${r.url}\n`);
        });
      }
    } else {
      const error = await response.text();
      console.log('\n❌ FAILED! Error details:');
      console.log(error);
      
      if (response.status === 401) {
        console.log('\n⚠️  401 = Invalid API key');
      } else if (response.status === 429) {
        console.log('\n⚠️  429 = Rate limit exceeded');
      } else if (response.status === 500) {
        console.log('\n⚠️  500 = Tavily API error');
      }
    }
  } catch (err) {
    console.error('❌ Request failed:', err.message);
  }
}

// Run test
testTavilyAPI();

