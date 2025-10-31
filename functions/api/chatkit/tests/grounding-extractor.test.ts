import assert from 'assert';
import { extractSourcesFromGeminiResponse } from '../grounding-extractor.ts';

function mockGeminiResponse(parts: any): any {
  return { candidates: [{ content: { parts: [{ text: parts.answer || '' }] }, groundingMetadata: parts.gm || {} }] };
}

// Test: zero webResults but groundingChunks present → should extract from chunks and filter vertex redirects
(() => {
  const gm = {
    groundingChunks: [
      { web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc', title: 'Redirect', snippet: 'n/a' } },
      { web: { uri: 'https://www.vesselfinder.com/vessels/details/9613733', title: 'Vesselfinder', snippet: 'IMO 9613733' } },
    ],
  };
  const data = mockGeminiResponse({ gm, answer: 'Sample answer' });
  const src = extractSourcesFromGeminiResponse(data, 'query');
  assert.ok(src.length >= 1, 'Should extract at least 1 source from chunks');
  assert.ok(src.every(s => !s.url.includes('vertexaisearch.cloud.google.com')), 'Should filter vertex redirect URLs');
  assert.ok(src.some(s => s.url.includes('vesselfinder.com')), 'Should include direct source URLs');
})();

// Test: redirect-only (searchEntryPoint) → should fallback to Google search link
(() => {
  const gm = { searchEntryPoint: { renderedContent: '<div>entry</div>' } };
  const data = mockGeminiResponse({ gm, answer: 'Fallback answer text for snippet distribution' });
  const src = extractSourcesFromGeminiResponse(data, 'Stanford Maya IMO');
  assert.equal(src.length, 1, 'Should produce one fallback source');
  assert.ok(src[0].url.startsWith('https://www.google.com/search'), 'Fallback should be Google search URL');
})();

console.log('✓ grounding-extractor tests passed');


