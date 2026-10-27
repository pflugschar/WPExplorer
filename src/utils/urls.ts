import type { QueryValue } from '@/types/api';

/** Builds a URL from a base + path, appending a query object while skipping undefined values. */
export function buildUrl(base: string, path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        url.searchParams.set(key, value.join(','));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export function serializeQuery(query: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return params.toString();
}

/** Extracts the `rel="https://api.w.org/"` REST API root from an HTTP Link header. */
export function extractApiRootFromLinkHeader(linkHeader: string | null): string | undefined {
  if (!linkHeader) return undefined;
  const match = linkHeader
    .split(',')
    .map((part) => part.trim())
    .find((part) => part.includes('rel="https://api.w.org/"'));
  if (!match) return undefined;
  const urlMatch = match.match(/<([^>]+)>/);
  return urlMatch?.[1];
}

export function joinPath(...parts: string[]): string {
  return parts
    .map((part, index) => {
      let p = part;
      if (index !== 0) p = p.replace(/^\/+/, '');
      if (index !== parts.length - 1) p = p.replace(/\/+$/, '');
      return p;
    })
    .join('/');
}
