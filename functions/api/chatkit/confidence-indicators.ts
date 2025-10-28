/**
 * CONFIDENCE INDICATORS (Phase C3)
 * Calculate and display answer confidence/reliability indicators
 * Similar to ChatGPT's search confidence and Cursor's verification badges
 */

export interface ConfidenceIndicator {
  level: 'high' | 'medium' | 'low' | 'unverified';
  score: number; // 0-100
  badge: 'verified' | 'likely' | 'uncertain' | 'unverified';
  color: 'green' | 'yellow' | 'orange' | 'red';
  icon: 'check-circle' | 'check' | 'alert-circle' | 'x-circle';
  label: string;
  reasoning: string[];
  showWarning: boolean;
}

export interface QualityMetrics {
  sourceCount: number;
  sourceQuality: 'authoritative' | 'standard' | 'mixed' | 'low';
  hasConflicts: boolean;
  verificationPassed: boolean;
  comparativeAnalysis: boolean;
  claimCount: number;
  normalizedDataPoints: number;
}

/**
 * Calculate comprehensive confidence indicator
 */
export function calculateConfidenceIndicator(
  confidence: number,
  metrics: QualityMetrics
): ConfidenceIndicator {
  
  const reasoning: string[] = [];
  let adjustedScore = confidence;
  
  // Factor 1: Source count and quality (40% weight)
  if (metrics.sourceCount >= 5) {
    reasoning.push(`${metrics.sourceCount} sources found`);
    adjustedScore += 5;
  } else if (metrics.sourceCount >= 3) {
    reasoning.push(`${metrics.sourceCount} sources consulted`);
  } else if (metrics.sourceCount >= 1) {
    reasoning.push(`Limited sources (${metrics.sourceCount})`);
    adjustedScore -= 10;
  } else {
    reasoning.push('No external sources');
    adjustedScore -= 20;
  }
  
  // Factor 2: Source quality (30% weight)
  if (metrics.sourceQuality === 'authoritative') {
    reasoning.push('Authoritative sources (gov, edu, class societies)');
    adjustedScore += 10;
  } else if (metrics.sourceQuality === 'standard') {
    reasoning.push('Industry-standard sources');
    adjustedScore += 5;
  } else if (metrics.sourceQuality === 'mixed') {
    reasoning.push('Mixed source quality');
  } else {
    reasoning.push('Low-quality sources');
    adjustedScore -= 15;
  }
  
  // Factor 3: Conflict detection (critical - 20% weight)
  if (metrics.hasConflicts) {
    reasoning.push('⚠️ Conflicting information detected');
    adjustedScore -= 25;
  } else {
    reasoning.push('No conflicts found');
    adjustedScore += 5;
  }
  
  // Factor 4: Verification status (10% weight)
  if (metrics.verificationPassed) {
    reasoning.push('✓ Verification passed');
    adjustedScore += 5;
  } else {
    reasoning.push('Verification incomplete');
    adjustedScore -= 10;
  }
  
  // Factor 5: Comparative analysis (bonus)
  if (metrics.comparativeAnalysis) {
    reasoning.push('Comparative analysis performed');
    adjustedScore += 5;
  }
  
  // Factor 6: Structured data
  if (metrics.normalizedDataPoints > 5) {
    reasoning.push(`${metrics.normalizedDataPoints} data points normalized`);
    adjustedScore += 5;
  }
  
  // Clamp score
  adjustedScore = Math.max(0, Math.min(100, adjustedScore));
  
  // Determine level and badge
  let level: ConfidenceIndicator['level'];
  let badge: ConfidenceIndicator['badge'];
  let color: ConfidenceIndicator['color'];
  let icon: ConfidenceIndicator['icon'];
  let label: string;
  let showWarning = false;
  
  if (adjustedScore >= 85) {
    level = 'high';
    badge = 'verified';
    color = 'green';
    icon = 'check-circle';
    label = 'High Confidence';
  } else if (adjustedScore >= 70) {
    level = 'high';
    badge = 'likely';
    color = 'green';
    icon = 'check';
    label = 'Verified';
  } else if (adjustedScore >= 50) {
    level = 'medium';
    badge = 'likely';
    color = 'yellow';
    icon = 'check';
    label = 'Likely Accurate';
    showWarning = metrics.hasConflicts;
  } else if (adjustedScore >= 30) {
    level = 'low';
    badge = 'uncertain';
    color = 'orange';
    icon = 'alert-circle';
    label = 'Uncertain';
    showWarning = true;
  } else {
    level = 'unverified';
    badge = 'unverified';
    color = 'red';
    icon = 'x-circle';
    label = 'Unverified';
    showWarning = true;
  }
  
  return {
    level,
    score: Math.round(adjustedScore),
    badge,
    color,
    icon,
    label,
    reasoning,
    showWarning
  };
}

/**
 * Determine source quality from URLs
 */
export function assessSourceQuality(sources: Array<{ url: string; title: string }>): QualityMetrics['sourceQuality'] {
  if (sources.length === 0) return 'low';
  
  let authoritativeCount = 0;
  let standardCount = 0;
  
  for (const source of sources) {
    const url = source.url.toLowerCase();
    
    // Authoritative sources
    if (
      url.includes('.gov') ||
      url.includes('.edu') ||
      url.includes('imo.org') ||
      url.includes('iacs.org.uk') ||
      url.includes('classnk') ||
      url.includes('dnv.com') ||
      url.includes('lr.org') || // Lloyd's Register
      url.includes('abs-group.com') || // American Bureau of Shipping
      url.includes('bv.com') // Bureau Veritas
    ) {
      authoritativeCount++;
    }
    // Standard maritime sources
    else if (
      url.includes('maritime') ||
      url.includes('shipping') ||
      url.includes('vessel') ||
      url.includes('offshore') ||
      url.includes('marinetraffic') ||
      url.includes('marineinsight')
    ) {
      standardCount++;
    }
  }
  
  const authRatio = authoritativeCount / sources.length;
  const standardRatio = standardCount / sources.length;
  
  if (authRatio >= 0.5) return 'authoritative';
  if (authRatio >= 0.3 || standardRatio >= 0.5) return 'standard';
  if (standardRatio >= 0.3) return 'mixed';
  return 'low';
}

/**
 * Generate user-friendly confidence message
 */
export function getConfidenceMessage(indicator: ConfidenceIndicator): string {
  const messages: Record<ConfidenceIndicator['level'], string> = {
    'high': 'This answer has been verified against multiple authoritative sources.',
    'medium': 'This answer is based on available sources but may have some uncertainty.',
    'low': 'This answer has limited source support. Consider verifying independently.',
    'unverified': 'This answer could not be verified from reliable sources.'
  };
  
  return messages[indicator.level];
}

