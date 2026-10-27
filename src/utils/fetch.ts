import { AppError } from '@/types/api';
import { isSafeHttpUrl } from '@/security/origins';

export interface FetchJsonOptions extends RequestInit {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;

/** fetch() with a hard timeout and centralized URL-scheme validation. */
export async function safeFetch(url: string, options: FetchJsonOptions = {}): Promise<Response> {
  if (!isSafeHttpUrl(url)) {
    throw new AppError('invalid-response', `Refusing to fetch unsafe URL: ${url}`);
  }

  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const externalSignal = init.signal;
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AppError('network', `Request timed out or was cancelled: ${url}`);
    }
    throw new AppError('network', `Network error while fetching ${url}: ${String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

function mapStatusToErrorKind(status: number): AppError['kind'] {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 429) return 'rate-limited';
  if (status >= 500) return 'network';
  return 'unknown';
}

/** Parses a REST JSON response, never treating HTML error pages as JSON. */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok) {
    throw new AppError(mapStatusToErrorKind(response.status), `Request failed with status ${response.status}`, response.status);
  }
  if (!contentType.includes('application/json')) {
    throw new AppError('invalid-response', `Expected JSON but received "${contentType || 'unknown content-type'}"`);
  }
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new AppError('invalid-response', `Failed to parse JSON response: ${String(error)}`);
  }
}
