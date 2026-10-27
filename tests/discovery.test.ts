import { afterEach, describe, expect, it, vi } from 'vitest';
import { discoverWordPress } from '@/api/discovery';
import { basicWordPressIndex, nonWordPressHtml } from './fixtures';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...init.headers },
    ...init,
  });
}

function htmlResponse(body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/html', ...headers } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('discoverWordPress', () => {
  it('discovers the REST API via /wp-json/ when no DOM/header hints are available', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://example.com') return htmlResponse('<html></html>');
      if (url === 'https://example.com/wp-json/') return jsonResponse(basicWordPressIndex);
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { detection, apiIndex } = await discoverWordPress('https://example.com');
    expect(detection.detected).toBe(true);
    expect(detection.apiRoot).toBe('https://example.com/wp-json/');
    expect(apiIndex?.namespaces).toContain('wp/v2');
  });

  it('falls back to ?rest_route=/ when /wp-json/ is unavailable', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://example.com') return htmlResponse('<html></html>');
      if (url === 'https://example.com/wp-json/') return new Response('not found', { status: 404 });
      if (url === 'https://example.com/?rest_route=/') return jsonResponse(basicWordPressIndex);
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { detection } = await discoverWordPress('https://example.com');
    expect(detection.detected).toBe(true);
    expect(detection.apiRoot).toBe('https://example.com/?rest_route=/');
    expect(detection.methods.find((m) => m.name === 'rest-route-fallback')?.matched).toBe(true);
  });

  it('uses the api.w.org Link header URL when present', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://example.com') {
        return htmlResponse('<html></html>', { link: '<https://example.com/custom-api/>; rel="https://api.w.org/"' });
      }
      if (url === 'https://example.com/custom-api/') return jsonResponse(basicWordPressIndex);
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { detection } = await discoverWordPress('https://example.com');
    expect(detection.apiRoot).toBe('https://example.com/custom-api/');
    expect(detection.methods.find((m) => m.name === 'link-header')?.matched).toBe(true);
  });

  it('reports not detected for a non-WordPress site', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://example.com') return htmlResponse(nonWordPressHtml);
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { detection, apiIndex } = await discoverWordPress('https://example.com');
    expect(detection.detected).toBe(false);
    expect(apiIndex).toBeUndefined();
  });
});
