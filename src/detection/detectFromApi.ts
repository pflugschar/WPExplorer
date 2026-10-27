import type { WordPressApiIndex } from '@/types/api';
import { safeFetch, parseJsonResponse } from '@/utils/fetch';

export interface ApiIndexValidation {
  valid: boolean;
  apiRoot: string;
  index?: WordPressApiIndex;
  wordpressVersion?: string;
  error?: string;
}

/** Fetches and validates a candidate REST API root, looking for the `wp/v2` namespace. */
export async function detectFromApiIndex(apiRoot: string, signal?: AbortSignal): Promise<ApiIndexValidation> {
  try {
    const response = await safeFetch(apiRoot, {
      headers: { Accept: 'application/json' },
      signal,
      timeoutMs: 10000,
    });
    const index = await parseJsonResponse<WordPressApiIndex>(response);
    const namespaces = Array.isArray(index.namespaces) ? index.namespaces : [];
    const valid = namespaces.includes('wp/v2');
    return { valid, apiRoot, index: valid ? index : undefined };
  } catch (error) {
    return { valid: false, apiRoot, error: error instanceof Error ? error.message : String(error) };
  }
}
