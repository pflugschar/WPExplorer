import { describe, expect, it, vi } from 'vitest';
import { withRetry } from '@/utils/retry';
import { AppError } from '@/types/api';

describe('withRetry', () => {
  it('retries on rate-limited/network errors and eventually succeeds', async () => {
    let attempts = 0;
    const operation = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) throw new AppError('rate-limited', 'Too many requests', 429);
      return 'ok';
    });

    const result = await withRetry(operation, { maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 2 });
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('does not retry non-retryable errors', async () => {
    const operation = vi.fn(async () => {
      throw new AppError('not-found', 'Missing', 404);
    });

    await expect(withRetry(operation, { maxAttempts: 5, baseDelayMs: 1 })).rejects.toThrow('Missing');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('stops after maxAttempts and throws the last error', async () => {
    const operation = vi.fn(async () => {
      throw new AppError('network', 'boom');
    });

    await expect(withRetry(operation, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2 })).rejects.toThrow('boom');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
