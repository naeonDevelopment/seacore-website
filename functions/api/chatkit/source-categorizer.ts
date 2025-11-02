export type SourceCategory = 'ais' | 'registry' | 'owner' | 'class' | 'directory_news' | 'forum' | 'oem' | 'other';

export interface CategorizableSource {
  url: string;
  title?: string;
  content?: string;
}

/**
 * PHASE 2 FIX: Pattern-based source categorization
 * Uses URL path patterns and domain specificity to avoid false positives
 */
export function categorizeSource(url: string): SourceCategory {
  const u = (url || '').toLowerCase();
  if (!u) return 'other';
  
  try {
    const parsed = new URL(u);
    const domain = parsed.hostname;
    const path = parsed.pathname;
    
    // AIS / tracking (domain-specific)
    if (domain.includes('vesselfinder') || domain.includes('marinetraffic') || 
        domain.includes('myshiptracking') || domain.includes('vesseltracker') || 
        domain.includes('fleetmon')) {
      return 'ais';
    }
    
    // Registry (domain-specific)
    if (domain.includes('equasis') || domain.includes('imo.org') || 
        domain.includes('shipregistry') || domain.includes('svgmaritime') || 
        domain.includes('stvincent') || domain.includes('flagstate') ||
        domain.includes('registry') || domain.includes('skanregistry')) {
      return 'registry';
    }
    
    // Directories / news - CHECK FIRST to prevent false owner matches
    const newsIndicators = [
      'marinelink', 'maritime-executive', 'splash247', 'tradewinds', 
      'offshore-energy', 'ijetty', 'gcaptain', 'marineinsight',
      'seatrade', 'shippingwatch', 'lloydslist', 'maritime-journal'
    ];
    if (newsIndicators.some(ind => domain.includes(ind))) {
      return 'directory_news';
    }
    
    // News path patterns (e.g., /news/, /article/, /press-release/)
    if (path.match(/\/(news|article|press|blog|stories|updates)\//)) {
      return 'directory_news';
    }
    
    // Owner/operator - SPECIFIC PATTERNS ONLY
    // Pattern 1: Known operator domains
    const ownerDomains = [
      'stanfordmarine', 'maersk', 'msc.com', 'cma-cgm', 
      'hapag-lloyd', 'evergreen-marine', 'yangming'
    ];
    if (ownerDomains.some(d => domain.includes(d))) {
      return 'owner';
    }
    
    // Pattern 2: Path patterns indicating company pages
    // /fleet, /about-us, /company, /management (but NOT /news/ or /article/)
    if (path.match(/\/(fleet|about|company|management|operations)\//)) {
      // Exclude if it's a news article path
      if (!path.match(/\/(news|article|press|blog)\//)) {
        return 'owner';
      }
    }
    
    // Pattern 3: Explicit "shipping company" pages
    if (domain.match(/shipping/) && (path.includes('/company') || path.includes('/about'))) {
      return 'owner';
    }
    
    // Class societies (domain-specific)
    const classDomains = ['dnv.com', 'lr.org', 'eagle.org', 'abs.org', 'classnk', 'bureauveritas', 'bv.com'];
    if (classDomains.some(d => domain.includes(d))) {
      return 'class';
    }
    
    // Forums (domain + path patterns)
    if (domain.includes('forum') || domain.includes('gcaptain') || 
        path.includes('/forum/') || path.includes('/discussion/')) {
      return 'forum';
    }
    
    // OEM manufacturers (domain-specific)
    const oemDomains = [
      'cat.com', 'caterpillar', 'wartsila', 'man-es', 'man-energy',
      'rolls-royce', 'abb.com', 'siemens', 'kongsberg', 'cummins'
    ];
    if (oemDomains.some(d => domain.includes(d))) {
      return 'oem';
    }
    
    // Fallback: If we can't categorize, it's "other"
    return 'other';
    
  } catch (e) {
    // If URL parsing fails, fall back to simple substring matching
    // AIS / tracking
    if (u.includes('vesselfinder') || u.includes('marinetraffic') || u.includes('myshiptracking') || u.includes('vesseltracker') || u.includes('fleetmon')) return 'ais';
    // Registry
    if (u.includes('equasis') || u.includes('imo.org') || u.includes('shipregistry')) return 'registry';
    // News (check before owner)
    if (u.includes('marinelink') || u.includes('maritime-executive') || u.includes('splash247') || u.includes('tradewinds')) return 'directory_news';
    // Class
    if (u.includes('dnv.com') || u.includes('lr.org') || u.includes('eagle.org') || u.includes('classnk')) return 'class';
    // OEM
    if (u.includes('cat.com') || u.includes('wartsila') || u.includes('man-es') || u.includes('rolls-royce')) return 'oem';
    
    return 'other';
  }
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


