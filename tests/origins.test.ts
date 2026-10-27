import { describe, expect, it } from 'vitest';
import { isSafeHttpUrl, isSameOrigin, normalizeOrigin, isSecureEnoughForCredentials, originMatchPattern } from '@/security/origins';

describe('isSafeHttpUrl', () => {
  it('accepts http/https URLs', () => {
    expect(isSafeHttpUrl('https://example.com/wp-json/')).toBe(true);
    expect(isSafeHttpUrl('http://example.com/wp-json/')).toBe(true);
  });

  it('rejects javascript:, data: and file: URLs', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isSafeHttpUrl('not a url')).toBe(false);
  });
});

describe('isSameOrigin', () => {
  it('recognizes the same origin regardless of path', () => {
    expect(isSameOrigin('https://example.com/wp-json/wp/v2/posts', 'https://example.com')).toBe(true);
  });

  it('rejects a different origin', () => {
    expect(isSameOrigin('https://evil.com/wp-json/', 'https://example.com')).toBe(false);
  });

  it('rejects a different scheme or port', () => {
    expect(isSameOrigin('http://example.com', 'https://example.com')).toBe(false);
    expect(isSameOrigin('https://example.com:8443', 'https://example.com')).toBe(false);
  });
});

describe('normalizeOrigin', () => {
  it('normalizes to scheme + host', () => {
    expect(normalizeOrigin('https://Example.com/some/path?x=1')).toBe('https://example.com');
  });

  it('returns undefined for unsafe schemes', () => {
    expect(normalizeOrigin('javascript:alert(1)')).toBeUndefined();
  });
});

describe('isSecureEnoughForCredentials', () => {
  it('allows https', () => {
    expect(isSecureEnoughForCredentials('https://example.com')).toBe(true);
  });

  it('allows localhost over http', () => {
    expect(isSecureEnoughForCredentials('http://localhost:8080')).toBe(true);
  });

  it('rejects plain http on a public domain', () => {
    expect(isSecureEnoughForCredentials('http://example.com')).toBe(false);
  });
});

describe('originMatchPattern', () => {
  it('builds a permissions match pattern', () => {
    expect(originMatchPattern('https://example.com/some/path')).toBe('https://example.com/*');
  });
});
