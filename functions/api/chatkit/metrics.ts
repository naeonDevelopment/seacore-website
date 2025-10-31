export interface AgentMetrics {
  geminiRetryCount?: number;
  tavilyRetryCount?: number;
  totalSources?: number;
  sourcesByTier?: { T1?: number; T2?: number; T3?: number };
  webResultsCount?: number;
  redirectOnlyFlag?: boolean;
  entityValidationConfidence?: number; // 0..1
  vesselCoverage?: { [k: string]: number };
  missingCoverage?: string[];
}

export function emitMetrics(statusEmitter: ((e: any) => void) | undefined, metrics: AgentMetrics) {
  if (!statusEmitter) return;
  try {
    statusEmitter({ type: 'metrics', data: metrics });
  } catch {}
}


