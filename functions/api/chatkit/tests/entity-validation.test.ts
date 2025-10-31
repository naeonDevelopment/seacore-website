import assert from 'assert';
import { validateVesselEntity } from '../entity-validation.ts';

const sources = [
  { title: 'Vesselfinder - Stanford Maya', url: 'https://www.vesselfinder.com/vessels/details/9613733', content: 'IMO 9613733 MMSI 377693000 Call Sign J8B4598' },
  { title: 'MarineLink Directory', url: 'https://directory.marinelink.com/ships/gt-243', content: 'Stanford Maya crew boat 41m' },
  { title: 'Owner', url: 'https://stanfordmarinegroup.com/vessel-chartering', content: 'Stanford Marine' },
];

// Positive match: query contains Stanford Maya + IMO
(() => {
  const result = validateVesselEntity('Tell me about Stanford Maya IMO 9613733', sources as any, 'Answer mentions IMO 9613733');
  assert.ok(result.match, 'Should match when IMO aligns');
  assert.ok((result.confidence || 0) >= 0.8, 'Confidence should be high with IMO match');
})();

// Negative / drift: different vessel in sources
(() => {
  const driftSources = [
    { title: 'Dynamic 17', url: 'https://www.vesselfinder.com/vessels/details/9562752', content: 'IMO 9562752' },
  ];
  const result = validateVesselEntity('Tell me about Stanford Maya IMO 9613733', driftSources as any, 'Answer mentions IMO 9562752');
  assert.ok(!result.match || (result.confidence || 0) < 0.8, 'Should not strongly match when IMO does not align');
})();

console.log('✓ entity-validation tests passed');


