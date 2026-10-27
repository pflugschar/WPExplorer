import { describe, expect, it } from 'vitest';
import { extractApiRootFromLinkHeader, buildUrl, serializeQuery, joinPath } from '@/utils/urls';

describe('extractApiRootFromLinkHeader', () => {
  it('extracts the api.w.org URL from a Link header', () => {
    const header = '<https://example.com/wp-json/>; rel="https://api.w.org/"';
    expect(extractApiRootFromLinkHeader(header)).toBe('https://example.com/wp-json/');
  });

  it('handles multiple comma-separated links', () => {
    const header = '<https://example.com/>; rel="alternate", <https://example.com/wp-json/>; rel="https://api.w.org/"';
    expect(extractApiRootFromLinkHeader(header)).toBe('https://example.com/wp-json/');
  });

  it('returns undefined when there is no matching rel', () => {
    expect(extractApiRootFromLinkHeader('<https://example.com/>; rel="alternate"')).toBeUndefined();
  });

  it('returns undefined for a null header', () => {
    expect(extractApiRootFromLinkHeader(null)).toBeUndefined();
  });
});

describe('buildUrl', () => {
  it('builds a URL with query parameters, skipping undefined values', () => {
    const url = buildUrl('https://example.com/wp-json/', 'wp/v2/posts', { search: 'hello', page: undefined, per_page: 5 });
    expect(url).toBe('https://example.com/wp-json/wp/v2/posts?search=hello&per_page=5');
  });

  it('serializes array values as comma-separated', () => {
    const url = buildUrl('https://example.com/wp-json/', 'wp/v2/posts', { categories: [1, 2, 3] });
    expect(url).toContain('categories=1%2C2%2C3');
  });
});

describe('serializeQuery', () => {
  it('serializes a flat query object', () => {
    expect(serializeQuery({ a: 1, b: 'x' })).toBe('a=1&b=x');
  });
});

describe('joinPath', () => {
  it('joins path segments without duplicate slashes', () => {
    expect(joinPath('https://example.com/', '/wp-json/', 'wp/v2/posts')).toBe('https://example.com/wp-json/wp/v2/posts');
  });
});
