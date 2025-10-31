/**
 * Shared HTTP retry utility with exponential backoff + jitter and per-attempt timeouts.
 */

export interface RetryOptions {
  retries?: number; // total attempts = retries + 1
  baseDelayMs?: number; // initial backoff base
  maxDelayMs?: number; // cap backoff
  timeoutMs?: number; // per-attempt timeout
  retryOnStatuses?: number[]; // explicit list; default includes 408, 429, 500-599
  retryOnNetworkError?: boolean; // default true
  onRetry?: (info: { attempt: number; delayMs: number; reason: string; status?: number }) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  retries: 3,
  baseDelayMs: 350,
  maxDelayMs: 6000,
  timeoutMs: 12000,
  retryOnStatuses: [],
  retryOnNetworkError: true,
  onRetry: () => {},
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calcBackoffWithJitter(attempt: number, base: number, maxDelay: number): number {
  const exp = Math.min(maxDelay, Math.pow(2, attempt) * base);
  const jitter = Math.random() * base;
  return Math.min(maxDelay, exp + jitter);
}

function isRetryableStatus(status: number, explicit: number[]): boolean {
  if (explicit.length > 0) return explicit.includes(status);
  if (status === 408 || status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  return false;
}

export async function fetchWithRetry(input: RequestInfo, init: RequestInit = {}, opts: RetryOptions = {}): Promise<Response> {
  const options: Required<RetryOptions> = { ...DEFAULT_OPTIONS, ...opts } as any;
  let lastError: any = null;

  for (let attempt = 0; attempt <= options.retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const resp = await fetch(input as any, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok && isRetryableStatus(resp.status, options.retryOnStatuses)) {
        lastError = new Error(`HTTP ${resp.status}`);
        if (attempt < options.retries) {
          const delay = calcBackoffWithJitter(attempt, options.baseDelayMs, options.maxDelayMs);
          options.onRetry?.({ attempt: attempt + 1, delayMs: delay, reason: 'http_status', status: resp.status });
          await sleep(delay);
          continue;
        }
      }
      return resp;
    } catch (err: any) {
      clearTimeout(timeout);
      lastError = err;
      const isAbort = err?.name === 'AbortError';
      const isNetwork = !isAbort && (err?.message?.toString?.().length > 0);
      if ((isAbort || (isNetwork && options.retryOnNetworkError)) && attempt < options.retries) {
        const delay = calcBackoffWithJitter(attempt, options.baseDelayMs, options.maxDelayMs);
        options.onRetry?.({ attempt: attempt + 1, delayMs: delay, reason: isAbort ? 'timeout' : 'network' });
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('fetchWithRetry: exhausted retries');
}


