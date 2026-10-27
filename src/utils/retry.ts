import { AppError } from '@/types/api';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'signal'>> = {
  maxAttempts: 4,
  baseDelayMs: 500,
  maxDelayMs: 8000,
};

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new AppError('network', 'Aborted while waiting to retry'));
      },
      { once: true },
    );
  });
}

function isRetryable(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.kind === 'rate-limited' || error.kind === 'network';
  }
  return false;
}

/** Bounded retry with exponential backoff; retries only on 429/5xx/network/timeout failures. */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (options.signal?.aborted) {
      throw new AppError('network', 'Aborted before request could be attempted');
    }
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !isRetryable(error)) {
        throw error;
      }
      const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = Math.random() * backoff * 0.25;
      await delay(backoff + jitter, options.signal);
    }
  }

  throw lastError;
}
