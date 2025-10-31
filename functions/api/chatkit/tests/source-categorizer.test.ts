import assert from 'assert';
import { categorizeSource, computeCoverage, missingVesselCoverage } from '../source-categorizer.ts';

(() => {
  assert.equal(categorizeSource('https://www.vesselfinder.com/vessels/details/9613733'), 'ais');
  assert.equal(categorizeSource('https://www.marinetraffic.com/ais/details/ships/imo:9613733'), 'ais');
  assert.equal(categorizeSource('https://www.equasis.org'), 'registry');
  assert.equal(categorizeSource('https://dnv.com'), 'class');
  assert.equal(categorizeSource('https://stanfordmarinegroup.com/vessel-chartering'), 'owner');
  assert.equal(categorizeSource('https://directory.marinelink.com/ships/gt-243'), 'directory_news');
})();

(() => {
  const sources = [
    { url: 'https://www.vesselfinder.com/vessels/details/9613733' },
    { url: 'https://www.equasis.org' },
    { url: 'https://stanfordmarinegroup.com/vessel-chartering' },
    { url: 'https://dnv.com' },
    { url: 'https://directory.marinelink.com/ships/gt-243' },
  ];
  const cov = computeCoverage(sources as any);
  const missing = missingVesselCoverage(cov);
  assert.equal(missing.length, 0, 'Complete vessel coverage should have no missing categories');
})();

(() => {
  const sources = [
    { url: 'https://www.vesselfinder.com/vessels/details/9613733' },
    { url: 'https://stanfordmarinegroup.com/vessel-chartering' },
  ];
  const cov = computeCoverage(sources as any);
  const missing = missingVesselCoverage(cov);
  assert.ok(missing.includes('registry') && missing.includes('class') && missing.includes('directory_news'));
})();

console.log('✓ source-categorizer tests passed');


