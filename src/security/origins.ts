/** Centralized origin/URL safety checks. All remote-controlled URLs must pass through here. */

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

export function parseUrlSafe(input: string, base?: string): URL | undefined {
  try {
    return base ? new URL(input, base) : new URL(input);
  } catch {
    return undefined;
  }
}

/** Rejects javascript:, data:, file: and any non-http(s) scheme. */
export function isSafeHttpUrl(input: string, base?: string): boolean {
  const url = parseUrlSafe(input, base);
  return !!url && SAFE_PROTOCOLS.has(url.protocol);
}

export function normalizeOrigin(input: string): string | undefined {
  const url = parseUrlSafe(input);
  if (!url || !SAFE_PROTOCOLS.has(url.protocol)) return undefined;
  return url.origin;
}

export function isSameOrigin(a: string, b: string): boolean {
  const oa = normalizeOrigin(a);
  const ob = normalizeOrigin(b);
  return !!oa && !!ob && oa === ob;
}

export function isLocalDevOrigin(origin: string): boolean {
  const url = parseUrlSafe(origin);
  if (!url) return false;
  const host = url.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.test')
  );
}

/** HTTPS is required for credentials unless the origin is a recognized local dev environment. */
export function isSecureEnoughForCredentials(origin: string): boolean {
  const url = parseUrlSafe(origin);
  if (!url) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && isLocalDevOrigin(origin);
}

export function originMatchPattern(origin: string): string | undefined {
  const normalized = normalizeOrigin(origin);
  return normalized ? `${normalized}/*` : undefined;
}
