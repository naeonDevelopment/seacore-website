export type SourceCategory = 'ais' | 'registry' | 'owner' | 'class' | 'directory_news' | 'forum' | 'oem' | 'other';

export interface CategorizableSource {
  url: string;
  title?: string;
  content?: string;
}

export function categorizeSource(url: string): SourceCategory {
  const u = (url || '').toLowerCase();
  if (!u) return 'other';
  // AIS / tracking
  if (u.includes('vesselfinder') || u.includes('marinetraffic') || u.includes('myshiptracking') || u.includes('vesseltracker') || u.includes('fleetmon')) return 'ais';
  // Registry
  if (u.includes('equasis') || u.includes('imo.org') || u.includes('shipregistry') || u.includes('svgmaritime') || u.includes('stvincent') || u.includes('flagstate')) return 'registry';
  // Directories / news (check BEFORE owner to avoid 'marinelink' matching 'marine')
  if (u.includes('marinelink') || u.includes('maritime-executive') || u.includes('splash247') || u.includes('tradewinds') || u.includes('offshore-energy') || u.includes('ijetty') || u.includes('directory')) return 'directory_news';
  // Owner/operator (more specific patterns to avoid false-positives)
  if (u.includes('stanfordmarine') || u.includes('shipmanagement') || u.includes('offshore.com') || u.match(/\bshipping\b/) ) return 'owner';
  // Class societies
  if (u.includes('dnv.com') || u.includes('lr.org') || u.includes('eagle.org') || u.includes('classnk') || u.includes('bureauveritas') || u.includes('bv')) return 'class';
  // Forums
  if (u.includes('gcaptain') || u.includes('forum') || u.includes('reddit.com/r/maritime')) return 'forum';
  // OEM
  if (u.includes('cat.com') || u.includes('wartsila') || u.includes('man-es') || u.includes('rolls-royce') || u.includes('abb.com')) return 'oem';
  return 'other';
}

export function computeCoverage(sources: CategorizableSource[]): Record<SourceCategory, number> {
  const coverage: Record<SourceCategory, number> = {
    ais: 0,
    registry: 0,
    owner: 0,
    class: 0,
    directory_news: 0,
    forum: 0,
    oem: 0,
    other: 0,
  };
  for (const s of sources) {
    const cat = categorizeSource(s.url);
    coverage[cat] = (coverage[cat] || 0) + 1;
  }
  return coverage;
}

export function missingVesselCoverage(coverage: Record<SourceCategory, number>): SourceCategory[] {
  const required: SourceCategory[] = ['ais', 'registry', 'owner', 'class', 'directory_news'];
  return required.filter(cat => (coverage[cat] || 0) === 0);
}


