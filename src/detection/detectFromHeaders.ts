import { extractApiRootFromLinkHeader } from '@/utils/urls';

/** Inspects HTTP response headers (currently just the `Link` header) for REST API discovery hints. */
export function detectApiRootFromHeaders(response: Response): string | undefined {
  return extractApiRootFromLinkHeader(response.headers.get('link'));
}
